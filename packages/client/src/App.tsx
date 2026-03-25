import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { RoomPage } from './pages/RoomPage';
import { useSocket } from './hooks/useSocket';
import './index.css';

function App() {
  const socketState = useSocket();

  return (
    <BrowserRouter>
      {/* Connection status */}
      <div className="status-bar">
        <span className={`status-dot ${socketState.connected ? '' : 'disconnected'}`} />
        {socketState.connected ? 'เชื่อมต่อแล้ว' : 'กำลังเชื่อมต่อ...'}
      </div>

      {/* Error toast */}
      {socketState.error && (
        <div className="toast" onClick={socketState.clearError}>
          {socketState.error}
        </div>
      )}

      <Routes>
        <Route path="/" element={<HomePage socket={socketState} />} />
        <Route path="/room/:code" element={<RoomPage socket={socketState} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
