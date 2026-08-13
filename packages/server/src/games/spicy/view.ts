import {
  type SpicyDeclaration,
  type SpicyPlayerView,
  type SpicyState,
} from 'shared';
import { legalDeclarations } from './rules.js';

export function toPlayerView(state: SpicyState, playerId: string): SpicyPlayerView {
  const me = state.seats[playerId];
  const top = state.spicyStack[state.spicyStack.length - 1] ?? null;

  const seats = state.playerOrder.map((id) => {
    const s = state.seats[id]!;
    return {
      id: s.id,
      name: s.name,
      handCount: s.hand.length,
      wonCount: s.wonCount,
      trophies: s.trophies,
    };
  });

  const hand = me ? me.hand.map((c) => ({ ...c })) : [];
  let legal: SpicyDeclaration[] = [];
  let canPlay = false;
  let canPass = false;
  let canChallenge = false;
  let canChallengeCopy = false;
  let canDecline = false;
  let canCopyCat = false;
  let canTuck = false;
  let canAckChallenge = false;

  if (me) {
    if (state.phase === 'challenge_reveal' && state.challengeReveal) {
      canAckChallenge = true;
    } else if (state.phase === 'tuck' && state.tuckPlayerId === playerId) {
      canTuck = true;
    } else if (state.phase === 'trophy_window') {
      if (!state.declineChallengeIds.includes(playerId)) {
        canDecline = true;
      }
      if (top && top.ownerId !== playerId) {
        if (top.isCopyCat) canChallengeCopy = true;
        else canChallenge = true;
      }
      if (
        state.specialCard === 'copy_cat' &&
        state.copyWindowOpen &&
        state.lastPlay &&
        state.lastPlay.playerId !== playerId &&
        hand.length > 0
      ) {
        canCopyCat = true;
      }
    } else if (state.phase === 'turn') {
      if (state.activePlayerId === playerId) {
        canPlay = true;
        canPass = true;
        legal = legalDeclarations(state);
      }
      if (top && top.ownerId !== playerId) {
        if (top.isCopyCat) canChallengeCopy = true;
        else canChallenge = true;
      }
      if (
        state.specialCard === 'copy_cat' &&
        state.copyWindowOpen &&
        state.lastPlay &&
        state.lastPlay.playerId !== playerId &&
        hand.length > 0
      ) {
        canCopyCat = true;
      }
    }
  }

  const canAct =
    canPlay ||
    canPass ||
    canChallenge ||
    canChallengeCopy ||
    canDecline ||
    canCopyCat ||
    canTuck ||
    canAckChallenge;

  return {
    phase: state.phase,
    playerOrder: [...state.playerOrder],
    seats,
    activePlayerId: state.activePlayerId,
    drawCount: state.drawPile.length,
    cardsUntilWorldsEnd: state.worldsEndAt,
    spicyStackCount: state.spicyStack.length,
    topDeclaration: top ? { ...top.declaration } : null,
    topOwnerId: top?.ownerId ?? null,
    trophiesLeft: state.trophiesLeft,
    specialCard: state.specialCard,
    spiceRaiderIndex: state.spiceRaiderIndex,
    copyWindowOpen: state.copyWindowOpen,
    lastPlay: state.lastPlay
      ? { playerId: state.lastPlay.playerId, declaration: { ...state.lastPlay.declaration } }
      : null,
    declineChallengeIds: [...state.declineChallengeIds],
    challengeReveal: state.challengeReveal
      ? {
          ...state.challengeReveal,
          declaration: { ...state.challengeReveal.declaration },
          revealed: { ...state.challengeReveal.revealed },
        }
      : null,
    lastEvent: state.lastEvent,
    result: state.result,
    scores: state.scores,
    you: {
      hand,
      canAct,
      canPlay,
      canPass,
      canChallenge,
      canChallengeCopy,
      canDecline,
      canCopyCat,
      canTuck,
      canAckChallenge,
      legalDeclarations: legal,
    },
  };
}
