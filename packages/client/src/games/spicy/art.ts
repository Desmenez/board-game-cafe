import {
  SPICY_CARD_BACK,
  SPICY_SPECIAL_ART,
  SPICY_TROPHY,
  SPICY_WILD_NUMBER,
  SPICY_WILD_SPICE,
  SPICY_WORLDS_END,
  spicyNumberCardArt,
  spicySpiceLabelTh,
  type SpicyCard,
  type SpicySpecialId,
} from 'shared';

const CLOUD = 'https://res.cloudinary.com/dpkqjlk3g/image/upload/q_auto/f_auto';

function artUrl(version: string, publicId: string): string {
  return `${CLOUD}/${version}/${publicId}`;
}

export function spicyCardBackUrl(): string {
  return artUrl(SPICY_CARD_BACK.version, SPICY_CARD_BACK.publicId);
}

export function spicyTrophyUrl(): string {
  return artUrl(SPICY_TROPHY.version, SPICY_TROPHY.publicId);
}

export function spicyWorldsEndUrl(): string {
  return artUrl(SPICY_WORLDS_END.version, SPICY_WORLDS_END.publicId);
}

export function spicySpecialUrl(id: SpicySpecialId): string {
  const a = SPICY_SPECIAL_ART[id];
  return artUrl(a.version, a.publicId);
}

export function spicyCardFaceUrl(card: SpicyCard): string {
  if (card.kind === 'wild_number') {
    return artUrl(SPICY_WILD_NUMBER.version, SPICY_WILD_NUMBER.publicId);
  }
  if (card.kind === 'wild_spice') {
    return artUrl(SPICY_WILD_SPICE.version, SPICY_WILD_SPICE.publicId);
  }
  const a = spicyNumberCardArt(card.spice!, card.number!);
  return artUrl(a.version, a.publicId);
}

export function spicyCardLabelTh(card: SpicyCard): string {
  if (card.kind === 'wild_number') return 'Wild เลข';
  if (card.kind === 'wild_spice') return 'Wild เครื่องเทศ';
  return `${card.number} ${spicySpiceLabelTh(card.spice!)}`;
}
