import { memo } from 'react'
import { Delete, Download, FileJson, Image, Layers3, PanelRightClose, Upload } from 'lucide-react'
import { ArrowToolButton } from '@/components/tools/ArrowToolButton'
import { CircleToolButton } from '@/components/tools/CircleToolButton'
import { EllipseToolButton } from '@/components/tools/EllipseToolButton'
import { EraserToolButton } from '@/components/tools/EraserToolButton'
import { LineToolButton } from '@/components/tools/LineToolButton'
import { PencilToolButton } from '@/components/tools/PencilToolButton'
import { RectangleToolButton } from '@/components/tools/RectangleToolButton'
import { SelectionToolButton } from '@/components/tools/SelectionToolButton'
import { TextToolButton } from '@/components/tools/TextToolButton'
import type { DashStyle, ToolType } from '@/types'

interface ToolbarProps {
  activeTool: ToolType
  selectedObjectId: string | null
  strokeColor: string
  fillColor: string
  strokeWidth: number
  opacity: number
  dashStyle: DashStyle
  onToolChange: (tool: ToolType) => void
  onStrokeColorChange: (color: string) => void
  onFillColorChange: (color: string) => void
  onStrokeWidthChange: (width: number) => void
  onOpacityChange: (opacity: number) => void
  onDashStyleChange: (dashStyle: DashStyle) => void
  onDeleteSelected: () => void
  onClearCanvas: () => void
  onExportPNG: () => void
  onExportSVG: () => void
  onExportJSON: () => void
  onImportJSON: (file: File) => void
}

const TOOL_COLORS = ['#8b5cf6', '#34d399', '#f59e0b', '#f43f5e', '#38bdf8', '#ffffff']
const DASH_STYLES: DashStyle[] = ['solid', 'dashed', 'dotted']

const ToolbarComponent = ({
  activeTool,
  selectedObjectId,
  strokeColor,
  fillColor,
  strokeWidth,
  opacity,
  dashStyle,
  onToolChange,
  onStrokeColorChange,
  onFillColorChange,
  onStrokeWidthChange,
  onOpacityChange,
  onDashStyleChange,
  onDeleteSelected,
  onClearCanvas,
  onExportPNG,
  onExportSVG,
  onExportJSON,
  onImportJSON,
}: ToolbarProps) => {
  return (
    <div className="fixed left-1/2 top-4 z-30 w-[min(96vw,1100px)] -translate-x-1/2 glass-panel p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SelectionToolButton active={activeTool === 'select'} onClick={() => onToolChange('select')} />
          <PencilToolButton active={activeTool === 'pencil'} onClick={() => onToolChange('pencil')} />
          <LineToolButton active={activeTool === 'line'} onClick={() => onToolChange('line')} />
          <RectangleToolButton active={activeTool === 'rectangle'} onClick={() => onToolChange('rectangle')} />
          <CircleToolButton active={activeTool === 'circle'} onClick={() => onToolChange('circle')} />
          <EllipseToolButton active={activeTool === 'ellipse'} onClick={() => onToolChange('ellipse')} />
          <ArrowToolButton active={activeTool === 'arrow'} onClick={() => onToolChange('arrow')} />
          <TextToolButton active={activeTool === 'text'} onClick={() => onToolChange('text')} />
          <EraserToolButton active={activeTool === 'eraser'} onClick={() => onToolChange('eraser')} />
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-300">
            <span>Stroke</span>
            <input type="color" value={strokeColor} onChange={(event) => onStrokeColorChange(event.target.value)} />
          </label>
          <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-300">
            <span>Fill</span>
            <input type="color" value={fillColor} onChange={(event) => onFillColorChange(event.target.value)} />
          </label>

          <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-300">
            <span>Width</span>
            <input type="range" min="1" max="24" value={strokeWidth} onChange={(event) => onStrokeWidthChange(Number(event.target.value))} className="accent-violet-500" />
          </label>

          <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-300">
            <span>Opacity</span>
            <input type="range" min="0.2" max="1" step="0.1" value={opacity} onChange={(event) => onOpacityChange(Number(event.target.value))} className="accent-cyan-500" />
          </label>

          <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-300">
            <span>Style</span>
            <select value={dashStyle} onChange={(event) => onDashStyleChange(event.target.value as DashStyle)} className="bg-transparent text-sm outline-none">
              {DASH_STYLES.map((style) => (
                <option key={style} value={style} className="bg-slate-950 text-slate-100">
                  {style}
                </option>
              ))}
            </select>
          </label>

          <div className="flex gap-2">
            {TOOL_COLORS.map((color) => (
              <button key={color} type="button" onClick={() => onStrokeColorChange(color)} className="h-6 w-6 rounded-full border border-white/20" style={{ backgroundColor: color }} />
            ))}
          </div>

          <button type="button" aria-label="Delete selected object" onClick={onDeleteSelected} disabled={!selectedObjectId} className="control-surface focus-ring p-2 disabled:cursor-not-allowed disabled:opacity-50">
            <Delete size={16} />
          </button>
          <button type="button" aria-label="Export PNG" onClick={onExportPNG} className="control-surface focus-ring p-2">
            <Image size={16} />
          </button>
          <button type="button" aria-label="Export SVG" onClick={onExportSVG} className="control-surface focus-ring p-2">
            <Download size={16} />
          </button>
          <button type="button" aria-label="Export JSON" onClick={onExportJSON} className="control-surface focus-ring p-2">
            <FileJson size={16} />
          </button>
          <label className="control-surface focus-ring cursor-pointer p-2" aria-label="Import JSON" title="Import JSON">
            <Upload size={16} />
            <input type="file" accept="application/json,.json" className="sr-only" onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) {
                onImportJSON(file)
                event.target.value = ''
              }
            }} />
          </label>
          <button type="button" aria-label="Clear canvas" onClick={onClearCanvas} className="control-surface focus-ring p-2">
            <Layers3 size={16} />
          </button>
          <button type="button" aria-label="Toggle side panel" className="control-surface focus-ring p-2">
            <PanelRightClose size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

export const Toolbar = memo(ToolbarComponent)
