import {
  modernArtCardBackUrl,
  modernArtImageUrl,
  modernArtPaintingArtOf,
  type ModernArtCard,
} from 'shared';

export const MODERN_ART_CARD_RATIO = 630 / 945;

export function modernArtPaintingUrl(card: ModernArtCard): string {
  const art = modernArtPaintingArtOf(card);
  if (!art) return modernArtCardBackUrl();
  return modernArtImageUrl(art.version, art.publicId);
}

export function modernArtPaintingAlt(card: ModernArtCard): string {
  const art = modernArtPaintingArtOf(card);
  return art ? `${art.artist} ${art.auction} ${art.copy}` : 'ภาพวาด';
}
