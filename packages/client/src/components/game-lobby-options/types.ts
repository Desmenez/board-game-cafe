export interface LobbyOptionsProps {
  /** หัวห้องแก้ไขได้; คนอื่นเห็นแบบอ่านอย่างเดียว */
  isHost: boolean;
  onChange: (options?: unknown) => void;
  /** จำนวนผู้เล่นในห้อง (ใช้ปิดตัวเลือกที่ต้องการคนเยอะ เช่น Lancelot 8+) */
  playerCount?: number;
  /** ค่าจากเซิร์ฟเวอร์ (room.lobbyOptions) — ทุกคนเห็นตรงกัน */
  lobbyOptions?: unknown;
}
