import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { HomePage } from './pages/HomePage';
import { RoomPage } from './pages/RoomPage';
import { useSocket } from './hooks/useSocket';
import './index.css';
import './components/ui/ui.css';

function App() {
  const socketState = useSocket();

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          // error: {
          //   style: {
          //     background: 'var(--danger-bg)',
          //     color: 'var(--danger)',
          //     border: '1px solid rgba(239, 68, 68, 0.35)',
          //     boxShadow: 'var(--shadow-md, 0 8px 24px rgb(0 0 0 / 0.12))',
          //   },
          // },
        }}
      />

      {/* Connection status */}
      <div className="status-bar">
        <span className={`status-dot ${socketState.connected ? '' : 'disconnected'}`} />
        {socketState.connected ? 'เชื่อมต่อแล้ว' : 'กำลังเชื่อมต่อ...'}
      </div>

      <Routes>
        <Route path="/" element={<HomePage socket={socketState} />} />
        <Route path="/room/:code" element={<RoomPage socket={socketState} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
