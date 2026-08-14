/** Cloudinary public IDs for Modern Art (`board-game-cafe/modern-art/`). */

export type ModernArtArtistId = 'carvalho' | 'thaler' | 'melim' | 'martins' | 'silveira';

export type ModernArtColor = 'yellow' | 'blue' | 'red' | 'green' | 'orange';

/** Auction printed on the painting (double is resolved before bidding). */
export type ModernArtAuctionKind = 'open' | 'once_around' | 'sealed' | 'fixed' | 'double';

/** Left → right on the value board (tie-break: closer to Carvalho ranks higher). */
export const MODERN_ART_ARTISTS: readonly ModernArtArtistId[] = [
  'carvalho',
  'thaler',
  'melim',
  'martins',
  'silveira',
] as const;

export const MODERN_ART_ARTIST_COLOR: Record<ModernArtArtistId, ModernArtColor> = {
  carvalho: 'yellow',
  thaler: 'blue',
  melim: 'red',
  martins: 'green',
  silveira: 'orange',
};

export const MODERN_ART_COLOR_ARTIST: Record<ModernArtColor, ModernArtArtistId> = {
  yellow: 'carvalho',
  blue: 'thaler',
  red: 'melim',
  green: 'martins',
  orange: 'silveira',
};

export function modernArtArtistLabel(id: ModernArtArtistId): string {
  switch (id) {
    case 'carvalho':
      return 'Manuel Carvalho';
    case 'thaler':
      return 'Sigrid Thaler';
    case 'melim':
      return 'Daniel Melim';
    case 'martins':
      return 'Ramon Martins';
    case 'silveira':
      return 'Rafael Silveira';
  }
}

export function modernArtAuctionLabelTh(kind: ModernArtAuctionKind): string {
  switch (kind) {
    case 'open':
      return 'ประมูลเปิด';
    case 'once_around':
      return 'รอบเดียว';
    case 'sealed':
      return 'ประมูลลับ';
    case 'fixed':
      return 'ราคาคงที่';
    case 'double':
      return 'ประมูลคู่';
  }
}

export const MODERN_ART_COVER = { version: 'v1786588433', publicId: 'cover_w0lfcn' } as const;
export const MODERN_ART_CARD_BACK = { version: 'v1786588433', publicId: 'back-card_dkutgs' } as const;
export const MODERN_ART_BOARD = { version: 'v1786594679', publicId: 'board_xivvrx' } as const;

export const MODERN_ART_VALUE_TILES = {
  10: { version: 'v1786588432', publicId: '10_jpmgxi' },
  20: { version: 'v1786588432', publicId: '20_tren6a' },
  30: { version: 'v1786588432', publicId: '30_rljqsr' },
} as const;

export type ModernArtValueAmount = 10 | 20 | 30;

export interface ModernArtPaintingArt {
  artist: ModernArtArtistId;
  auction: ModernArtAuctionKind;
  copy: number;
  version: string;
  publicId: string;
}

const CLOUD = 'https://res.cloudinary.com/dpkqjlk3g/image/upload/q_auto/f_auto';

export function modernArtImageUrl(version: string, publicId: string): string {
  return `${CLOUD}/${version}/${publicId}`;
}

export function modernArtCoverUrl(): string {
  return modernArtImageUrl(MODERN_ART_COVER.version, MODERN_ART_COVER.publicId);
}

export function modernArtBoardUrl(): string {
  return modernArtImageUrl(MODERN_ART_BOARD.version, MODERN_ART_BOARD.publicId);
}

export function modernArtCardBackUrl(): string {
  return modernArtImageUrl(MODERN_ART_CARD_BACK.version, MODERN_ART_CARD_BACK.publicId);
}

export function modernArtValueTileUrl(amount: ModernArtValueAmount): string {
  const t = MODERN_ART_VALUE_TILES[amount];
  return modernArtImageUrl(t.version, t.publicId);
}

/** 68 paintings currently on Cloudinary (Martins 13 vs 15 in the printed deck). */
export const MODERN_ART_PAINTINGS: readonly ModernArtPaintingArt[] = [
  { artist: 'thaler', auction: 'double', copy: 1, version: 'v1786588433', publicId: 'blue-double-auction-1_qoosnv' },
  { artist: 'thaler', auction: 'double', copy: 2, version: 'v1786588432', publicId: 'blue-double-auction-2_usnfgv' },
  { artist: 'thaler', auction: 'fixed', copy: 1, version: 'v1786588433', publicId: 'blue-fixed-price-1_kkrelv' },
  { artist: 'thaler', auction: 'fixed', copy: 2, version: 'v1786588433', publicId: 'blue-fixed-price-2_ea7buf' },
  { artist: 'thaler', auction: 'fixed', copy: 3, version: 'v1786588433', publicId: 'blue-fixed-price-3_bq2gzb' },
  { artist: 'thaler', auction: 'sealed', copy: 1, version: 'v1786588439', publicId: 'blue-hidden-auction-1_zxczft' },
  { artist: 'thaler', auction: 'sealed', copy: 2, version: 'v1786588434', publicId: 'blue-hidden-auction-2_qycnkj' },
  { artist: 'thaler', auction: 'sealed', copy: 3, version: 'v1786588434', publicId: 'blue-hidden-auction-3_nqrpv8' },
  { artist: 'thaler', auction: 'once_around', copy: 1, version: 'v1786588434', publicId: 'blue-one-offer-1_nvd8th' },
  { artist: 'thaler', auction: 'once_around', copy: 2, version: 'v1786588439', publicId: 'blue-one-offer-2_n6gm7t' },
  { artist: 'thaler', auction: 'open', copy: 1, version: 'v1786588437', publicId: 'blue-open-auction-1_w3dkcf' },
  { artist: 'thaler', auction: 'open', copy: 2, version: 'v1786588436', publicId: 'blue-open-auction-2_myvvkv' },
  { artist: 'thaler', auction: 'open', copy: 3, version: 'v1786588435', publicId: 'blue-open-auction-3_fbb81c' },

  { artist: 'martins', auction: 'double', copy: 1, version: 'v1786588434', publicId: 'green-double-auction-1_qtnlb1' },
  { artist: 'martins', auction: 'double', copy: 2, version: 'v1786588434', publicId: 'green-double-auction-2_xi85mw' },
  { artist: 'martins', auction: 'fixed', copy: 1, version: 'v1786588436', publicId: 'green-fixed-price-1_g72w0e' },
  { artist: 'martins', auction: 'fixed', copy: 2, version: 'v1786588434', publicId: 'green-fixed-price-2_zcch2q' },
  { artist: 'martins', auction: 'fixed', copy: 3, version: 'v1786588434', publicId: 'green-fixed-price-3_cqnuja' },
  { artist: 'martins', auction: 'sealed', copy: 1, version: 'v1786588437', publicId: 'green-hidden-auction-1_ovz6k0' },
  { artist: 'martins', auction: 'sealed', copy: 2, version: 'v1786588437', publicId: 'green-hidden-auction-2_qux9rx' },
  { artist: 'martins', auction: 'sealed', copy: 3, version: 'v1786588436', publicId: 'green-hidden-auction-3_rfc6zg' },
  { artist: 'martins', auction: 'once_around', copy: 1, version: 'v1786588437', publicId: 'green-one-offer-1_niossz' },
  { artist: 'martins', auction: 'once_around', copy: 2, version: 'v1786588435', publicId: 'green-one-offer-2_oa4ww3' },
  { artist: 'martins', auction: 'open', copy: 1, version: 'v1786588438', publicId: 'green-open-auction-1_abyxzr' },
  { artist: 'martins', auction: 'open', copy: 2, version: 'v1786588436', publicId: 'green-open-auction-2_vjk4dy' },
  { artist: 'martins', auction: 'open', copy: 3, version: 'v1786588438', publicId: 'green-open-auction-3_p7gklr' },

  { artist: 'silveira', auction: 'double', copy: 1, version: 'v1786588439', publicId: 'orange-double-auction-1_y87t7g' },
  { artist: 'silveira', auction: 'double', copy: 2, version: 'v1786588438', publicId: 'orange-double-auction-2_gokfma' },
  { artist: 'silveira', auction: 'double', copy: 3, version: 'v1786588438', publicId: 'orange-double-auction-3_obptap' },
  { artist: 'silveira', auction: 'fixed', copy: 1, version: 'v1786588439', publicId: 'orange-fixed-price-1_bktabe' },
  { artist: 'silveira', auction: 'fixed', copy: 2, version: 'v1786588439', publicId: 'orange-fixed-price-2_yudmfv' },
  { artist: 'silveira', auction: 'fixed', copy: 3, version: 'v1786588440', publicId: 'orange-fixed-price-3_izqn4o' },
  { artist: 'silveira', auction: 'sealed', copy: 1, version: 'v1786588439', publicId: 'orange-hidden-auction-1_w5ifac' },
  { artist: 'silveira', auction: 'sealed', copy: 2, version: 'v1786588440', publicId: 'orange-hidden-auction-2_abbx5n' },
  { artist: 'silveira', auction: 'sealed', copy: 3, version: 'v1786588441', publicId: 'orange-hidden-auction-3_lrqcnu' },
  { artist: 'silveira', auction: 'once_around', copy: 1, version: 'v1786588440', publicId: 'orange-one-offer-1_jnw4rr' },
  { artist: 'silveira', auction: 'once_around', copy: 2, version: 'v1786588441', publicId: 'orange-one-offer-2_ds34jc' },
  { artist: 'silveira', auction: 'once_around', copy: 3, version: 'v1786588441', publicId: 'orange-one-offer-3_cor2rq' },
  { artist: 'silveira', auction: 'open', copy: 1, version: 'v1786588442', publicId: 'orange-open-auction-1_tuodcd' },
  { artist: 'silveira', auction: 'open', copy: 2, version: 'v1786588442', publicId: 'orange-open-auction-2_bqogn5' },
  { artist: 'silveira', auction: 'open', copy: 3, version: 'v1786588441', publicId: 'orange-open-auction-3_xnx0ln' },
  { artist: 'silveira', auction: 'open', copy: 4, version: 'v1786588442', publicId: 'orange-open-auction-4_ohllsd' },

  { artist: 'melim', auction: 'double', copy: 1, version: 'v1786588442', publicId: 'red-double-auction-1_njrop7' },
  { artist: 'melim', auction: 'double', copy: 2, version: 'v1786588444', publicId: 'red-double-auction-2_gjyifp' },
  { artist: 'melim', auction: 'fixed', copy: 1, version: 'v1786588443', publicId: 'red-fixed-price-1_t8rgcb' },
  { artist: 'melim', auction: 'fixed', copy: 2, version: 'v1786588443', publicId: 'red-fixed-price-2_y8xdzt' },
  { artist: 'melim', auction: 'fixed', copy: 3, version: 'v1786588444', publicId: 'red-fixed-price-3_xtytvp' },
  { artist: 'melim', auction: 'sealed', copy: 1, version: 'v1786588444', publicId: 'red-hidden-auction-1_ry0kma' },
  { artist: 'melim', auction: 'sealed', copy: 2, version: 'v1786588444', publicId: 'red-hidden-auction-2_bdwanw' },
  { artist: 'melim', auction: 'sealed', copy: 3, version: 'v1786588444', publicId: 'red-hidden-auction-3_uwdgte' },
  { artist: 'melim', auction: 'once_around', copy: 1, version: 'v1786588444', publicId: 'red-one-offer-1_jwhodm' },
  { artist: 'melim', auction: 'once_around', copy: 2, version: 'v1786588444', publicId: 'red-one-offer-2_j9zv9x' },
  { artist: 'melim', auction: 'once_around', copy: 3, version: 'v1786588445', publicId: 'red-one-offer-3_kc5wrz' },
  { artist: 'melim', auction: 'open', copy: 1, version: 'v1786588445', publicId: 'red-open-auction-1_upgmsq' },
  { artist: 'melim', auction: 'open', copy: 2, version: 'v1786588445', publicId: 'red-open-auction-2_nnbuz5' },
  { artist: 'melim', auction: 'open', copy: 3, version: 'v1786588445', publicId: 'red-open-auction-3_uacn9h' },

  { artist: 'carvalho', auction: 'double', copy: 1, version: 'v1786588446', publicId: 'yellow-double-auction-1_xlaka3' },
  { artist: 'carvalho', auction: 'double', copy: 2, version: 'v1786588446', publicId: 'yellow-double-auction-2_vmrthl' },
  { artist: 'carvalho', auction: 'fixed', copy: 1, version: 'v1786588446', publicId: 'yellow-fixed-price-1_wzz595' },
  { artist: 'carvalho', auction: 'fixed', copy: 2, version: 'v1786588447', publicId: 'yellow-fixed-price-2_zdte3j' },
  { artist: 'carvalho', auction: 'sealed', copy: 1, version: 'v1786588448', publicId: 'yellow-hidden-auction-1_fqwpfi' },
  { artist: 'carvalho', auction: 'sealed', copy: 2, version: 'v1786588449', publicId: 'yellow-hidden-auction-2_m3rxqv' },
  { artist: 'carvalho', auction: 'once_around', copy: 1, version: 'v1786588448', publicId: 'yellow-one-offer-1_duhszx' },
  { artist: 'carvalho', auction: 'once_around', copy: 2, version: 'v1786588447', publicId: 'yellow-one-offer-2_ddbkye' },
  { artist: 'carvalho', auction: 'once_around', copy: 3, version: 'v1786588448', publicId: 'yellow-one-offer-3_xqim2u' },
  { artist: 'carvalho', auction: 'open', copy: 1, version: 'v1786588449', publicId: 'yellow-open-auction-1_hhjrcy' },
  { artist: 'carvalho', auction: 'open', copy: 2, version: 'v1786588448', publicId: 'yellow-open-auction-2_eqilwm' },
  { artist: 'carvalho', auction: 'open', copy: 3, version: 'v1786588448', publicId: 'yellow-open-auction-3_ajwuxr' },
];
