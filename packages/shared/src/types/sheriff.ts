export type SheriffLegalGood = 'apple' | 'cheese' | 'bread' | 'chicken';
export type SheriffContraband =
  | 'pepper'
  | 'mead'
  | 'silk'
  | 'crossbow'
  | 'feast_plate'
  | 'dragon_pepper'
  | 'brimstone_oil'
  | 'olive_oil'
  | 'strawberry_mead'
  | 'golden_silk'
  | 'heavy_crossbow'
  | 'prince_johns_sword'
  | 'royal_summons'
  | 'arcane_scrolls'
  | 'green_apples'
  | 'golden_apples'
  | 'bleu_cheese'
  | 'gouda_cheese'
  | 'rye_bread'
  | 'pumpernickel_bread'
  | 'royal_rooster';
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

export type SheriffPhase =
  | 'merchant_market'
  | 'merchant_bagging'
  | 'merchant_bribe'
  | 'sheriff_inspection'
  | 'round_end'
  | 'game_over';

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
  bribeByPlayer: Record<string, number>;
  bribeDoneByPlayer: Record<string, boolean>;
  lastInspection?: {
    id: string;
    merchantId: string;
    merchantName: string;
    sheriffId: string;
    sheriffName: string;
    inspected: boolean;
    confiscatedCount: number;
    passedCount: number;
    sheriffDelta: number;
    merchantDelta: number;
    passedCards: SheriffGoodType[];
    confiscatedCards: SheriffGoodType[];
    declaredGood: SheriffLegalGood;
    bribePaid: number;
  };
  publicLog: string[];
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
  canBribeNow: boolean;
  canInspectNow: boolean;
  myCurrentBribe: number;
  legalGoodsForDeclaration: SheriffLegalGood[];
  discardTopLeft?: SheriffGoodType;
  discardTopRight?: SheriffGoodType;
  discardLeftPreview: SheriffGoodType[];
  discardRightPreview: SheriffGoodType[];
  discardLeftCount: number;
  discardRightCount: number;
  drawPileCount: number;
  publicLog: string[];
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
  | { type: 'set_bribe'; amount: number }
  | { type: 'confirm_bribe' }
  | { type: 'sheriff_decide'; inspect: boolean };

