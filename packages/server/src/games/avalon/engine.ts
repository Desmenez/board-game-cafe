import type { GameDefinition, Player, GameResult } from 'shared';
import type {
  AvalonState,
  AvalonAction,
  AvalonPlayerView,
  AvalonPlayer,
  AvalonRole,
  QuestResult,
} from 'shared';
import {
  AVALON_LOYAL_SERVANT_PORTRAIT_COUNT,
  AVALON_MINION_PORTRAIT_COUNT,
  QUEST_TEAM_SIZES,
  QUEST_TWO_FAILS,
  ROLE_DISTRIBUTION,
  getTeamForRole,
} from 'shared';

// ============================================================
// Avalon Game Engine
// ============================================================

/** Delay between quest card flips during `quest_reveal` (server timer + payload cadence). */
export const AVALON_QUEST_REVEAL_STEP_MS = 2000;

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickRandomRole(roles: AvalonRole[]): AvalonRole {
  return roles[Math.floor(Math.random() * roles.length)];
}

function getEvilRolesForGame(playerCount: number, baseEvil: AvalonRole[]): AvalonRole[] {
  if (playerCount === 10) return [...baseEvil];
  if (playerCount < 7) return [...baseEvil];

  const evilRoles = [...baseEvil];
  const flexIndex = evilRoles.findIndex((role) => !['assassin', 'morgana'].includes(role));
  if (flexIndex === -1) return evilRoles;

  const options: AvalonRole[] =
    playerCount === 7 || playerCount === 8
      ? ['minion', 'mordred', 'oberon']
      : ['mordred', 'oberon'];
  evilRoles[flexIndex] = pickRandomRole(options);
  return evilRoles;
}

/** Replace one Loyal Servant + one evil role (minion → oberon → mordred) with the Lancelot pair. */
/** ผู้ที่เคยถือ Lady — ใช้กรองเป้าหมายตามกฎ (รวมผู้ถือคนแรกตอน setup) */
function getLadyEverHolderIds(state: AvalonState): string[] {
  if (state.ladyEverHolderIds && state.ladyEverHolderIds.length > 0) {
    return state.ladyEverHolderIds;
  }
  const set = new Set<string>();
  for (const h of state.ladyHistory ?? []) {
    set.add(h.fromId);
    set.add(h.toId);
  }
  if (state.ladyHolderId) set.add(state.ladyHolderId);
  return [...set];
}

function injectLancelotRoles(roles: AvalonRole[]): AvalonRole[] {
  const loyalIdx = roles.indexOf('loyal_servant');
  let evilIdx = -1;
  for (const r of ['minion', 'oberon', 'mordred'] as const) {
    const i = roles.indexOf(r);
    if (i !== -1) {
      evilIdx = i;
      break;
    }
  }
  if (loyalIdx === -1 || evilIdx === -1) return roles;
  const out = [...roles];
  out[loyalIdx] = 'lancelot_loyal';
  out[evilIdx] = 'lancelot_evil';
  return out;
}

/** Assign unique portrait indices per `loyal_servant` / `minion` in this game (no duplicates within each role). */
function assignPortraitVariants(players: AvalonPlayer[]): AvalonPlayer[] {
  const loyalIndices: number[] = [];
  const minionIndices: number[] = [];
  for (let i = 0; i < players.length; i++) {
    if (players[i].role === 'loyal_servant') loyalIndices.push(i);
    else if (players[i].role === 'minion') minionIndices.push(i);
  }
  const loyalPool = shuffle(
    Array.from({ length: AVALON_LOYAL_SERVANT_PORTRAIT_COUNT }, (_, i) => i),
  );
  const minionPool = shuffle(Array.from({ length: AVALON_MINION_PORTRAIT_COUNT }, (_, i) => i));
  if (loyalIndices.length > loyalPool.length) {
    throw new Error('Not enough loyal servant portrait variants for this player count');
  }
  if (minionIndices.length > minionPool.length) {
    throw new Error('Not enough minion portrait variants for this player count');
  }
  const next = players.map((p) => ({ ...p }));
  loyalIndices.forEach((idx, j) => {
    next[idx] = { ...next[idx], portraitVariant: loyalPool[j] };
  });
  minionIndices.forEach((idx, j) => {
    next[idx] = { ...next[idx], portraitVariant: minionPool[j] };
  });
  return next;
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

    case 'lancelot_loyal':
      for (const p of allPlayers) {
        if (p.role === 'lancelot_evil') {
          known.push({ id: p.id, name: p.name, detail: 'Lancelot ฝ่ายชั่ว' });
        }
      }
      break;

    case 'lancelot_evil':
      for (const p of allPlayers) {
        if (p.role === 'lancelot_loyal') {
          known.push({ id: p.id, name: p.name, detail: 'Lancelot ฝ่ายดี' });
        } else if (p.id !== player.id && p.team === 'evil' && p.role !== 'oberon') {
          known.push({ id: p.id, name: p.name, detail: 'Evil ally' });
        }
      }
      break;

    case 'assassin':
    case 'morgana':
    case 'mordred':
    case 'minion':
      // Evil (except Oberon) sees other evil (except Oberon)
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

/**
 * Resolve a completed `team_vote` after a delay.
 * We keep `phase === 'team_vote'` immediately after the last vote
 * so clients can show who voted what for a short moment.
 */
export function resolveTeamVote(state: AvalonState): AvalonState {
  if (state.phase !== 'team_vote') return state;

  const playerCount = state.players.length;
  let votedCount = 0;
  let approves = 0;
  for (const id in state.teamVotes) {
    if (!Object.prototype.hasOwnProperty.call(state.teamVotes, id)) continue;
    votedCount += 1;
    if (state.teamVotes[id]) approves += 1;
  }
  if (votedCount !== playerCount) return state;

  const newState: AvalonState = { ...state };

  if (approves > playerCount / 2) {
    newState.phase = 'quest';
    newState.questVotes = {};
    newState.teamVotes = {};
    return newState;
  }

  newState.consecutiveRejects += 1;

  if (newState.consecutiveRejects >= 5) {
    newState.phase = 'game_over';
    newState.winner = 'evil';
    newState.winReason = '5 ทีมถูกปฏิเสธติดต่อกัน — ฝ่ายชั่วชนะ!';
    newState.teamVotes = {};
    return newState;
  }

  newState.currentLeaderIndex = (newState.currentLeaderIndex + 1) % playerCount;
  newState.phase = 'team_building';
  newState.selectedTeam = [];
  newState.teamVotes = {};
  return newState;
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
  let fails = 0;
  for (const pid in s.questVotes) {
    if (!s.questVotes[pid]) fails += 1;
  }
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

  /** โหวตไม่ผ่านสะสม: ไม่รีเซ็ตตอนโหวตรับทีม — รีเซ็ตเมื่อ Quest จบแล้วเท่านั้น */
  s.consecutiveRejects = 0;

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
    /** Quest เพิ่งจบ (0 = Quest 1, …) — Lady หลัง Quest 2–4 เท่านั้น (index 1,2,3) */
    const completedQuestIndex = s.questNumber;
    s.questNumber += 1;
    s.currentLeaderIndex = (s.currentLeaderIndex + 1) % playerCount;
    s.selectedTeam = [];
    s.teamVotes = {};
    s.questVotes = {};
    const shouldLadyCheck =
      Boolean(s.ladyOfTheLakeEnabled) &&
      completedQuestIndex >= 1 &&
      completedQuestIndex <= 3 &&
      Boolean(s.ladyHolderId);
    s.phase = shouldLadyCheck ? 'lady_of_lake' : 'team_building';
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

/**
 * Shuffle once at setup; same arrays are reused for every getPlayerView/broadcast so clients stay in sync
 * and we avoid re-shuffling on every socket emit.
 */
function buildRoleRevealArrays(players: AvalonPlayer[]): {
  roleRevealAllRoles: AvalonRole[];
  roleRevealPortraitVariants: number[];
} {
  const pairs = players.map((p) => ({
    role: p.role,
    portraitVariant: p.portraitVariant ?? 0,
  }));
  const shuffled = shuffle(pairs);
  return {
    roleRevealAllRoles: shuffled.map((s) => s.role),
    roleRevealPortraitVariants: shuffled.map((s) => s.portraitVariant),
  };
}

function buildTeamVoteView(state: AvalonState, playerId: string) {
  if (state.phase !== 'team_vote') {
    return { teamVotes: state.teamVotes };
  }
  const total = state.players.length;
  let votedCount = 0;
  for (const key in state.teamVotes) {
    if (Object.prototype.hasOwnProperty.call(state.teamVotes, key)) votedCount += 1;
  }
  const allIn = votedCount === total;
  const awaitingTeamVoteFrom: { id: string; name: string }[] = [];
  for (const p of state.players) {
    if (state.teamVotes[p.id] === undefined) awaitingTeamVoteFrom.push({ id: p.id, name: p.name });
  }
  const mine = state.teamVotes[playerId];
  const teamVotes: Record<string, boolean> = allIn
    ? state.teamVotes
    : mine === undefined
      ? {}
      : { [playerId]: mine };
  return {
    teamVotes,
    teamVoteProgress: { current: votedCount, total },
    awaitingTeamVoteFrom,
  };
}

interface AvalonSetupOptions {
  ladyOfTheLake?: boolean;
  lancelot?: boolean;
}

function parseSetupOptions(options?: unknown): AvalonSetupOptions {
  if (!options || typeof options !== 'object') return {};
  const opts = options as Record<string, unknown>;
  return {
    ladyOfTheLake: Boolean(opts.ladyOfTheLake),
    lancelot: Boolean(opts.lancelot),
  };
}

function ownKeyCount(obj: Record<string, unknown>): number {
  let count = 0;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) count += 1;
  }
  return count;
}

export const avalonGame: GameDefinition<AvalonState, AvalonAction> = {
  id: 'avalon',
  name: 'The Resistance: Avalon',
  description:
    'เกม social deduction ที่ฝ่ายดีต้องหาฝ่ายชั่ว ขณะที่ฝ่ายชั่วต้องแทรกซึมทำลาย Quest ให้ล้มเหลว',
  minPlayers: 5,
  maxPlayers: 10,
  thumbnail: '/games/avalon/thumbnail.png',

  setup(players: Player[], options?: unknown): AvalonState {
    const count = players.length;
    const dist = ROLE_DISTRIBUTION[count];
    if (!dist) throw new Error(`Unsupported player count: ${count}`);

    const opts = parseSetupOptions(options);

    const evilRoles = getEvilRolesForGame(count, dist.evil);
    const poolBase: AvalonRole[] = [...dist.good, ...evilRoles];
    const lancelotRequested = count >= 8 && opts.lancelot;
    const pool = lancelotRequested ? injectLancelotRoles(poolBase) : poolBase;
    const lancelotEnabled = lancelotRequested && pool.some((r) => r === 'lancelot_loyal');
    const allRoles = shuffle(pool);

    const avalonPlayers: AvalonPlayer[] = assignPortraitVariants(
      players.map((p, i) => ({
        id: p.id,
        name: p.name,
        role: allRoles[i],
        team: getTeamForRole(allRoles[i]),
      })),
    );

    const questResults: ('success' | 'fail' | 'pending')[] = Array(5).fill('pending');

    const ladyOfTheLakeEnabled = opts.ladyOfTheLake ?? false;

    const currentLeaderIndex = Math.floor(Math.random() * count);
    /** Lady คนแรก: ผู้เล่นที่อยู่ *ก่อน* หัวหน้าคนแรกในลำดับการหมุนหัวหน้า (A→B→C→D→E ถ้าหัวหน้า A ผู้ถือคือ E) — (index + n − 1) mod n ไม่ใช่ index+1 */
    const ladyHolderId =
      ladyOfTheLakeEnabled && count > 0
        ? players[(currentLeaderIndex + count - 1) % count]?.id
        : undefined;

    const { roleRevealAllRoles, roleRevealPortraitVariants } = buildRoleRevealArrays(avalonPlayers);

    return {
      phase: 'composition',
      players: avalonPlayers,
      roleRevealAllRoles,
      roleRevealPortraitVariants,
      compositionAcknowledgedBy: [],
      roleAcknowledgedBy: [],
      currentLeaderIndex,
      questNumber: 0,
      quests: [],
      questResults,
      selectedTeam: [],
      teamVotes: {},
      questVotes: {},
      consecutiveRejects: 0,
      ladyOfTheLakeEnabled,
      lancelotEnabled,
      ladyHolderId,
      ladyEverHolderIds: ladyHolderId ? [ladyHolderId] : undefined,
      ladyHistory: [],
    };
  },

  onAction(state: AvalonState, playerId: string, action: AvalonAction): AvalonState {
    if (state.ladyJustRevealed && action.type !== 'acknowledge_lady_reveal') {
      return state;
    }

    const newState = { ...state };
    const playerCount = state.players.length;
    const playerById = new Map(newState.players.map((p) => [p.id, p] as const));

    switch (action.type) {
      case 'acknowledge_composition': {
        if (newState.phase !== 'composition') break;
        if (newState.compositionAcknowledgedBy.includes(playerId)) break;

        newState.compositionAcknowledgedBy = [...newState.compositionAcknowledgedBy, playerId];

        if (newState.compositionAcknowledgedBy.length === playerCount) {
          newState.phase = 'role_reveal';
          newState.roleAcknowledgedBy = [];
        }
        break;
      }

      case 'acknowledge_role': {
        if (newState.phase !== 'role_reveal') break;
        if (newState.roleAcknowledgedBy.includes(playerId)) break;

        newState.roleAcknowledgedBy = [...newState.roleAcknowledgedBy, playerId];

        if (newState.roleAcknowledgedBy.length === playerCount) {
          newState.phase = 'team_building';
          newState.selectedTeam = [];
          delete newState.roleRevealAllRoles;
          delete newState.roleRevealPortraitVariants;
        }
        break;
      }

      case 'acknowledge_lady_reveal': {
        if (!newState.ladyJustRevealed) break;
        if (playerId !== newState.ladyJustRevealed.holderId) break;
        delete newState.ladyJustRevealed;
        break;
      }

      case 'lady_inspect': {
        if (newState.phase !== 'lady_of_lake') break;
        if (!newState.ladyOfTheLakeEnabled || !newState.ladyHolderId) break;
        if (playerId !== newState.ladyHolderId) break;
        if (action.targetId === playerId) break;
        const target = playerById.get(action.targetId);
        if (!target) break;

        const ladyHolderSet = new Set(getLadyEverHolderIds(newState));
        if (ladyHolderSet.has(action.targetId)) break;

        const history = newState.ladyHistory ?? [];
        newState.ladyHistory = [
          ...history,
          { fromId: playerId, toId: target.id, team: target.team },
        ];
        newState.ladyJustRevealed = { holderId: playerId, targetId: target.id, team: target.team };
        newState.ladyHolderId = target.id;
        newState.ladyEverHolderIds = [...ladyHolderSet, target.id];
        newState.phase = 'team_building';
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
        if (ownKeyCount(newState.teamVotes as Record<string, unknown>) === playerCount) {
          // Resolution is intentionally delayed in `socket-handlers.ts`
          // so clients can show the full voting result for a moment.
        }
        break;
      }

      case 'quest_vote': {
        if (newState.phase !== 'quest') break;
        if (!newState.selectedTeam.includes(playerId)) break;
        if (newState.questVotes[playerId] !== undefined) break;

        // Good players can only vote success
        const player = playerById.get(playerId);
        if (player?.team === 'good' && !action.success) break;

        newState.questVotes = { ...newState.questVotes, [playerId]: action.success };

        // Check if all quest votes are in → shuffle reveal order, then quest_reveal phase
        if (
          ownKeyCount(newState.questVotes as Record<string, unknown>) ===
          newState.selectedTeam.length
        ) {
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
        const target = playerById.get(action.targetId);

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
    const playerById = new Map(state.players.map((p) => [p.id, p] as const));
    const nameById = new Map(state.players.map((p) => [p.id, p.name] as const));
    const me = playerById.get(playerId);
    if (!me) throw new Error(`Player ${playerId} not found`);
    const ladyEverHolderSet = new Set(getLadyEverHolderIds(state));

    const isGameOver = state.phase === 'game_over';

    // Show all roles only when game is over
    const players = state.players.map((p) => ({
      id: p.id,
      name: p.name,
      ...(isGameOver ? { role: p.role, team: p.team, portraitVariant: p.portraitVariant } : {}),
    }));

    // Quest votes — partial counts during quest_reveal; full last quest after round
    let questVotesCount: { success: number; fail: number } | undefined;
    if (state.phase === 'quest_reveal' && state.questRevealCards) {
      const revealed = state.questRevealCards.slice(0, state.questRevealShown ?? 0);
      let success = 0;
      let fail = 0;
      for (const v of revealed) {
        if (v) success += 1;
        else fail += 1;
      }
      questVotesCount = { success, fail };
    } else if (state.phase === 'game_over' || state.quests.length > 0) {
      const lastQuest = state.quests[state.quests.length - 1];
      if (lastQuest?.questVotes) {
        let successes = 0;
        let fails = 0;
        for (const pid in lastQuest.questVotes) {
          if (lastQuest.questVotes[pid]) successes += 1;
          else fails += 1;
        }
        questVotesCount = { success: successes, fail: fails };
      }
    }

    return {
      phase: state.phase,
      players,
      myRole: me.role,
      myTeam: me.team,
      myPortraitVariant: me.portraitVariant,
      knownInfo: getKnownInfo(me, state.players),
      ladyOfTheLakeEnabled: state.ladyOfTheLakeEnabled,
      lancelotEnabled: state.lancelotEnabled,
      ladyHolderId: state.ladyHolderId,
      ...(state.phase === 'lady_of_lake' && state.ladyHolderId
        ? {
            ladyPrompt:
              state.ladyHolderId === playerId
                ? {
                    holderId: state.ladyHolderId,
                    canInspectIds: (() => {
                      const canInspectIds: { id: string; name: string }[] = [];
                      for (const p of state.players) {
                        if (p.id === playerId) continue;
                        if (ladyEverHolderSet.has(p.id)) continue;
                        canInspectIds.push({ id: p.id, name: p.name });
                      }
                      return canInspectIds;
                    })(),
                  }
                : {
                    holderId: state.ladyHolderId,
                    canInspectIds: [],
                  },
          }
        : {}),
      ...(state.ladyJustRevealed
        ? {
            ladyRevealBroadcast: {
              holderId: state.ladyJustRevealed.holderId,
              holderName: nameById.get(state.ladyJustRevealed.holderId) ?? '?',
              targetId: state.ladyJustRevealed.targetId,
              targetName: nameById.get(state.ladyJustRevealed.targetId) ?? '?',
            },
            ...(state.ladyJustRevealed.holderId === playerId
              ? {
                  ladyRevealSecret: {
                    targetName: nameById.get(state.ladyJustRevealed.targetId) ?? '?',
                    team: state.ladyJustRevealed.team,
                  },
                }
              : {}),
          }
        : {}),
      ...(state.phase === 'composition'
        ? {
            hasAcknowledgedComposition: state.compositionAcknowledgedBy.includes(playerId),
            compositionAcknowledgeProgress: {
              current: state.compositionAcknowledgedBy.length,
              total: state.players.length,
            },
            roleRevealAllRoles: state.roleRevealAllRoles,
            roleRevealPortraitVariants: state.roleRevealPortraitVariants,
          }
        : {}),
      ...(state.phase === 'role_reveal'
        ? {
            hasAcknowledgedRole: state.roleAcknowledgedBy.includes(playerId),
            roleAcknowledgeProgress: {
              current: state.roleAcknowledgedBy.length,
              total: state.players.length,
            },
            roleRevealAllRoles: state.roleRevealAllRoles,
            roleRevealPortraitVariants: state.roleRevealPortraitVariants,
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
      ...buildTeamVoteView(state, playerId),
      questVotesCount,
      consecutiveRejects: state.consecutiveRejects,
      assassinTarget: state.assassinTarget,
      winner: state.winner,
      winReason: state.winReason,
    };
  },

  isGameOver(state: AvalonState): GameResult | null {
    if (state.phase !== 'game_over' || !state.winner) return null;

    const winners: string[] = [];
    for (const p of state.players) {
      if (p.team === state.winner) winners.push(p.id);
    }

    return {
      winners,
      reason: state.winReason || '',
    };
  },
};
