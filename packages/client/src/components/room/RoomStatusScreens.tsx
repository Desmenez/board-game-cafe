import { useNavigate } from 'react-router-dom';
import { Button } from '../ui';
import { clearStoredRoomSession, normalizeRoomCode } from '../../utils/playerToken';
import { RoomWaitingIndicator } from './RoomWaitingIndicator';

export function RoomKickedScreen({
  message,
  code,
  onDismiss,
}: {
  message: string;
  code: string | undefined;
  onDismiss: () => void;
}) {
  const navigate = useNavigate();

  return (
    <div className="page app-night-page room-state-page grid min-h-svh place-items-center p-6 text-center">
      <div
        className="modal-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="kick-modal-title"
      >
        <div className="modal">
          <h2 id="kick-modal-title">ถูกเตะออกจากห้อง</h2>
          <p>{message}</p>
          <Button
            block
            type="button"
            onClick={() => {
              if (code) clearStoredRoomSession(normalizeRoomCode(code));
              onDismiss();
              navigate('/');
            }}
          >
            กลับหน้าหลัก
          </Button>
        </div>
      </div>
    </div>
  );
}

export function RoomConnectingScreen({ switching }: { switching: boolean }) {
  return (
    <div className="page app-night-page room-state-page grid min-h-svh place-content-center gap-6 p-6 text-center">
      <RoomWaitingIndicator message={switching ? 'กำลังเปลี่ยนห้อง...' : 'กำลังเชื่อมต่อห้อง...'} />
    </div>
  );
}

export function RoomSyncingGameScreen() {
  return (
    <div className="page app-night-page room-state-page grid min-h-svh place-content-center gap-6 p-6 text-center">
      <RoomWaitingIndicator message="กำลังโหลดเกม..." />
    </div>
  );
}

export function RoomGameLoadFailedScreen({ onLeave }: { onLeave: () => void }) {
  return (
    <div className="page app-night-page room-state-page grid min-h-svh place-content-center gap-6 p-6 text-center">
      <p className="mb-6 text-ink-2">โหลดเกมนี้ไม่สำเร็จ</p>
      <Button type="button" onClick={onLeave}>
        ออกจากห้อง
      </Button>
    </div>
  );
}
