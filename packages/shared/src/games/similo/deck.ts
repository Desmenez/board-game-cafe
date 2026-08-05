/** Cloudinary folder version for Similo animal deck art. */
export const SIMILO_ANIMALS_CLOUD_VERSION = 'v1779598181';
export const SIMILO_FABLES_CLOUD_VERSION = 'v1779600049';
export const SIMILO_HARRY_POTTER_CLOUD_VERSION = 'v1779601093';
export const SIMILO_HISTORY_CLOUD_VERSION = 'v1779599222';
export const SIMILO_MYTHS_CLOUD_VERSION = 'v1779599559';
export const SIMILO_SPOOKIES_CLOUD_VERSION = 'v1779600642';
export const SIMILO_WILD_ANIMALS_CLOUD_VERSION = 'v1779598781';
export const SIMILO_FANTASTIC_BEASTS_CLOUD_VERSION = 'v1779602217';

export const SIMILO_CARD_BACK_PUBLIC_ID = 'back-card_zyr5sv';

/** Playable character public IDs (face art). */
export const SIMILO_ANIMAL_CHARACTER_PUBLIC_IDS = [
  'bear_nyzp7n',
  'cat_voppvb',
  'fox_pebsty',
  'beaver_cyfevy',
  'donkey_ytmr2q',
  'dog_e51gsc',
  'frog_b6oxcu',
  'cow_dgsnap',
  'deer_rkxds0',
  'chicken_iv7lsy',
  'goose_fuiz6t',
  'hawk_ewqpbt',
  'horse_bc18ar',
  'lizard_zwkglx',
  'mouse_sxtelx',
  'hedgehog_wii2ux',
  'otter_gmvnas',
  'owl_yxsn1o',
  'peacock_mwdbbr',
  'pig_ye5y9w',
  'rabbit_sm0iqt',
  'raven_x0pisx',
  'robin_adoxce',
  'skunk_unacsn',
  'sheep_ahj6nh',
  'snake_n6cvby',
  'squirrel_xqyofw',
  'turtle_tedijn',
  'wolf_bl31wa',
  'woodpecker_bnklpc',
] as const;

export type SimiloAnimalPublicId = (typeof SIMILO_ANIMAL_CHARACTER_PUBLIC_IDS)[number];
export type SimiloDeckId =
  | 'animals'
  | 'fables'
  | 'harry-potter'
  | 'history'
  | 'myths'
  | 'spookies'
  | 'wild-animals'
  | 'fantastic-beasts';

export const SIMILO_FABLES_CHARACTER_PUBLIC_IDS = [
  'little-mermaid_mfkz9v',
  'little-red-riding-hood_pa6zvr',
  'mad-hatter_ag4opi',
  'peter-pan_ury3ay',
  'pinocchio_ffp4en',
  'prince-charming_dhuz3y',
  'puss-in-boot_x3rzbo',
  'queen-of-hearts_psdmzc',
  'robin-hood_lmges5',
  'sea-witch_qpzhnz',
  'snow-white_ol5hca',
  'three-little-pig_dhovux',
  'tinker-bell_qzfafy',
  'tin-woodman_dlx4uv',
  'wicked-witch-of-the-west_eiattk',
  'aladdin_udgbwc',
  'alice_kzb4dm',
  'big-bad-wolf_rkqcch',
  'captain-hook_kzlb5m',
  'cat-basilio-and-fox-alice_baxti2',
  'cheshire-cat_pe4bef',
  'cinderella_kfi8qe',
  'dorothy_diveha',
  'evil-quee_l0lo1c',
  'evil-stepmother_az8xom',
  'fairy-godmother_bztswb',
  'genie_o75psl',
  'giant_phlztr',
  'hunter_hyevz4',
  'jack_qfafin',
  'karabas-barabas_nu8oyg',
  'king-arthur_bqed0y',
] as const;

export const SIMILO_HARRY_POTTER_CHARACTER_PUBLIC_IDS = [
  'harry-potter_giihbq',
  'hermione-granger_o35mbw',
  'horace-slughorn_alhx4e',
  'kingsley-shacklebolt_mrh99o',
  'lord-voldemort_twtdzd',
  'lucius-malfoy_vxunlh',
  'luna-lovegood_kvaovc',
  'minerva-mcgonagall_mfqcl3',
  'moaning-myrtle_ygugxn',
  'molly-and-arthur-weasley_wgzxul',
  'nearly-headless-nick_forsys',
  'neville-longbottom_a0qozo',
  'nymphadora-tonks_y5txmt',
  'peter-pettigrew_ernwnc',
  'remus-lupin_qmhml0',
  'ron-weasley_pmjbao',
  'rubeus-hagrid_ddf9nv',
  'severus-snape_ow9blh',
  'sirius-black_irwl82',
  'sybill-trelawney_hgrdpu',
  'tom-marvolo-riddle_tnajux',
  'vernon-petunia-and-dudley-dursley_wkwm0o',
  'alastor-moody_udmjvp',
  'albus-dumbledore_gnyee2',
  'argus-filch_mbforl',
  'bellatrix-lestrange_yjnii8',
  'cedric-diggory_pnflut',
  'cho-chang_sapxne',
  'cornelius-fudge_wbwkja',
  'crabbe-and-goyle_jcddjq',
  'death-eater_yzrvbj',
  'dementor_o7eefb',
  'dobby_t8zn5r',
  'dolores-umbridge_budppd',
  'draco-malfoy_pshser',
  'fred-and-george-weasley_v6c1hk',
  'gilderoy-lockhart_agmvvu',
  'ginny-weasley_h0hckv',
  'griphook_nlsiwz',
] as const;

export const SIMILO_HISTORY_CHARACTER_PUBLIC_IDS = [
  'salah-ad-din_u7d9tl',
  'sitting-bull_cp7ccs',
  'virginia-woolf_fqg6th',
  'tutankhamun_kaglvl',
  'vincent-van-gogh_xl0wse',
  'william-shakespeare_v92n1a',
  'abraham-lincoln_lrcycx',
  'alexander-the-great_wcxmm3',
  'anne-bonny_wbvtol',
  'bessie-coleman_dgsqeb',
  'boudica_irmg8n',
  'catherine-the-great_b8pl9t',
  'charles-darwin_g8yloe',
  'cleopatra_wslzne',
  'confucius_zoyzqa',
  'elisabeth-of-bavaria_zq9jvm',
  'frederick-douglass_ytiwcm',
  'gaius-julius-caesar_joy6vd',
  'genghis-khan_csxlu8',
  'hypatia_kwzd5s',
  'isaac-newton_cxrcke',
  'joan-of-arc_m40zxe',
  'katsushika-hokusai_bqzxjs',
  'leonardo-da-vinci_rf3cvr',
  'ludwig-van-beethoven_ewvvlh',
  'marie-antoinette_zqs06y',
  'marie-curie_zldrb0',
  'mary-shelley_od3qbf',
  'montezuma_crvnec',
  'napoleon-bonaparte_ncdhbn',
  'pocahontas_xcx5df',
  'queen-elizabeth-i_mdipju',
] as const;

export const SIMILO_MYTHS_CHARACTER_PUBLIC_IDS = [
  'achilles_gupe9i',
  'amazon_pyjhug',
  'aphrodite_m6xq5x',
  'apollo_dmxnse',
  'arachne_ckftzn',
  'ares_sirfct',
  'argus_eosam0',
  'artemis_kvr54b',
  'athena_rws5ct',
  'chiron_yztvtf',
  'circe_jas5gz',
  'cupid_wajmjq',
  'dionysus_degv2o',
  'echidna_rmgphh',
  'fortuna_myml5t',
  'hades_vcyrqe',
  'harpy_yrop2p',
  'hera_surocp',
  'heracles_moudpt',
  'hermes_ttbxtl',
  'icarus_ogss96',
  'jason_jzfdre',
  'medusa_jkrsyu',
  'minotaur_nexzss',
  'moirai_bu03ne',
  'pan_rqspvm',
  'pandora_cbkzbz',
  'polyphemus_oe5sax',
  'poseidon_ojbzsl',
  'zeus_k7fung',
] as const;

export const SIMILO_SPOOKIES_CHARACTER_PUBLIC_IDS = [
  'zombie_oywnid',
  'banshee_dcbyk3',
  'boogeyman_sws7kz',
  'cthulhu_tb2an2',
  'cultist_ykizju',
  'demon_a2uhf8',
  'evil-clown_gzzj7t',
  'evil-witch_ix1dsi',
  'frankensteins-monster_rnmb4t',
  'gargoyle_n88cbj',
  'ghost_z8y0fx',
  'ghoul_hqetuj',
  'gremlin_gifzol',
  'grey-alien_fp31ii',
  'grim-reaper_clcbj4',
  'headless-horseman_q9gjrq',
  'invisible-man_piisqz',
  'krampus_k85ygl',
  'mad-scientist_pwcysp',
  'maniac_xkwdqx',
  'mummy_mlrwgm',
  'oni_y588pc',
  'possessed-doll_em3p2n',
  'scarecrow_vn4gwu',
  'skeleton_r21rgn',
  'swamp-monster_a0etzm',
  'vampire_taaqi5',
  'werewolf_rxeedo',
  'yeti_e3anam',
  'yurei_tr520o',
] as const;

export const SIMILO_WILD_ANIMALS_CHARACTER_PUBLIC_IDS = [
  'tiger_nkjhz7',
  'toucan_g4hopf',
  'vulture_ahtb1u',
  'walrus_iwsrmm',
  'zebra_lhsiao',
  'armadillo_at7ccb',
  'albatross_n2i7ok',
  'bat_chjqp5',
  'camel_ydvgpy',
  'chameleon_zew9ze',
  'cobra_ij2vcb',
  'crocodile_lrzymc',
  'elephant_ug6clz',
  'flamingo_avngad',
  'giraffe_uyuk0p',
  'gorilla_fsjjbd',
  'hippopotamus_m103cs',
  'hummingbird_hj6btc',
  'iguana_qsziqm',
  'kangaroo_btmocg',
  'koala_sitwr6',
  'komodo-dragon_b3dwwn',
  'lion_x3jn6l',
  'llama_jthnql',
  'ostrich_aqbsdy',
  'panda_yn1apo',
  'pelican_beyrfr',
  'penguin_n7r3iq',
  'rhinoceros_peyc7m',
  'scarlet-macaw_f5nuji',
] as const;

export const SIMILO_FANTASTIC_BEASTS_CHARACTER_PUBLIC_IDS = [
  'abernathy_hgmaxb',
  'billywig_onka6y',
  'camouflori_rez2m1',
  'chastity-barebone_kks4y1',
  'credence-barebone_bnmawn',
  'diricawl_ggnlg8',
  'doxy_jfgcnr',
  'erumpent_tlyd2g',
  'fwooper_jqgcva',
  'giant-dung-beetle_zvq4rn',
  'glow-worm_imhbbq',
  'gnarlak_hjroac',
  'goblin-jazz-singer_w4n1s8',
  'graphorn_h7wb6e',
  'grindylow_isyz7v',
  'hector-podmore_ibzkwx',
  'heinrich-eberstadt_qwgz4k',
  'henry-shaw_hjotvj',
  'henry-shaw-sr_jvjua9',
  'jacob-kowalski_ocqbwz',
  'marmite_f7950w',
  'mary-lou-barebone_sbjttz',
  'modesty-barebone_hlnyrs',
  'momolu-wotorson_oywrp0',
  'mooncalf_e8yyuw',
  'murtlap_ouor9x',
  'newt-scamander_q28mr7',
  'niffler_fk57vz',
  'nundu_rg5bve',
  'occamy_fbxafa',
  'percival-graves_ph1wbz',
  'pickett_msgqej',
  'queenie-goldstein_bgjrau',
  'senator-henry-shaw_h6q81k',
  'seraphina-picquery_wcbwwa',
  'swooping-evil_ejtxt4',
  'thunderbird_b4fagr',
  'tina-goldstein_sxw6rk',
  'ya-zhou_irqqox',
] as const;

type SimiloDeckConfig = {
  label: string;
  cloudVersion: string;
  characterPublicIds: readonly string[];
};

export const SIMILO_DECKS: Record<SimiloDeckId, SimiloDeckConfig> = {
  animals: {
    label: 'Animals',
    cloudVersion: SIMILO_ANIMALS_CLOUD_VERSION,
    characterPublicIds: SIMILO_ANIMAL_CHARACTER_PUBLIC_IDS,
  },
  fables: {
    label: 'Fables',
    cloudVersion: SIMILO_FABLES_CLOUD_VERSION,
    characterPublicIds: SIMILO_FABLES_CHARACTER_PUBLIC_IDS,
  },
  'harry-potter': {
    label: 'Harry Potter',
    cloudVersion: SIMILO_HARRY_POTTER_CLOUD_VERSION,
    characterPublicIds: SIMILO_HARRY_POTTER_CHARACTER_PUBLIC_IDS,
  },
  history: {
    label: 'History',
    cloudVersion: SIMILO_HISTORY_CLOUD_VERSION,
    characterPublicIds: SIMILO_HISTORY_CHARACTER_PUBLIC_IDS,
  },
  myths: {
    label: 'Myths',
    cloudVersion: SIMILO_MYTHS_CLOUD_VERSION,
    characterPublicIds: SIMILO_MYTHS_CHARACTER_PUBLIC_IDS,
  },
  spookies: {
    label: 'Spookies',
    cloudVersion: SIMILO_SPOOKIES_CLOUD_VERSION,
    characterPublicIds: SIMILO_SPOOKIES_CHARACTER_PUBLIC_IDS,
  },
  'wild-animals': {
    label: 'Wild Animals',
    cloudVersion: SIMILO_WILD_ANIMALS_CLOUD_VERSION,
    characterPublicIds: SIMILO_WILD_ANIMALS_CHARACTER_PUBLIC_IDS,
  },
  'fantastic-beasts': {
    label: 'Fantastic Beasts',
    cloudVersion: SIMILO_FANTASTIC_BEASTS_CLOUD_VERSION,
    characterPublicIds: SIMILO_FANTASTIC_BEASTS_CHARACTER_PUBLIC_IDS,
  },
};

export const SIMILO_DEFAULT_DECK_IDS: readonly SimiloDeckId[] = ['animals'];
export const SIMILO_ALL_DECK_IDS = Object.keys(SIMILO_DECKS) as SimiloDeckId[];
export const SIMILO_ALL_CHARACTER_PUBLIC_IDS = SIMILO_ALL_DECK_IDS.flatMap(
  (deckId) => SIMILO_DECKS[deckId].characterPublicIds,
);

const CLOUD_NAME = 'dpkqjlk3g';
const CHARACTER_DECK_BY_PUBLIC_ID = buildCharacterDeckLookup();

/** Portrait card artwork size (width × height). */
export const SIMILO_CARD_ASPECT_WIDTH = 600;
export const SIMILO_CARD_ASPECT_HEIGHT = 909;

function buildCharacterDeckLookup(): Record<string, SimiloDeckId> {
  const lookup: Record<string, SimiloDeckId> = {};
  for (const deckId of SIMILO_ALL_DECK_IDS) {
    for (const publicId of SIMILO_DECKS[deckId].characterPublicIds) {
      lookup[publicId] = deckId;
    }
  }
  return lookup;
}

export function similoDeckLabel(deckId: SimiloDeckId): string {
  return SIMILO_DECKS[deckId].label;
}

export function similoCharacterPool(deckIds: readonly SimiloDeckId[]): string[] {
  const selected = deckIds.length > 0 ? deckIds : SIMILO_DEFAULT_DECK_IDS;
  const seen = new Set<string>();
  const pool: string[] = [];
  for (const deckId of selected) {
    const deck = SIMILO_DECKS[deckId];
    if (!deck) continue;
    for (const publicId of deck.characterPublicIds) {
      if (seen.has(publicId)) continue;
      seen.add(publicId);
      pool.push(publicId);
    }
  }
  return pool;
}

export function similoAnimalImageUrl(publicId: string): string {
  const deckId = CHARACTER_DECK_BY_PUBLIC_ID[publicId] ?? 'animals';
  const cloudVersion = SIMILO_DECKS[deckId].cloudVersion;
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/q_auto/f_auto/${cloudVersion}/${publicId}.jpg`;
}

export function similoCardBackImageUrl(): string {
  return similoAnimalImageUrl(SIMILO_CARD_BACK_PUBLIC_ID);
}

/** Display label from public id, e.g. `woodpecker_bnklpc` → `woodpecker`. */
export function similoCharacterLabel(publicId: string): string {
  const base = publicId.split('_')[0]?.trim();
  if (!base || base === 'back-card') return publicId;
  return base;
}

export function formatSimiloCharacterLabel(publicId: string): string {
  const raw = similoCharacterLabel(publicId);
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}
