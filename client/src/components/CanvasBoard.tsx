import { memo, useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { motion } from 'framer-motion'
import { Activity, Copy, Layers, Lock, Moon, PenTool, SendToBack, Sparkles, Sun } from 'lucide-react'
import toast from 'react-hot-toast'
import { Toolbar } from '@/components/toolbar/Toolbar'
import { usePan } from '@/hooks/usePan'
import { useCanvas } from '@/hooks/useCanvas'
import { useZoom } from '@/hooks/useZoom'
import { useCanvasStore } from '@/store/canvasStore'
import { useHistoryStore } from '@/store/historyStore'
import { useRoomStore } from '@/store/roomStore'
import { useSelectionStore } from '@/store/selectionStore'
import { useSocketStore } from '@/store/socketStore'
import { useUIStore } from '@/store/uiStore'
import { getGridSpacing, renderCanvasScene, screenToWorld, snapPointToGrid, worldToScreen } from '@/lib/canvas/renderer'
import { getHandlePositions, getObjectBounds, isPointInBounds, moveObject, resizeObject, type Bounds, type ResizeHandle } from '@/lib/canvas/geometry'
import { exportJSON, exportPNG, exportSVG, parseCanvasDocument } from '@/lib/canvas/exporters'
import { saveRoomLocally } from '@/services/persistence'
import type { CanvasObject, Point } from '@/types'

const logAnalyticsEvent = (_eventName: string, _payload: Record<string, unknown>) => {
  return undefined
}

interface CanvasBoardProps {
  roomId: string
}

interface InteractionState {
  mode: 'move' | 'resize'
  objectId: string
  startPoint: Point
  startObject: CanvasObject
  startObjects?: CanvasObject[]
  handle?: ResizeHandle
  initialBounds?: Bounds
}

const CanvasBoardComponent = ({ roomId }: CanvasBoardProps) => {
  const [draftObject, setDraftObject] = useState<CanvasObject | null>(null)
  const [spacePressed, setSpacePressed] = useState(false)
  const [isPanning, setIsPanning] = useState(false)
  const [interaction, setInteraction] = useState<InteractionState | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [perf, setPerf] = useState({ visibleObjects: 0, totalObjects: 0, drawMs: 0 })
  const [isAutosaved, setIsAutosaved] = useState(false)
  const panOrigin = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)
  const clipboard = useRef<CanvasObject[]>([])
  const lastCursorEmit = useRef(0)
  const perfEmit = useRef(0)
  const { pan, setPan, resetPan } = usePan()
  const { zoom, setZoom, resetZoom } = useZoom(1)

  const objects = useCanvasStore((state) => state.objects)
  const addObject = useCanvasStore((state) => state.addObject)
  const updateObject = useCanvasStore((state) => state.updateObject)
  const deleteObject = useCanvasStore((state) => state.deleteObject)
  const bringForward = useCanvasStore((state) => state.bringForward)
  const sendBackward = useCanvasStore((state) => state.sendBackward)
  const replaceObjects = useCanvasStore((state) => state.replaceObjects)
  const pushSnapshot = useHistoryStore((state) => state.pushSnapshot)
  const undoHistory = useHistoryStore((state) => state.undo)
  const redoHistory = useHistoryStore((state) => state.redo)
  const userName = useRoomStore((state) => state.userName)
  const participants = useRoomStore((state) => state.participants)
  const selectedObjectId = useSelectionStore((state) => state.selectedObjectId)
  const setSelectedObjectId = useSelectionStore((state) => state.setSelectedObjectId)
  const clearSelection = useSelectionStore((state) => state.clearSelection)
  const emitDraw = useSocketStore((state) => state.emitDraw)
  const emitUpsert = useSocketStore((state) => state.emitUpsert)
  const emitDelete = useSocketStore((state) => state.emitDelete)
  const emitCursor = useSocketStore((state) => state.emitCursor)
  const emitHistory = useSocketStore((state) => state.emitHistory)
  const activeTool = useUIStore((state) => state.activeTool)
  const strokeColor = useUIStore((state) => state.strokeColor)
  const fillColor = useUIStore((state) => state.fillColor)
  const strokeWidth = useUIStore((state) => state.strokeWidth)
  const opacity = useUIStore((state) => state.opacity)
  const dashStyle = useUIStore((state) => state.dashStyle)
  const showGrid = useUIStore((state) => state.showGrid)
  const snapToGrid = useUIStore((state) => state.snapToGrid)
  const theme = useUIStore((state) => state.theme)
  const setActiveTool = useUIStore((state) => state.setActiveTool)
  const setStrokeColor = useUIStore((state) => state.setStrokeColor)
  const setFillColor = useUIStore((state) => state.setFillColor)
  const setStrokeWidth = useUIStore((state) => state.setStrokeWidth)
  const setOpacity = useUIStore((state) => state.setOpacity)
  const setDashStyle = useUIStore((state) => state.setDashStyle)
  const toggleGrid = useUIStore((state) => state.toggleGrid)
  const toggleSnap = useUIStore((state) => state.toggleSnap)
  const toggleTheme = useUIStore((state) => state.toggleTheme)

  const selectedObject = useMemo(() => objects.find((object) => object.id === selectedObjectId) ?? null, [objects, selectedObjectId])
  const selectedObjects = useMemo(() => {
    if (!selectedObject) {
      return []
    }
    return selectedObject.groupId ? objects.filter((object) => object.groupId === selectedObject.groupId) : [selectedObject]
  }, [objects, selectedObject])

  const commitObjects = useCallback(
    (nextObjects: CanvasObject[], previousObjects = objects) => {
      pushSnapshot(previousObjects)
      replaceObjects(nextObjects)
      emitHistory(roomId, 'snapshot', { objects: nextObjects })
      logAnalyticsEvent('canvas.snapshot', { roomId, objectCount: nextObjects.length })
    },
    [emitHistory, objects, pushSnapshot, replaceObjects, roomId],
  )

  const duplicateSelected = useCallback(() => {
    if (!selectedObjects.length) {
      return
    }
    const groupId = selectedObjects.length > 1 ? `group-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` : undefined
    const copies = selectedObjects.map((object) => moveObject({ ...object, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, locked: false, groupId: groupId ?? object.groupId }, 24, 24))
    commitObjects([...objects, ...copies])
    setSelectedObjectId(copies.at(-1)?.id ?? null)
    toast.success('Duplicated selection')
  }, [commitObjects, objects, selectedObjects, setSelectedObjectId])

  const importJSON = useCallback(async (file: File) => {
    try {
      const importedObjects = parseCanvasDocument(await file.text())
      commitObjects(importedObjects)
      logAnalyticsEvent('canvas.import_json', { roomId, objectCount: importedObjects.length })
      toast.success(`Imported ${importedObjects.length} objects`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to import JSON')
    }
  }, [commitObjects, roomId])

  const remoteCursors = useMemo(
    () => participants.filter((participant) => participant.userName !== userName && participant.cursor),
    [participants, userName],
  )

  const commitSelectedTransform = useCallback(
    (object: CanvasObject) => {
      emitUpsert(roomId, object)
      emitHistory(roomId, 'snapshot', { objects: useCanvasStore.getState().objects })
    },
    [emitHistory, emitUpsert, roomId],
  )

  useEffect(() => {
    const timer = window.setTimeout(() => {
      saveRoomLocally(roomId, objects)
      setIsAutosaved(true)
      window.setTimeout(() => setIsAutosaved(false), 1000)
    }, 500)

    return () => window.clearTimeout(timer)
  }, [objects, roomId])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isModifier = event.ctrlKey || event.metaKey

      if (event.key === 'Escape') {
        setContextMenu(null)
      }

      if (isModifier && event.key.toLowerCase() === 's') {
        event.preventDefault()
        exportJSON(objects)
        toast.success('Exported canvas JSON')
      }

      if (isModifier && event.shiftKey && event.key.toLowerCase() === 's') {
        event.preventDefault()
        exportPNG(objects)
        toast.success('Exported canvas PNG')
      }

      if (isModifier && event.key.toLowerCase() === 'o') {
        event.preventDefault()
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'application/json,.json'
        input.onchange = async () => {
          const file = input.files?.[0]
          if (!file) {
            return
          }
          try {
            const importedObjects = parseCanvasDocument(await file.text())
            commitObjects(importedObjects)
            logAnalyticsEvent('canvas.import_json', { roomId, objectCount: importedObjects.length })
            toast.success(`Imported ${importedObjects.length} objects`)
          } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Unable to import JSON')
          }
        }
        input.click()
      }

      if (isModifier && event.key.toLowerCase() === 'd' && selectedObjectId) {
        event.preventDefault()
        duplicateSelected()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [commitObjects, duplicateSelected, objects, roomId, selectedObjectId])

  const { canvasRef, size } = useCanvas<HTMLCanvasElement>(
    useCallback(
      (context, _canvas, viewportSize) => {
        const viewport = {
          width: viewportSize.width,
          height: viewportSize.height,
          zoom,
          panX: pan.x,
          panY: pan.y,
        }
        const sceneObjects = draftObject ? [...objects, draftObject] : objects
        renderCanvasScene(context, viewport, sceneObjects, {
          showGrid,
          selectedObject,
          dirtyBounds: interaction?.initialBounds ?? (interaction?.startObject ? getObjectBounds(interaction.startObject) : null),
          onMeasure: (metrics) => {
            const now = performance.now()
            if (now - perfEmit.current > 250) {
              perfEmit.current = now
              setPerf(metrics)
            }
          },
        })
      },
      [draftObject, interaction, objects, pan.x, pan.y, selectedObject, showGrid, zoom],
    ),
  )

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault()
        setSpacePressed(true)
      }
      const isModifier = event.ctrlKey || event.metaKey
      if (isModifier && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        const nextObjects = event.shiftKey ? redoHistory(objects) : undoHistory(objects)
        replaceObjects(nextObjects)
        emitHistory(roomId, event.shiftKey ? 'redo' : 'undo', { objects: nextObjects })
      }
      if (isModifier && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        const nextObjects = redoHistory(objects)
        replaceObjects(nextObjects)
        emitHistory(roomId, 'redo', { objects: nextObjects })
      }
      if (isModifier && event.key.toLowerCase() === 'c' && selectedObjects.length) {
        event.preventDefault()
        clipboard.current = selectedObjects
      }
      if (isModifier && event.key.toLowerCase() === 'v' && clipboard.current.length) {
        event.preventDefault()
        const groupId = clipboard.current.length > 1 ? `group-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` : undefined
        const copies = clipboard.current.map((object) => moveObject({ ...object, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, locked: false, groupId: groupId ?? object.groupId }, 24, 24))
        commitObjects([...objects, ...copies])
        setSelectedObjectId(copies.at(-1)?.id ?? null)
      }
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedObjects.length) {
        const deletable = selectedObjects.filter((object) => !object.locked)
        if (!deletable.length) {
          return
        }
        pushSnapshot(objects)
        deletable.forEach((object) => {
          deleteObject(object.id)
          emitDelete(roomId, object.id)
        })
        clearSelection()
        toast.success('Deleted selection')
      }
      if (event.key === 'Escape') {
        setContextMenu(null)
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        setSpacePressed(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [clearSelection, commitObjects, deleteObject, emitDelete, emitHistory, objects, pushSnapshot, redoHistory, replaceObjects, roomId, selectedObjects, setSelectedObjectId, undoHistory])

  const viewport = useMemo(
    () => ({
      width: size.width,
      height: size.height,
      zoom,
      panX: pan.x,
      panY: pan.y,
    }),
    [pan.x, pan.y, size.height, size.width, zoom],
  )

  const getWorldPoint = (event: ReactPointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current
    if (!canvas) {
      return { x: 0, y: 0 }
    }

    const rect = canvas.getBoundingClientRect()
    const point = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }

    return screenToWorld(point, viewport)
  }

  const createBaseObject = (start: Point): CanvasObject => {
    const base = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdBy: userName,
      strokeColor,
      fillColor,
      strokeWidth,
      opacity,
      dashStyle,
    }

    switch (activeTool) {
      case 'pencil':
        return { ...base, type: 'pencil', points: [start] }
      case 'line':
        return { ...base, type: 'line', start, end: start }
      case 'rectangle':
        return { ...base, type: 'rectangle', x: start.x, y: start.y, width: 0, height: 0 }
      case 'circle':
        return { ...base, type: 'circle', center: start, radius: 0 }
      case 'ellipse':
        return { ...base, type: 'ellipse', center: start, radiusX: 0, radiusY: 0 }
      case 'arrow':
        return { ...base, type: 'arrow', start, end: start, arrowHeadSize: 12 }
      case 'text': {
        const text = window.prompt('Enter text', 'Text') ?? 'Text'
        return { ...base, type: 'text', x: start.x, y: start.y, text, fontSize: 18 }
      }
      case 'eraser':
        return { ...base, type: 'eraser', points: [start] }
      default:
        return { ...base, type: 'pencil', points: [start] }
    }
  }

  const isPointOnObject = (point: Point, object: CanvasObject) => {
    const bounds = getObjectBounds(object)
    if (!isPointInBounds(point, bounds, object.type === 'pencil' || object.type === 'eraser' ? 12 : 8)) {
      return false
    }

    if (object.type === 'pencil' || object.type === 'eraser') {
      return object.points.some((candidate) => Math.hypot(candidate.x - point.x, candidate.y - point.y) <= 14)
    }

    if (object.type === 'line' || object.type === 'arrow') {
      const dx = object.end.x - object.start.x
      const dy = object.end.y - object.start.y
      const length = Math.hypot(dx, dy) || 1
      const projection = ((point.x - object.start.x) * dx + (point.y - object.start.y) * dy) / length
      const clamped = Math.max(0, Math.min(length, projection))
      const nearest = {
        x: object.start.x + (clamped / length) * dx,
        y: object.start.y + (clamped / length) * dy,
      }
      return Math.hypot(point.x - nearest.x, point.y - nearest.y) <= 10
    }

    return true
  }

  const finishDraft = () => {
    if (!draftObject) {
      return
    }

    pushSnapshot(objects)
    addObject(draftObject)
    emitDraw(roomId, draftObject)
    emitHistory(roomId, 'draw', { objects: [...objects, draftObject] })
    setDraftObject(null)
    setSelectedObjectId(draftObject.id)
  }

  const emitLiveDraft = useCallback((object: CanvasObject) => {
    emitDraw(roomId, object)
  }, [emitDraw, roomId])

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.preventDefault()
    setContextMenu(null)
    const canvas = event.currentTarget
    canvas.setPointerCapture(event.pointerId)

    if (spacePressed || event.button === 1) {
      setIsPanning(true)
      panOrigin.current = {
        x: event.clientX,
        y: event.clientY,
        panX: pan.x,
        panY: pan.y,
      }
      return
    }

    const point = getWorldPoint(event)
    const snappedPoint = snapToGrid ? snapPointToGrid(point, getGridSpacing(zoom)) : point

    if (activeTool === 'select') {
      const target = [...objects].reverse().find((object) => isPointOnObject(point, object))
      if (target) {
        if (target.locked) {
          setSelectedObjectId(target.id)
          return
        }
        const bounds = getObjectBounds(target)
        const handles = getHandlePositions(bounds)
        const hittingHandle = Object.entries(handles).find(([, handlePoint]) => Math.hypot(handlePoint.x - point.x, handlePoint.y - point.y) <= 10)
        pushSnapshot(objects)
        if (hittingHandle) {
          setInteraction({ mode: 'resize', objectId: target.id, startPoint: point, handle: hittingHandle[0] as ResizeHandle, startObject: target, initialBounds: bounds })
        } else {
          const startObjects = target.groupId ? objects.filter((object) => object.groupId === target.groupId) : [target]
          setInteraction({ mode: 'move', objectId: target.id, startPoint: point, startObject: target, startObjects })
        }
        setSelectedObjectId(target.id)
      } else {
        clearSelection()
      }
      return
    }

    const draft = createBaseObject(snappedPoint)
    setDraftObject(draft)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (panOrigin.current) {
      const deltaX = event.clientX - panOrigin.current.x
      const deltaY = event.clientY - panOrigin.current.y
      setPan(panOrigin.current.panX - deltaX / zoom, panOrigin.current.panY - deltaY / zoom)
      return
    }

    const point = getWorldPoint(event)
    const snappedPoint = snapToGrid ? snapPointToGrid(point, getGridSpacing(zoom)) : point
    const now = performance.now()
    if (now - lastCursorEmit.current > 33) {
      lastCursorEmit.current = now
      emitCursor(roomId, point)
    }

    if (interaction) {
      if (interaction.mode === 'move') {
        const deltaX = snappedPoint.x - interaction.startPoint.x
        const deltaY = snappedPoint.y - interaction.startPoint.y
        ;(interaction.startObjects ?? [interaction.startObject]).forEach((object) => {
          updateObject(object.id, () => moveObject(object, deltaX, deltaY))
        })
      } else if (interaction.initialBounds) {
        updateObject(interaction.objectId, (object) => resizeObject(object, interaction.handle ?? 'br', interaction.startPoint, snappedPoint, interaction.initialBounds!))
      }
      return
    }

    if (!draftObject) {
      return
    }

    if (activeTool === 'pencil') {
      setDraftObject((current) => {
        if (!current || current.type !== 'pencil') {
          return current
        }
        const nextObject = { ...current, points: [...current.points, snappedPoint] }
        emitLiveDraft(nextObject)
        return nextObject
      })
      return
    }

    if (activeTool === 'eraser') {
      const target = objects.find((object) => isPointOnObject(snappedPoint, object))
      if (target) {
        pushSnapshot(objects)
        deleteObject(target.id)
        emitDelete(roomId, target.id)
      }
      setDraftObject((current) => {
        if (!current || current.type !== 'eraser') {
          return current
        }
        const nextObject = { ...current, points: [...current.points, snappedPoint] }
        emitLiveDraft(nextObject)
        return nextObject
      })
      return
    }

    if (activeTool === 'line' || activeTool === 'arrow') {
      setDraftObject((current) => {
        if (!current || (current.type !== 'line' && current.type !== 'arrow')) {
          return current
        }
        const nextObject = { ...current, end: snappedPoint }
        emitLiveDraft(nextObject)
        return nextObject
      })
      return
    }

    if (activeTool === 'rectangle') {
      setDraftObject((current) => {
        if (!current || current.type !== 'rectangle') {
          return current
        }
        const nextObject = { ...current, x: Math.min(current.x, snappedPoint.x), y: Math.min(current.y, snappedPoint.y), width: Math.abs(snappedPoint.x - current.x), height: Math.abs(snappedPoint.y - current.y) }
        emitLiveDraft(nextObject)
        return nextObject
      })
      return
    }

    if (activeTool === 'circle') {
      setDraftObject((current) => {
        if (!current || current.type !== 'circle') {
          return current
        }
        const nextObject = { ...current, radius: Math.max(0, Math.hypot(snappedPoint.x - current.center.x, snappedPoint.y - current.center.y)) }
        emitLiveDraft(nextObject)
        return nextObject
      })
      return
    }

    if (activeTool === 'ellipse') {
      setDraftObject((current) => {
        if (!current || current.type !== 'ellipse') {
          return current
        }
        const nextObject = { ...current, radiusX: Math.max(0, Math.abs(snappedPoint.x - current.center.x)), radiusY: Math.max(0, Math.abs(snappedPoint.y - current.center.y)) }
        emitLiveDraft(nextObject)
        return nextObject
      })
      return
    }
  }

  const handlePointerUp = () => {
    if (panOrigin.current) {
      panOrigin.current = null
      setIsPanning(false)
      return
    }

    if (interaction) {
      const object = useCanvasStore.getState().objects.find((candidate) => candidate.id === interaction.objectId)
      if (object) {
        commitSelectedTransform(object)
      }
      setInteraction(null)
      return
    }

    if (draftObject) {
      finishDraft()
    }
  }

  const handleWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const rect = canvas.getBoundingClientRect()
    const point = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
    const worldPoint = screenToWorld(point, viewport)
    const nextZoom = Math.min(3.2, Math.max(0.35, zoom * (event.deltaY > 0 ? 0.9 : 1.1)))
    const nextPanX = worldPoint.x - (point.x - rect.width / 2) / nextZoom
    const nextPanY = worldPoint.y - (point.y - rect.height / 2) / nextZoom

    setZoom(nextZoom)
    setPan(nextPanX, nextPanY)
  }

  const zoomIn = () => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const rect = canvas.getBoundingClientRect()
    const center = { x: rect.width / 2, y: rect.height / 2 }
    const worldPoint = screenToWorld(center, viewport)
    const nextZoom = Math.min(3.2, zoom + 0.15)
    const nextPanX = worldPoint.x - (center.x - rect.width / 2) / nextZoom
    const nextPanY = worldPoint.y - (center.y - rect.height / 2) / nextZoom

    setZoom(nextZoom)
    setPan(nextPanX, nextPanY)
  }

  const zoomOut = () => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const rect = canvas.getBoundingClientRect()
    const center = { x: rect.width / 2, y: rect.height / 2 }
    const worldPoint = screenToWorld(center, viewport)
    const nextZoom = Math.max(0.35, zoom - 0.15)
    const nextPanX = worldPoint.x - (center.x - rect.width / 2) / nextZoom
    const nextPanY = worldPoint.y - (center.y - rect.height / 2) / nextZoom

    setZoom(nextZoom)
    setPan(nextPanX, nextPanY)
  }

  const resetView = () => {
    resetPan()
    resetZoom()
  }

  const toggleLockSelected = () => {
    if (!selectedObject) {
      return
    }
    commitObjects(objects.map((object) => (selectedObjects.some((candidate) => candidate.id === object.id) ? { ...object, locked: !selectedObject.locked } : object)))
    toast.success(selectedObject.locked ? 'Selection unlocked' : 'Selection locked')
  }

  const groupSelected = () => {
    if (!selectedObject) {
      return
    }
    const groupId = selectedObject.groupId ?? `group-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    commitObjects(objects.map((object) => (object.id === selectedObject.id || object.groupId === selectedObject.groupId ? { ...object, groupId } : object)))
    toast.success('Grouped selection')
  }

  const ungroupSelected = () => {
    if (!selectedObject?.groupId) {
      return
    }
    commitObjects(objects.map((object) => (object.groupId === selectedObject.groupId ? { ...object, groupId: undefined } : object)))
    toast.success('Ungrouped selection')
  }

  const orderSelected = (direction: 'forward' | 'backward') => {
    if (!selectedObjectId) {
      return
    }
    pushSnapshot(objects)
    if (direction === 'forward') {
      bringForward(selectedObjectId)
    } else {
      sendBackward(selectedObjectId)
    }
    emitHistory(roomId, direction === 'forward' ? 'bring-forward' : 'send-backward', { objects: useCanvasStore.getState().objects })
  }

  const handleContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault()
    setContextMenu({ x: event.clientX, y: event.clientY })
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel p-4 pb-20"
    >
      <Toolbar
        activeTool={activeTool}
        selectedObjectId={selectedObjectId}
        strokeColor={strokeColor}
        fillColor={fillColor}
        strokeWidth={strokeWidth}
        opacity={opacity}
        dashStyle={dashStyle}
        onToolChange={setActiveTool}
        onStrokeColorChange={setStrokeColor}
        onFillColorChange={setFillColor}
        onStrokeWidthChange={setStrokeWidth}
        onOpacityChange={setOpacity}
        onDashStyleChange={setDashStyle}
        onDeleteSelected={() => {
          if (selectedObjectId && selectedObjects.some((object) => !object.locked)) {
            pushSnapshot(objects)
            selectedObjects.filter((object) => !object.locked).forEach((object) => {
              deleteObject(object.id)
              emitDelete(roomId, object.id)
            })
            clearSelection()
          }
        }}
        onClearCanvas={() => {
          commitObjects([])
          clearSelection()
        }}
        onExportPNG={() => {
          exportPNG(objects)
          logAnalyticsEvent('canvas.export_png', { roomId, objectCount: objects.length })
        }}
        onExportSVG={() => {
          exportSVG(objects)
          logAnalyticsEvent('canvas.export_svg', { roomId, objectCount: objects.length })
        }}
        onExportJSON={() => {
          exportJSON(objects)
          logAnalyticsEvent('canvas.export_json', { roomId, objectCount: objects.length })
        }}
        onImportJSON={importJSON}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 pt-16">
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <PenTool size={16} className="text-violet-400" />
          <span>Infinite canvas for room {roomId}</span>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-300">
          <Sparkles size={16} className="text-cyan-400" />
          <span>Zoom {zoom.toFixed(2)}× • Space + drag to pan</span>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/80 p-3 text-sm text-slate-300">
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ${isAutosaved ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-800/70 text-slate-300'}`}>
          {isAutosaved ? 'Autosaved' : 'Autosave ready'}
        </span>
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ${useSocketStore.getState().isReconnecting ? 'bg-amber-500/15 text-amber-300' : 'bg-slate-800/70 text-slate-300'}`}>
          {useSocketStore.getState().isReconnecting ? 'Reconnecting' : 'Live sync active'}
        </span>
        <span className="ml-auto text-xs text-slate-400">Shortcuts: Ctrl/Cmd+S export JSON, Ctrl/Cmd+Shift+S export PNG, Ctrl/Cmd+O import JSON, Ctrl/Cmd+D duplicate</span>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/80 p-3">
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <span className="text-violet-400">Active tool:</span>
          <span className="font-medium text-white">{activeTool}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-slate-300">
            <Activity size={14} className="text-emerald-300" />
            {perf.visibleObjects}/{perf.totalObjects} objects • {perf.drawMs.toFixed(1)}ms
          </div>
          <button type="button" onClick={toggleTheme} className="control-surface focus-ring rounded-full p-2">{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}</button>
          <button type="button" onClick={toggleGrid} className="control-surface focus-ring rounded-full px-3 py-2 text-sm">{showGrid ? 'Grid on' : 'Grid off'}</button>
          <button type="button" onClick={toggleSnap} className="control-surface focus-ring rounded-full px-3 py-2 text-sm">{snapToGrid ? 'Snap on' : 'Snap off'}</button>
          <button type="button" onClick={zoomOut} className="control-surface focus-ring rounded-full p-2">−</button>
          <button type="button" onClick={zoomIn} className="control-surface focus-ring rounded-full p-2">+</button>
          <button type="button" onClick={resetView} className="control-surface focus-ring rounded-full p-2">⌂</button>
        </div>
      </div>

      <div className="relative" onContextMenu={handleContextMenu}>
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onWheel={handleWheel}
          className="h-[560px] w-full touch-none rounded-[24px] border border-white/10"
          aria-label="Collaborative drawing canvas"
          style={{ background: 'var(--canvas-bg)', cursor: isPanning ? 'grabbing' : spacePressed ? 'grab' : activeTool === 'select' ? 'default' : 'crosshair' }}
        />
        {remoteCursors.map((participant) => {
          const cursor = participant.cursor as Point
          const screen = worldToScreen(cursor, viewport)
          return (
            <div key={participant.id} className="pointer-events-none absolute left-0 top-0 z-20" style={{ transform: `translate(${screen.x}px, ${screen.y}px)` }}>
              <div className="h-3 w-3 rotate-45 rounded-[2px]" style={{ backgroundColor: participant.color ?? '#38bdf8' }} />
              <div className="mt-1 flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/90 px-2 py-1 text-xs text-white shadow-lg backdrop-blur">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: participant.color ?? '#38bdf8' }} />
                {participant.userName}
                {participant.isTyping ? <span className="text-cyan-300">typing</span> : null}
              </div>
            </div>
          )
        })}
        {!objects.length && !draftObject ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl border border-white/10 bg-slate-950/70 px-5 py-4 text-center text-sm text-slate-300 shadow-xl backdrop-blur">
              <Sparkles className="mx-auto mb-2 text-cyan-300" size={20} />
              Pick a tool and make the first mark.
            </motion.div>
          </div>
        ) : null}
        {remoteCursors.map((participant) => {
          const screen = worldToScreen(participant.cursor!, viewport)
          return (
            <div key={participant.id} className="pointer-events-none absolute left-0 top-0 z-20" style={{ transform: `translate(${screen.x}px, ${screen.y}px)` }}>
              <div className="h-3 w-3 rotate-45" style={{ backgroundColor: participant.color ?? '#38bdf8' }} />
              <div className="mt-1 rounded-md px-2 py-1 text-xs font-medium text-slate-950" style={{ backgroundColor: participant.color ?? '#38bdf8' }}>
                {participant.userName}
              </div>
            </div>
          )
        })}
        {contextMenu ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed z-50 w-52 overflow-hidden rounded-xl border border-white/10 bg-slate-950/95 p-1 text-sm text-slate-200 shadow-2xl backdrop-blur"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            role="menu"
          >
            <button type="button" onClick={duplicateSelected} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-white/10"><Copy size={15} /> Duplicate</button>
            <button type="button" onClick={toggleLockSelected} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-white/10"><Lock size={15} /> {selectedObject?.locked ? 'Unlock' : 'Lock'}</button>
            <button type="button" onClick={groupSelected} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-white/10"><Layers size={15} /> Group</button>
            <button type="button" onClick={() => orderSelected('backward')} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-white/10"><SendToBack size={15} /> Send Backward</button>
          </motion.div>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={duplicateSelected} disabled={!selectedObjectId} className="rounded-full border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10 disabled:opacity-50">Duplicate</button>
        <button type="button" onClick={toggleLockSelected} disabled={!selectedObjectId} className="rounded-full border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10 disabled:opacity-50">{selectedObject?.locked ? 'Unlock' : 'Lock'}</button>
        <button type="button" onClick={groupSelected} disabled={!selectedObjectId} className="rounded-full border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10 disabled:opacity-50">Group</button>
        <button type="button" onClick={ungroupSelected} disabled={!selectedObject?.groupId} className="rounded-full border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10 disabled:opacity-50">Ungroup</button>
        <button type="button" onClick={() => orderSelected('forward')} disabled={!selectedObjectId} className="rounded-full border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10 disabled:opacity-50">Bring Forward</button>
        <button type="button" onClick={() => orderSelected('backward')} disabled={!selectedObjectId} className="rounded-full border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10 disabled:opacity-50">Send Backward</button>
      </div>
    </motion.section>
  )
}

export const CanvasBoard = memo(CanvasBoardComponent)
