export interface LobbyOptionsProps {
  onChange: (options?: unknown) => void;
  /** จำนวนผู้เล่นในห้อง (ใช้ปิดตัวเลือกที่ต้องการคนเยอะ เช่น Lancelot 8+) */
  playerCount?: number;
}
