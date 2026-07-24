// ============================================================
// CS Files — สืบสวนคดีฆาตกรรม (ดัดแปลงจากบอร์ดเกม CS Files)
// ============================================================

import type { GameResult } from './game.js';
import type { CsFilesCardDef, CsFilesSceneKind } from '../cs-files-deck.js';

export type { CsFilesCardDef, CsFilesSceneKind, CsFilesSceneTileDef } from '../cs-files-deck.js';

/** ตัวเลือกห้อง (lobby) — ส่งเข้า setup */
export interface CsFilesLobbyOptions {
  /** เพิ่มผู้สมรู้ร่วมคิด — ใช้ได้เมื่อผู้เล่น ≥ 6 */
  includeAccomplice: boolean;
  /** เพิ่มพยาน — ต้องเปิดสมรู้ร่วมคิดด้วย และผู้เล่น ≥ 6 */
  includeWitness: boolean;
  /** เวลาอภิปรายต่อรอบ (นาที) — ทุกคนยกเว้นนักนิติฯ */
  discussionMinutes: number;
  /** เวลาตัดสินใจไขคดี/ผ่านต่อคน (วินาที) ในรอบสืบสวน */
  turnSeconds: number;
  /** สุ่ม หรือเลือกผู้เล่นเป็นนักนิติฯ */
  forensicMode: 'random' | 'manual';
  /** เมื่อ forensicMode = manual — id ผู้เล่นในห้อง */
  forensicPlayerId?: string;
}

export const CS_FILES_DISCUSSION_MINUTES = [1, 2, 3, 5, 7, 10] as const;
export const CS_FILES_TURN_SECONDS = [15, 20, 30, 45, 60, 90] as const;

export function defaultCsFilesLobbyOptions(): CsFilesLobbyOptions {
  return {
    includeAccomplice: true,
    includeWitness: true,
    discussionMinutes: 2,
    turnSeconds: 30,
    forensicMode: 'random',
  };
}

export function parseCsFilesLobbyOptions(raw: unknown, playerCount?: number): CsFilesLobbyOptions {
  const defaults = defaultCsFilesLobbyOptions();
  let includeAccomplice = defaults.includeAccomplice;
  let includeWitness = defaults.includeWitness;
  let discussionMinutes = defaults.discussionMinutes;
  let turnSeconds = defaults.turnSeconds;
  let forensicMode: 'random' | 'manual' = defaults.forensicMode;
  let forensicPlayerId: string | undefined;

  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    if (o.includeAccomplice === false) includeAccomplice = false;
    if (o.includeAccomplice === true) includeAccomplice = true;
    if (o.includeWitness === false) includeWitness = false;
    if (o.includeWitness === true) includeWitness = true;
    if (typeof o.discussionMinutes === 'number' && Number.isFinite(o.discussionMinutes)) {
      discussionMinutes = Math.round(o.discussionMinutes);
    }
    if (typeof o.turnSeconds === 'number' && Number.isFinite(o.turnSeconds)) {
      turnSeconds = Math.round(o.turnSeconds);
    }
    if (o.forensicMode === 'manual') forensicMode = 'manual';
    if (o.forensicMode === 'random') forensicMode = 'random';
    if (typeof o.forensicPlayerId === 'string' && o.forensicPlayerId.trim() !== '') {
      forensicPlayerId = o.forensicPlayerId.trim();
    }
  }

  if (playerCount != null && playerCount < 6) {
    includeAccomplice = false;
    includeWitness = false;
  }
  if (!includeAccomplice) {
    includeWitness = false;
  }

  if (!(CS_FILES_DISCUSSION_MINUTES as readonly number[]).includes(discussionMinutes)) {
    discussionMinutes = defaults.discussionMinutes;
  }
  if (!(CS_FILES_TURN_SECONDS as readonly number[]).includes(turnSeconds)) {
    turnSeconds = defaults.turnSeconds;
  }

  if (forensicMode !== 'manual') {
    forensicPlayerId = undefined;
  }

  return {
    includeAccomplice,
    includeWitness,
    discussionMinutes,
    turnSeconds,
    forensicMode,
    forensicPlayerId,
  };
}

export type CsFilesRole = 'forensic' | 'murderer' | 'investigator' | 'accomplice' | 'witness';

export type CsFilesTeam = 'good' | 'evil' | 'neutral';

export type CsFilesPhase =
  | 'composition'
  | 'role_reveal'
  | 'night_crime'
  | 'night_witness'
  | 'investigation'
  | 'witness_hunt'
  | 'game_over';

export type CsFilesInvestigationSubPhase =
  | 'placing_pins'
  | 'replacing_situation'
  | 'discussion'
  | 'presenting';

export interface CsFilesSolution {
  ownerId: string;
  evidenceCardId: string;
  meansCardId: string;
}

export interface CsFilesSceneTile {
  id: string;
  kind: CsFilesSceneKind;
  label: string;
  options: string[];
  /** ดัชนีตัวเลือกที่วางหมุด — null ถ้ายังไม่วาง */
  pinIndex: number | null;
}

export interface CsFilesSeat {
  id: string;
  name: string;
  role: CsFilesRole;
  brownCards: CsFilesCardDef[];
  blueCards: CsFilesCardDef[];
  /** สิทธิ์ไขคดีเหลืออยู่ (นักนิติฯ ไม่มี) */
  hasBadge: boolean;
}

export interface CsFilesKnownInfo {
  id: string;
  name: string;
  detail: string;
}

export type CsFilesAction =
  | { type: 'acknowledge_composition' }
  | { type: 'acknowledge_role' }
  | { type: 'murderer_select_solution'; evidenceCardId: string; meansCardId: string }
  /** ฆาตกรอัปเดตการเลือกชั่วคราว — สมรู้ร่วมคิดเห็นได้ระหว่างช่วงก่อเหตุ */
  | {
      type: 'murderer_set_crime_draft';
      evidenceCardId: string | null;
      meansCardId: string | null;
    }
  /** ฆาตกรอัปเดตเป้าชั่วคราว — ทุกคนเห็นระหว่างชี้พยาน */
  | { type: 'murderer_set_witness_draft'; targetId: string | null }
  | { type: 'forensic_place_pin'; tileId: string; optionIndex: number }
  | { type: 'forensic_confirm_pins' }
  /** รอบ 2–3: เลือกแผ่นสถานการณ์เก่าที่จะถูกแทนด้วยแผ่นใหม่ */
  | { type: 'forensic_replace_situation'; tileId: string }
  | { type: 'advance_to_presenting' }
  /** ผ่านตา — ไม่ไขคดี (รอบสุดท้ายถ้ายังมีเหรียญตรา ห้ามผ่าน) */
  | { type: 'pass_turn' }
  | { type: 'finish_presentation_turn' }
  /** ปัก/ถอดหมุดการ์ดหลักฐานหรือวิธีฆ่า (ทุกคนยกเว้นนิติฯ — กี่ใบก็ได้) */
  | { type: 'toggle_card_pin'; cardId: string }
  | {
      type: 'solve_attempt';
      targetPlayerId: string;
      evidenceCardId: string;
      meansCardId: string;
    }
  | { type: 'murderer_accuse_witness'; targetId: string };

export const CS_FILES_ROLE_DESCRIPTION_TH: Record<CsFilesRole, string> = {
  forensic: 'คุณรู้คำตอบจริง — ใบ้ได้เฉพาะแผ่นสถานการณ์กับหมุด ห้ามพูดหรือใบ้ด้วยท่าทาง',
  murderer:
    'เลือกการ์ดหลักฐาน 1 ใบและการ์ดวิธีฆ่า 1 ใบของตนเป็นคำตอบ แล้วหลอกลวงนักสืบ (ไม่รู้ว่าใครเป็นสมรู้ร่วมคิด)',
  investigator: 'วิเคราะห์คำใบ้จากนักนิติฯ แล้วไขคดีด้วยสิทธิ์ตอบ 1 ครั้ง',
  accomplice: 'คุณรู้ว่าใครเป็นฆาตกรและรู้คำตอบ — ช่วยฆาตกรโดยไม่ถูกจับได้',
  witness:
    'คุณรู้ว่าผู้เล่น 2 คนใดเป็นฆาตกร+สมรู้ร่วมคิด แต่ไม่รู้ว่าใครเป็นใคร และไม่รู้การ์ดคำตอบ',
};

export const CS_FILES_ROLE_LABEL_TH: Record<CsFilesRole, string> = {
  forensic: 'นักนิติวิทยาศาสตร์',
  murderer: 'ฆาตกร',
  investigator: 'นักสืบ',
  accomplice: 'ผู้สมรู้ร่วมคิด',
  witness: 'พยาน',
};

export function getTeamForCsFilesRole(role: CsFilesRole): CsFilesTeam {
  if (role === 'murderer' || role === 'accomplice') return 'evil';
  if (role === 'forensic' || role === 'investigator' || role === 'witness') return 'good';
  return 'neutral';
}

/** ที่นั่งในมุมมองผู้เล่น (ไม่มี role ลับ) */
export interface CsFilesSeatView {
  id: string;
  name: string;
  brownCards: CsFilesCardDef[];
  blueCards: CsFilesCardDef[];
  hasBadge: boolean;
}

/** มุมมองผู้เล่น — ข้อมูลลับถูกกรองใน getPlayerView */
export interface CsFilesPlayerView {
  phase: CsFilesPhase;
  players: { id: string; name: string }[];
  seats: CsFilesSeatView[];
  /** เปิดเผยหลัง role_reveal — ทุกคนรู้ว่าใครเป็นนักนิติฯ */
  forensicId: string | null;
  myRole: CsFilesRole;
  myId: string;
  hasAcknowledgedComposition?: boolean;
  compositionAcknowledgeProgress?: { current: number; total: number };
  hasAcknowledgedRole?: boolean;
  roleAcknowledgeProgress?: { current: number; total: number };
  /** สำรับบทบาทในเกมนี้ (composition / reveal animation) */
  roleRevealAllRoles?: CsFilesRole[];
  /** คำตอบ — เฉพาะ forensic / murderer / accomplice */
  solution?: CsFilesSolution;
  /** ช่วงก่อเหตุ: ฆาตกรกำลังเลือก — สมรู้ร่วมคิด/ฆาตกรเห็น draft */
  crimeDraft?: { evidenceCardId: string | null; meansCardId: string | null } | null;
  /** ช่วงชี้พยาน: id ที่ฆาตกรกำลังเลือก (ทุกคนเห็น) */
  witnessHuntDraft?: string | null;
  /** พยาน: ฝ่ายร้ายสองคน (ไม่แยกว่าใครเป็นฆาตกร) */
  evilPairIds?: string[];
  /** สมรู้ร่วมคิด: id ฆาตกร — นิติฯ ได้ทั้ง murdererId และ accompliceId; ฆาตกรได้ accompliceId เฉพาะ witness_hunt */
  accompliceId?: string | null;
  murdererId?: string | null;
  knownInfo?: CsFilesKnownInfo[];
  /** night_witness: พยานเห็นคู่ที่นักนิติฯ ชี้แล้ว */
  witnessShownEvilIds?: string[] | null;
  investigationRound?: number;
  investigationSubPhase?: CsFilesInvestigationSubPhase;
  sceneTiles?: CsFilesSceneTile[];
  /** รอบ 2–3: แผ่นสถานการณ์ใหม่ที่รอให้นิติฯ เลือกแผ่นเก่าแทนที่ */
  pendingSituationTile?: CsFilesSceneTile | null;
  /** แผ่นที่ต้องวางหมุดในรอบนี้ (รอบ 2–3 = แผ่นใหม่เท่านั้น) */
  tilesNeedingPin?: string[];
  /** หมุดตัดชอยส์บนการ์ด — cardId → ผู้ที่ปักหมุด */
  cardPins?: Record<string, { id: string; name: string }[]>;
  presentationOrder?: string[];
  currentSpeakerId?: string | null;
  /** หมดเวลาอภิปราย (server timestamp ms) */
  discussionEndsAtMs?: number | null;
  /** หมดเวลารอบสืบสวนของคนปัจจุบัน */
  turnEndsAtMs?: number | null;
  /** รอบ 3 และยังมีเหรียญตรา — ห้ามผ่าน ต้องไขคดี */
  mustSolveThisTurn?: boolean;
  lastSolveResult?: {
    playerId: string;
    playerName: string;
    correct: boolean;
    targetPlayerId: string;
    targetPlayerName: string;
    evidenceCardId: string;
    meansCardId: string;
  } | null;
  lastEvent: string;
  gameResult?: GameResult;
  gameOverReveal?: {
    roles: Record<string, CsFilesRole>;
    solution: CsFilesSolution;
    witnessId: string | null;
    solvedById: string | null;
  };
}
