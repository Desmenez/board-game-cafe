/**
 * ข้อความที่เกมตั้งใจปฏิเสธแอ็กชัน (กดผิด / หมดเวลา / ไม่ถึงตา ฯลฯ)
 * — ไม่ควร log ระดับ error ในซ็อกเก็ตเหมือนบั๊กเซิร์ฟเวอร์
 */
export class GameActionRejectedError extends Error {
  override readonly name = 'GameActionRejectedError';
  constructor(message: string) {
    super(message);
  }
}
