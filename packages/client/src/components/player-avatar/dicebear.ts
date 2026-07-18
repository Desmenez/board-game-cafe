import { Avatar, Style } from '@dicebear/core';
import micahDefinition from '@dicebear/styles/micah.json';
import { PLAYER_AVATAR_MOUTH, type PlayerAvatarBackground, type PlayerAvatarConfig } from 'shared';

const micahStyle = new Style(micahDefinition);

/*
 * Artwork palette passed to DiceBear's SVG generator. These values are image
 * content, not UI surface colors; the UI itself continues to use Midnight tokens.
 */
const backgroundColors: Record<PlayerAvatarBackground, string> = {
  amber: 'f2c94c',
  sky: '8ecae6',
  sage: 'a7c7a1',
  rose: 'e7a0a0',
};

const avatarDataUriCache = new Map<string, string>();
const MAX_CACHE_ENTRIES = 256;

export function renderPlayerAvatarDataUri(config: PlayerAvatarConfig): string {
  const key = JSON.stringify(config);
  const cached = avatarDataUriCache.get(key);
  if (cached) return cached;

  // DiceBear validates present keys — omit *Variant when probability is 0.
  // Passing `undefined` still fails OptionsValidationError.
  const dataUri = new Avatar(micahStyle, {
    seed: config.seed,
    backgroundColor: backgroundColors[config.background],
    flip: config.flip ? 'horizontal' : 'none',
    borderRadius: 18,
    mouthVariant: [PLAYER_AVATAR_MOUTH],
    baseColor: [config.baseColor],
    hairProbability: config.hair === 'none' ? 0 : 100,
    hairColor: [config.hairColor],
    ...(config.hair === 'none' ? {} : { hairVariant: [config.hair] as const }),
    eyesVariant: [config.eyes],
    eyeShadowColor: [config.eyeShadowColor],
    eyebrowsVariant: [config.eyebrows],
    noseVariant: [config.nose],
    earsVariant: [config.ears],
    earringsProbability: config.earrings === 'none' ? 0 : 100,
    earringColor: [config.earringColor],
    ...(config.earrings === 'none' ? {} : { earringsVariant: [config.earrings] as const }),
    glassesProbability: config.glasses === 'none' ? 0 : 100,
    glassesColor: [config.glassesColor],
    ...(config.glasses === 'none' ? {} : { glassesVariant: [config.glasses] as const }),
    facialHairProbability: config.facialHair === 'none' ? 0 : 100,
    facialHairColor: [config.hairColor],
    ...(config.facialHair === 'none' ? {} : { facialHairVariant: [config.facialHair] as const }),
    clothesVariant: [config.clothes],
    shirtColor: [config.shirtColor],
  }).toDataUri();

  if (avatarDataUriCache.size >= MAX_CACHE_ENTRIES) {
    avatarDataUriCache.clear();
  }
  avatarDataUriCache.set(key, dataUri);
  return dataUri;
}
