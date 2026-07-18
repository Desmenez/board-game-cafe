import type {
  Salem1692PlayingCard,
  Salem1692PlayingCardKind,
  Salem1692TownHallId,
  Salem1692TryalCard,
  Salem1692TryalComposition,
  Salem1692TryalKind,
} from './types/salem-1692.js';

/** Pin after uploading a batch to Cloudinary — see `.agents/design/cloudinary-assets.md` */
export const SALEM_1692_CLOUD_VERSION = 'v1784276502';

const CLOUD_NAME = 'dpkqjlk3g';

export const SALEM_1692_TOWN_HALL_IDS: readonly Salem1692TownHallId[] = [
  'abigail_williams',
  'ann_putnam',
  'cotton_mather',
  'giles_corey',
  'george_burroughs',
  'john_proctor',
  'martha_corey',
  'mary_warren',
  'rebecca_nurse',
  'samuel_parris',
  'sarah_good',
  'thomas_danforth',
  'tituba',
  'will_griggs',
  'william_phips',
];

export const SALEM_1692_TOWN_HALL_LABELS: Record<Salem1692TownHallId, string> = {
  abigail_williams: 'Abigail Williams',
  ann_putnam: 'Ann Putnam',
  cotton_mather: 'Cotton Mather',
  giles_corey: 'Giles Corey',
  george_burroughs: 'George Burroughs',
  john_proctor: 'John Proctor',
  martha_corey: 'Martha Corey',
  mary_warren: 'Mary Warren',
  rebecca_nurse: 'Rebecca Nurse',
  samuel_parris: 'Samuel Parris',
  sarah_good: 'Sarah Good',
  thomas_danforth: 'Thomas Danforth',
  tituba: 'Tituba',
  will_griggs: 'Will Griggs',
  william_phips: 'William Phips',
};

/** Single shared Town Hall art until per-character portraits are uploaded */
export const SALEM_1692_TOWN_HALL_ART_KEYS: Record<Salem1692TownHallId, string> = {
  abigail_williams: 'town-hall_o2n2k4',
  ann_putnam: 'town-hall_o2n2k4',
  cotton_mather: 'town-hall_o2n2k4',
  giles_corey: 'town-hall_o2n2k4',
  george_burroughs: 'town-hall_o2n2k4',
  john_proctor: 'town-hall_o2n2k4',
  martha_corey: 'town-hall_o2n2k4',
  mary_warren: 'town-hall_o2n2k4',
  rebecca_nurse: 'town-hall_o2n2k4',
  samuel_parris: 'town-hall_o2n2k4',
  sarah_good: 'town-hall_o2n2k4',
  thomas_danforth: 'town-hall_o2n2k4',
  tituba: 'town-hall_o2n2k4',
  will_griggs: 'town-hall_o2n2k4',
  william_phips: 'town-hall_o2n2k4',
};

const TRYAL_POOL: Record<number, { notWitch: number; witch: number; constable: number }> = {
  4: { notWitch: 18, witch: 1, constable: 1 },
  5: { notWitch: 23, witch: 1, constable: 1 },
  6: { notWitch: 27, witch: 2, constable: 1 },
  7: { notWitch: 32, witch: 2, constable: 1 },
  8: { notWitch: 29, witch: 2, constable: 1 },
  9: { notWitch: 33, witch: 2, constable: 1 },
  10: { notWitch: 27, witch: 2, constable: 1 },
  11: { notWitch: 30, witch: 2, constable: 1 },
  12: { notWitch: 33, witch: 2, constable: 1 },
};

export const SALEM_1692_CARD_META: Record<
  Salem1692PlayingCardKind,
  { color: Salem1692PlayingCard['color']; accusationValue: number }
> = {
  accusation: { color: 'red', accusationValue: 1 },
  evidence: { color: 'red', accusationValue: 3 },
  witness: { color: 'red', accusationValue: 7 },
  piety: { color: 'blue', accusationValue: 0 },
  asylum: { color: 'blue', accusationValue: 0 },
  matchmaker: { color: 'blue', accusationValue: 0 },
  alibi: { color: 'green', accusationValue: 0 },
  stocks: { color: 'green', accusationValue: 0 },
  scapegoat: { color: 'green', accusationValue: 0 },
  curse: { color: 'green', accusationValue: 0 },
  arson: { color: 'green', accusationValue: 0 },
  robbery: { color: 'green', accusationValue: 0 },
  conspiracy: { color: 'black', accusationValue: 0 },
  night: { color: 'black', accusationValue: 0 },
};

export const SALEM_1692_PLAYING_COUNTS: Partial<Record<Salem1692PlayingCardKind, number>> = {
  accusation: 12,
  evidence: 4,
  witness: 2,
  piety: 3,
  asylum: 2,
  matchmaker: 2,
  alibi: 2,
  stocks: 2,
  scapegoat: 2,
  curse: 2,
  arson: 2,
  robbery: 2,
  conspiracy: 1,
  night: 1,
};

export const SALEM_1692_CARD_ART_KEYS: Record<Salem1692PlayingCardKind, string> = {
  accusation: 'accusation_v0r5dr',
  evidence: 'evidence_kapldc',
  witness: 'witness_fdxazy',
  piety: 'piety_azwbju',
  asylum: 'asylum_tbsd6o',
  matchmaker: 'matchmaker_nbmohx',
  alibi: 'alibi_lmf4es',
  stocks: 'stocks_mmtqkz',
  scapegoat: 'scapegoat_mqkaen',
  curse: 'curse_mmav4z',
  arson: 'arson_ihfppy',
  robbery: 'robbery_fjormq',
  conspiracy: 'conspiracy_ya6nex',
  night: 'night_kcdd2w',
};

export const SALEM_1692_TRYAL_ART_KEYS: Record<Salem1692TryalKind, string> = {
  not_witch: 'not-a-witch_ssrico',
  witch: 'witch_ftz8mw',
  constable: 'constable_j4uxzx',
};

let tryalSeq = 0;
let playingSeq = 0;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function salem1692TryalComposition(playerCount: number): Salem1692TryalComposition {
  const pool = TRYAL_POOL[playerCount];
  if (!pool) throw new Error(`Salem 1692: unsupported player count ${playerCount}`);
  return { witch: pool.witch, constable: pool.constable, notWitch: pool.notWitch };
}

export function salem1692TryalsPerPlayer(playerCount: number): number {
  const pool = salem1692TryalComposition(playerCount);
  return (pool.notWitch + pool.witch + pool.constable) / playerCount;
}

export function buildTryalDeck(playerCount: number): Salem1692TryalCard[] {
  const pool = TRYAL_POOL[playerCount];
  if (!pool) throw new Error(`Salem 1692: unsupported player count ${playerCount}`);
  tryalSeq = 0;
  const cards: Salem1692TryalCard[] = [];
  const push = (kind: Salem1692TryalKind, count: number) => {
    for (let i = 0; i < count; i += 1) {
      cards.push({ id: `tryal-${kind}-${tryalSeq++}`, kind, revealed: false });
    }
  };
  push('not_witch', pool.notWitch);
  push('witch', pool.witch);
  push('constable', pool.constable);
  return shuffle(cards);
}

export function newPlayingCard(kind: Salem1692PlayingCardKind): Salem1692PlayingCard {
  const meta = SALEM_1692_CARD_META[kind];
  return { id: `play-${kind}-${playingSeq++}`, kind, color: meta.color };
}

export function buildPlayingDeck(): Salem1692PlayingCard[] {
  playingSeq = 0;
  const cards: Salem1692PlayingCard[] = [];
  for (const [kind, count] of Object.entries(SALEM_1692_PLAYING_COUNTS) as [
    Salem1692PlayingCardKind,
    number,
  ][]) {
    if (kind === 'night' || kind === 'conspiracy') continue;
    for (let i = 0; i < count; i += 1) cards.push(newPlayingCard(kind));
  }
  const shuffled = shuffle(cards);
  const conspiracy = newPlayingCard('conspiracy');
  const night = newPlayingCard('night');
  const idx = Math.floor(Math.random() * (shuffled.length + 1));
  shuffled.splice(idx, 0, conspiracy);
  shuffled.push(night);
  return shuffled;
}

export function salem1692CardLabel(kind: Salem1692PlayingCardKind): string {
  const labels: Record<Salem1692PlayingCardKind, string> = {
    accusation: 'Accusation',
    evidence: 'Evidence',
    witness: 'Witness',
    piety: 'Piety',
    asylum: 'Asylum',
    matchmaker: 'Matchmaker',
    alibi: 'Alibi',
    stocks: 'Stocks',
    scapegoat: 'Scapegoat',
    curse: 'Curse',
    arson: 'Arson',
    robbery: 'Robbery',
    conspiracy: 'Conspiracy',
    night: 'Night',
  };
  return labels[kind];
}

export function salem1692TryalLabel(kind: Salem1692TryalKind): string {
  if (kind === 'witch') return 'Witch';
  if (kind === 'constable') return 'Constable';
  return 'Not a Witch';
}

export function salem1692ImagePath(artKey: string): string {
  const version = SALEM_1692_CLOUD_VERSION || 'vPLACEHOLDER';
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/q_auto/f_auto/${version}/${artKey}`;
}

export function salem1692AccusationValue(kind: Salem1692PlayingCardKind): number {
  return SALEM_1692_CARD_META[kind].accusationValue;
}

export function isSalem1692BlueKind(kind: Salem1692PlayingCardKind): boolean {
  return SALEM_1692_CARD_META[kind].color === 'blue';
}

export function isSalem1692RedKind(kind: Salem1692PlayingCardKind): boolean {
  return SALEM_1692_CARD_META[kind].color === 'red';
}

export function isSalem1692BlackKind(kind: Salem1692PlayingCardKind): boolean {
  return SALEM_1692_CARD_META[kind].color === 'black';
}

/** Lasting cards that sit in front of a player after being played. */
export function isSalem1692FrontLastingKind(kind: Salem1692PlayingCardKind): boolean {
  return kind === 'piety' || kind === 'asylum' || kind === 'matchmaker';
}
