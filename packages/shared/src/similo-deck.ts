/** Cloudinary folder version for Similo animal deck art. */
export const SIMILO_ANIMALS_CLOUD_VERSION = 'v1779598181';

export const SIMILO_CARD_BACK_PUBLIC_ID = 'back-card_zyr5sv';

/** Playable character public IDs (face art). */
export const SIMILO_ANIMAL_CHARACTER_PUBLIC_IDS = [
  'bear_nyzp7n',
  'cat_voppvb',
  'fox_pebsty',
  'beaver_cyfevy',
  'donkey_ytmr2q',
  'dog_e51gsc',
  'frog_b6oxcu',
  'cow_dgsnap',
  'deer_rkxds0',
  'chicken_iv7lsy',
  'goose_fuiz6t',
  'hawk_ewqpbt',
  'horse_bc18ar',
  'lizard_zwkglx',
  'mouse_sxtelx',
  'hedgehog_wii2ux',
  'otter_gmvnas',
  'owl_yxsn1o',
  'peacock_mwdbbr',
  'pig_ye5y9w',
  'rabbit_sm0iqt',
  'raven_x0pisx',
  'robin_adoxce',
  'skunk_unacsn',
  'sheep_ahj6nh',
  'snake_n6cvby',
  'squirrel_xqyofw',
  'turtle_tedijn',
  'wolf_bl31wa',
  'woodpecker_bnklpc',
] as const;

export type SimiloAnimalPublicId = (typeof SIMILO_ANIMAL_CHARACTER_PUBLIC_IDS)[number];

const CLOUD_NAME = 'dpkqjlk3g';

/** Portrait card artwork size (width × height). */
export const SIMILO_CARD_ASPECT_WIDTH = 600;
export const SIMILO_CARD_ASPECT_HEIGHT = 909;

export function similoAnimalImageUrl(publicId: string): string {
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/q_auto/f_auto/${SIMILO_ANIMALS_CLOUD_VERSION}/${publicId}.jpg`;
}

export function similoCardBackImageUrl(): string {
  return similoAnimalImageUrl(SIMILO_CARD_BACK_PUBLIC_ID);
}

/** Display label from public id, e.g. `woodpecker_bnklpc` → `woodpecker`. */
export function similoCharacterLabel(publicId: string): string {
  const base = publicId.split('_')[0]?.trim();
  if (!base || base === 'back-card') return publicId;
  return base;
}

export function formatSimiloCharacterLabel(publicId: string): string {
  const raw = similoCharacterLabel(publicId);
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}
