/** Cloudinary public IDs + versions for Skull art (folder `board-game-cafe/skull/`). */

export const SKULL_COLORS = ['red', 'purple', 'orange', 'green', 'brown', 'blue'] as const;
export type SkullColor = (typeof SKULL_COLORS)[number];

export const SKULL_COVER = { version: 'v1786463810', publicId: 'cover_cscorr' } as const;

export const SKULL_CENTER = { version: 'v1786463504', publicId: 'center-skull_hg6vid' } as const;

/** Mat: `back` = blank (0 wins), `front` = flower (1 win). */
export const SKULL_MAT_ART: Record<
  SkullColor,
  { front: { version: string; publicId: string }; back: { version: string; publicId: string } }
> = {
  red: {
    front: { version: 'v1786463170', publicId: 'red-front_udgvaw' },
    back: { version: 'v1786463169', publicId: 'red-back_hjn6iz' },
  },
  purple: {
    front: { version: 'v1786463169', publicId: 'purple-front_zmcioz' },
    back: { version: 'v1786463168', publicId: 'purple-back_wxg7w9' },
  },
  orange: {
    front: { version: 'v1786463168', publicId: 'orange-front_unle32' },
    back: { version: 'v1786463167', publicId: 'orange-back_imhbil' },
  },
  green: {
    front: { version: 'v1786463167', publicId: 'green-front_mtzku7' },
    back: { version: 'v1786463167', publicId: 'green-back_upilne' },
  },
  brown: {
    front: { version: 'v1786463167', publicId: 'brown-front_ckyfrn' },
    back: { version: 'v1786463166', publicId: 'brown-back_jypa28' },
  },
  blue: {
    front: { version: 'v1786463167', publicId: 'blue-front_kuxmv8' },
    back: { version: 'v1786463166', publicId: 'blue-back_tzcfk2' },
  },
};

export const SKULL_COASTER_ART: Record<
  SkullColor,
  {
    flower: { version: string; publicId: string };
    skull: { version: string; publicId: string };
    back: { version: string; publicId: string };
  }
> = {
  red: {
    flower: { version: 'v1786463580', publicId: 'red-flower_k1iloq' },
    skull: { version: 'v1786463584', publicId: 'red-skull_bowvpc' },
    back: { version: 'v1786463583', publicId: 'red-back_j4igx9' },
  },
  purple: {
    flower: { version: 'v1786463585', publicId: 'purple-flower_offtny' },
    skull: { version: 'v1786463582', publicId: 'purple-skull_ffndsw' },
    back: { version: 'v1786463577', publicId: 'purple-back_kvbvtw' },
  },
  orange: {
    flower: { version: 'v1786463578', publicId: 'orange-flower_mnpwyi' },
    skull: { version: 'v1786463589', publicId: 'orange-skull_oded8y' },
    back: { version: 'v1786463579', publicId: 'orange-back_hfottg' },
  },
  green: {
    flower: { version: 'v1786463586', publicId: 'green-flower_oqrwae' },
    skull: { version: 'v1786463576', publicId: 'green-skull_gmyqlh' },
    back: { version: 'v1786463588', publicId: 'green-back_d4dqwj' },
  },
  brown: {
    flower: { version: 'v1786463575', publicId: 'brown-flower_gikbrm' },
    skull: { version: 'v1786463587', publicId: 'brown-skull_xwblvr' },
    back: { version: 'v1786463581', publicId: 'brown-back_htiyft' },
  },
  blue: {
    flower: { version: 'v1786463565', publicId: 'blue-flower_gbr3xm' },
    skull: { version: 'v1786463566', publicId: 'blue-skull_zhhjei' },
    back: { version: 'v1786463564', publicId: 'blue-back_t6dyud' },
  },
};
