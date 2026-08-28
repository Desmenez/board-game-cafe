export type DemoTileFace = 'terrain' | 'effects' | 'abilities';
export type DemoTileAssetKey =
  | 'beach'
  | 'forest'
  | 'mountain'
  | 'shark'
  | 'kaiju'
  | 'raft-effect'
  | 'whirlpool'
  | 'volcano'
  | 'paddle'
  | 'dolphin'
  | 'dive'
  | 'creature-die'
  | 'repellent';

export type DemoTileAssets = Partial<Record<DemoTileAssetKey, string>>;

export type TileDescriptor = {
  key: DemoTileAssetKey;
  label: string;
  className: string;
  /** Cloudinary source width ÷ height, before the board's 90° rotation. */
  sourceAspectRatio: number;
};

export const DEMO_TILES_BY_FACE: Record<DemoTileFace, readonly TileDescriptor[]> = {
  terrain: [
    { key: 'beach', label: 'Beach', className: 'sti-tile--beach', sourceAspectRatio: 576 / 640 },
    { key: 'forest', label: 'Forest', className: 'sti-tile--forest', sourceAspectRatio: 576 / 640 },
    {
      key: 'mountain',
      label: 'Mountain',
      className: 'sti-tile--mountain',
      sourceAspectRatio: 576 / 640,
    },
  ],
  effects: [
    { key: 'shark', label: 'Shark', className: 'sti-tile--shark', sourceAspectRatio: 640 / 552 },
    { key: 'kaiju', label: 'Kaiju', className: 'sti-tile--kaiju', sourceAspectRatio: 640 / 552 },
    {
      key: 'raft-effect',
      label: 'Raft',
      className: 'sti-tile--raft',
      sourceAspectRatio: 639 / 552,
    },
    {
      key: 'whirlpool',
      label: 'Whirlpool',
      className: 'sti-tile--whirlpool',
      sourceAspectRatio: 640 / 552,
    },
    {
      key: 'volcano',
      label: 'Volcano',
      className: 'sti-tile--volcano',
      sourceAspectRatio: 640 / 552,
    },
  ],
  abilities: [
    { key: 'paddle', label: 'Paddle', className: 'sti-tile--paddle', sourceAspectRatio: 639 / 552 },
    {
      key: 'dolphin',
      label: 'Dolphin',
      className: 'sti-tile--dolphin',
      sourceAspectRatio: 640 / 552,
    },
    { key: 'dive', label: 'Dive', className: 'sti-tile--dive', sourceAspectRatio: 640 / 552 },
    {
      key: 'creature-die',
      label: 'Creature die',
      className: 'sti-tile--die',
      sourceAspectRatio: 639 / 552,
    },
    {
      key: 'repellent',
      label: 'Repellent',
      className: 'sti-tile--repellent',
      sourceAspectRatio: 640 / 552,
    },
  ],
};

export function tileFor(face: DemoTileFace, cellId: number, shuffleSeed = 0): TileDescriptor {
  const tiles = DEMO_TILES_BY_FACE[face];
  const mixed = Math.imul(cellId + 1, 1103515245) + Math.imul(shuffleSeed + 1, 12345);
  return tiles[(mixed >>> 0) % tiles.length]!;
}
