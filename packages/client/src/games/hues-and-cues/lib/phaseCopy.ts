import type { HuesAndCuesPlayerView } from 'shared';

/** Short header line — round + what you should do (or who the cue giver is). */
export function headerSubtitle(gs: HuesAndCuesPlayerView): string {
  if (gs.phase === 'game_over') return 'เกมจบแล้ว';
  const round = `รอบ ${gs.roundIndex + 1}/${gs.totalRounds}`;
  const cue = gs.playerNames[gs.cueGiverId] ?? gs.cueGiverId;

  switch (gs.subPhase) {
    case 'pick_target':
      return gs.amCueGiver ? `${round} · เลือกสีจากบัตร` : `${round} · รอ ${cue} เลือกสี`;
    case 'clue1':
      return gs.amCueGiver ? `${round} · ส่งคำใบ้แรก` : `${round} · รอ ${cue}`;
    case 'guess1':
      return gs.amCueGiver ? `${round} · รอผู้ทาย` : `${round} · วางมาร์กเกอร์รอบ 1`;
    case 'clue2':
      return gs.amCueGiver ? `${round} · ส่งคำใบ้ที่ 2 (หรือข้าม)` : `${round} · รอ ${cue}`;
    case 'guess2':
      return gs.amCueGiver ? `${round} · รอผู้ทาย` : `${round} · วางมาร์กเกอร์รอบ 2`;
    case 'reveal':
      return `${round} · เฉลย`;
    default:
      return `${round} · ผู้ใบ้: ${cue}`;
  }
}

export function clue2Placehold(gs: HuesAndCuesPlayerView): string {
  if (gs.clue2 === '-') return 'ข้าม';
  if (gs.clue2) return gs.clue2;
  if (gs.subPhase === 'clue2') return gs.amCueGiver ? 'พิมพ์ด้านล่าง' : 'รอผู้ใบ้พิมพ์…';
  if (gs.subPhase === 'guess2' || gs.subPhase === 'reveal') return '—';
  return 'หลังทายรอบ 1 ครบ';
}

export function formatRevealPts(v: number | undefined): string {
  if (v === undefined) return '—';
  return v === 0 ? '0' : `+${v}`;
}
