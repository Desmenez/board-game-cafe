import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { HomePage } from './pages/HomePage';
import { GamesCatalogPage } from './pages/GamesCatalogPage';
import { RoomPage } from './pages/RoomPage';
import { AdminPage } from './pages/AdminPage';
import { useSocket } from './hooks/useSocket';
import './index.css';
import './components/ui/ui.css';

function App() {
  const socketState = useSocket();

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        containerStyle={{ top: 14, right: 14 }}
        toastOptions={{
          duration: 3000,
          style: {
            fontFamily: 'inherit',
            background: 'color-mix(in srgb, var(--bg-secondary) 92%, transparent)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            padding: '14px 16px',
            fontSize: '0.9375rem',
            maxWidth: 'min(360px, calc(100vw - 28px))',
          },
          success: {
            style: {
              background: 'var(--success-bg)',
              color: '#d1fae5',
              border: '1px solid rgba(34, 197, 94, 0.4)',
              boxShadow:
                'var(--shadow-lg), 0 0 28px color-mix(in srgb, var(--success) 18%, transparent)',
            },
            iconTheme: {
              primary: 'var(--success)',
              secondary: 'rgba(10, 10, 15, 0.92)',
            },
          },
          error: {
            style: {
              background: 'var(--danger-bg)',
              color: 'var(--danger)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              boxShadow:
                'var(--shadow-lg), 0 0 24px color-mix(in srgb, var(--danger) 15%, transparent)',
            },
            iconTheme: {
              primary: 'var(--danger)',
              secondary: 'rgba(10, 10, 15, 0.92)',
            },
          },
          loading: {
            style: {
              border: '1px solid var(--border-accent)',
            },
            iconTheme: {
              primary: 'var(--accent)',
              secondary: 'rgba(10, 10, 15, 0.88)',
            },
          },
        }}
      />

      {/* Connection status */}
      <div className="status-bar">
        <span className={`status-dot ${socketState.connected ? '' : 'disconnected'}`} />
        {socketState.connected ? 'เชื่อมต่อแล้ว' : 'กำลังเชื่อมต่อ...'}
      </div>

      <Routes>
        <Route path="/" element={<HomePage socket={socketState} />} />
        <Route path="/games" element={<GamesCatalogPage socket={socketState} />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/room/:code" element={<RoomPage socket={socketState} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
