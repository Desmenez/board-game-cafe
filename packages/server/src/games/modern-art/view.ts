import type { ModernArtAuction, ModernArtPlayerView, ModernArtState } from 'shared';
import { canCloseOpen } from './rules.js';

function sanitizeAuction(auction: ModernArtAuction | null, playerId: string): ModernArtAuction | null {
  if (!auction) return null;
  const copy = structuredClone(auction);
  if (copy.kind === 'sealed') {
    const mine = copy.sealedBids[playerId];
    copy.sealedBids = mine != null ? { [playerId]: mine } : {};
  }
  return copy;
}

export function toPlayerView(state: ModernArtState, playerId: string): ModernArtPlayerView {
  const me = state.seats[playerId];
  const auction = state.auction;
  const wait = state.doubleWait;
  const hand = me ? me.hand.map((c) => ({ ...c })) : [];
  const money = me?.money ?? 0;

  const legalDoubleSeconds =
    wait && me
      ? hand
          .filter((c) => c.artist === wait.firstCard.artist && c.auction !== 'double')
          .map((c) => c.id)
      : [];

  const isAuctioneer = state.auctioneerId === playerId;
  const canOffer = state.phase === 'offer' && isAuctioneer && hand.length > 0;
  const canPlayDoubleSecond =
    state.phase === 'double_wait' && wait?.currentChooserId === playerId && legalDoubleSeconds.length > 0;
  const canSkipDouble = state.phase === 'double_wait' && wait?.currentChooserId === playerId;
  const canSetPrice = state.phase === 'set_price' && auction?.kind === 'fixed' && isAuctioneer;
  const canBid =
    state.phase === 'auction' &&
    Boolean(auction) &&
    (auction!.kind === 'open' || (auction!.kind === 'once_around' && auction!.nextBidderId === playerId)) &&
    money > auction!.currentBid;
  const canPass =
    state.phase === 'auction' &&
    Boolean(auction) &&
    ((auction!.kind === 'open') ||
      (auction!.kind === 'once_around' && auction!.nextBidderId === playerId) ||
      (auction!.kind === 'fixed' && auction!.nextBuyerId === playerId && playerId !== auction!.auctioneerId));
  const canBuyFixed =
    state.phase === 'auction' &&
    auction?.kind === 'fixed' &&
    auction.nextBuyerId === playerId &&
    auction.fixedPrice != null &&
    money >= auction.fixedPrice;
  const canSubmitSealed =
    state.phase === 'auction' &&
    auction?.kind === 'sealed' &&
    auction.sealedBids[playerId] == null;
  const closeOpen = canCloseOpen(state, playerId);
  const canAckRound = state.phase === 'round_scoring';
  const sealedSubmitted = auction?.kind === 'sealed' ? auction.sealedBids[playerId] != null : false;

  const minBid = auction ? auction.currentBid + 1 : 1;
  const maxBid = money;

  const seats = state.playerOrder.map((id) => {
    const s = state.seats[id]!;
    return {
      id: s.id,
      name: s.name,
      handCount: s.hand.length,
      gallery: s.gallery.map((c) => ({ ...c })),
      isAuctioneer: id === state.auctioneerId,
      submittedSealed: auction?.kind === 'sealed' ? auction.sealedBids[id] != null : false,
      money: state.phase === 'game_over' ? s.money : null,
    };
  });

  return {
    phase: state.phase,
    round: state.round,
    playerOrder: [...state.playerOrder],
    seats,
    auctioneerId: state.auctioneerId,
    drawCount: state.drawPile.length,
    playedThisRound: { ...state.playedThisRound },
    valueBoard: structuredClone(state.valueBoard),
    auction: sanitizeAuction(auction, playerId),
    doubleWait: wait ? structuredClone(wait) : null,
    roundRanks: state.roundRanks ? structuredClone(state.roundRanks) : null,
    roundPayouts: state.roundPayouts ? structuredClone(state.roundPayouts) : null,
    lastEvent: state.lastEvent,
    result: state.result,
    you: {
      money,
      hand,
      canOffer,
      canPlayDoubleSecond,
      canSkipDouble,
      canSetPrice,
      canBid,
      canPass,
      canBuyFixed,
      canSubmitSealed,
      canCloseOpen: closeOpen,
      canAckRound,
      legalDoubleSeconds,
      minBid,
      maxBid,
      sealedSubmitted,
    },
  };
}
