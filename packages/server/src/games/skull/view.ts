import {
  type SkullDisc,
  type SkullPlayerView,
  type SkullPublicSeat,
  type SkullPublicStackDisc,
  type SkullState,
} from 'shared';
import {
  canPlaceOpening,
  discsInPlay,
  legalFlipOwnerIds,
  mustBid,
  activeSeats,
} from './rules.js';

function toPublicStackDisc(d: {
  id: string;
  color: SkullPublicStackDisc['color'];
  face: SkullDisc['face'];
  faceUp: boolean;
  isLastChance?: boolean;
}): SkullPublicStackDisc {
  return {
    id: d.id,
    color: d.color,
    faceUp: d.faceUp,
    face: d.faceUp ? d.face : null,
    isLastChance: d.isLastChance,
  };
}

export function toPlayerView(state: SkullState, playerId: string): SkullPlayerView {
  const me = state.seats[playerId];

  const seats: SkullPublicSeat[] = state.playerOrder.map((id) => {
    const s = state.seats[id]!;
    return {
      id: s.id,
      name: s.name,
      color: s.color,
      wins: s.wins,
      eliminated: s.eliminated,
      hasLastChance: s.hasLastChance,
      handCount: s.hand.length,
      stack: s.stack.map(toPublicStackDisc),
      passed: s.passed,
      matAside: state.phase === 'bidding' && s.passed,
    };
  });

  const hand = me && !me.eliminated ? me.hand.map((d) => ({ ...d })) : [];

  let canAct = false;
  let legalPlaceDiscIds: string[] = [];
  let legalFlipOwnerIdsList: string[] = [];
  let discardPool: SkullDisc[] | null = null;
  let mustConfirmRandomDiscard = false;
  let legalFirstPlayerIds: string[] = [];
  let minBid = 0;
  let maxBid = 0;

  if (me && !me.eliminated) {
    if (state.phase === 'opening_place' && canPlaceOpening(state, playerId)) {
      canAct = true;
      legalPlaceDiscIds = hand.map((d) => d.id);
    } else if (state.phase === 'decision' && state.activePlayerId === playerId) {
      canAct = true;
      if (!mustBid(state, playerId)) {
        legalPlaceDiscIds = hand.map((d) => d.id);
      }
      maxBid = discsInPlay(state);
      minBid = maxBid >= 1 ? 1 : 0;
    } else if (state.phase === 'bidding' && state.activePlayerId === playerId && !me.passed) {
      canAct = true;
      maxBid = discsInPlay(state);
      minBid = state.currentBid + 1;
    } else if (state.phase === 'challenge' && state.challengerId === playerId) {
      canAct = true;
      legalFlipOwnerIdsList = legalFlipOwnerIds(state, playerId);
    } else if (state.phase === 'choose_discard' && state.pendingDiscard) {
      const p = state.pendingDiscard;
      if (p.mode === 'choose_by_challenger' && p.challengerId === playerId) {
        canAct = true;
        discardPool = p.pool.map((d) => ({ ...d }));
      } else if (p.mode === 'random_by_owner') {
        if (p.skullOwnerId === playerId) {
          canAct = true;
          mustConfirmRandomDiscard = true;
        }
        // Challenger sees their own discs while waiting for the random discard.
        if (p.challengerId === playerId) {
          discardPool = p.pool.map((d) => ({ ...d }));
        }
      }
    } else if (state.phase === 'discard_reveal' && !me.eliminated) {
      canAct = true;
    } else if (state.phase === 'round_result' && !me.eliminated) {
      canAct = true;
    }
  }

  // Self-eliminated Challenger still picks the next first player.
  if (
    state.phase === 'choose_first_player' &&
    state.roundOutcome?.kind === 'failure' &&
    state.roundOutcome.challengerId === playerId
  ) {
    canAct = true;
    legalFirstPlayerIds = activeSeats(state).map((s) => s.id);
  }

  const discardReveal: SkullPlayerView['discardReveal'] = state.discardReveal
    ? (() => {
        const reveal = state.discardReveal;
        const isChallenger = playerId === reveal.challengerId;
        if (isChallenger) {
          return {
            challengerId: reveal.challengerId,
            skullOwnerId: reveal.skullOwnerId,
            facesHidden: false,
            discarded: { ...reveal.discarded },
            pool: reveal.pool.map((d) => ({ ...d })),
          };
        }
        // Official rule: random discard is face-down — only the disc owner learns the face.
        return {
          challengerId: reveal.challengerId,
          skullOwnerId: reveal.skullOwnerId,
          facesHidden: true,
          discarded: null,
          pool: null,
        };
      })()
    : null;

  return {
    phase: state.phase,
    playerOrder: [...state.playerOrder],
    seats,
    firstPlayerId: state.firstPlayerId,
    activePlayerId: state.activePlayerId,
    challengerId: state.challengerId,
    currentBid: state.currentBid,
    flippedCount: state.flippedCount,
    discsInPlay: discsInPlay(state),
    round: state.round,
    lastEvent: state.lastEvent,
    result: state.result,
    roundOutcome: state.roundOutcome,
    pendingAcks: [...state.pendingAcks],
    lastChanceHolderId: state.lastChanceHolderId,
    discardReveal,
    you: {
      hand,
      canAct,
      legalPlaceDiscIds,
      legalFlipOwnerIds: legalFlipOwnerIdsList,
      discardPool,
      mustConfirmRandomDiscard,
      legalFirstPlayerIds,
      minBid,
      maxBid,
    },
  };
}
