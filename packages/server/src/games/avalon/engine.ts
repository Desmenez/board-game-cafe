import type { GameDefinition, Player, GameResult } from 'shared';
import type { AvalonState, AvalonAction, AvalonPlayerView, AvalonPlayer, AvalonRole } from 'shared';
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
          known.push({ id: p.id, name: p.name, detail: 'Merlin or Morgana' });
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
        // During role_reveal, once all players acknowledge, move to team_building
        // For simplicity, we track this with a simple check
        // Move to team building after any acknowledge (in practice, client handles the reveal UI)
        if (newState.phase === 'role_reveal') {
          newState.phase = 'team_building';
          newState.selectedTeam = [];
        }
        break;
      }

      case 'select_team': {
        if (newState.phase !== 'team_building') break;
        const leader = newState.players[newState.currentLeaderIndex];
        if (playerId !== leader.id) break;

        const requiredSize = QUEST_TEAM_SIZES[playerCount][newState.questNumber];
        if (action.playerIds.length !== requiredSize) break;

        newState.selectedTeam = action.playerIds;
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

        // Check if all quest votes are in
        if (Object.keys(newState.questVotes).length === newState.selectedTeam.length) {
          const fails = Object.values(newState.questVotes).filter((v) => !v).length;
          const requiresTwoFails = QUEST_TWO_FAILS[playerCount][newState.questNumber];
          const questFailed = requiresTwoFails ? fails >= 2 : fails >= 1;

          const questResult = {
            questNumber: newState.questNumber,
            teamPlayerIds: [...newState.selectedTeam],
            votes: { ...newState.teamVotes },
            questVotes: { ...newState.questVotes },
            result: (questFailed ? 'fail' : 'success') as 'success' | 'fail',
            requiresTwoFails,
          };

          newState.quests = [...newState.quests, questResult];

          const newQuestResults = [...newState.questResults];
          newQuestResults[newState.questNumber] = questFailed ? 'fail' : 'success';
          newState.questResults = newQuestResults;

          const results = countQuestResults({ ...newState, questResults: newQuestResults });

          if (results.success >= 3) {
            // Good needs 3 quests, but assassin gets a chance
            newState.phase = 'assassination';
          } else if (results.fail >= 3) {
            // Evil wins
            newState.phase = 'game_over';
            newState.winner = 'evil';
            newState.winReason = 'Quest ล้มเหลว 3 ครั้ง — ฝ่ายชั่วชนะ!';
          } else {
            // Next quest
            newState.questNumber += 1;
            newState.currentLeaderIndex = (newState.currentLeaderIndex + 1) % playerCount;
            newState.phase = 'team_building';
            newState.selectedTeam = [];
            newState.teamVotes = {};
            newState.questVotes = {};
          }
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

    // Quest votes — only show count, not who voted what (unless game over)
    let questVotesCount: { success: number; fail: number } | undefined;
    if (state.phase === 'game_over' || state.quests.length > 0) {
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
      currentLeaderIndex: state.currentLeaderIndex,
      questNumber: state.questNumber,
      quests: state.quests.map((q) => ({
        ...q,
        questVotes: isGameOver ? q.questVotes : undefined,
      })),
      questResults: state.questResults,
      selectedTeam: state.selectedTeam,
      teamVotes:
        state.phase === 'team_vote' && Object.keys(state.teamVotes).length < state.players.length
          ? {} // hide individual votes until all in
          : state.teamVotes,
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
