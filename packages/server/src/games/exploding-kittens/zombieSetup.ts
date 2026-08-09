import type {
  ExplodingKittensCard,
  ExplodingKittensCardType,
  ExplodingKittensExpansionsEnabled,
  ExplodingKittensMixBase,
  ExplodingKittensPlayerState,
  ExplodingKittensState,
} from 'shared';
import {
  apocalypseDrawPileTarget,
  apocalypseSaveCardCounts,
  buildZombieKittenCardSpecs,
  clampEkDeckCopies,
  EK_BASE_COUNTS_BY_MODE,
  EK_BARKING_FIXED_COUNTS,
  EK_IMPLODING_FIXED_COUNTS,
  EK_STREAKING_FIXED_COUNTS,
  isZombieMode,
} from 'shared';

type NewCardFn = (type: ExplodingKittensCardType) => ExplodingKittensCard;
type ShuffleFn = <T>(arr: T[]) => T[];

function appendFixedExpansion(
  cards: ExplodingKittensCard[],
  expansions: ExplodingKittensExpansionsEnabled,
  newCard: NewCardFn,
): void {
  if (expansions.barking) {
    for (const t of Object.keys(EK_BARKING_FIXED_COUNTS) as ExplodingKittensCardType[]) {
      const n = EK_BARKING_FIXED_COUNTS[t] ?? 0;
      for (let i = 0; i < n; i += 1) cards.push(newCard(t));
    }
  }
  if (expansions.streaking) {
    for (const t of Object.keys(EK_STREAKING_FIXED_COUNTS) as ExplodingKittensCardType[]) {
      const n = EK_STREAKING_FIXED_COUNTS[t] ?? 0;
      for (let i = 0; i < n; i += 1) cards.push(newCard(t));
    }
  }
  if (expansions.imploding) {
    for (const t of Object.keys(EK_IMPLODING_FIXED_COUNTS) as ExplodingKittensCardType[]) {
      const n = EK_IMPLODING_FIXED_COUNTS[t] ?? 0;
      for (let i = 0; i < n; i += 1) cards.push(newCard(t));
    }
  }
}

/** Companion base pile without cats / EK / defuse (Apocalypse). */
function buildCompanionNoCats(
  mixBase: 'original' | 'party_pack',
  deckCopies: number,
  newCard: NewCardFn,
): ExplodingKittensCard[] {
  const copies = clampEkDeckCopies(deckCopies);
  const counts = EK_BASE_COUNTS_BY_MODE[mixBase];
  const cards: ExplodingKittensCard[] = [];
  for (const t of Object.keys(counts) as ExplodingKittensCardType[]) {
    if (t === 'exploding_kitten' || t === 'defuse' || t.startsWith('cat_') || t === 'feral_cat') {
      continue;
    }
    const n = (counts[t] ?? 0) * copies;
    for (let i = 0; i < n; i += 1) cards.push(newCard(t));
  }
  return cards;
}

export type ZombieSetupResult = {
  players: ExplodingKittensPlayerState[];
  drawPile: ExplodingKittensCard[];
  lastEvent: string;
};

/**
 * Pure ZK or Apocalypse (mixBase + optional expansions) setup.
 * Call only when `mode === 'zombie_kittens'`.
 */
export function setupZombieKittensTable(args: {
  players: { id: string; name: string }[];
  mixBase: ExplodingKittensMixBase;
  expansions: ExplodingKittensExpansionsEnabled;
  deckCopies: number;
  newCard: NewCardFn;
  shuffle: ShuffleFn;
}): ZombieSetupResult {
  const { mixBase, expansions, deckCopies, newCard, shuffle } = args;
  const playerCount = args.players.length;
  const seated: ExplodingKittensPlayerState[] = shuffle(
    args.players.map((p) => ({
      id: p.id,
      name: p.name,
      alive: true,
      hand: [] as ExplodingKittensCard[],
      pendingTurns: 0,
    })),
  );
  seated[0]!.pendingTurns = 1;

  const isApocalypse = mixBase === 'original' || mixBase === 'party_pack';
  const zkSpecs = buildZombieKittenCardSpecs(playerCount);
  const zkCards = zkSpecs.map((s) => newCard(s.type));

  // Pull all ZK save cards out for dealing
  const zombiePool: ExplodingKittensCard[] = [];
  const restZk: ExplodingKittensCard[] = [];
  for (const c of zkCards) {
    if (c.type === 'zombie_kitten') zombiePool.push(c);
    else restZk.push(c);
  }

  if (!isApocalypse) {
    // Standalone: 1 ZK each, leftover ZK into pile; deal 7 from rest; n-1 EK
    const dealZk = Math.min(playerCount, zombiePool.length);
    for (let i = 0; i < dealZk; i += 1) {
      const zk = zombiePool.shift();
      if (zk) seated[i]!.hand.push(zk);
    }
    // If fewer ZK than players (2p paw filter has only 2 ZK for 2p — OK)
    while (zombiePool.length < playerCount - dealZk) {
      /* impossible if charts match */
    }
    for (let i = dealZk; i < playerCount; i += 1) {
      // Should not happen with official counts; give nothing extra
    }

    let pile = shuffle([...restZk, ...zombiePool]);
    for (let round = 0; round < 7; round += 1) {
      for (const pl of seated) {
        const c = pile.shift();
        if (c) pl.hand.push(c);
      }
    }
    appendFixedExpansion(pile, expansions, newCard);
    const kittens = Math.max(1, playerCount - 1) + (expansions.streaking ? 1 : 0);
    for (let i = 0; i < kittens; i += 1) pile.push(newCard('exploding_kitten'));
    if (expansions.imploding) pile.push(newCard('imploding_kitten'));
    pile = shuffle(pile);

    return {
      players: seated,
      drawPile: pile,
      lastEvent: `Zombie Kittens — ${seated[0]!.name} เริ่มก่อน (${playerCount} คน)`,
    };
  }

  // Apocalypse chart saves
  const saves = apocalypseSaveCardCounts(playerCount);
  const savePool: ExplodingKittensCard[] = [];
  for (let i = 0; i < saves.zombieKitten; i += 1) {
    const zk = zombiePool.shift() ?? newCard('zombie_kitten');
    savePool.push(zk);
  }
  for (let i = 0; i < saves.defuse; i += 1) savePool.push(newCard('defuse'));
  // Extra ZK from filtered deck not in chart → discard from game
  zombiePool.length = 0;

  const shuffledSaves = shuffle(savePool);
  for (let i = 0; i < playerCount; i += 1) {
    const save = shuffledSaves.shift();
    if (save) seated[i]!.hand.push(save);
  }

  let pile = shuffle([...restZk, ...buildCompanionNoCats(mixBase, deckCopies, newCard)]);
  appendFixedExpansion(pile, expansions, newCard);

  for (let round = 0; round < 7; round += 1) {
    for (const pl of seated) {
      const c = pile.shift();
      if (c) pl.hand.push(c);
    }
  }

  const target = apocalypseDrawPileTarget(playerCount);
  if (pile.length > target) {
    pile = shuffle(pile).slice(0, target);
  }

  const kittens = Math.max(1, playerCount - 1) + (expansions.streaking ? 1 : 0);
  for (let i = 0; i < kittens; i += 1) pile.push(newCard('exploding_kitten'));
  if (expansions.imploding) pile.push(newCard('imploding_kitten'));
  pile = shuffle(pile);

  return {
    players: seated,
    drawPile: pile,
    lastEvent: `Zombie Apocalypse (${mixBase}) — ${seated[0]!.name} เริ่มก่อน (${playerCount} คน)`,
  };
}

export function killPlayerZombieStyle(
  s: ExplodingKittensState,
  victim: ExplodingKittensPlayerState,
  kitten: ExplodingKittensCard | undefined,
): void {
  victim.alive = false;
  victim.pendingTurns = 0;
  if (kitten) victim.faceUpEk = kitten;
  if (!s.eliminationOrder.includes(victim.id)) s.eliminationOrder.push(victim.id);
}

export function revivePlayer(
  s: ExplodingKittensState,
  targetId: string,
): ExplodingKittensCard | undefined {
  const target = s.players.find((p) => p.id === targetId);
  if (!target || target.alive) return undefined;
  target.alive = true;
  const ek = target.faceUpEk;
  target.faceUpEk = undefined;
  s.eliminationOrder = s.eliminationOrder.filter((id) => id !== targetId);
  return ek;
}

export function countDeadPlayers(s: ExplodingKittensState): number {
  return s.players.filter((p) => !p.alive).length;
}

export function zombieModeActive(s: ExplodingKittensState): boolean {
  return isZombieMode(s.mode);
}
