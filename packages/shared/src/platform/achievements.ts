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

/** Exploding Kittens progression rewards. */
export const EXPLODING_KITTENS_REWARD_TRACK: readonly GameRewardAchievementDef[] = [
  {
    id: 'exploding-kittens-wins-1',
    title: 'บ้านบึ้ม!!!',
    description: 'ชนะ Exploding Kittens อย่างน้อย 1 ครั้ง',
    reward: { type: 'title', id: 'exploding-kittens-house-boom' },
    rule: { kind: 'wins', count: 1, gameId: 'exploding-kittens' },
    cosmetic: {
      label: 'บ้านบึ้ม!!!',
      gameId: 'exploding-kittens',
    },
  },
  {
    id: 'exploding-kittens-wins-2',
    title: 'ไอคอน Exploding Kittens',
    description: 'ชนะ Exploding Kittens อย่างน้อย 2 ครั้ง',
    reward: { type: 'icon', id: 'exploding-kittens-icon' },
    rule: { kind: 'wins', count: 2, gameId: 'exploding-kittens' },
    cosmetic: {
      label: 'ไอคอน Exploding Kittens',
      gameId: 'exploding-kittens',
      imageUrl: `${CLOUDINARY_IMAGE}/q_auto/f_auto/v1785895927/icon_xvaaya`,
    },
  },
  {
    id: 'exploding-kittens-wins-3',
    title: 'ป้ายชื่อ Exploding Kittens',
    description: 'ชนะ Exploding Kittens อย่างน้อย 3 ครั้ง',
    reward: { type: 'nameplate', id: 'exploding-kittens-plate-1' },
    rule: { kind: 'wins', count: 3, gameId: 'exploding-kittens' },
    cosmetic: {
      label: 'ป้ายชื่อ Exploding Kittens',
      gameId: 'exploding-kittens',
      theme: 'exploding-kittens',
      motion: 'static',
      imageUrl: `${CLOUDINARY_IMAGE}/q_auto/f_auto/v1785895927/plate-1_uaz7yx`,
    },
  },
  {
    id: 'exploding-kittens-wins-4',
    title: 'ชิป Exploding Kittens',
    description: 'ชนะ Exploding Kittens อย่างน้อย 4 ครั้ง',
    reward: { type: 'chip', id: 'exploding-kittens-chip' },
    rule: { kind: 'wins', count: 4, gameId: 'exploding-kittens' },
    cosmetic: {
      label: 'ชิป Exploding Kittens',
      gameId: 'exploding-kittens',
      theme: 'exploding-kittens',
      imageUrl: `${CLOUDINARY_IMAGE}/q_auto/f_auto/v1785895927/chip_ylcrhs`,
    },
  },
  {
    id: 'exploding-kittens-wins-5',
    title: 'ป้ายชื่อ Exploding Kittens 2',
    description: 'ชนะ Exploding Kittens อย่างน้อย 5 ครั้ง',
    reward: { type: 'nameplate', id: 'exploding-kittens-plate-2' },
    rule: { kind: 'wins', count: 5, gameId: 'exploding-kittens' },
    cosmetic: {
      label: 'ป้ายชื่อ Exploding Kittens 2',
      gameId: 'exploding-kittens',
      theme: 'exploding-kittens',
      motion: 'animated',
      videoUrl: `${CLOUDINARY_VIDEO}/q_auto/v1785895927/plate-2_t9hiof.mp4`,
    },
  },
] as const;

/** Camel Up progression rewards. */
export const CAMEL_UP_REWARD_TRACK: readonly GameRewardAchievementDef[] = [
  {
    id: 'camel-up-wins-1',
    title: 'ขี่หลังฉันสิ!',
    description: 'ชนะ Camel Up อย่างน้อย 1 ครั้ง',
    reward: { type: 'title', id: 'camel-up-house-boom' },
    rule: { kind: 'wins', count: 1, gameId: 'camel-up' },
    cosmetic: {
      label: 'ขี่หลังฉันสิ!',
      gameId: 'camel-up',
    },
  },
  {
    id: 'camel-up-wins-2',
    title: 'ไอคอน Camel Up',
    description: 'ชนะ Camel Up อย่างน้อย 2 ครั้ง',
    reward: { type: 'icon', id: 'camel-up-icon' },
    rule: { kind: 'wins', count: 2, gameId: 'camel-up' },
    cosmetic: {
      label: 'ไอคอน Camel Up',
      gameId: 'camel-up',
      imageUrl: `${CLOUDINARY_IMAGE}/q_auto/f_auto/v1785987600/icon_gr75xu`,
    },
  },
  {
    id: 'camel-up-wins-3',
    title: 'ป้ายชื่อ Camel Up',
    description: 'ชนะ Camel Up อย่างน้อย 3 ครั้ง',
    reward: { type: 'nameplate', id: 'camel-up-plate-1' },
    rule: { kind: 'wins', count: 3, gameId: 'camel-up' },
    cosmetic: {
      label: 'ป้ายชื่อ Camel Up',
      gameId: 'camel-up',
      theme: 'camel-up',
      motion: 'static',
      imageUrl: `${CLOUDINARY_IMAGE}/q_auto/f_auto/v1785987600/plate-1_acefx9`,
    },
  },
  {
    id: 'camel-up-wins-4',
    title: 'ชิป Camel Up',
    description: 'ชนะ Camel Up อย่างน้อย 4 ครั้ง',
    reward: { type: 'chip', id: 'camel-up-chip' },
    rule: { kind: 'wins', count: 4, gameId: 'camel-up' },
    cosmetic: {
      label: 'ชิป Camel Up',
      gameId: 'camel-up',
      theme: 'camel-up',
      imageUrl: `${CLOUDINARY_IMAGE}/q_auto/f_auto/v1785987600/chip_jotkxq`,
    },
  },
  {
    id: 'camel-up-wins-5',
    title: 'ป้ายชื่อ Camel Up 2',
    description: 'ชนะ Camel Up อย่างน้อย 5 ครั้ง',
    reward: { type: 'nameplate', id: 'camel-up-plate-2' },
    rule: { kind: 'wins', count: 5, gameId: 'camel-up' },
    cosmetic: {
      label: 'ป้ายชื่อ Camel Up 2',
      gameId: 'camel-up',
      theme: 'camel-up',
      motion: 'animated',
      videoUrl: `${CLOUDINARY_VIDEO}/q_auto/v1785987600/plate-2_qgypiu.mp4`,
    },
  },
] as const;

/** Ticket to Ride progression rewards. */
export const TICKET_TO_RIDE_REWARD_TRACK: readonly GameRewardAchievementDef[] = [
  {
    id: 'ticket-to-ride-wins-1',
    title: 'ปู๊น ปู๊น ฉึกกะฉัก',
    description: 'ชนะ Ticket to Ride อย่างน้อย 1 ครั้ง',
    reward: { type: 'title', id: 'ticket-to-ride-toot-toot' },
    rule: { kind: 'wins', count: 1, gameId: 'ticket-to-ride' },
    cosmetic: {
      label: 'ปู๊น ปู๊น ฉึกกะฉัก',
      gameId: 'ticket-to-ride',
    },
  },
  {
    id: 'ticket-to-ride-wins-2',
    title: 'ไอคอน Ticket to Ride',
    description: 'ชนะ Ticket to Ride อย่างน้อย 2 ครั้ง',
    reward: { type: 'icon', id: 'ticket-to-ride-icon' },
    rule: { kind: 'wins', count: 2, gameId: 'ticket-to-ride' },
    cosmetic: {
      label: 'ไอคอน Ticket to Ride',
      gameId: 'ticket-to-ride',
      imageUrl: `${CLOUDINARY_IMAGE}/q_auto/f_auto/v1786069053/icon_o8spif`,
    },
  },
  {
    id: 'ticket-to-ride-wins-3',
    title: 'ป้ายชื่อ Ticket to Ride',
    description: 'ชนะ Ticket to Ride อย่างน้อย 3 ครั้ง',
    reward: { type: 'nameplate', id: 'ticket-to-ride-plate-1' },
    rule: { kind: 'wins', count: 3, gameId: 'ticket-to-ride' },
    cosmetic: {
      label: 'ป้ายชื่อ Ticket to Ride',
      gameId: 'ticket-to-ride',
      theme: 'ticket-to-ride',
      motion: 'static',
      imageUrl: `${CLOUDINARY_IMAGE}/q_auto/f_auto/v1786069053/plate-1_pkuakr`,
    },
  },
  {
    id: 'ticket-to-ride-wins-4',
    title: 'ชิป Ticket to Ride',
    description: 'ชนะ Ticket to Ride อย่างน้อย 4 ครั้ง',
    reward: { type: 'chip', id: 'ticket-to-ride-chip' },
    rule: { kind: 'wins', count: 4, gameId: 'ticket-to-ride' },
    cosmetic: {
      label: 'ชิป Ticket to Ride',
      gameId: 'ticket-to-ride',
      theme: 'ticket-to-ride',
      imageUrl: `${CLOUDINARY_IMAGE}/q_auto/f_auto/v1786069053/chip_luovcq`,
    },
  },
  {
    id: 'ticket-to-ride-wins-5',
    title: 'ป้ายชื่อ Ticket to Ride 2',
    description: 'ชนะ Ticket to Ride อย่างน้อย 5 ครั้ง',
    reward: { type: 'nameplate', id: 'ticket-to-ride-plate-2' },
    rule: { kind: 'wins', count: 5, gameId: 'ticket-to-ride' },
    cosmetic: {
      label: 'ป้ายชื่อ Ticket to Ride 2',
      gameId: 'ticket-to-ride',
      theme: 'ticket-to-ride',
      motion: 'animated',
      videoUrl: `${CLOUDINARY_VIDEO}/q_auto/v1786069053/plate-2_nqrodl.mp4`,
    },
  },
] as const;

/** CS Files progression rewards. */
export const CS_FILES_REWARD_TRACK: readonly GameRewardAchievementDef[] = [
  {
    id: 'cs-files-wins-1',
    title: 'ใครคือฆาตกร?',
    description: 'ชนะ CS Files อย่างน้อย 1 ครั้ง',
    reward: { type: 'title', id: 'cs-files-whodunit' },
    rule: { kind: 'wins', count: 1, gameId: 'cs-files' },
    cosmetic: {
      label: 'ใครคือฆาตกร?',
      gameId: 'cs-files',
    },
  },
  {
    id: 'cs-files-wins-2',
    title: 'ไอคอน CS Files',
    description: 'ชนะ CS Files อย่างน้อย 2 ครั้ง',
    reward: { type: 'icon', id: 'cs-files-icon' },
    rule: { kind: 'wins', count: 2, gameId: 'cs-files' },
    cosmetic: {
      label: 'ไอคอน CS Files',
      gameId: 'cs-files',
      imageUrl: `${CLOUDINARY_IMAGE}/q_auto/f_auto/v1786071183/icon_a0noiq`,
    },
  },
  {
    id: 'cs-files-wins-3',
    title: 'ป้ายชื่อ CS Files',
    description: 'ชนะ CS Files อย่างน้อย 3 ครั้ง',
    reward: { type: 'nameplate', id: 'cs-files-plate-1' },
    rule: { kind: 'wins', count: 3, gameId: 'cs-files' },
    cosmetic: {
      label: 'ป้ายชื่อ CS Files',
      gameId: 'cs-files',
      theme: 'cs-files',
      motion: 'static',
      imageUrl: `${CLOUDINARY_IMAGE}/q_auto/f_auto/v1786071183/plate-1_o7zrli`,
    },
  },
  {
    id: 'cs-files-wins-4',
    title: 'ชิป CS Files',
    description: 'ชนะ CS Files อย่างน้อย 4 ครั้ง',
    reward: { type: 'chip', id: 'cs-files-chip' },
    rule: { kind: 'wins', count: 4, gameId: 'cs-files' },
    cosmetic: {
      label: 'ชิป CS Files',
      gameId: 'cs-files',
      theme: 'cs-files',
      imageUrl: `${CLOUDINARY_IMAGE}/q_auto/f_auto/v1786071183/chip_r8kf83`,
    },
  },
  {
    id: 'cs-files-wins-5',
    title: 'ป้ายชื่อ CS Files 2',
    description: 'ชนะ CS Files อย่างน้อย 5 ครั้ง',
    reward: { type: 'nameplate', id: 'cs-files-plate-2' },
    rule: { kind: 'wins', count: 5, gameId: 'cs-files' },
    cosmetic: {
      label: 'ป้ายชื่อ CS Files 2',
      gameId: 'cs-files',
      theme: 'cs-files',
      motion: 'animated',
      videoUrl: `${CLOUDINARY_VIDEO}/q_auto/v1786071183/plate-2_aj7gc8.mp4`,
    },
  },
] as const;

export const GAME_REWARD_TRACKS: readonly GameRewardAchievementDef[] = [
  ...MARRAKECH_REWARD_TRACK,
  ...EXPLODING_KITTENS_REWARD_TRACK,
  ...CAMEL_UP_REWARD_TRACK,
  ...TICKET_TO_RIDE_REWARD_TRACK,
  ...CS_FILES_REWARD_TRACK,
] as const;

/** Game ids that have a cosmetic reward track, in catalog order. */
export const REWARD_TRACK_GAME_IDS: readonly string[] = [
  ...new Set(GAME_REWARD_TRACKS.map((a) => a.cosmetic.gameId)),
];

/** The reward track for one game, ordered by threshold. */
export function getGameRewardTrack(gameId: string): GameRewardAchievementDef[] {
  return GAME_REWARD_TRACKS.filter((a) => a.cosmetic.gameId === gameId);
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
  ...GAME_REWARD_TRACKS,
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
