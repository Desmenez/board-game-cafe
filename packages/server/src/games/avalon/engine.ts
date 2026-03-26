import type { GameDefinition, Player, GameResult } from 'shared';
import type {
  AvalonState,
  AvalonAction,
  AvalonPlayerView,
  AvalonPlayer,
  AvalonRole,
  QuestResult,
} from 'shared';
import { QUEST_TEAM_SIZES, QUEST_TWO_FAILS, ROLE_DISTRIBUTION } from 'shared';

// ============================================================
// Avalon Game Engine
// ============================================================

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getTeamForRole(role: AvalonRole): 'good' | 'evil' {
  return ['assassin', 'morgana', 'mordred', 'oberon', 'minion'].includes(role) ? 'evil' : 'good';
}

function getKnownInfo(
  player: AvalonPlayer,
  allPlayers: AvalonPlayer[],
): { id: string; name: string; detail: string }[] {
  const known: { id: string; name: string; detail: string }[] = [];

  switch (player.role) {
    case 'merlin':
      // Merlin sees evil players EXCEPT Mordred
      for (const p of allPlayers) {
        if (p.id !== player.id && p.team === 'evil' && p.role !== 'mordred') {
          known.push({ id: p.id, name: p.name, detail: 'Evil' });
        }
      }
      break;

    case 'percival':
      // Percival sees Merlin and Morgana (but doesn't know which is which)
      for (const p of allPlayers) {
        if (p.role === 'merlin' || p.role === 'morgana') {
          known.push({ id: p.id, name: p.name, detail: 'Merlin หรือ Morgana' });
        }
      }
      break;

    case 'assassin':
    case 'morgana':
    case 'minion':
      // Evil sees other evil (except Oberon)
      for (const p of allPlayers) {
        if (p.id !== player.id && p.team === 'evil' && p.role !== 'oberon') {
          known.push({ id: p.id, name: p.name, detail: 'Evil ally' });
        }
      }
      break;

    case 'mordred':
      // Mordred sees other evil (except Oberon)
      for (const p of allPlayers) {
        if (p.id !== player.id && p.team === 'evil' && p.role !== 'oberon') {
          known.push({ id: p.id, name: p.name, detail: 'Evil ally' });
        }
      }
      break;

    // oberon, loyal_servant see nothing
  }

  return known;
}

function countQuestResults(state: AvalonState): { success: number; fail: number } {
  let success = 0;
  let fail = 0;
  for (const r of state.questResults) {
    if (r === 'success') success++;
    else if (r === 'fail') fail++;
  }
  return { success, fail };
}

function applyQuestAfterReveal(state: AvalonState): AvalonState {
  const s = { ...state };
  const playerCount = s.players.length;
  const fails = Object.values(s.questVotes).filter((v) => !v).length;
  const requiresTwoFails = QUEST_TWO_FAILS[playerCount][s.questNumber];
  const questFailed = requiresTwoFails ? fails >= 2 : fails >= 1;

  const questResult: QuestResult = {
    questNumber: s.questNumber,
    teamPlayerIds: [...s.selectedTeam],
    votes: { ...s.teamVotes },
    questVotes: { ...s.questVotes },
    result: questFailed ? 'fail' : 'success',
    requiresTwoFails,
  };

  s.quests = [...s.quests, questResult];
  const newQuestResults = [...s.questResults];
  newQuestResults[s.questNumber] = questFailed ? 'fail' : 'success';
  s.questResults = newQuestResults;

  delete s.questRevealCards;
  delete s.questRevealShown;

  const results = countQuestResults(s);

  if (results.success >= 3) {
    s.phase = 'assassination';
    s.questVotes = {};
    s.teamVotes = {};
  } else if (results.fail >= 3) {
    s.phase = 'game_over';
    s.winner = 'evil';
    s.winReason = 'Quest ล้มเหลว 3 ครั้ง — ฝ่ายชั่วชนะ!';
    s.questVotes = {};
  } else {
    s.questNumber += 1;
    s.currentLeaderIndex = (s.currentLeaderIndex + 1) % playerCount;
    s.phase = 'team_building';
    s.selectedTeam = [];
    s.teamVotes = {};
    s.questVotes = {};
  }
  return s;
}

/** Advance quest card reveal (server timer); one extra beat after all cards face-up, then resolve. */
export function advanceQuestRevealStep(state: AvalonState): AvalonState {
  if (state.phase !== 'quest_reveal' || !state.questRevealCards?.length) {
    return state;
  }
  const cards = state.questRevealCards;
  const n = cards.length;
  const shown = state.questRevealShown ?? 0;

  if (shown < n) {
    return { ...state, questRevealShown: shown + 1 };
  }

  return applyQuestAfterReveal(state);
}

export const avalonGame: GameDefinition<AvalonState, AvalonAction> = {
  id: 'avalon',
  name: 'The Resistance: Avalon',
  description:
    'เกม social deduction ที่ฝ่ายดีต้องหาฝ่ายชั่ว ขณะที่ฝ่ายชั่วต้องแทรกซึมทำลาย Quest ให้ล้มเหลว',
  minPlayers: 5,
  maxPlayers: 10,
  thumbnail: '/games/avalon/thumbnail.png',

  setup(players: Player[]): AvalonState {
    const count = players.length;
    const dist = ROLE_DISTRIBUTION[count];
    if (!dist) throw new Error(`Unsupported player count: ${count}`);

    const allRoles = shuffle([...dist.good, ...dist.evil]);

    const avalonPlayers: AvalonPlayer[] = players.map((p, i) => ({
      id: p.id,
      name: p.name,
      role: allRoles[i],
      team: getTeamForRole(allRoles[i]),
    }));

    const questResults: ('success' | 'fail' | 'pending')[] = Array(5).fill('pending');

    return {
      phase: 'role_reveal',
      players: avalonPlayers,
      roleAcknowledgedBy: [],
      currentLeaderIndex: Math.floor(Math.random() * players.length),
      questNumber: 0,
      quests: [],
      questResults,
      selectedTeam: [],
      teamVotes: {},
      questVotes: {},
      consecutiveRejects: 0,
    };
  },

  onAction(state: AvalonState, playerId: string, action: AvalonAction): AvalonState {
    const newState = { ...state };
    const playerCount = state.players.length;

    switch (action.type) {
      case 'acknowledge_role': {
        if (newState.phase !== 'role_reveal') break;
        if (newState.roleAcknowledgedBy.includes(playerId)) break;

        newState.roleAcknowledgedBy = [...newState.roleAcknowledgedBy, playerId];

        if (newState.roleAcknowledgedBy.length === playerCount) {
          newState.phase = 'team_building';
          newState.selectedTeam = [];
        }
        break;
      }

      case 'select_team': {
        if (newState.phase !== 'team_building') break;
        const leader = newState.players[newState.currentLeaderIndex];
        if (playerId !== leader.id) break;

        const sizes = QUEST_TEAM_SIZES[playerCount];
        const requiredSize = sizes?.[newState.questNumber] ?? 2;
        const ids = action.playerIds;
        // Client builds the team incrementally (0..requiredSize); accept partial selection.
        if (ids.length > requiredSize) break;
        const validIds = new Set(newState.players.map((p) => p.id));
        if (!ids.every((id) => validIds.has(id))) break;
        if (new Set(ids).size !== ids.length) break;

        newState.selectedTeam = [...ids];
        break;
      }

      case 'submit_team': {
        if (newState.phase !== 'team_building') break;
        const leader = newState.players[newState.currentLeaderIndex];
        if (playerId !== leader.id) break;

        const requiredSize = QUEST_TEAM_SIZES[playerCount][newState.questNumber];
        if (newState.selectedTeam.length !== requiredSize) break;

        newState.phase = 'team_vote';
        newState.teamVotes = {};
        break;
      }

      case 'vote_team': {
        if (newState.phase !== 'team_vote') break;
        if (newState.teamVotes[playerId] !== undefined) break;

        newState.teamVotes = { ...newState.teamVotes, [playerId]: action.approve };

        // Check if all votes are in
        if (Object.keys(newState.teamVotes).length === playerCount) {
          const approves = Object.values(newState.teamVotes).filter(Boolean).length;

          if (approves > playerCount / 2) {
            // Team approved → go to quest
            newState.phase = 'quest';
            newState.questVotes = {};
            newState.consecutiveRejects = 0;
          } else {
            // Team rejected
            newState.consecutiveRejects += 1;

            if (newState.consecutiveRejects >= 5) {
              // 5 consecutive rejects → evil wins
              newState.phase = 'game_over';
              newState.winner = 'evil';
              newState.winReason = '5 ทีมถูกปฏิเสธติดต่อกัน — ฝ่ายชั่วชนะ!';
            } else {
              // Next leader
              newState.currentLeaderIndex = (newState.currentLeaderIndex + 1) % playerCount;
              newState.phase = 'team_building';
              newState.selectedTeam = [];
              newState.teamVotes = {};
            }
          }
        }
        break;
      }

      case 'quest_vote': {
        if (newState.phase !== 'quest') break;
        if (!newState.selectedTeam.includes(playerId)) break;
        if (newState.questVotes[playerId] !== undefined) break;

        // Good players can only vote success
        const player = newState.players.find((p) => p.id === playerId);
        if (player?.team === 'good' && !action.success) break;

        newState.questVotes = { ...newState.questVotes, [playerId]: action.success };

        // Check if all quest votes are in → shuffle reveal order, then quest_reveal phase
        if (Object.keys(newState.questVotes).length === newState.selectedTeam.length) {
          const voteCards = shuffle(
            newState.selectedTeam.map((id) => newState.questVotes[id] as boolean),
          );
          newState.phase = 'quest_reveal';
          newState.questRevealCards = voteCards;
          newState.questRevealShown = 0;
        }
        break;
      }

      case 'assassinate': {
        if (newState.phase !== 'assassination') break;
        const assassin = newState.players.find((p) => p.role === 'assassin');
        if (!assassin || playerId !== assassin.id) break;

        newState.assassinTarget = action.targetId;
        const target = newState.players.find((p) => p.id === action.targetId);

        if (target?.role === 'merlin') {
          newState.phase = 'game_over';
          newState.winner = 'evil';
          newState.winReason = 'Assassin หา Merlin เจอ — ฝ่ายชั่วชนะ!';
        } else {
          newState.phase = 'game_over';
          newState.winner = 'good';
          newState.winReason = 'Quest สำเร็จ 3 ครั้งและ Assassin หา Merlin ไม่เจอ — ฝ่ายดีชนะ!';
        }
        break;
      }
    }

    return newState;
  },

  getPlayerView(state: AvalonState, playerId: string): AvalonPlayerView {
    const me = state.players.find((p) => p.id === playerId);
    if (!me) throw new Error(`Player ${playerId} not found`);

    const isGameOver = state.phase === 'game_over';

    // Show all roles only when game is over
    const players = state.players.map((p) => ({
      id: p.id,
      name: p.name,
      ...(isGameOver ? { role: p.role, team: p.team } : {}),
    }));

    // Quest votes — partial counts during quest_reveal; full last quest after round
    let questVotesCount: { success: number; fail: number } | undefined;
    if (state.phase === 'quest_reveal' && state.questRevealCards) {
      const revealed = state.questRevealCards.slice(0, state.questRevealShown ?? 0);
      questVotesCount = {
        success: revealed.filter(Boolean).length,
        fail: revealed.filter((v) => !v).length,
      };
    } else if (state.phase === 'game_over' || state.quests.length > 0) {
      const lastQuest = state.quests[state.quests.length - 1];
      if (lastQuest?.questVotes) {
        const successes = Object.values(lastQuest.questVotes).filter(Boolean).length;
        const fails = Object.values(lastQuest.questVotes).filter((v) => !v).length;
        questVotesCount = { success: successes, fail: fails };
      }
    }

    return {
      phase: state.phase,
      players,
      myRole: me.role,
      myTeam: me.team,
      knownInfo: getKnownInfo(me, state.players),
      ...(state.phase === 'role_reveal'
        ? {
            hasAcknowledgedRole: state.roleAcknowledgedBy.includes(playerId),
            roleAcknowledgeProgress: {
              current: state.roleAcknowledgedBy.length,
              total: state.players.length,
            },
          }
        : {}),
      ...(state.phase === 'quest_reveal' && state.questRevealCards
        ? {
            questRevealSequence: [...state.questRevealCards],
            questRevealShown: state.questRevealShown ?? 0,
          }
        : {}),
      currentLeaderIndex: state.currentLeaderIndex,
      questNumber: state.questNumber,
      quests: state.quests.map((q) => ({
        ...q,
        questVotes: isGameOver ? q.questVotes : undefined,
      })),
      questResults: state.questResults,
      selectedTeam: state.selectedTeam,
      ...(() => {
        if (state.phase !== 'team_vote') {
          return { teamVotes: state.teamVotes };
        }
        const total = state.players.length;
        const votedCount = Object.keys(state.teamVotes).length;
        const allIn = votedCount === total;
        const awaitingTeamVoteFrom = state.players
          .filter((p) => state.teamVotes[p.id] === undefined)
          .map((p) => ({ id: p.id, name: p.name }));
        const mine = state.teamVotes[playerId];
        const teamVotesForView: Record<string, boolean> = allIn
          ? state.teamVotes
          : mine === undefined
            ? {}
            : { [playerId]: mine };
        return {
          teamVotes: teamVotesForView,
          teamVoteProgress: { current: votedCount, total },
          awaitingTeamVoteFrom,
        };
      })(),
      questVotesCount,
      consecutiveRejects: state.consecutiveRejects,
      assassinTarget: state.assassinTarget,
      winner: state.winner,
      winReason: state.winReason,
    };
  },

  isGameOver(state: AvalonState): GameResult | null {
    if (state.phase !== 'game_over' || !state.winner) return null;

    const winners = state.players.filter((p) => p.team === state.winner).map((p) => p.id);

    return {
      winners,
      reason: state.winReason || '',
    };
  },
};
