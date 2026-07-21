import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { HomePage } from './pages/HomePage';
import { GamesCatalogPage } from './pages/GamesCatalogPage';
import { RoomPage } from './pages/RoomPage';
import { AdminPage } from './pages/AdminPage';
import { PlayerHandDemoPage } from './pages/PlayerHandDemoPage';
import { CamelUpTrackDemoPage } from './pages/CamelUpTrackDemoPage';
import { PlayerAvatarPreviewPage } from './pages/PlayerAvatarPreviewPage';
import { useSocket } from './hooks/useSocket';
import { PlayerAvatarProvider } from './components/player-avatar';
import { AuthProvider } from './auth/AuthProvider';
import { ProfilePage } from './pages/ProfilePage';
import { HistoryPage } from './pages/HistoryPage';
import { FriendsPage } from './pages/FriendsPage';
import './index.css';
import './components/ui/ui.css';
import './pages/home-night.css';

function App() {
  const socketState = useSocket();

  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          containerStyle={{ top: 14, right: 14 }}
          toastOptions={{
            duration: 3000,
            className: 'night-toast',
            success: {
              className: 'night-toast night-toast--success',
              iconTheme: {
                primary: 'var(--color-success)',
                secondary: 'var(--color-paper)',
              },
            },
            error: {
              className: 'night-toast night-toast--error',
              iconTheme: {
                primary: 'var(--color-error)',
                secondary: 'var(--color-paper)',
              },
            },
            loading: {
              className: 'night-toast night-toast--loading',
              iconTheme: {
                primary: 'var(--color-pear)',
                secondary: 'var(--color-paper)',
              },
            },
          }}
        />

        {/* Connection status */}
        <div className="status-bar">
          <span className={`status-dot ${socketState.connected ? '' : 'disconnected'}`} />
          {socketState.connected ? 'เชื่อมต่อแล้ว' : 'กำลังเชื่อมต่อ...'}
        </div>

        <PlayerAvatarProvider players={socketState.room?.players}>
          <Routes>
            <Route path="/" element={<HomePage socket={socketState} />} />
            <Route path="/games" element={<GamesCatalogPage socket={socketState} />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/friends" element={<FriendsPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/room/:code" element={<RoomPage socket={socketState} />} />
            {import.meta.env.DEV ? (
              <>
                <Route path="/dev/player-hand" element={<PlayerHandDemoPage />} />
                <Route path="/dev/camel-up-track" element={<CamelUpTrackDemoPage />} />
                <Route path="/dev/player-avatar" element={<PlayerAvatarPreviewPage />} />
              </>
            ) : null}
          </Routes>
        </PlayerAvatarProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
