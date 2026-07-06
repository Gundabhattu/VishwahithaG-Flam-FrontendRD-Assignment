import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { CanvasPage } from '@/pages/CanvasPage'
import { LandingPage } from '@/pages/LandingPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { RoomRedirectPage } from '@/pages/RoomRedirectPage'
import { useUIStore } from '@/store/uiStore'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'

function App() {
  const theme = useUIStore((state) => state.theme)

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <div className={`min-h-screen ${theme === 'dark' ? 'theme-dark bg-slate-950 text-slate-50' : 'theme-light bg-slate-100 text-slate-950'}`}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/room/:roomId" element={<RoomRedirectPage />} />
            <Route path="/canvas/:roomId?" element={<CanvasPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: theme === 'dark' ? '#111827' : '#ffffff',
                color: theme === 'dark' ? '#fff' : '#0f172a',
                border: '1px solid rgba(148,163,184,0.35)',
                boxShadow: '0 18px 60px rgba(15,23,42,0.22)',
              },
            }}
          />
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
