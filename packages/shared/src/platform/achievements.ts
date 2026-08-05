/**
 * Achievement catalog + rule helpers.
 * Definitions live in code; unlock rows live in Postgres (`achievement_unlocks`).
 */

import {
  DEFAULT_NAMEPLATE_ID,
  isFreeNameplate,
  isKnownNameplateId,
  type NameplateDef,
} from './nameplates.js';
import { NO_CHIP_ID, isFreeChip, isKnownChipId, type ChipDef } from './chips.js';
import { NO_ICON_ID, isFreeIcon, isKnownIconId, type IconDef } from './icons.js';
import { NO_TITLE_ID, isFreeTitle, isKnownTitleId, type TitleDef } from './titles.js';

export type CosmeticReward =
  | { type: 'nameplate'; id: string }
  | { type: 'title'; id: string }
  | { type: 'icon'; id: string }
  | { type: 'chip'; id: string };

export type AchievementRule =
  | { kind: 'wins'; count: number; gameId?: string }
  | { kind: 'matches_played'; count: number; gameId?: string };

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  reward: CosmeticReward;
  rule: AchievementRule;
}

/** Stats derived from persisted `match_players` (and optional current match). */
export interface AchievementStats {
  wins: number;
  matchesPlayed: number;
  /** wins / matches for a single gameId when needed */
  winsByGame?: Readonly<Record<string, number>>;
  matchesByGame?: Readonly<Record<string, number>>;
}

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  {
    id: 'wins-1',
    title: 'ชัยชนะแรก',
    description: 'ชนะแมตช์อย่างน้อย 1 ครั้ง (ทุกเกม)',
    reward: { type: 'nameplate', id: 'bronze' },
    rule: { kind: 'wins', count: 1 },
  },
  {
    id: 'chip-wins-1',
    title: 'ชิปทองแดง',
    description: 'ชนะแมตช์อย่างน้อย 1 ครั้ง — ปลดล็อกชิปชื่อทองแดง',
    reward: { type: 'chip', id: 'chip-bronze' },
    rule: { kind: 'wins', count: 1 },
  },
  {
    id: 'wins-5',
    title: 'ห้าชัย',
    description: 'ชนะแมตช์อย่างน้อย 5 ครั้ง (ทุกเกม)',
    reward: { type: 'nameplate', id: 'silver' },
    rule: { kind: 'wins', count: 5 },
  },
  {
    id: 'chip-wins-5',
    title: 'ชิปเงิน',
    description: 'ชนะแมตช์อย่างน้อย 5 ครั้ง — ปลดล็อกชิปชื่อเงิน',
    reward: { type: 'chip', id: 'chip-silver' },
    rule: { kind: 'wins', count: 5 },
  },
  {
    id: 'wins-10',
    title: 'สิบชัย',
    description: 'ชนะแมตช์อย่างน้อย 10 ครั้ง (ทุกเกม)',
    reward: { type: 'nameplate', id: 'gold' },
    rule: { kind: 'wins', count: 10 },
  },
  {
    id: 'chip-wins-10',
    title: 'ชิปทอง',
    description: 'ชนะแมตช์อย่างน้อย 10 ครั้ง — ปลดล็อกชิปชื่อทอง',
    reward: { type: 'chip', id: 'chip-gold' },
    rule: { kind: 'wins', count: 10 },
  },
  {
    id: 'marrakech-wins-1',
    title: 'เจ้าพ่อค้าพรม',
    description: 'ชนะ Marrakech อย่างน้อย 1 ครั้ง',
    reward: { type: 'title', id: 'marrakech-carpet-mogul' },
    rule: { kind: 'wins', count: 1, gameId: 'marrakech' },
  },
  {
    id: 'marrakech-wins-2',
    title: 'Zarcev',
    description: 'ชนะ Marrakech อย่างน้อย 2 ครั้ง',
    reward: { type: 'icon', id: 'marrakech-zarcev' },
    rule: { kind: 'wins', count: 2, gameId: 'marrakech' },
  },
  {
    id: 'marrakech-wins-3',
    title: 'พรม Marrakech',
    description: 'ชนะ Marrakech อย่างน้อย 3 ครั้ง',
    reward: { type: 'nameplate', id: 'marrakech-plate-1' },
    rule: { kind: 'wins', count: 3, gameId: 'marrakech' },
  },
  {
    id: 'marrakech-wins-5',
    title: 'พรม Marrakech (เคลื่อนไหว)',
    description: 'ชนะ Marrakech อย่างน้อย 5 ครั้ง',
    reward: { type: 'nameplate', id: 'marrakech-plate-2' },
    rule: { kind: 'wins', count: 5, gameId: 'marrakech' },
  },
] as const;

const ACHIEVEMENT_BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));

export function getAchievementDef(id: string): AchievementDef | undefined {
  return ACHIEVEMENT_BY_ID.get(id);
}

export function isAchievementSatisfied(rule: AchievementRule, stats: AchievementStats): boolean {
  if (rule.kind === 'wins') {
    const n = rule.gameId ? (stats.winsByGame?.[rule.gameId] ?? 0) : stats.wins;
    return n >= rule.count;
  }
  const n = rule.gameId ? (stats.matchesByGame?.[rule.gameId] ?? 0) : stats.matchesPlayed;
  return n >= rule.count;
}

/** Achievement ids unlocked in DB, plus any whose rules are already met by stats. */
export function effectiveUnlockedAchievementIds(
  unlockedAchievementIds: ReadonlySet<string>,
  stats: AchievementStats,
): Set<string> {
  const next = new Set(unlockedAchievementIds);
  for (const a of ACHIEVEMENTS) {
    if (isAchievementSatisfied(a.rule, stats)) next.add(a.id);
  }
  return next;
}

/** Achievement ids whose rules are met and not yet unlocked. */
export function achievementsToGrant(
  stats: AchievementStats,
  alreadyUnlocked: ReadonlySet<string>,
): AchievementDef[] {
  return ACHIEVEMENTS.filter(
    (a) => !alreadyUnlocked.has(a.id) && isAchievementSatisfied(a.rule, stats),
  );
}

/** Nameplate ids the player may equip given unlock rows. */
export function unlockedNameplateIds(unlockedAchievementIds: ReadonlySet<string>): Set<string> {
  const ids = new Set<string>([DEFAULT_NAMEPLATE_ID]);
  for (const achievementId of unlockedAchievementIds) {
    const def = getAchievementDef(achievementId);
    if (def?.reward.type === 'nameplate' && isKnownNameplateId(def.reward.id)) {
      ids.add(def.reward.id);
    }
  }
  return ids;
}

export function canEquipNameplate(
  nameplateId: string,
  unlockedAchievementIds: ReadonlySet<string>,
): boolean {
  if (!isKnownNameplateId(nameplateId)) return false;
  if (isFreeNameplate(nameplateId)) return true;
  return unlockedNameplateIds(unlockedAchievementIds).has(nameplateId);
}

/** Title ids the player may equip given unlock rows. */
export function unlockedTitleIds(unlockedAchievementIds: ReadonlySet<string>): Set<string> {
  const ids = new Set<string>([NO_TITLE_ID]);
  for (const achievementId of unlockedAchievementIds) {
    const def = getAchievementDef(achievementId);
    if (def?.reward.type === 'title' && isKnownTitleId(def.reward.id)) {
      ids.add(def.reward.id);
    }
  }
  return ids;
}

export function canEquipTitle(
  titleId: string,
  unlockedAchievementIds: ReadonlySet<string>,
): boolean {
  if (!isKnownTitleId(titleId)) return false;
  if (isFreeTitle(titleId)) return true;
  return unlockedTitleIds(unlockedAchievementIds).has(titleId);
}

/** Icon ids the player may equip given unlock rows. */
export function unlockedIconIds(unlockedAchievementIds: ReadonlySet<string>): Set<string> {
  const ids = new Set<string>([NO_ICON_ID]);
  for (const achievementId of unlockedAchievementIds) {
    const def = getAchievementDef(achievementId);
    if (def?.reward.type === 'icon' && isKnownIconId(def.reward.id)) {
      ids.add(def.reward.id);
    }
  }
  return ids;
}

export function canEquipIcon(iconId: string, unlockedAchievementIds: ReadonlySet<string>): boolean {
  if (!isKnownIconId(iconId)) return false;
  if (isFreeIcon(iconId)) return true;
  return unlockedIconIds(unlockedAchievementIds).has(iconId);
}

/** Chip ids the player may equip given unlock rows. */
export function unlockedChipIds(unlockedAchievementIds: ReadonlySet<string>): Set<string> {
  const ids = new Set<string>([NO_CHIP_ID]);
  for (const achievementId of unlockedAchievementIds) {
    const def = getAchievementDef(achievementId);
    if (def?.reward.type === 'chip' && isKnownChipId(def.reward.id)) {
      ids.add(def.reward.id);
    }
  }
  return ids;
}

export function canEquipChip(chipId: string, unlockedAchievementIds: ReadonlySet<string>): boolean {
  if (!isKnownChipId(chipId)) return false;
  if (isFreeChip(chipId)) return true;
  return unlockedChipIds(unlockedAchievementIds).has(chipId);
}

/** Resolve which achievement grants a nameplate (for UI copy). */
export function achievementForNameplateReward(nameplateId: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.reward.type === 'nameplate' && a.reward.id === nameplateId);
}

export function achievementForTitleReward(titleId: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.reward.type === 'title' && a.reward.id === titleId);
}

export function achievementForIconReward(iconId: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.reward.type === 'icon' && a.reward.id === iconId);
}

export function achievementForChipReward(chipId: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.reward.type === 'chip' && a.reward.id === chipId);
}

export type { ChipDef, IconDef, NameplateDef, TitleDef };
