import { imageMap } from '../../imageMap';

export const SPY_CARD_URL = imageMap.spyfall.spyCard;
export const CARD_BACK_URL = imageMap.spyfall.cardBack;
export const COVER_URL = imageMap.spyfall.cover;
export const LOCATION_IMAGES = imageMap.spyfall.locations;

export function spyfallLocationImage(locationId: string): string {
  return LOCATION_IMAGES[locationId] ?? '';
}
