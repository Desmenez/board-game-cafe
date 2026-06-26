import { isSushiGoMaki, isSushiGoNigiri, sushiGoMakiIcons } from './sushi-go-deck.js';
import type { SushiGoCard, SushiGoCardKind, SushiGoWasabiSlot } from './types/sushi-go.js';

export function scoreDumplings(count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 3;
  if (count === 3) return 6;
  if (count === 4) return 10;
  return 15;
}

export function scoreTempura(count: number): number {
  return Math.floor(count / 2) * 5;
}

export function scoreSashimi(count: number): number {
  return Math.floor(count / 3) * 10;
}

export function nigiriBasePoints(kind: SushiGoCardKind): number {
  if (kind === 'nigiri_squid') return 3;
  if (kind === 'nigiri_salmon') return 2;
  if (kind === 'nigiri_egg') return 1;
  return 0;
}

export function scoreNigiriFromSlots(
  nigiriCards: readonly SushiGoCard[],
  wasabiSlots: readonly SushiGoWasabiSlot[],
): number {
  const nigiriById = new Map(nigiriCards.map((c) => [c.id, c]));
  let total = 0;
  const pairedIds = new Set<string>();

  for (const slot of wasabiSlots) {
    if (!slot.nigiriId) continue;
    const card = nigiriById.get(slot.nigiriId);
    if (!card) continue;
    pairedIds.add(card.id);
    total += nigiriBasePoints(card.kind) * 3;
  }

  for (const card of nigiriCards) {
    if (pairedIds.has(card.id)) continue;
    total += nigiriBasePoints(card.kind);
  }

  return total;
}

export interface MakiScoreResult {
  points: Record<string, number>;
}

/** Award maki points to players with at least 1 maki card */
export function scoreMaki(
  makiIconsByPlayer: Record<string, number>,
  playerIds: readonly string[],
): MakiScoreResult {
  const points: Record<string, number> = {};
  for (const id of playerIds) points[id] = 0;

  const eligible = playerIds.filter((id) => (makiIconsByPlayer[id] ?? 0) > 0);
  if (eligible.length === 0) return { points };

  const sorted = [...eligible].sort(
    (a, b) => (makiIconsByPlayer[b] ?? 0) - (makiIconsByPlayer[a] ?? 0),
  );
  const topIcons = makiIconsByPlayer[sorted[0]!] ?? 0;
  const first = sorted.filter((id) => (makiIconsByPlayer[id] ?? 0) === topIcons);

  if (first.length > 1) {
    const each = Math.floor(6 / first.length);
    for (const id of first) points[id] = (points[id] ?? 0) + each;
    return { points };
  }

  points[first[0]!] = (points[first[0]!] ?? 0) + 6;

  const remaining = sorted.filter((id) => !first.includes(id));
  if (remaining.length === 0) return { points };

  const secondIcons = makiIconsByPlayer[remaining[0]!] ?? 0;
  const second = remaining.filter((id) => (makiIconsByPlayer[id] ?? 0) === secondIcons);
  const eachSecond = Math.floor(3 / second.length);
  for (const id of second) points[id] = (points[id] ?? 0) + eachSecond;

  return { points };
}

export function countMakiIcons(makiCardKinds: readonly SushiGoCardKind[]): number {
  return makiCardKinds.reduce((sum, kind) => sum + sushiGoMakiIcons(kind), 0);
}

export interface PuddingScoreResult {
  points: Record<string, number>;
}

/** Pudding scoring at end of game */
export function scorePudding(
  puddingCounts: Record<string, number>,
  playerIds: readonly string[],
  playerCount: number,
): PuddingScoreResult {
  const points: Record<string, number> = {};
  for (const id of playerIds) points[id] = 0;

  const counts = playerIds.map((id) => puddingCounts[id] ?? 0);
  const allSame = counts.every((c) => c === counts[0]);
  if (allSame) return { points };

  const max = Math.max(...counts);
  const min = Math.min(...counts);
  const most = playerIds.filter((id) => (puddingCounts[id] ?? 0) === max);
  const least = playerIds.filter((id) => (puddingCounts[id] ?? 0) === min);

  const mostEach = Math.floor(6 / most.length);
  for (const id of most) points[id] = (points[id] ?? 0) + mostEach;

  if (playerCount > 2) {
    const leastEach = Math.floor(6 / least.length);
    for (const id of least) points[id] = (points[id] ?? 0) - leastEach;
  }

  return { points };
}

export function scorePlayerRound(input: {
  tempuraCount: number;
  sashimiCount: number;
  dumplingCount: number;
  makiIcons: number;
  nigiriCards: SushiGoCard[];
  wasabiSlots: SushiGoWasabiSlot[];
  makiPoints: number;
}): {
  maki: number;
  tempura: number;
  sashimi: number;
  dumpling: number;
  nigiri: number;
  total: number;
} {
  const tempura = scoreTempura(input.tempuraCount);
  const sashimi = scoreSashimi(input.sashimiCount);
  const dumpling = scoreDumplings(input.dumplingCount);
  const nigiri = scoreNigiriFromSlots(input.nigiriCards, input.wasabiSlots);
  const maki = input.makiPoints;
  return {
    maki,
    tempura,
    sashimi,
    dumpling,
    nigiri,
    total: maki + tempura + sashimi + dumpling + nigiri,
  };
}

export function cardsFromKinds(cards: readonly SushiGoCard[]): {
  tempura: number;
  sashimi: number;
  dumpling: number;
  makiKinds: SushiGoCardKind[];
  nigiri: SushiGoCard[];
} {
  const makiKinds: SushiGoCardKind[] = [];
  const nigiri: SushiGoCard[] = [];
  let tempura = 0;
  let sashimi = 0;
  let dumpling = 0;

  for (const card of cards) {
    if (card.kind === 'tempura') tempura += 1;
    else if (card.kind === 'sashimi') sashimi += 1;
    else if (card.kind === 'dumpling') dumpling += 1;
    else if (isSushiGoMaki(card.kind)) makiKinds.push(card.kind);
    else if (isSushiGoNigiri(card.kind)) nigiri.push(card);
  }

  return { tempura, sashimi, dumpling, makiKinds, nigiri };
}
