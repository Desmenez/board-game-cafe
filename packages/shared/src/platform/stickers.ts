/**
 * Default in-game sticker pack (Cloudinary folder
 * `board-game-cafe-achievements/default-stickers`).
 * Logged-in players can send these during play; reactions are ephemeral.
 */

const CLOUDINARY_IMAGE = 'https://res.cloudinary.com/dpkqjlk3g/image/upload';

/** Pin a shared upload-batch version for delivery URLs. */
export const DEFAULT_STICKERS_CLOUD_VERSION = 'v1785931461';

export interface StickerDef {
  id: string;
  label: string;
  imageUrl: string;
}

function stickerUrl(publicId: string, version: string): string {
  return `${CLOUDINARY_IMAGE}/q_auto/f_auto/${version}/${publicId}.png`;
}

export const DEFAULT_STICKERS: readonly StickerDef[] = [
  {
    id: 'thinking',
    label: 'Thinking',
    imageUrl: stickerUrl('thinking_yo7e1t', 'v1785931449'),
  },
  {
    id: 'yeah',
    label: 'Yeah',
    imageUrl: stickerUrl('yeah_pjaboh', 'v1785931450'),
  },
  {
    id: 'hurry-up',
    label: 'Hurry up',
    imageUrl: stickerUrl('hurry-up_r9qcxt', 'v1785931451'),
  },
  {
    id: 'oops',
    label: 'Oops',
    imageUrl: stickerUrl('oops_d0bvas', 'v1785931452'),
  },
  {
    id: 'what-happen',
    label: 'What happen',
    imageUrl: stickerUrl('what-happen_dw8lwi', 'v1785931453'),
  },
  {
    id: 'laugh',
    label: 'Laugh',
    imageUrl: stickerUrl('laugh_cpw6rd', 'v1785931457'),
  },
  {
    id: 'lucky',
    label: 'Lucky',
    imageUrl: stickerUrl('lucky_u7btth', 'v1785931459'),
  },
  {
    id: 'mad',
    label: 'Mad',
    imageUrl: stickerUrl('mad_fimmrb', 'v1785931459'),
  },
  {
    id: 'nice-play',
    label: 'Nice play',
    imageUrl: stickerUrl('nice-play_kcd0fc', 'v1785931460'),
  },
  {
    id: 'not-trust',
    label: 'Not trust',
    imageUrl: stickerUrl('not-trust_smppb7', 'v1785931461'),
  },
];

const STICKER_BY_ID = new Map(DEFAULT_STICKERS.map((s) => [s.id, s]));

export function getStickerDef(id: string | null | undefined): StickerDef | undefined {
  if (!id) return undefined;
  return STICKER_BY_ID.get(id);
}

export function isKnownStickerId(id: string): boolean {
  return STICKER_BY_ID.has(id);
}
