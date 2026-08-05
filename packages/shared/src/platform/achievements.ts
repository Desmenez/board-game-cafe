/**
 * Achievement catalog + rule helpers.
 * Definitions live in code; unlock rows live in Postgres (`achievement_unlocks`).
 *
 * Game reward tracks own their cosmetic metadata here as the source of truth.
 * The title / icon / chip / nameplate catalogs derive game rewards from these
 * entries, so thresholds, labels, copy, and media URLs cannot drift apart.
 */

const DEFAULT_NAMEPLATE_ID = 'default';
const NO_COSMETIC_ID = 'none';

const CLOUDINARY_IMAGE = 'https://res.cloudinary.com/dpkqjlk3g/image/upload';
const CLOUDINARY_VIDEO = 'https://res.cloudinary.com/dpkqjlk3g/video/upload';

export type CosmeticReward =
  | { type: 'nameplate'; id: string }
  | { type: 'title'; id: string }
  | { type: 'icon'; id: string }
  | { type: 'chip'; id: string };

export interface RewardCosmeticDef {
  label: string;
  gameId: string;
  theme?: string;
  motion?: 'static' | 'animated';
  imageUrl?: string;
  videoUrl?: string;
}

export type AchievementRule =
  | { kind: 'wins'; count: number; gameId?: string }
  | { kind: 'matches_played'; count: number; gameId?: string };

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  reward: CosmeticReward;
  rule: AchievementRule;
  /** Present for game reward tracks; consumed by cosmetic catalogs. */
  cosmetic?: RewardCosmeticDef;
}

export interface GameRewardAchievementDef extends AchievementDef {
  cosmetic: RewardCosmeticDef;
}

/** Stats derived from persisted `match_players` (and optional current match). */
export interface AchievementStats {
  wins: number;
  matchesPlayed: number;
  /** wins / matches for a single gameId when needed */
  winsByGame?: Readonly<Record<string, number>>;
  matchesByGame?: Readonly<Record<string, number>>;
}

/**
 * Marrakech progression — canonical definitions for both achievements and
 * their cosmetic catalog entries.
 */
export const MARRAKECH_REWARD_TRACK: readonly GameRewardAchievementDef[] = [
  {
    id: 'marrakech-wins-1',
    title: 'เจ้าพ่อค้าพรม',
    description: 'ชนะ Marrakech อย่างน้อย 1 ครั้ง',
    reward: { type: 'title', id: 'marrakech-carpet-mogul' },
    rule: { kind: 'wins', count: 1, gameId: 'marrakech' },
    cosmetic: {
      label: 'เจ้าพ่อค้าพรม',
      gameId: 'marrakech',
    },
  },
  {
    id: 'marrakech-wins-2',
    title: 'Zarcev',
    description: 'ชนะ Marrakech อย่างน้อย 2 ครั้ง',
    reward: { type: 'icon', id: 'marrakech-zarcev' },
    rule: { kind: 'wins', count: 2, gameId: 'marrakech' },
    cosmetic: {
      label: 'Zarcev',
      gameId: 'marrakech',
      imageUrl: `${CLOUDINARY_IMAGE}/q_auto/f_auto/v1785915453/icon_n8azoj.webp`,
    },
  },
  {
    id: 'marrakech-wins-3',
    title: 'พรม Marrakech',
    description: 'ชนะ Marrakech อย่างน้อย 3 ครั้ง',
    reward: { type: 'nameplate', id: 'marrakech-plate-1' },
    rule: { kind: 'wins', count: 3, gameId: 'marrakech' },
    cosmetic: {
      label: 'พรม Marrakech',
      gameId: 'marrakech',
      theme: 'marrakech',
      motion: 'static',
      imageUrl: `${CLOUDINARY_IMAGE}/q_auto/f_auto/v1785856692/plate-1_umbqqj.jpg`,
    },
  },
  {
    id: 'marrakech-wins-4',
    title: 'ชิปพรม Marrakech',
    description: 'ชนะ Marrakech อย่างน้อย 4 ครั้ง',
    reward: { type: 'chip', id: 'marrakech-carpet-chip' },
    rule: { kind: 'wins', count: 4, gameId: 'marrakech' },
    cosmetic: {
      label: 'ชิปพรม Marrakech',
      gameId: 'marrakech',
      theme: 'marrakech',
      imageUrl: `${CLOUDINARY_IMAGE}/q_auto/f_auto/v1785915457/chip_o3u2uc.jpg`,
    },
  },
  {
    id: 'marrakech-wins-5',
    title: 'พรม Marrakech (เคลื่อนไหว)',
    description: 'ชนะ Marrakech อย่างน้อย 5 ครั้ง',
    reward: { type: 'nameplate', id: 'marrakech-plate-2' },
    rule: { kind: 'wins', count: 5, gameId: 'marrakech' },
    cosmetic: {
      label: 'พรม Marrakech (เคลื่อนไหว)',
      gameId: 'marrakech',
      theme: 'marrakech',
      motion: 'animated',
      videoUrl: `${CLOUDINARY_VIDEO}/q_auto/v1785897424/plate-2_s9dmeq.mp4`,
    },
  },
] as const;

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
  ...MARRAKECH_REWARD_TRACK,
] as const;

const ACHIEVEMENT_BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));
const REWARD_IDS_BY_TYPE = {
  nameplate: new Set(
    ACHIEVEMENTS.filter((a) => a.reward.type === 'nameplate').map((a) => a.reward.id),
  ),
  title: new Set(ACHIEVEMENTS.filter((a) => a.reward.type === 'title').map((a) => a.reward.id)),
  icon: new Set(ACHIEVEMENTS.filter((a) => a.reward.type === 'icon').map((a) => a.reward.id)),
  chip: new Set(ACHIEVEMENTS.filter((a) => a.reward.type === 'chip').map((a) => a.reward.id)),
};

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
    if (def?.reward.type === 'nameplate') {
      ids.add(def.reward.id);
    }
  }
  return ids;
}

export function canEquipNameplate(
  nameplateId: string,
  unlockedAchievementIds: ReadonlySet<string>,
): boolean {
  if (nameplateId === DEFAULT_NAMEPLATE_ID) return true;
  if (!REWARD_IDS_BY_TYPE.nameplate.has(nameplateId)) return false;
  return unlockedNameplateIds(unlockedAchievementIds).has(nameplateId);
}

/** Title ids the player may equip given unlock rows. */
export function unlockedTitleIds(unlockedAchievementIds: ReadonlySet<string>): Set<string> {
  const ids = new Set<string>([NO_COSMETIC_ID]);
  for (const achievementId of unlockedAchievementIds) {
    const def = getAchievementDef(achievementId);
    if (def?.reward.type === 'title') {
      ids.add(def.reward.id);
    }
  }
  return ids;
}

export function canEquipTitle(
  titleId: string,
  unlockedAchievementIds: ReadonlySet<string>,
): boolean {
  if (titleId === NO_COSMETIC_ID) return true;
  if (!REWARD_IDS_BY_TYPE.title.has(titleId)) return false;
  return unlockedTitleIds(unlockedAchievementIds).has(titleId);
}

/** Icon ids the player may equip given unlock rows. */
export function unlockedIconIds(unlockedAchievementIds: ReadonlySet<string>): Set<string> {
  const ids = new Set<string>([NO_COSMETIC_ID]);
  for (const achievementId of unlockedAchievementIds) {
    const def = getAchievementDef(achievementId);
    if (def?.reward.type === 'icon') {
      ids.add(def.reward.id);
    }
  }
  return ids;
}

export function canEquipIcon(iconId: string, unlockedAchievementIds: ReadonlySet<string>): boolean {
  if (iconId === NO_COSMETIC_ID) return true;
  if (!REWARD_IDS_BY_TYPE.icon.has(iconId)) return false;
  return unlockedIconIds(unlockedAchievementIds).has(iconId);
}

/** Chip ids the player may equip given unlock rows. */
export function unlockedChipIds(unlockedAchievementIds: ReadonlySet<string>): Set<string> {
  const ids = new Set<string>([NO_COSMETIC_ID]);
  for (const achievementId of unlockedAchievementIds) {
    const def = getAchievementDef(achievementId);
    if (def?.reward.type === 'chip') {
      ids.add(def.reward.id);
    }
  }
  return ids;
}

export function canEquipChip(chipId: string, unlockedAchievementIds: ReadonlySet<string>): boolean {
  if (chipId === NO_COSMETIC_ID) return true;
  if (!REWARD_IDS_BY_TYPE.chip.has(chipId)) return false;
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
