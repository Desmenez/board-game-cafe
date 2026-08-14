import { MODERN_ART_PAINTINGS } from './assets.js';
import type { ModernArtCard } from './types.js';

export function buildModernArtDeck(): ModernArtCard[] {
  return MODERN_ART_PAINTINGS.map((p) => ({
    id: p.publicId,
    artist: p.artist,
    auction: p.auction,
    copy: p.copy,
  }));
}

export function modernArtPaintingArtOf(card: ModernArtCard) {
  return MODERN_ART_PAINTINGS.find((p) => p.publicId === card.id) ?? null;
}
