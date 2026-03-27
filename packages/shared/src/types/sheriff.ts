export type SheriffLegalGood = 'apple' | 'cheese' | 'bread' | 'chicken';
export type SheriffContraband = 'pepper' | 'mead' | 'silk' | 'crossbow' | 'feast_plate';
export type SheriffGoodType = SheriffLegalGood | SheriffContraband;

export interface SheriffCard {
  id: string;
  type: SheriffGoodType;
}

export interface SheriffPlayerState {
  id: string;
  name: string;
  hand: SheriffCard[];
  stall: SheriffCard[];
  coins: number;
}

export type SheriffPhase = 'merchant_market' | 'merchant_bagging' | 'sheriff_inspection' | 'round_end' | 'game_over';

export interface SheriffState {
  phase: SheriffPhase;
  players: SheriffPlayerState[];
  drawPile: SheriffCard[];
  discardPiles: [SheriffCard[], SheriffCard[]];
  sheriffIndex: number;
  merchantOrder: number[];
  merchantTurnPointer: number;
  bagByPlayer: Record<string, SheriffCard[]>;
  declaredGoodByPlayer: Record<string, SheriffLegalGood | undefined>;
  marketDoneByPlayer: Record<string, boolean>;
  lastInspection?: {
    merchantId: string;
    merchantName: string;
    sheriffId: string;
    sheriffName: string;
    inspected: boolean;
    confiscatedCount: number;
    passedCount: number;
    sheriffDelta: number;
    merchantDelta: number;
  };
  lastRoundSummary?: string;
  roundsCompleted: number;
  sheriffTurnsTaken: Record<string, number>;
  winnerIds?: string[];
}

export interface SheriffPlayerView {
  phase: SheriffPhase;
  me: { id: string; name: string; coins: number };
  players: {
    id: string;
    name: string;
    coins: number;
    handCount: number;
    stallCount: number;
  }[];
  myHand: SheriffCard[];
  myStall: SheriffCard[];
  sheriffId: string;
  sheriffName: string;
  activeMerchantId?: string;
  activeMerchantName?: string;
  myBagCount: number;
  myDeclaredGood?: SheriffLegalGood;
  canBagNow: boolean;
  canMarketNow: boolean;
  canInspectNow: boolean;
  legalGoodsForDeclaration: SheriffLegalGood[];
  discardTopLeft?: SheriffGoodType;
  discardTopRight?: SheriffGoodType;
  discardLeftCount: number;
  discardRightCount: number;
  drawPileCount: number;
  lastRoundSummary?: string;
  lastInspection?: SheriffState['lastInspection'];
  winners?: { id: string; name: string; score: number }[];
  scoreBreakdown?: { id: string; name: string; coins: number; goodsValue: number; bonus: number; total: number }[];
}

export type SheriffAction =
  | {
      type: 'merchant_market';
      discardCardIds: string[];
      discardPileIndex: 0 | 1;
      drawFrom: Array<'deck' | 'left' | 'right'>;
    }
  | { type: 'set_bag'; cardIds: string[]; declaredGood: SheriffLegalGood }
  | { type: 'sheriff_decide'; inspect: boolean };

