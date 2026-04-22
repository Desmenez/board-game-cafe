import type { ExplodingKittensPlayerView } from 'shared';

export function getTurnOrderDockHint(
  gs: ExplodingKittensPlayerView,
  myId: string,
): string | null {
  if (gs.phase === 'reaction' && gs.pendingAction) {
    return 'ตาปัจจุบันไฮไลต์ — ใช้ดูว่าใครถึงตาถัดไปหลังแอ็กชันนี้สำเร็จ';
  }
  if (gs.phase === 'barking_kitten_show') {
    return 'ลำดับโต๊ะ — หลังทุกคนรับทราบจะคำนวณเอฟเฟ็กต์ Barking';
  }
  if (gs.phase === 'barking_exchange') {
    return 'Barking — เป้าหมายมอบครึ่งมือ แล้วผู้เล่นคืนจำนวนเท่ากัน';
  }
  if (gs.phase === 'defuse_prompt' && gs.defusePrompt?.playerId === myId) {
    return 'ลำดับนั่งโต๊ะ — นึกภาพว่าใครจั่วถัดจากคุณหลังวางระเบิด';
  }
  if (gs.phase === 'defuse_reinsert' && gs.defusePrompt?.playerId === myId) {
    return 'เทียบลำดับว่าใครจั่วถัดจากคุณ — ช่วยตัดสินใจว่าใส่บนหรือล่างกองให้ถึงใครก่อน';
  }
  return null;
}
