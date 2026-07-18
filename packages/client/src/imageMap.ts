import type {
  AvalonRole,
  CupTheCrabCupValue,
  ExplodingKittensCardType,
  SheriffCard,
  TtrTrainColor,
  WttdEquipmentId,
  WttdHeroClass,
  WttdWeaknessSymbol,
} from 'shared';
import {
  CAMEL_UP_CLOUD_VERSION,
  CUP_THE_CRAB_CLOUD_VERSION,
  LOVE_LETTER_CLOUD_VERSION,
  ONUW_CLOUD_VERSION,
  SALEM_1692_CARD_ART_KEYS,
  SALEM_1692_CLOUD_VERSION,
  SALEM_1692_TOWN_HALL_ART_KEYS,
  SALEM_1692_TRYAL_ART_KEYS,
  SPYFALL_CLOUD_VERSION,
  SPYFALL_LOCATIONS,
  SUSHI_GO_CARD_ART_KEYS,
  SUSHI_GO_CLOUD_VERSION,
} from 'shared';
import type { CamelUpColor } from 'shared';
import {
  SPLENDOR_COVER_PUBLIC_ID,
  SPLENDOR_CHIP_PUBLIC_IDS,
  SPLENDOR_DECK_BACK_PUBLIC_IDS,
  SPLENDOR_DEV_PUBLIC_IDS,
  SPLENDOR_NOBLE_BACK_PUBLIC_ID,
  SPLENDOR_NOBLE_PUBLIC_IDS,
} from './games/splendor/splendorImageIds';

const cloudName = 'dpkqjlk3g';
const cloudinaryBase = cloudName
  ? `https://res.cloudinary.com/${cloudName}/image/upload/q_auto/f_auto`
  : '';

function cloudinaryImage(publicId: string): string {
  return cloudinaryBase ? `${cloudinaryBase}/${publicId}` : '';
}

/** One Night Ultimate Werewolf — publicId อยู่ภายใต้ `${ONUW_CLOUD_VERSION}/` */
export function onuwRoleCardUrl(artKey: string): string {
  return cloudinaryImage(`${ONUW_CLOUD_VERSION}/${artKey}`);
}

export function onuwCardBackUrl(): string {
  return cloudinaryImage(`${ONUW_CLOUD_VERSION}/back-card_uopawc`);
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

  codenames: {
    cover: cloudinaryImage('v1777557982/cover_v1euj7.jpg'),
    roleCards: {
      redTeam: cloudinaryImage('v1777557982/red_xqkllh'),
      blueTeam: cloudinaryImage('v1777557982/blue_zufyzo'),
      wrongNeutral: cloudinaryImage('v1777557982/white_x2evww'),
      assassin: cloudinaryImage('v1777557982/black_ccsbmn'),
    },
  },
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

  /** Ticket to Ride — card arts + game cover */
  ticketToRide: (() => {
    const t = (publicId: string) => cloudinaryImage(publicId);
    const trainCards: Record<TtrTrainColor, string> = {
      red: t('red_p9ghkb'),
      white: t('white_bh95wt'),
      yellow: t('yellow_xwyu5f'),
      black: t('black_z6flyp'),
      blue: t('blue_imz18u'),
      green: t('green_cpd3qv'),
      orange: t('orange_druook'),
      purple: t('pink_r91xvx'),
      locomotive: t('rainbow_bmuxn7'),
    };
    return {
      cover: t('cover_ouh48b'),
      mapBackground: t('map_pxdos0'),
      destinationCardBack: t('v1776875450/destination-back-card_qf6avq'),
      trainCardBack: t('train-back-card_ehyfmu'),
      trainCards,
    };
  })(),

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

  /**
   * Welcome to the Dungeon — Cloudinary `v1776052607`
   * มอนสเตอร์ใช้ **พลังเป็น key** (1–7, 9); ไม่มี asset ชื่อ `monster-8` — พลัง 9 ใช้ `monster-9_*`
   */
  welcomeToTheDungeon: (() => {
    const v = 'v1776052607';
    const w = (publicId: string) => cloudinaryImage(`${v}/${publicId}`);
    const monsterByPower = {
      1: w('monster-1_q31ig6'),
      2: w('monster-2_ioe3lb'),
      3: w('monster-3_s18cer'),
      4: w('monster-4_lox4si'),
      5: w('monster-5_psrhv9'),
      6: w('monster-6_diufdq'),
      7: w('monster-7_icb272'),
      9: w('monster-9_rp6tej'),
    } as const satisfies Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 9, string>;
    const weaknessIconBySymbol = {
      torch: w('icon-torch_wxheig'),
      holy_grail: w('icon-holy-grail_z861wv'),
      war_hammer: w('icon-war-hammer_poiqdr'),
      invisibility_cloak: w('icon-invisibility-cloak_rxu2mx'),
      demonic_pact: w('icon-demonic-pact_hnopme'),
      dragon_spear: w('icon-dragon-spear_hby9mp'),
    } as const satisfies Record<WttdWeaknessSymbol, string>;
    const heroes: Record<WttdHeroClass, string> = {
      warrior: w('warrior_sw9hmv'),
      barbarian: w('barbarian_kdryo2'),
      mage: w('mage_jfjstj'),
      rogue: w('rogue_rr1ysv'),
    };
    const equipment = {
      warrior_dragon_spear: w('warrior-dragon-spear_gkdukd'),
      warrior_holy_grail: w('warrior-holy-grail_v1zuil'),
      warrior_knight_shield: w('warrior-knight-shield_eysacs'),
      warrior_plate_armor: w('warrior-plate-armor_jgyexs'),
      warrior_torch: w('warrior-torch_uh7ghy'),
      warrior_vorpal_sword: w('warrior-vorpal-sword_ijmxev'),
      barbarian_chainmail: w('barbarian-chainmail_qvoeeh'),
      barbarian_healing_potion: w('barbarian-healing-potion_bw5fbh'),
      barbarian_leather_shield: w('barbarian-leather-shield_z5rznz'),
      barbarian_torch: w('barbarian-torch_ibh2bw'),
      barbarian_vorpal_axe: w('barbarian-vorpal-axe_nl1tje'),
      barbarian_war_hammer: w('barbarian-war-hammer_wpfsi7'),
      mage_demonic_pact: w('mage-demonic-pact_hrensf'),
      mage_polymorph: w('mage-polymorph_wk1iqo'),
      mage_bracelet: w('mage-bracelet_ctmag2'),
      mage_holy_grail: w('mage-holy-grail_x3v4ux'),
      mage_wall_of_fire: w('mage-wall-of-fire_f7qeya'),
      mage_omnipotence: w('mage-omnipotence_vxbtwc'),
      rogue_buckler: w('rogue-buckler_pt6v74'),
      rogue_vorpal_dagger: w('rogue-vorpal-dagger_g6ihcg'),
      rogue_invisibility_cloak: w('rogue-invisibility-cloak_fjfm4v'),
      rogue_healing_potion: w('rogue-healing-potion_mekpbb'),
      rogue_mithril_armor: w('rogue-mithril-armor_q7rxih'),
      rogue_ring_of_power: w('rogue-ring-of-power_ysmbkx'),
    } as const satisfies Record<WttdEquipmentId, string>;
    return {
      cover: w('cover_llot6w'),
      cardBack: w('back-card_srtu0r'),
      aide: w('aide_sol9wv'),
      heroes,
      equipment,
      monsterByPower,
      weaknessIconBySymbol,
    };
  })(),

  /** Flip 7 — Cloudinary public IDs (no version pin) */
  flip7: (() => {
    const f = (publicId: string) => cloudinaryImage(publicId);
    const number = {
      0: f('0_ww7how'),
      1: f('1_fzpigd'),
      2: f('2_bjtawj'),
      3: f('3_huseff'),
      4: f('4_h7qxi9'),
      5: f('5_a2pdre'),
      6: f('6_ltkchp'),
      7: f('7_sqlats'),
      8: f('8_nfbg8o'),
      9: f('9_fm1qpe'),
      10: f('10_f4ke8d'),
      11: f('11_dqoeeq'),
      12: f('12_f0cdnk'),
    } as const;
    const special = {
      secondChance: f('second-chance_dwhjlk'),
      discard: f('discard_r0ckpu'),
      freeze: f('freeze_ifub9u'),
      flip3: f('flip-3_dcxjay'),
      flip4: f('flip-4_gvz11w'),
      justOneMore: f('just-one-more_uly0tp'),
      steal: f('steal_yriwe6'),
      plus10: f('plus-10_vxp3km'),
      plus8: f('plus-8_qtctvg'),
      plus6: f('plus-6_u3mbge'),
      plus4: f('plus-4_uc6qkb'),
      plus2: f('plus-2_cuuid0'),
      x2: f('x2_phvdx9'),
    } as const;
    return {
      cover: f('cover_uj4rum'),
      cardBack: f('back-card_l3otic'),
      number,
      special,
    };
  })(),

  oneNightUltimateWerewolf: {
    cover: cloudinaryImage('v1777643831/cover-1_k3n3lz.jpg'),
    cardBack: cloudinaryImage(`${ONUW_CLOUD_VERSION}/back-card_uopawc`),
  },

  /** Abracada…What? — v1776529785 */
  abracawhat: (() => {
    const f = (publicId: string) => cloudinaryImage(publicId);
    const v = 'v1776529785';
    const spell = {
      1: f(`${v}/1_teovgj`),
      2: f(`${v}/2_dnofvx`),
      3: f(`${v}/3_s2cssm`),
      4: f(`${v}/4_hyjkmk`),
      5: f(`${v}/5_uuhvql`),
      6: f(`${v}/6_vrti0w`),
      7: f(`${v}/7_sw7pwv`),
      8: f(`${v}/8_sbaa5n`),
    } as const;
    return {
      cover: f(`${v}/cover_edcqew`),
      spell,
    };
  })(),
  camelUp: (() => {
    const f = (publicId: string) => cloudinaryImage(publicId);
    const v = CAMEL_UP_CLOUD_VERSION;
    const legBetArt = {
      green: {
        5: f(`${v}/green-5_m5ez3j`),
        3: f(`${v}/green-3_nj51ys`),
        2: f(`${v}/green-2_puiq56`),
      },
      blue: { 5: f(`${v}/blue-5_u79vbq`), 3: f(`${v}/blue-3_kp65ex`), 2: f(`${v}/blue-2_hssnjp`) },
      yellow: {
        5: f(`${v}/yellow-5_lxdyig`),
        3: f(`${v}/yellow-3_d0wx8o`),
        2: f(`${v}/yellow-2_pappdk`),
      },
      white: {
        5: f(`${v}/white-5_r3epoq`),
        3: f(`${v}/white-3_tmt2rx`),
        2: f(`${v}/white-2_nx483w`),
      },
      orange: {
        5: f(`${v}/orange-5_zuxlhe`),
        3: f(`${v}/orange-3_gvh1wo`),
        2: f(`${v}/orange-2_sdwggy`),
      },
    } satisfies Record<CamelUpColor, Record<2 | 3 | 5, string>>;
    return {
      cover: f('v1781249764/cover_nqk5ba'),
      map: f('v1781249476/map_lqtjbm'),
      oasis: f('v1780117799/oasis-1_luljbh'),
      mirage: f('v1780117797/oasis-2_g4blo0'),
      coins: {
        1: f('v1780117798/coin-1_mpnclj'),
        2: f('v1780117798/coin-2_czmejd'),
        3: f('v1780117798/coin-3_u1rvuo'),
      },
      legBet: legBetArt,
    };
  })(),
  cupTheCrab: (() => {
    const f = (publicId: string) => cloudinaryImage(publicId);
    const v = CUP_THE_CRAB_CLOUD_VERSION;
    const cups: Record<CupTheCrabCupValue, string> = {
      1: f(`${v}/1_wrfl0h`),
      2: f(`${v}/2_vuvlsx`),
      3: f(`${v}/3_kkprx6`),
      4: f(`${v}/4_armipa`),
      5: f(`${v}/5_nbxqeb`),
      6: f(`${v}/6_sjziz5`),
      8: f(`${v}/8_wpkrl2`),
      10: f(`${v}/10_lb56rw`),
    };
    return {
      cover: f(`${v}/cover_cvy1xh`),
      cardBack: f(`${v}/back-card_aepo6m`),
      crab: f(`${v}/cup-crab_f0xnkn`),
      octopus: f(`${v}/bottle-octopus_rqn5fa`),
      bottle: f(`${v}/bottle_bz8rvh`),
      cups,
    };
  })(),

  /** Fugitive — board-game-cafe/fugitive (hideout cards 0–42) */
  fugitive: (() => {
    const f = (publicId: string) => cloudinaryImage(publicId);
    const cardPublicIds: Record<number, string> = {
      0: '00_rshtt9',
      1: '01_pvlaiy',
      2: '02_xrtlh1',
      3: '03_dlgeob',
      4: '04_ue9fp2',
      5: '05_uutlvk',
      6: '06_pp4qc1',
      7: '07_msftoh',
      8: '08_nqabzb',
      9: '09_qdkldx',
      10: '10_kraerm',
      11: '11_sb7vpj',
      12: '12_sz07tw',
      13: '13_l5llho',
      14: '14_pqsdrr',
      15: '15_vucdqm',
      16: '16_plojth',
      17: '17_br5alo',
      18: '18_iuough',
      19: '19_v0rq6q',
      20: '20_i9o2kz',
      21: '21_x02bqe',
      22: '22_iw1jus',
      23: '23_wzfygw',
      24: '24_jkr68p',
      25: '25_lrmik6',
      26: '26_su2u1b',
      27: '27_xa4dmv',
      28: '28_nbpjbe',
      29: '29_znujsn',
      30: '30_sejkbr',
      31: '31_ceza8r',
      32: '32_tf5ysx',
      33: '33_w60bzn',
      34: '34_rirh08',
      35: '35_ugcghz',
      36: '36_anqwxh',
      37: '37_gv2wxv',
      38: '38_cb0cx5',
      39: '39_wohues',
      40: '40_u8zf1y',
      41: '41_b6vzbu',
      42: '42_yb0t4s',
    };
    const cards = Object.fromEntries(
      Object.entries(cardPublicIds).map(([n, id]) => [Number(n), f(id)]),
    ) as Record<number, string>;
    return {
      cover: f('v1782402508/cover_vsaue7'),
      cardBack: f('v1782402461/back-card_vjdclw'),
      cards,
    };
  })(),

  /** Splendor — board-game-cafe/splendor */
  splendor: (() => {
    const f = (publicId: string) => cloudinaryImage(publicId);
    const devCards = Object.fromEntries(
      Object.entries(SPLENDOR_DEV_PUBLIC_IDS).map(([key, id]) => [key, f(id)]),
    ) as Record<string, string>;
    const nobles = Object.fromEntries(
      Object.entries(SPLENDOR_NOBLE_PUBLIC_IDS).map(([key, id]) => [key, f(id)]),
    ) as Record<string, string>;
    const chips = Object.fromEntries(
      Object.entries(SPLENDOR_CHIP_PUBLIC_IDS).map(([key, id]) => [key, f(id)]),
    ) as Record<string, string>;
    return {
      cover: f(`v1777178930/${SPLENDOR_COVER_PUBLIC_ID}`),
      devCards,
      nobles,
      chips,
      deckBacks: {
        1: f(SPLENDOR_DECK_BACK_PUBLIC_IDS[1]),
        2: f(SPLENDOR_DECK_BACK_PUBLIC_IDS[2]),
        3: f(SPLENDOR_DECK_BACK_PUBLIC_IDS[3]),
      },
      nobleBack: f(SPLENDOR_NOBLE_BACK_PUBLIC_ID),
    };
  })(),

  /** Love Letter — board-game-cafe/love-letter */
  loveLetter: (() => {
    const v = LOVE_LETTER_CLOUD_VERSION || 'vPLACEHOLDER';
    const ll = (id: string) => cloudinaryImage(`${v}/${id}`);
    return {
      cover: ll('cover_PLACEHOLDER'),
      backCard: ll('back-card_PLACEHOLDER'),
      cards: {
        guard: ll('guard_PLACEHOLDER'),
        priest: ll('priest_PLACEHOLDER'),
        baron: ll('baron_PLACEHOLDER'),
        handmaid: ll('handmaid_PLACEHOLDER'),
        prince: ll('prince_PLACEHOLDER'),
        king: ll('king_PLACEHOLDER'),
        countess: ll('countess_PLACEHOLDER'),
        princess: ll('princess_PLACEHOLDER'),
      },
      affectionToken: ll('affection-token_PLACEHOLDER'),
    };
  })(),

  /** Spyfall — board-game-cafe/spyfall */
  spyfall: (() => {
    const v = SPYFALL_CLOUD_VERSION || 'vPLACEHOLDER';
    const sf = (id: string) => cloudinaryImage(`${v}/${id}`);
    return {
      cover: sf('cover_PLACEHOLDER'),
      spyCard: sf('spy-card_PLACEHOLDER'),
      cardBack: sf('card-back_PLACEHOLDER'),
      locations: Object.fromEntries(
        SPYFALL_LOCATIONS.map((loc) => [loc.id, sf(`${loc.artKey}_PLACEHOLDER`)]),
      ) as Record<string, string>,
    };
  })(),

  /** Sushi Go — board-game-cafe/sushi-go */
  sushiGo: (() => {
    const v = SUSHI_GO_CLOUD_VERSION || 'vPLACEHOLDER';
    const sg = (id: string) => cloudinaryImage(`${v}/${id}`);
    return {
      cover: sg('cover_PLACEHOLDER'),
      cardBack: sg('card-back_PLACEHOLDER'),
      cards: Object.fromEntries(
        Object.entries(SUSHI_GO_CARD_ART_KEYS).map(([kind, artKey]) => [kind, sg(artKey)]),
      ) as Record<keyof typeof SUSHI_GO_CARD_ART_KEYS, string>,
    };
  })(),

  /** Salem 1692 — board-game-cafe/salem-1692 */
  salem1692: (() => {
    const v = SALEM_1692_CLOUD_VERSION || 'vPLACEHOLDER';
    const s = (id: string) => cloudinaryImage(`${v}/${id}`);
    return {
      cover: s('cover_fjtyvy'),
      cardBack: s('back-card_gvtxw4'),
      tryalBack: s('tryal_eq9abv'),
      blackCat: s('black-cat_ldyhem'),
      /** Night kill / death token — no separate gavel upload */
      gavel: s('kill_vjmysv'),
      tryals: Object.fromEntries(
        Object.entries(SALEM_1692_TRYAL_ART_KEYS).map(([kind, artKey]) => [kind, s(artKey)]),
      ) as Record<keyof typeof SALEM_1692_TRYAL_ART_KEYS, string>,
      playingCards: Object.fromEntries(
        Object.entries(SALEM_1692_CARD_ART_KEYS).map(([kind, artKey]) => [kind, s(artKey)]),
      ) as Record<keyof typeof SALEM_1692_CARD_ART_KEYS, string>,
      townHall: Object.fromEntries(
        Object.entries(SALEM_1692_TOWN_HALL_ART_KEYS).map(([id, artKey]) => [id, s(artKey)]),
      ) as Record<keyof typeof SALEM_1692_TOWN_HALL_ART_KEYS, string>,
    };
  })(),
} as const;
