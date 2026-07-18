export const PLAYER_AVATAR_VERSION = 2 as const;

/** Single DiceBear style for player identity — Micah Illustration System. */
export const PLAYER_AVATAR_STYLE = 'micah' as const;

/** Mouth is locked to a big smile; the editor does not expose other expressions. */
export const PLAYER_AVATAR_MOUTH = 'laughing' as const;

export const PLAYER_AVATAR_BACKGROUNDS = ['amber', 'sky', 'sage', 'rose'] as const;
export type PlayerAvatarBackground = (typeof PLAYER_AVATAR_BACKGROUNDS)[number];

export const PLAYER_AVATAR_BASE_COLORS = ['f9c9b6', 'ac6651', '77311d'] as const;
export type PlayerAvatarBaseColor = (typeof PLAYER_AVATAR_BASE_COLORS)[number];

export const PLAYER_AVATAR_ACCENT_COLORS = [
  '000000',
  '77311d',
  'ac6651',
  'f9c9b6',
  'f4d150',
  'ffeba4',
  'fc909f',
  'ffedef',
  '9287ff',
  'e0ddff',
  '6bd9e9',
  'd2eff3',
  'ffffff',
] as const;
export type PlayerAvatarAccentColor = (typeof PLAYER_AVATAR_ACCENT_COLORS)[number];

export const PLAYER_AVATAR_EYE_SHADOW_COLORS = [
  'd2eff3',
  'e0ddff',
  'ffeba4',
  'ffedef',
  'ffffff',
] as const;
export type PlayerAvatarEyeShadowColor = (typeof PLAYER_AVATAR_EYE_SHADOW_COLORS)[number];

export const PLAYER_AVATAR_HAIR = [
  'none',
  'dannyPhantom',
  'dougFunny',
  'fonze',
  'full',
  'mrClean',
  'mrT',
  'pixie',
  'turban',
] as const;
export type PlayerAvatarHair = (typeof PLAYER_AVATAR_HAIR)[number];

export const PLAYER_AVATAR_EYES = [
  'eyes',
  'eyesShadow',
  'round',
  'smiling',
  'smilingShadow',
] as const;
export type PlayerAvatarEyes = (typeof PLAYER_AVATAR_EYES)[number];

export const PLAYER_AVATAR_EYEBROWS = ['down', 'eyelashesDown', 'eyelashesUp', 'up'] as const;
export type PlayerAvatarEyebrows = (typeof PLAYER_AVATAR_EYEBROWS)[number];

export const PLAYER_AVATAR_NOSE = ['curve', 'pointed', 'tound'] as const;
export type PlayerAvatarNose = (typeof PLAYER_AVATAR_NOSE)[number];

export const PLAYER_AVATAR_EARS = ['attached', 'detached'] as const;
export type PlayerAvatarEars = (typeof PLAYER_AVATAR_EARS)[number];

export const PLAYER_AVATAR_EARRINGS = ['none', 'hoop', 'stud'] as const;
export type PlayerAvatarEarrings = (typeof PLAYER_AVATAR_EARRINGS)[number];

export const PLAYER_AVATAR_GLASSES = ['none', 'round', 'square'] as const;
export type PlayerAvatarGlasses = (typeof PLAYER_AVATAR_GLASSES)[number];

export const PLAYER_AVATAR_FACIAL_HAIR = ['none', 'beard', 'scruff'] as const;
export type PlayerAvatarFacialHair = (typeof PLAYER_AVATAR_FACIAL_HAIR)[number];

export const PLAYER_AVATAR_CLOTHES = ['collared', 'crew', 'open'] as const;
export type PlayerAvatarClothes = (typeof PLAYER_AVATAR_CLOTHES)[number];

export interface PlayerAvatarConfig {
  version: typeof PLAYER_AVATAR_VERSION;
  seed: string;
  background: PlayerAvatarBackground;
  flip: boolean;
  baseColor: PlayerAvatarBaseColor;
  hair: PlayerAvatarHair;
  hairColor: PlayerAvatarAccentColor;
  eyes: PlayerAvatarEyes;
  eyeShadowColor: PlayerAvatarEyeShadowColor;
  eyebrows: PlayerAvatarEyebrows;
  nose: PlayerAvatarNose;
  ears: PlayerAvatarEars;
  earrings: PlayerAvatarEarrings;
  earringColor: PlayerAvatarAccentColor;
  glasses: PlayerAvatarGlasses;
  glassesColor: PlayerAvatarAccentColor;
  facialHair: PlayerAvatarFacialHair;
  clothes: PlayerAvatarClothes;
  shirtColor: PlayerAvatarAccentColor;
}

const MAX_AVATAR_SEED_LENGTH = 64;
const SAFE_AVATAR_SEED = /[^a-zA-Z0-9_-]/g;

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pick<T extends readonly string[]>(list: T, hash: number, salt: number): T[number] {
  return list[((hash + salt * 2654435761) >>> 0) % list.length]!;
}

function includesValue<T extends readonly string[]>(list: T, value: unknown): value is T[number] {
  return typeof value === 'string' && (list as readonly string[]).includes(value);
}

export function normalizePlayerAvatarSeed(seed: unknown, fallbackSeed = 'player'): string {
  if (typeof seed !== 'string') return normalizePlayerAvatarSeed(fallbackSeed);
  const normalized = seed.replace(SAFE_AVATAR_SEED, '').slice(0, MAX_AVATAR_SEED_LENGTH);
  if (normalized) return normalized;
  if (seed !== fallbackSeed) return normalizePlayerAvatarSeed(fallbackSeed);
  return 'player';
}

export function createDefaultPlayerAvatar(seed: string): PlayerAvatarConfig {
  const normalizedSeed = normalizePlayerAvatarSeed(seed);
  const hash = stableHash(normalizedSeed);
  return {
    version: PLAYER_AVATAR_VERSION,
    seed: normalizedSeed,
    background: pick(PLAYER_AVATAR_BACKGROUNDS, hash, 1),
    flip: false,
    baseColor: pick(PLAYER_AVATAR_BASE_COLORS, hash, 2),
    hair: pick(PLAYER_AVATAR_HAIR, hash, 3),
    hairColor: pick(PLAYER_AVATAR_ACCENT_COLORS, hash, 4),
    eyes: pick(PLAYER_AVATAR_EYES, hash, 5),
    eyeShadowColor: pick(PLAYER_AVATAR_EYE_SHADOW_COLORS, hash, 6),
    eyebrows: pick(PLAYER_AVATAR_EYEBROWS, hash, 7),
    nose: pick(PLAYER_AVATAR_NOSE, hash, 8),
    ears: pick(PLAYER_AVATAR_EARS, hash, 9),
    earrings: pick(PLAYER_AVATAR_EARRINGS, hash, 10),
    earringColor: pick(PLAYER_AVATAR_ACCENT_COLORS, hash, 11),
    glasses: pick(PLAYER_AVATAR_GLASSES, hash, 12),
    glassesColor: pick(PLAYER_AVATAR_ACCENT_COLORS, hash, 13),
    facialHair: pick(PLAYER_AVATAR_FACIAL_HAIR, hash, 14),
    clothes: pick(PLAYER_AVATAR_CLOTHES, hash, 15),
    shirtColor: pick(PLAYER_AVATAR_ACCENT_COLORS, hash, 16),
  };
}

export function normalizePlayerAvatar(value: unknown, fallbackSeed: string): PlayerAvatarConfig {
  const fallback = createDefaultPlayerAvatar(fallbackSeed);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback;

  const candidate = value as Partial<PlayerAvatarConfig>;
  return {
    version: PLAYER_AVATAR_VERSION,
    seed: normalizePlayerAvatarSeed(candidate.seed, fallback.seed),
    background: includesValue(PLAYER_AVATAR_BACKGROUNDS, candidate.background)
      ? candidate.background
      : fallback.background,
    flip: candidate.flip === true,
    baseColor: includesValue(PLAYER_AVATAR_BASE_COLORS, candidate.baseColor)
      ? candidate.baseColor
      : fallback.baseColor,
    hair: includesValue(PLAYER_AVATAR_HAIR, candidate.hair) ? candidate.hair : fallback.hair,
    hairColor: includesValue(PLAYER_AVATAR_ACCENT_COLORS, candidate.hairColor)
      ? candidate.hairColor
      : fallback.hairColor,
    eyes: includesValue(PLAYER_AVATAR_EYES, candidate.eyes) ? candidate.eyes : fallback.eyes,
    eyeShadowColor: includesValue(PLAYER_AVATAR_EYE_SHADOW_COLORS, candidate.eyeShadowColor)
      ? candidate.eyeShadowColor
      : fallback.eyeShadowColor,
    eyebrows: includesValue(PLAYER_AVATAR_EYEBROWS, candidate.eyebrows)
      ? candidate.eyebrows
      : fallback.eyebrows,
    nose: includesValue(PLAYER_AVATAR_NOSE, candidate.nose) ? candidate.nose : fallback.nose,
    ears: includesValue(PLAYER_AVATAR_EARS, candidate.ears) ? candidate.ears : fallback.ears,
    earrings: includesValue(PLAYER_AVATAR_EARRINGS, candidate.earrings)
      ? candidate.earrings
      : fallback.earrings,
    earringColor: includesValue(PLAYER_AVATAR_ACCENT_COLORS, candidate.earringColor)
      ? candidate.earringColor
      : fallback.earringColor,
    glasses: includesValue(PLAYER_AVATAR_GLASSES, candidate.glasses)
      ? candidate.glasses
      : fallback.glasses,
    glassesColor: includesValue(PLAYER_AVATAR_ACCENT_COLORS, candidate.glassesColor)
      ? candidate.glassesColor
      : fallback.glassesColor,
    facialHair: includesValue(PLAYER_AVATAR_FACIAL_HAIR, candidate.facialHair)
      ? candidate.facialHair
      : fallback.facialHair,
    clothes: includesValue(PLAYER_AVATAR_CLOTHES, candidate.clothes)
      ? candidate.clothes
      : fallback.clothes,
    shirtColor: includesValue(PLAYER_AVATAR_ACCENT_COLORS, candidate.shirtColor)
      ? candidate.shirtColor
      : fallback.shirtColor,
  };
}

export function isPlayerAvatarConfig(value: unknown): value is PlayerAvatarConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Partial<PlayerAvatarConfig>;
  return (
    candidate.version === PLAYER_AVATAR_VERSION &&
    typeof candidate.seed === 'string' &&
    normalizePlayerAvatarSeed(candidate.seed) === candidate.seed &&
    includesValue(PLAYER_AVATAR_BACKGROUNDS, candidate.background) &&
    typeof candidate.flip === 'boolean' &&
    includesValue(PLAYER_AVATAR_BASE_COLORS, candidate.baseColor) &&
    includesValue(PLAYER_AVATAR_HAIR, candidate.hair) &&
    includesValue(PLAYER_AVATAR_ACCENT_COLORS, candidate.hairColor) &&
    includesValue(PLAYER_AVATAR_EYES, candidate.eyes) &&
    includesValue(PLAYER_AVATAR_EYE_SHADOW_COLORS, candidate.eyeShadowColor) &&
    includesValue(PLAYER_AVATAR_EYEBROWS, candidate.eyebrows) &&
    includesValue(PLAYER_AVATAR_NOSE, candidate.nose) &&
    includesValue(PLAYER_AVATAR_EARS, candidate.ears) &&
    includesValue(PLAYER_AVATAR_EARRINGS, candidate.earrings) &&
    includesValue(PLAYER_AVATAR_ACCENT_COLORS, candidate.earringColor) &&
    includesValue(PLAYER_AVATAR_GLASSES, candidate.glasses) &&
    includesValue(PLAYER_AVATAR_ACCENT_COLORS, candidate.glassesColor) &&
    includesValue(PLAYER_AVATAR_FACIAL_HAIR, candidate.facialHair) &&
    includesValue(PLAYER_AVATAR_CLOTHES, candidate.clothes) &&
    includesValue(PLAYER_AVATAR_ACCENT_COLORS, candidate.shirtColor)
  );
}
