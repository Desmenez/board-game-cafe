// ============================================================
// Avalon Types
// ============================================================

export type AvalonRole =
  | 'merlin'
  | 'percival'
  | 'loyal_servant'
  | 'lancelot_loyal'
  | 'assassin'
  | 'morgana'
  | 'mordred'
  | 'oberon'
  | 'minion'
  | 'lancelot_evil';

export type AvalonTeam = 'good' | 'evil';

export type AvalonPhase =
  | 'role_reveal'
  | 'lady_of_lake'
  | 'team_building'
  | 'team_vote'
  | 'quest'
  | 'quest_reveal'
  | 'assassination'
  | 'game_over';

export interface AvalonPlayer {
  id: string;
  name: string;
  role: AvalonRole;
  team: AvalonTeam;
  /**
   * Portrait art index for `loyal_servant` / `minion` (unique among that role in the game).
   * Other roles omit this.
   */
  portraitVariant?: number;
}

/** Distinct portrait arts for normal good/evil roles — must match client `imageMap` pool sizes. */
export const AVALON_LOYAL_SERVANT_PORTRAIT_COUNT = 5;
export const AVALON_MINION_PORTRAIT_COUNT = 3;

export interface QuestResult {
  questNumber: number;
  teamPlayerIds: string[];
  votes: Record<string, boolean>; // playerId → approve/reject
  questVotes?: Record<string, boolean>; // playerId → success/fail
  result?: 'success' | 'fail';
  requiresTwoFails: boolean;
}

export interface AvalonState {
  phase: AvalonPhase;
  players: AvalonPlayer[];
  /** During role_reveal: who has clicked "ready"; all must acknowledge before team_building. */
  roleAcknowledgedBy: string[];
  currentLeaderIndex: number;
  questNumber: number; // 0-4
  quests: QuestResult[];
  questResults: ('success' | 'fail' | 'pending')[];
  selectedTeam: string[];
  teamVotes: Record<string, boolean>;
  questVotes: Record<string, boolean>;
  consecutiveRejects: number;
  ladyOfTheLakeEnabled?: boolean;
  /** Lancelot promo: Sir Lancelot (good) + Evil Lancelot; รู้ตัวตนกัน — ต้องมีผู้เล่น 8 คนขึ้นไป */
  lancelotEnabled?: boolean;
  /** ผู้ถือ Lady — เริ่มเกม: คนก่อนหัวหน้าคนแรกในลำดับการหมุน; หลังสืบสวนโทเคนไปคนที่เลือก */
  ladyHolderId?: string;
  /** ผู้เล่นที่เคยถือ Lady แล้ว — ห้ามถูกเลือกให้โชว์การ์ดอีก (กฎทางการ) */
  ladyEverHolderIds?: string[];
  ladyHistory?: { fromId: string; toId: string; team: AvalonTeam }[];
  ladyJustRevealed?: { holderId: string; targetId: string; team: AvalonTeam };
  /** Shuffled quest cards (true = success); used in quest_reveal */
  questRevealCards?: boolean[];
  questRevealShown?: number;
  assassinTarget?: string;
  winner?: AvalonTeam;
  winReason?: string;
}

/** Player view — hides secret info */
export interface AvalonPlayerView {
  phase: AvalonPhase;
  players: {
    id: string;
    name: string;
    role?: AvalonRole;
    team?: AvalonTeam;
    portraitVariant?: number;
  }[];
  myRole: AvalonRole;
  myTeam: AvalonTeam;
  /** Portrait index for `loyal_servant` / `minion` (matches server assignment). */
  myPortraitVariant?: number;
  knownInfo: { id: string; name: string; detail: string }[];
  /** role_reveal: whether this player already pressed acknowledge */
  hasAcknowledgedRole?: boolean;
  /** role_reveal: how many players have acknowledged / total */
  roleAcknowledgeProgress?: { current: number; total: number };
  /**
   * role_reveal: roles drawn for this game (for the local role reveal animation).
   * This does NOT include which player has which role.
   */
  roleRevealAllRoles?: AvalonRole[];
  /** role_reveal: parallel to `roleRevealAllRoles` / player order — portrait index for loyal_servant / minion */
  roleRevealPortraitVariants?: number[];
  ladyOfTheLakeEnabled?: boolean;
  lancelotEnabled?: boolean;
  ladyHolderId?: string;
  ladyPrompt?: { holderId: string; canInspectIds: { id: string; name: string }[] };
  /** ทุกคนเห็น: ใครใช้ Lady กับใคร (จนกว่าผู้ถือ Lady จะ acknowledge) */
  ladyRevealBroadcast?: {
    holderId: string;
    holderName: string;
    targetId: string;
    targetName: string;
  };
  /** เฉพาะผู้ถือ Lady ที่เพิ่งตรวจ — ฝ่ายจริงของเป้าหมาย */
  ladyRevealSecret?: { targetName: string; team: AvalonTeam };
  currentLeaderIndex: number;
  questNumber: number;
  quests: QuestResult[];
  questResults: ('success' | 'fail' | 'pending')[];
  selectedTeam: string[];
  teamVotes: Record<string, boolean>;
  /** team_vote: votes cast so far / all players (does not reveal others’ choices early) */
  teamVoteProgress?: { current: number; total: number };
  /** team_vote: who has not voted yet */
  awaitingTeamVoteFrom?: { id: string; name: string }[];
  questVotesCount?: { success: number; fail: number };
  /** quest_reveal: shuffled card results (true = success) */
  questRevealSequence?: boolean[];
  /** quest_reveal: number of cards revealed so far */
  questRevealShown?: number;
  consecutiveRejects: number;
  assassinTarget?: string;
  winner?: AvalonTeam;
  winReason?: string;
}

export type AvalonAction =
  | { type: 'acknowledge_role' }
  | { type: 'acknowledge_lady_reveal' }
  | { type: 'lady_inspect'; targetId: string }
  | { type: 'select_team'; playerIds: string[] }
  | { type: 'submit_team' }
  | { type: 'vote_team'; approve: boolean }
  | { type: 'quest_vote'; success: boolean }
  | { type: 'assassinate'; targetId: string };

// Quest size config per player count
// [questNumber][playerCount] = team size
export const QUEST_TEAM_SIZES: Record<number, number[]> = {
  5: [2, 3, 2, 3, 3],
  6: [2, 3, 4, 3, 4],
  7: [2, 3, 3, 4, 4],
  8: [3, 4, 4, 5, 5],
  9: [3, 4, 4, 5, 5],
  10: [3, 4, 4, 5, 5],
};

// Quest 4 requires 2 fails for 7+ players
export const QUEST_TWO_FAILS: Record<number, boolean[]> = {
  5: [false, false, false, false, false],
  6: [false, false, false, false, false],
  7: [false, false, false, true, false],
  8: [false, false, false, true, false],
  9: [false, false, false, true, false],
  10: [false, false, false, true, false],
};

// Role distribution per player count
export const ROLE_DISTRIBUTION: Record<number, { good: AvalonRole[]; evil: AvalonRole[] }> = {
  5: { good: ['merlin', 'percival', 'loyal_servant'], evil: ['assassin', 'morgana'] },
  6: {
    good: ['merlin', 'percival', 'loyal_servant', 'loyal_servant'],
    evil: ['assassin', 'morgana'],
  },
  7: {
    good: ['merlin', 'percival', 'loyal_servant', 'loyal_servant'],
    evil: ['assassin', 'morgana', 'oberon'],
  },
  8: {
    good: ['merlin', 'percival', 'loyal_servant', 'loyal_servant', 'loyal_servant'],
    evil: ['assassin', 'morgana', 'minion'],
  },
  9: {
    good: [
      'merlin',
      'percival',
      'loyal_servant',
      'loyal_servant',
      'loyal_servant',
      'loyal_servant',
    ],
    evil: ['assassin', 'morgana', 'mordred'],
  },
  10: {
    good: [
      'merlin',
      'percival',
      'loyal_servant',
      'loyal_servant',
      'loyal_servant',
      'loyal_servant',
    ],
    evil: ['assassin', 'morgana', 'mordred', 'oberon'],
  },
};
