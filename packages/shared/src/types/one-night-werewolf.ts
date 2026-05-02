// ============================================================
// One Night Ultimate Werewolf (ดัดแปลงเล่นออนไลน์ — เวอร์ชันเบื้องต้น)
// ============================================================

/** Cloudinary folder สำหรับการ์ดเกมนี้ */
export const ONUW_CLOUD_VERSION = 'v1777643831';

/** เวลาทำแอ็กชันแต่ละขั้นกลางคืน (มิลลิวินาที) — ขั้นที่ไม่มีผู้เล่นก็จับเวลาเท่ากันเพื่อไม่ให้ล่วงรู้ */
export const ONUW_NIGHT_STEP_MS = 10_000;

/** เฟสโหวต — ถ้าครบกำหนดแล้วยังมีคนไม่ยืนยันโหวต เกมจบแบบทุกคนแพ้ */
export const ONUW_VOTE_PHASE_MS = 10 * 60 * 1000;

/** เปิดการ์ดผู้ถูกโหวต — ระยะพลิกแต่ละใบ (client CSS/motion ควรตรงกับค่านี้) */
export const ONUW_VOTE_ELIMINATION_FLIP_MS = 600;

/** เปิดการ์ดผู้ถูกโหวต — ห่างกันระหว่างเริ่มพลิกแต่ละใบ */
export const ONUW_VOTE_ELIMINATION_FLIP_STAGGER_MS = 250;

/** เปิดการ์ดผู้ถูกโหวต — ค้างหน้าเปิดหลังพลิกครบทุกใบ ก่อนไป Hunter / สรุปผล */
export const ONUW_VOTE_ELIMINATION_HOLD_MS = 3000;

/** ระยะเวลารวมเฟสเปิดการ์ดผู้ถูกโหวต (ซิงก์กับเซิร์ฟเวอร์) */
export function onuwVoteEliminationRevealPhaseDurationMs(eliminatedCount: number): number {
  if (eliminatedCount <= 0) return 0;
  const lastFlipStart = (eliminatedCount - 1) * ONUW_VOTE_ELIMINATION_FLIP_STAGGER_MS;
  return lastFlipStart + ONUW_VOTE_ELIMINATION_FLIP_MS + ONUW_VOTE_ELIMINATION_HOLD_MS;
}

export type OnuwRole =
  | 'werewolf'
  | 'doppelganger'
  | 'minion'
  | 'mason'
  | 'seer'
  | 'robber'
  | 'troublemaker'
  | 'drunk'
  | 'insomniac'
  | 'hunter'
  | 'tanner'
  | 'villager';

/** การ์ดที่ใส่ในกล่อง — แต่ละใบมี art key ไม่ซ้ำกัน */
export interface OnuwScriptCard {
  role: OnuwRole;
  /** suffix หลัง `${ONUW_CLOUD_VERSION}/` */
  artKey: string;
}

/**
 * ชุดการ์ดตามที่กำหนด (16 ใบ)
 * werewolf ×2, mason ×2, villager ×3 และบทบาทพิเศษอื่นๆ
 */
export const ONUW_SCRIPT_CARDS: readonly OnuwScriptCard[] = [
  { role: 'werewolf', artKey: 'werewolf_ugaaau' },
  { role: 'werewolf', artKey: 'werewolf-2_g19olp' },
  { role: 'doppelganger', artKey: 'doppelganger_dsknkq' },
  { role: 'minion', artKey: 'minion_jyof3i' },
  { role: 'mason', artKey: 'mason_potm8b' },
  { role: 'mason', artKey: 'mason_potm8b' },
  { role: 'seer', artKey: 'seer_ghtgei' },
  { role: 'robber', artKey: 'robber_br4gac' },
  { role: 'troublemaker', artKey: 'troublemaker_w2vjrv' },
  { role: 'drunk', artKey: 'drunk_ydgygw' },
  { role: 'insomniac', artKey: 'insomniac_v4wnjb' },
  { role: 'hunter', artKey: 'hunter_afo3vj' },
  { role: 'tanner', artKey: 'tanner_gfsans' },
  { role: 'villager', artKey: 'villager_rbodnt' },
  { role: 'villager', artKey: 'villager_rbodnt' },
  { role: 'villager', artKey: 'villager_rbodnt' },
] as const;

export type OnuwPhase =
  | 'composition'
  | 'role_reveal'
  | 'night'
  | 'day'
  | 'vote'
  | 'vote_elimination_reveal'
  | 'hunter_shot'
  | 'hunter_reveal'
  | 'game_over';

export type OnuwNightStepKind =
  | 'doppelganger'
  | 'werewolf'
  | 'minion'
  | 'mason'
  | 'seer'
  | 'robber'
  | 'troublemaker'
  | 'drunk'
  | 'insomniac';

/** บทที่ไม่มีขั้นตื่นกลางคืน — ใช้เรียงการ์ดใน composition / กลางวัน */
const ONUW_ROLES_COMPOSITION_PASSIVE: ReadonlySet<OnuwRole> = new Set(['villager', 'hunter', 'tanner']);

/** ลำดับแอ็กชันคืนสำหรับเรียงการ์ดบนโต๊ะ (ให้ตรงกับ UI ลูกค้า) */
const ONUW_COMPOSITION_NIGHT_PRIORITY: readonly OnuwNightStepKind[] = [
  'doppelganger',
  'werewolf',
  'minion',
  'mason',
  'seer',
  'robber',
  'troublemaker',
  'drunk',
  'insomniac',
] as const;

function onuwCompositionSortIndex(role: OnuwRole): number {
  const i = ONUW_COMPOSITION_NIGHT_PRIORITY.indexOf(role as OnuwNightStepKind);
  return i === -1 ? 999 : i;
}

/**
 * ช่องการ์ดในชุดเกม เรียงเหมือนหน้า composition — `slotKey` ใช้ซิงก์การเลือก “มั่นใจบทนี้” ระหว่างกลางวัน/โหวต
 */
export function onuwOrderedCompositionSlots(
  rolesInPlay: { role: OnuwRole; count: number; artKeys: string[] }[],
): { slotKey: string; role: OnuwRole; artKey: string }[] {
  const raw: { slotKey: string; role: OnuwRole; artKey: string }[] = [];
  for (const row of rolesInPlay) {
    for (let i = 0; i < row.count; i += 1) {
      const artKey = row.artKeys[i] ?? row.artKeys[0] ?? '';
      raw.push({
        role: row.role,
        artKey,
        slotKey: `${row.role}-${i}-${artKey}`,
      });
    }
  }
  return [...raw].sort((a, b) => {
    const ap = ONUW_ROLES_COMPOSITION_PASSIVE.has(a.role);
    const bp = ONUW_ROLES_COMPOSITION_PASSIVE.has(b.role);
    if (ap !== bp) return ap ? 1 : -1;
    return onuwCompositionSortIndex(a.role) - onuwCompositionSortIndex(b.role);
  });
}

export function onuwValidCompositionSlotKeys(
  rolesInPlay: { role: OnuwRole; count: number; artKeys: string[] }[],
): Set<string> {
  return new Set(onuwOrderedCompositionSlots(rolesInPlay).map((s) => s.slotKey));
}

export interface OnuwNightStep {
  kind: OnuwNightStepKind;
  /** ผู้เล่นที่ต้องทำแอ็กชันในขั้นนี้ — ยึดบทเริ่มคืน (รวม Doppel สวมบท) ไม่สลับตามการ์ดที่เคลื่อนทีหลัง */
  actorIds: string[];
}

/** ลำดับขั้นคืนที่แสดงให้ผู้เล่น — เฉพาะชนิดขั้น (ห้ามส่ง/แสดง meta ว่ามีผู้เล่นในบทหรือไม่) */
export interface OnuwNightStepDisplay {
  kind: OnuwNightStepKind;
}

export type OnuwTeam = 'werewolf_team' | 'village_team';

export function onuwTeamForRole(role: OnuwRole): OnuwTeam {
  if (role === 'werewolf' || role === 'minion') return 'werewolf_team';
  return 'village_team';
}

export type OnuwAction =
  | { type: 'acknowledge_composition' }
  | { type: 'acknowledge_role' }
  | { type: 'night_ack' }
  | { type: 'night_doppel_peek'; targetId: string }
  | { type: 'night_wolf_peek_center'; centerIndex: 0 | 1 | 2 }
  | { type: 'night_seer_peek_player'; targetId: string }
  | { type: 'night_seer_peek_center'; indexA: 0 | 1 | 2; indexB: 0 | 1 | 2 }
  | { type: 'night_robber_swap'; targetId: string }
  | { type: 'night_troublemaker_swap'; playerAId: string; playerBId: string }
  | { type: 'night_drunk_take_center'; centerIndex: 0 | 1 | 2 }
  /** ช่วงกลางวัน/โหวต — เลือกการ์ดบทที่มั่นใจ (คนทั้งห้องเห็น); slotKey null = ยกเลิก */
  | { type: 'day_role_confidence'; slotKey: string | null }
  | { type: 'vote'; targetId: string }
  /** โหวตว่าไม่โหวตใคร — นับเป็นผู้ยืนยันรอบโหวตแล้ว */
  | { type: 'vote_abstain' }
  | { type: 'hunter_shoot'; targetId: string }
  | { type: 'acknowledge_hunter_reveal' };

export interface OnuwPlayerView {
  phase: OnuwPhase;
  players: { id: string; name: string }[];
  /** สรุปการ์ดที่ใช้ในเกมนี้ (จำนวนตามที่แจก — ไม่บอกว่าใครถืออะไร) */
  rolesInPlay: { role: OnuwRole; count: number; artKeys: string[] }[];
  compositionAckProgress: { current: number; total: number } | null;
  /** เฟส composition — รับทราบการ์ดในเกมแล้ว */
  hasAcknowledgedComposition: boolean;
  /** เฟส role_reveal */
  roleRevealProgress: { current: number; total: number } | null;
  hasAcknowledgedRole: boolean;
  myRole: OnuwRole | null;
  myRoleArtKey: string | null;
  /** คำอธิบายบทบาท (ภาษาไทย) */
  myRoleDescriptionTh: string | null;
  /** กลางคืน — ขั้นปัจจุบัน */
  nightStepIndex: number | null;
  /** ลำดับขั้นคืนนี้ — ครบทุกบทที่มีในการ์ด 6 ใบของเกม (เรียงตามลำดับมาตรฐาน) */
  nightSteps: OnuwNightStepDisplay[] | null;
  /** เวลาที่ขั้นกลางคืนปัจจุบันหมดอายุ (Unix ms) — client ใช้นับถอยหลัง */
  nightStepEndsAtMs: number | null;
  currentNightKind: OnuwNightStepKind | null;
  /**
   * เฉพาะคุณ — ถ้ามี `[yourId]` แปลว่าตอนนี้ถึงคิวคุณให้ทำแอ็กชัน
   * (ไม่ส่ง id ผู้อื่นในขั้นเดียวกัน)
   */
  nightActors: string[] | null;
  /** ขั้นมนุษย์หมาป่า: true = มีหลายคนตื่นพร้อมกัน (ยืนยันทีม), false = โดดเดี่ยวดูกลาง — null = ไม่ใช่ขั้นหมาป่า */
  nightWolfIsPack: boolean | null;
  /** ข้อความช่วยเหลือ / สถานะกลางคืน */
  nightPromptTh: string | null;
  /** ข้อมูลที่เห็นได้เฉพาะคุณจากกลางคืน */
  nightSecretView: OnuwNightSecretView | null;
  /** วัน — พร้อมโหวต */
  dayReadyProgress: { current: number; total: number } | null;
  voteProgress: { current: number; total: number } | null;
  /** เฟสโหวต — เวลาสุดท้ายที่ทุกคนต้องยืนยันโหวต (Unix ms) */
  votePhaseEndsAtMs: number | null;
  /** เฟสเปิดการ์ดผู้ถูกโหวต — เวลาที่จะไป Hunter / สรุปผล (Unix ms) */
  voteEliminationRevealEndsAtMs: number | null;
  /** เฟสโหวต — ใครโหวตแล้ว / ยังไม่โหวต (ไม่เปิดเผยว่าโหวตใคร) */
  voteParticipantStatus: { playerId: string; name: string; hasVoted: boolean }[] | null;
  /** เฟสโหวต — เป้าหมายที่คุณโหวตแล้ว (เฉพาะคุณ) */
  myVoteTargetId: string | null;
  /** เฟสโหวต — ยืนยันไม่โหวตใครแล้ว */
  myVoteAbstained: boolean;
  /** กลางวัน/โหวต — ช่องการ์ดที่คุณเลือกว่ามั่นใจ (ซิงก์จากเซิร์ฟเวอร์) */
  myRoleConfidenceSlotKey: string | null;
  /** กลางวัน/โหวต — ใครเลือกช่องไหนบ้าง (ทุกคนเห็นเหมือนกัน) */
  roleConfidenceSlots: { slotKey: string; pickers: { playerId: string; name: string }[] }[] | null;
  /** Hunter ถูกโหวตออก — เลือกยิงผู้เล่นที่ยังไม่ถูกโหวต (ในเดคมีการ์ด Hunter แค่ใบเดียว) */
  hunterMustShoot: boolean;
  /** ระหว่าง hunter_shot — รายชื่อ Hunter ที่ยังต้องยิง (ยังมีชื่อคุณอยู่ = ถึงคุณเลือกยิง) */
  hunterPendingShooterIds: string[] | null;
  /** ระหว่าง hunter_shot — ห้ามเลือก: ผู้ถูกโหวต + ผู้ถูกยิงแล้วในรอบนี้ */
  hunterExcludedTargetIds: string[] | null;
  /** หลัง Hunter เลือกยิง — เปิดการ์ดของเป้าหมายให้ทุกคนเห็นก่อนสรุปผล / ก่อน Hunter คนถัดไป */
  hunterRevealCard: { playerId: string; role: OnuwRole; artKey: string } | null;
  hunterRevealAckProgress: { current: number; total: number } | null;
  hasAcknowledgedHunterReveal: boolean;
  /** หลังโหวตหลัก — เปิดการ์ดผู้ถูกโหวต (อาจหลายคนถ้าคะแนนสูงสุดเสมอกันหลายคน) */
  revealEliminations: { playerId: string; role: OnuwRole; artKey: string }[];
  /** หลังจบเกม — ผู้ถูก Hunter ยิง (นับรวมในผลชนะแพ้) */
  hunterShotReveals: { playerId: string; role: OnuwRole; artKey: string }[];
  /**
   * เฟส game_over — บทหน้าที่นั่งแต่ละคน ณ หลังจบคืน (สำหรับโชว์สรุป — เท่ากับการ์ดตอนกลางวันก่อนโหวต)
   */
  morningRoster: { playerId: string; name: string; role: OnuwRole; artKey: string }[] | null;
  gameResult: { winners: string[]; reason: string } | null;
  lastEvent: string;
}

/** ข้อมูลลับตามบทบาท — ส่งเฉพาะเมื่อเป็นผู้ได้รับผล */
export type OnuwNightSecretView =
  /** sawRole / sawArtKey = การ์ดของเป้าหมายตอนเริ่มคืน — Doppel สวมบทบาทนั้นตลอดคืนนี้ */
  | { kind: 'doppel_peek'; targetName: string; sawRole: OnuwRole; sawArtKey: string }
  | { kind: 'wolf_pack'; teammateNames: string[] }
  | { kind: 'wolf_solo'; centerIndex: 0 | 1 | 2; sawRole: OnuwRole; sawArtKey: string }
  | { kind: 'minion_peek'; werewolfNames: string[] }
  | { kind: 'mason_peek'; masonNames: string[] }
  | { kind: 'seer_player'; targetName: string; sawRole: OnuwRole; sawArtKey: string }
  | { kind: 'seer_center'; roles: [OnuwRole, OnuwRole]; artKeys: [string, string] }
  | { kind: 'robber_swap'; tookFromName: string; newRole: OnuwRole; newRoleArtKey: string }
  | { kind: 'troublemaker_done'; swappedNames: [string, string] }
  | { kind: 'drunk_done'; noteTh: string }
  | {
      kind: 'insomniac';
      startedAs: OnuwRole;
      endedAs: OnuwRole;
      startedArtKey: string;
      endedArtKey: string;
    };

/** คำอธิบายบทบาทสั้นๆ (ไทย) */
export const ONUW_ROLE_DESCRIPTION_TH: Record<OnuwRole, string> = {
  werewolf:
    'ฝ่ายมนุษย์หมาป่า — กลางคืนรู้ว่าใครเป็นมนุษย์หมาป่าด้วยกัน (ถ้ามีหลายคน) หรือดูการ์ดกลางหนึ่งใบถ้าอยู่คนเดียว — เป้าคือไม่ให้ใครจับมนุษย์หมาป่าได้',
  doppelganger:
    'ตื่นก่อนใคร — เลือกผู้เล่นหนึ่งคนแล้วดูการ์ดของเขา (การ์ดอยู่ที่เดิม) คุณจะสวมบทบาทนั้นทั้งคืน: ถ้าเป็นหมาป่าจะตื่นพร้อมหมาป่า ถ้าเป็น Mason/Seer/Robber ฯลฯ จะทำขั้นตอนของบทบาทนั้นเมื่อถึงคิว — Villager/Hunter/Tanner ไม่มีขั้นตอนเพิ่ม',
  minion:
    'ฝ่ายมนุษย์หมาป่า — รู้ว่าใครเป็นมนุษย์หมาป่า แต่หมาป่าไม่รู้ว่าคุณเป็นใคร — ชนะเมื่อไม่มีหมาป่าถูกโหวตออก',
  mason:
    'ฝ่ายชาวบ้าน — กลางคืนรู้ว่าใครเป็น Mason ด้วยกัน (ถ้ามีมากกว่าหนึ่งคน)',
  seer:
    'ฝ่ายชาวบ้าน — ดูการ์ดของผู้เล่นหนึ่งคน หรือดูการ์ดกลางสองใบ (ไม่รวมการ์ดของคุณเอง)',
  robber:
    'ฝ่ายชาวบ้าน — สลับการ์ดของคุณกับผู้เล่นอื่นหนึ่งคนโดยไม่ดูการ์ดของเขาก่อน — จากนั้นคุณจะได้บทบาทใหม่ของเขา',
  troublemaker:
    'ฝ่ายชาวบ้าน — สลับการ์ดของผู้เล่นอื่นสองคน (ไม่รวมคุณ)',
  drunk:
    'ฝ่ายชาวบ้าน — สลับการ์ดของคุณกับการ์ดกลางหนึ่งใบโดยไม่ดู — คุณไม่รู้ว่าตอนนี้คุณเป็นใครจนกว่าจะจบเกม',
  insomniac:
    'ฝ่ายชาวบ้าน — ถ้าคุณเป็น Insomniac ตั้งแต่เริ่มคืน ให้ตื่นท้ายและดูว่าการ์ดหน้าที่นั่งเปลี่ยนหรือไม่ (แอ็กชันตามบทเริ่มคืน แม้การ์ดจะถูกสลับทีหลัง)',
  hunter:
    'ฝ่ายชาวบ้าน — การ์ด Hunter ในเกมมีใบเดียว — ถ้าคุณถูกโหวตออกและเป็น Hunter ให้เลือกยิงผู้เล่นคนใดก็ได้ที่ยังไม่ถูกโหวต จากนั้นทุกคนจะเห็นการ์ดของคนที่คุณเลือก — การยิงนับรวมในผู้ถูกกำจัดเพื่อตัดสินชนะแพ้',
  tanner:
    'เล่นคนเดียว — คุณชนะถ้าคุณถูกโหวตออกเท่านั้น',
  villager: 'ฝ่ายชาวบ้าน — ไม่มีการกระทำกลางคืน',
};
