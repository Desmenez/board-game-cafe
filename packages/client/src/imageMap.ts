import type { AvalonRole, ExplodingKittensCardType, SheriffCard } from 'shared';

const cloudName = 'dpkqjlk3g';
const cloudinaryBase = cloudName
  ? `https://res.cloudinary.com/${cloudName}/image/upload/q_auto/f_auto`
  : '';

function cloudinaryImage(publicId: string): string {
  return cloudinaryBase ? `${cloudinaryBase}/${publicId}` : '';
}

/** Sheriff of Nottingham — หัว Sheriff ข้างแถวผู้เล่น */
export const sheriffHeadImageUrl = cloudinaryImage('v1775815360/sheriff-head_ykpuuy');

/** Distinct Loyal Servant arts — order must match `AVALON_LOYAL_SERVANT_PORTRAIT_COUNT` on server. */
export const loyalServantPortraitUrls = [
  cloudinaryImage('v1774628592/loyal-servant_xuywyw'),
  cloudinaryImage('v1774628592/loyal-servant-2_t9bjw4'),
  cloudinaryImage('v1774628592/loyal-servant-3_vprffq'),
  cloudinaryImage('v1774628592/loyal-servant-4_gtwgva'),
  cloudinaryImage('v1774628592/loyal-servant-5_egpnd6'),
] as const;

/** Distinct Minion arts — order must match `AVALON_MINION_PORTRAIT_COUNT` on server. */
export const minionPortraitUrls = [
  cloudinaryImage('v1774628592/minion-of-mordred_y0gw59'),
  cloudinaryImage('v1774628592/minion-of-mordred-2_xmu2c5'),
  cloudinaryImage('v1774628592/minion-of-mordred-3_zimupu'),
] as const;

const AVALON_STATIC_ROLE_PORTRAITS: Record<
  Exclude<AvalonRole, 'loyal_servant' | 'minion'>,
  string
> = {
  merlin: cloudinaryImage('v1774628592/merlin_rxlhn5'),
  percival: cloudinaryImage('v1774628592/percival_ikzpaa'),
  lancelot_loyal: cloudinaryImage('v1774628592/lancelot-loyal_sqzq54'),
  assassin: cloudinaryImage('v1774628592/assassin_h5y9qq'),
  morgana: cloudinaryImage('v1774628592/morgana_sfhgjv'),
  mordred: cloudinaryImage('v1774628592/mordred_gzlrp7'),
  oberon: cloudinaryImage('v1774628592/oberon_fmvdxm'),
  lancelot_evil: cloudinaryImage('v1774628592/lancelot-minion_zpskfc'),
};

/** Card art URL for a role; `portraitVariant` indexes variant pools for loyal_servant / minion. */
export function getAvalonRolePortraitUrl(role: AvalonRole, portraitVariant?: number): string {
  const v = portraitVariant ?? 0;
  if (role === 'loyal_servant') {
    const list = loyalServantPortraitUrls;
    return list[Math.min(v, list.length - 1)]!;
  }
  if (role === 'minion') {
    const list = minionPortraitUrls;
    return list[Math.min(v, list.length - 1)]!;
  }
  return AVALON_STATIC_ROLE_PORTRAITS[role];
}

export const imageMap = {
  avalon: {
    cover: cloudinaryImage('v1774628592/cover_pkoxtl'),
    roleCardBack: cloudinaryImage('v1774628592/back-card_s1utxg'),
    role: {
      ...AVALON_STATIC_ROLE_PORTRAITS,
      loyalServantPortraits: loyalServantPortraitUrls,
      minionPortraits: minionPortraitUrls,
    },
    quest: {
      success: cloudinaryImage('v1774628592/success_vfhocc'),
      fail: cloudinaryImage('v1774628592/fail_uz50fd'),
    },
    /** Subtle guard art — team vote “ไป Quest” cards (and similar UI) */
    questHistoryGuard: cloudinaryImage('v1774631535/guard_p4mgx6'),
    /** Lady of the Lake — โมดัลประกาศ */
    ladyOfTheLake: cloudinaryImage('v1774628592/lady-of-the-lake_w2mh7u'),
  },

  /** Exploding Kittens — Cloudinary upload version `v1774699068` */
  explodingKittens: (() => {
    const v = 'v1774699068';
    const ek = (publicId: string) => cloudinaryImage(`${v}/${publicId}`);
    const cards = {
      exploding_kitten: ek('exploding_r3byrt'),
      defuse: ek('defuse_vn9ayz'),
      attack: ek('attack_wvtr8b'),
      skip: ek('skip_rjws3b'),
      shuffle: ek('shuffle_jffsvu'),
      see_future: ek('see-the-future_ul128y'),
      favor: ek('favor_ghdwrg'),
      targeted_attack: ek('targeted-attack-2x_ooqqer'),
      draw_from_bottom: ek('draw-from-the-bottom_ajbfbn'),
      alter_future: ek('alter-the-future_w5lpxt'),
      nope: ek('nope_yfs5xr'),
      feral_cat: ek('feral-cat_psabha'),
      cat_taco: ek('tacocat_yjshrw'),
      cat_melon: ek('cattermelon_f7t7it'),
      cat_beard: ek('beard-cat_krqkrp'),
      cat_rainbow: ek('rainbow-ralphing-cat_lokj5x'),
      cat_potato: ek('hairy-potato-cat_jkerzf'),
      barking_kitten: ek('barking-kitten_mgl5pk'),
      bury: ek('bury_buesbc'),
      ill_take_that: ek('i-will-take-that_xy9rx5'),
      personal_attack_3x: ek('personal-attack_kteilp'),
      potluck: ek('potluck_ruakex'),
      share_future_3x: ek('share-the-future_fay5in'),
      super_skip: ek('super-skip_x4od8o'),
      tower_of_power: ek('tower-of-power_azmvxz'),
      alter_future_now: ek('alter-the-future-now_higdsg'),
    } satisfies Record<ExplodingKittensCardType, string>;
    return {
      cover: ek('cover_awa2ej'),
      cardBack: ek('back-card_hsyivz'),
      /** GIF ระเบิด — อัปโหลดคนละเวอร์ชันกับการ์ด jpg (`v1774699047`) */
      catExplode: cloudinaryImage('v1774699047/cat-explode_n7ms0t.gif'),
      cards,
    };
  })(),

  codenames: {},
  coup: {},

  /**
   * Sheriff of Nottingham — Cloudinary `v1775814353`
   * ภาพ rye / pumpernickel / royal rooster / golden apples / bleu cheese / ขนมปังพื้นฐาน ฯลฯ
   * ใช้ในสำรับตามจำนวนผู้เล่น — เกม 3–4 คนไม่มีการ์ดสายขยายบางชนิด (ดู `buildDeck` ฝั่ง server)
   */
  sheriffOfNottingham: (() => {
    const v = 'v1775814353';
    const sh = (publicId: string) => cloudinaryImage(`${v}/${publicId}`);
    const cards = {
      apple: sh('apples_yqh7ge'),
      cheese: sh('cheese_scoljg'),
      bread: sh('bread_vve2fg'),
      chicken: sh('chicken_uwavji'),
      pepper: sh('pepper_zo6vzm'),
      mead: sh('mead_rhwvje'),
      silk: sh('silk_zec9wn'),
      crossbow: sh('crossbow_q8sg1d'),
      feast_plate: sh('feast-plate_lwmf89'),
      dragon_pepper: sh('dragon-pepper_mkjdvq'),
      brimstone_oil: sh('brimstone-oil_u5ro5n'),
      olive_oil: sh('olive-oil_bpl4il'),
      strawberry_mead: sh('strawberry-mead_yurapc'),
      golden_silk: sh('golden-silk_wyvue3'),
      heavy_crossbow: sh('heavy-crossbow_rvv4wg'),
      prince_johns_sword: sh('prince-john_s-sword_w0p1o2'),
      green_apples: sh('green-apples_cb66fc'),
      golden_apples: sh('golder-apples_n7bvbp'),
      bleu_cheese: sh('bleu-cheese_zx3q9u'),
      gouda_cheese: sh('gouda-cheese_trq7fr'),
      rye_bread: sh('rye-bread_fkptjj'),
      pumpernickel_bread: sh('pumpernickel-bread_n3qpoa'),
      royal_rooster: sh('royal-rooster_rsvojc'),
    } satisfies Record<SheriffCard['type'], string>;
    return {
      cover: sh('cover_pwhivm'),
      cardBack: sh('back-card_x5p39w'),
      cards,
    };
  })(),

  insider: {
    cover: cloudinaryImage('v1775788472/cover_fucyzs'),
    master: cloudinaryImage('v1775788472/master_e3pmpj'),
    insider: cloudinaryImage('v1775788472/insider_yeax78'),
    common: cloudinaryImage('v1775788472/commons_fsrnpq'),
  },

  /** Name It — Cloudinary upload version `v1775560713` */
  nameIt: {
    /** ค่าเดียวกับ `imageBase` ที่ส่งจาก server (ใช้ประกอบ `${imageBase}/${imageId}.jpg`) */
    imageBase: cloudinaryImage('v1775560713'),
    cover: cloudinaryImage('v1775560713/cover_y4pidu.jpg'),
    cardBack: cloudinaryImage('v1775560713/back-card_fjozcp.jpg'),
  },

  /** Hues and Cues — Cloudinary upload version `v1775805189` */
  huesAndCues: {
    cover: cloudinaryImage('v1775805189/cover_h1chxq.jpg'),
  },
} as const;
