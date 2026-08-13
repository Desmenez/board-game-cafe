/** Cloudinary public IDs + versions for Spicy (folder `board-game-cafe/spicy/`). */

export const SPICY_CLOUD_VERSION = 'v1786499428' as const;

export type SpicySpice = 'chili' | 'wasabi' | 'pepper';

/** File color prefix → spice. */
export const SPICY_SPICE_COLOR: Record<SpicySpice, 'red' | 'green' | 'blue'> = {
  chili: 'red',
  wasabi: 'green',
  pepper: 'blue',
};

export const SPICY_COVER = { version: 'v1786499432', publicId: 'cover_srvw81' } as const;
export const SPICY_CARD_BACK = { version: 'v1786499428', publicId: 'back-card_wkijjg' } as const;
export const SPICY_TROPHY = { version: 'v1786499439', publicId: 'trophy-card_mdcvxi' } as const;
export const SPICY_TROPHY_BACK = {
  version: 'v1786499439',
  publicId: 'trophy-back-card_gv5hag',
} as const;
export const SPICY_WORLDS_END = {
  version: 'v1786499440',
  publicId: 'world-end-card_smpfuk',
} as const;
export const SPICY_WORLDS_END_BACK = {
  version: 'v1786499440',
  publicId: 'world-end-back-card_ghxa1n',
} as const;

/** Wild number (shows 1–10). */
export const SPICY_WILD_NUMBER = { version: 'v1786499428', publicId: '1-10_jnoml5' } as const;
/** Wild spice (all spices) — Cloudinary name is opaque. */
export const SPICY_WILD_SPICE = { version: 'v1786499430', publicId: 'cards__31_qwliua' } as const;

const NUMBER_VERSION: Record<number, string> = {
  1: 'v1786499428',
  2: 'v1786499428',
  3: 'v1786499428',
  4: 'v1786499428',
  5: 'v1786499429',
  6: 'v1786499429',
  7: 'v1786499429',
  8: 'v1786499429',
  9: 'v1786499429',
  10: 'v1786499429',
};

const GREEN_NUMBER_VERSION: Record<number, string> = {
  1: 'v1786499431',
  2: 'v1786499430',
  3: 'v1786499431',
  4: 'v1786499430',
  5: 'v1786499432',
  6: 'v1786499432',
  7: 'v1786499432',
  8: 'v1786499433',
  9: 'v1786499433',
  10: 'v1786499433',
};

const RED_NUMBER_VERSION: Record<number, string> = {
  1: 'v1786499434',
  2: 'v1786499434',
  3: 'v1786499434',
  4: 'v1786499435',
  5: 'v1786499435',
  6: 'v1786499435',
  7: 'v1786499436',
  8: 'v1786499436',
  9: 'v1786499437',
  10: 'v1786499436',
};

const BLUE_PUBLIC: Record<number, string> = {
  1: 'blue-1_stcpvs',
  2: 'blue-2_ovvlrp',
  3: 'blue-3_eym82v',
  4: 'blue-4_ssqbfw',
  5: 'blue-5_sw33nd',
  6: 'blue-6_l2vted',
  7: 'blue-7_zwqipd',
  8: 'blue-8_mpwpmi',
  9: 'blue-9_seud2j',
  10: 'blue-10_uvjmbp',
};

const GREEN_PUBLIC: Record<number, string> = {
  1: 'green-1_z5tcgf',
  2: 'green-2_f4btzp',
  3: 'green-3_noqj6k',
  4: 'green-4_jo8vps',
  5: 'green-5_jxupib',
  6: 'green-6_lekole',
  7: 'green-7_gkrz4m',
  8: 'green-8_antt2z',
  9: 'green-9_quczer',
  10: 'green-10_aovdyn',
};

const RED_PUBLIC: Record<number, string> = {
  1: 'red-1_isvsoh',
  2: 'red-2_ttf1pk',
  3: 'red-3_jqbyrn',
  4: 'red-4_iffuyk',
  5: 'red-5_ubvqks',
  6: 'red-6_bbz60x',
  7: 'red-7_pofcje',
  8: 'red-8_pnmdko',
  9: 'red-9_qmvyiu',
  10: 'red-10_ebktmv',
};

export function spicyNumberCardArt(
  spice: SpicySpice,
  n: number,
): { version: string; publicId: string } {
  const color = SPICY_SPICE_COLOR[spice];
  if (color === 'red') {
    return { version: RED_NUMBER_VERSION[n]!, publicId: RED_PUBLIC[n]! };
  }
  if (color === 'green') {
    return { version: GREEN_NUMBER_VERSION[n]!, publicId: GREEN_PUBLIC[n]! };
  }
  return { version: NUMBER_VERSION[n]!, publicId: BLUE_PUBLIC[n]! };
}

export type SpicySpecialId =
  | 'we_love_chili'
  | 'start_it_up'
  | 'spice_raider'
  | 'change_your_luck'
  | 'turn_it_up'
  | 'copy_cat';

export const SPICY_SPECIAL_ART: Record<
  SpicySpecialId,
  { version: string; publicId: string }
> = {
  we_love_chili: { version: 'v1786499437', publicId: 'special-1-3_p18ezi' },
  start_it_up: { version: 'v1786499437', publicId: 'special-1-3-8-10_nbd7ac' },
  spice_raider: { version: 'v1786499438', publicId: 'special-4_do5xmd' },
  change_your_luck: { version: 'v1786499438', publicId: 'special-5_eb9kyy' },
  turn_it_up: { version: 'v1786499437', publicId: 'special-6_9_pp6dkq' },
  copy_cat: { version: 'v1786499439', publicId: 'special-_dsevu7' },
};

export const SPICY_SPECIAL_BACK = {
  version: 'v1786499439',
  publicId: 'special-back-card_zmyvxz',
} as const;

export const SPICY_SPECIAL_IDS: SpicySpecialId[] = [
  'we_love_chili',
  'start_it_up',
  'spice_raider',
  'change_your_luck',
  'turn_it_up',
  'copy_cat',
];

export function spicySpecialLabelTh(id: SpicySpecialId): string {
  switch (id) {
    case 'we_love_chili':
      return 'We Love Chili!';
    case 'start_it_up':
      return 'Start It Up!';
    case 'spice_raider':
      return 'Spice Raider';
    case 'change_your_luck':
      return 'Change Your Luck';
    case 'turn_it_up':
      return 'Turn It Up!';
    case 'copy_cat':
      return 'Copy Cat';
  }
}

export function spicySpiceLabelTh(spice: SpicySpice): string {
  switch (spice) {
    case 'chili':
      return 'พริก';
    case 'wasabi':
      return 'วาซาบิ';
    case 'pepper':
      return 'พริกไทย';
  }
}
