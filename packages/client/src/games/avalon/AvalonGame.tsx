import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  Check,
  Crown,
  FlaskConical,
  Shield,
  Skull,
  Swords,
  Target,
  Trophy,
  Vote,
  X,
} from 'lucide-react';
import type { AvalonPlayerView, AvalonAction, AvalonPhase, AvalonRole, AvalonTeam } from 'shared';
import { QUEST_TEAM_SIZES, QUEST_TWO_FAILS, getTeamForRole } from 'shared';
import './avalon-night.css';
import { Badge, Button, Dialog, DialogDescription, DialogTitle } from '../../components/ui';
import { getAvalonRolePortraitUrl, imageMap } from '../../imageMap';
import { useYourTurnToast } from '../../hooks/useYourTurnToast';
import { fireQuestSuccessConfetti, startWinCelebrationLoop } from '../../utils/winCelebration';
import {
  GameDecisionActions,
  GameHistoryDisclosure,
  GameOverModal,
  GamePhasePanel,
  GamePlayHeader,
  GameProgressTrack,
  GameShell,
  GameWaitingState,
  type GameProgressValue,
} from '../../components/game-shell';
import { PlayerRosterStrip } from '../../components/player-roster';
import { PlayerChoiceGrid } from '../../components/player-choice';
import { SecretIdentityReveal } from '../../components/secret-identity';

/** Display name per role (art uses `getAvalonRolePortraitUrl` + optional portrait variant). */
const ROLE_LABEL: Record<AvalonRole, string> = {
  merlin: 'Merlin',
  percival: 'Percival',
  loyal_servant: 'Loyal Servant',
  lancelot_loyal: 'Sir Lancelot',
  assassin: 'Assassin',
  morgana: 'Morgana',
  mordred: 'Mordred',
  oberon: 'Oberon',
  minion: 'Minion of Mordred',
  lancelot_evil: 'Evil Lancelot',
};

/** Server sends English keys; UI shows Thai labels. Tones drive row/label colors. */
type KnownInfoTone = 'good' | 'evil' | 'evil_ally' | 'uncertain';

function knownInfoPresentation(detail: string): { label: string; tone: KnownInfoTone } {
  switch (detail) {
    case 'Evil':
      return { label: 'เป็นฝ่ายชั่ว', tone: 'evil' };
    case 'Evil ally':
      return { label: 'เป็นฝ่ายชั่ว (พันธมิตร)', tone: 'evil_ally' };
    case 'Good':
      return { label: 'เป็นฝ่ายดี', tone: 'good' };
    case 'Merlin หรือ Morgana':
      return { label: 'Merlin หรือ Morgana', tone: 'uncertain' };
    case 'Lancelot ฝ่ายชั่ว':
      return { label: 'คือ Lancelot ฝ่ายชั่ว (รู้ตัวตนกัน)', tone: 'evil' };
    case 'Lancelot ฝ่ายดี':
      return { label: 'คือ Lancelot ฝ่ายดี (รู้ตัวตนกัน)', tone: 'good' };
    default:
      return { label: detail, tone: 'uncertain' };
  }
}

interface Props {
  gameState: AvalonPlayerView;
  myId: string;
  sendAction: (action: AvalonAction) => void;
  onLeave: () => void;
  onRestart?: () => void;
  isHost?: boolean;
}

export function AvalonGame({ gameState, myId, sendAction, onLeave, onRestart, isHost }: Props) {
  const gs = gameState;
  const playerCount = gs.players.length;
  const leader = gs.players[gs.currentLeaderIndex];
  const isLeader = leader?.id === myId;
  const myPlayer = gs.players.find((p) => p.id === myId);
  const myRoleLabel = ROLE_LABEL[gs.myRole];
  const myRoleArt = getAvalonRolePortraitUrl(gs.myRole, gs.myPortraitVariant);

  const prevQuestResultsKey = useRef<string | null>(null);
  useEffect(() => {
    const key = gs.questResults.join(',');
    if (prevQuestResultsKey.current === null) {
      prevQuestResultsKey.current = key;
      return;
    }
    if (prevQuestResultsKey.current === key) return;

    const prevParts = prevQuestResultsKey.current.split(',');
    for (let i = 0; i < gs.questResults.length; i++) {
      if (gs.questResults[i] === 'success' && prevParts[i] !== 'success') {
        fireQuestSuccessConfetti();
        break;
      }
    }
    prevQuestResultsKey.current = key;
  }, [gs.questResults]);

  const avalonNeedsMe = useMemo(() => {
    if (gs.phase === 'game_over' || gs.phase === 'role_reveal') return false;
    if (gs.phase === 'team_building' && isLeader) return true;
    if (gs.phase === 'team_vote' && gs.awaitingTeamVoteFrom?.some((p) => p.id === myId))
      return true;
    if (gs.phase === 'quest' && gs.selectedTeam.includes(myId)) return true;
    if (gs.phase === 'lady_of_lake' && gs.ladyPrompt?.holderId === myId) return true;
    if (gs.phase === 'assassination' && gs.myRole === 'assassin') return true;
    return false;
  }, [gs, isLeader, myId]);

  useYourTurnToast(avalonNeedsMe, gs.phase !== 'game_over');

  return (
    <GameShell className="avalon-page">
      <GamePlayHeader
        title="The Resistance: Avalon"
        onLeave={onLeave}
        onRestart={onRestart}
        leaveLabel="full"
      />

      <LadyRevealModals
        broadcast={gs.ladyRevealBroadcast}
        secret={gs.ladyRevealSecret}
        onAcknowledgeLady={() => sendAction({ type: 'acknowledge_lady_reveal' })}
      />

      <QuestHistoryDock quests={gs.quests} players={gs.players} />

      {/* Quest Track */}
      <QuestTrack
        phase={gs.phase}
        questResults={gs.questResults}
        currentQuest={gs.questNumber}
        playerCount={playerCount}
        roleAcknowledgeProgress={gs.roleAcknowledgeProgress}
      />

      {gs.phase !== 'role_reveal' && gs.phase !== 'game_over' && (
        <GamePhasePanel
          className={isLeader ? 'border-pear' : undefined}
          title={myRoleLabel}
          description={`${myPlayer?.name ?? 'ผู้เล่น'} · บทบาทของคุณ`}
          actions={
            <Badge variant={gs.consecutiveRejects >= 3 ? 'danger' : 'warning'}>
              <Vote size={12} aria-hidden />
              ปฏิเสธสะสม {gs.consecutiveRejects}/5
            </Badge>
          }
        >
          <div className="grid min-w-0 gap-4 sm:grid-cols-[6rem_minmax(0,1fr)] sm:items-start">
            <img
              src={myRoleArt}
              alt={myRoleLabel}
              className="aspect-square w-24 rounded-input border border-rule object-cover"
              loading="lazy"
            />
            <dl className="grid min-w-0 gap-2 text-sm">
              <div className="flex min-w-0 items-start gap-2 rounded-input bg-paper-3 px-3 py-2">
                <Crown size={16} className="mt-0.5 shrink-0 text-pear" aria-hidden />
                <div className="min-w-0">
                  <dt className="font-semibold text-ink">Leader</dt>
                  <dd className="mt-0.5 text-ink-2">
                    {isLeader ? 'คุณเป็น Leader รอบนี้' : (leader?.name ?? '—')}
                  </dd>
                </div>
              </div>
              {gs.ladyOfTheLakeEnabled ? (
                <div className="flex min-w-0 items-start gap-2 rounded-input bg-paper-3 px-3 py-2">
                  <FlaskConical size={16} className="mt-0.5 shrink-0 text-pear" aria-hidden />
                  <div className="min-w-0">
                    <dt className="font-semibold text-ink">Lady of the Lake</dt>
                    <dd className="mt-0.5 text-ink-2">
                      {gs.ladyHolderId === myId
                        ? 'คุณถือ Lady อยู่'
                        : `ผู้ถือ: ${gs.players.find((p) => p.id === gs.ladyHolderId)?.name ?? 'ไม่ทราบ'}`}
                    </dd>
                  </div>
                </div>
              ) : null}
              {gs.lancelotEnabled ? (
                <div className="flex min-w-0 items-start gap-2 rounded-input bg-paper-3 px-3 py-2">
                  <Swords size={16} className="mt-0.5 shrink-0 text-pear" aria-hidden />
                  <div className="min-w-0">
                    <dt className="font-semibold text-ink">Lancelot</dt>
                    <dd className="mt-0.5 text-ink-2">เกมนี้มี Sir Lancelot และ Evil Lancelot</dd>
                  </div>
                </div>
              ) : null}
            </dl>
          </div>
        </GamePhasePanel>
      )}

      {/* Phase Content */}
      {gs.phase === 'role_reveal' && (
        <RoleReveal
          role={gs.myRole}
          team={gs.myTeam}
          knownInfo={gs.knownInfo}
          hasAcknowledged={gs.hasAcknowledgedRole ?? false}
          progress={gs.roleAcknowledgeProgress}
          onAcknowledge={() => sendAction({ type: 'acknowledge_role' })}
          roleRevealAllRoles={gs.roleRevealAllRoles}
          roleRevealPortraitVariants={gs.roleRevealPortraitVariants}
          myPortraitVariant={gs.myPortraitVariant}
        />
      )}

      {gs.phase === 'team_building' && (
        <TeamBuilding
          players={gs.players}
          leader={leader}
          isLeader={isLeader}
          questNumber={gs.questNumber}
          playerCount={playerCount}
          selectedTeam={gs.selectedTeam}
          onSelectTeam={(ids) => sendAction({ type: 'select_team', playerIds: ids })}
          onSubmitTeam={() => sendAction({ type: 'submit_team' })}
        />
      )}

      {gs.phase === 'lady_of_lake' && (
        <LadyOfLakePhase
          myId={myId}
          players={gs.players}
          ladyHolderId={gs.ladyHolderId}
          prompt={gs.ladyPrompt}
          onInspect={(targetId) => sendAction({ type: 'lady_inspect', targetId })}
        />
      )}

      {gs.phase === 'team_vote' && (
        <TeamVote
          players={gs.players}
          selectedTeam={gs.selectedTeam}
          teamVotes={gs.teamVotes}
          teamVoteProgress={gs.teamVoteProgress}
          awaitingTeamVoteFrom={gs.awaitingTeamVoteFrom}
          leaderId={leader.id}
          myId={myId}
          onVote={(approve) => sendAction({ type: 'vote_team', approve })}
        />
      )}

      {gs.phase === 'quest' && (
        <QuestPhase
          selectedTeam={gs.selectedTeam}
          players={gs.players}
          myId={myId}
          onVote={(success) => sendAction({ type: 'quest_vote', success })}
          myTeam={gs.myTeam}
        />
      )}

      {gs.phase === 'quest_reveal' && gs.questRevealSequence && (
        <QuestRevealOverlay
          sequence={gs.questRevealSequence}
          shown={gs.questRevealShown ?? 0}
          questVotesCount={gs.questVotesCount}
        />
      )}

      {gs.phase === 'assassination' && (
        <Assassination
          players={gs.players}
          myId={myId}
          myRole={gs.myRole}
          knownInfo={gs.knownInfo}
          onAssassinate={(targetId) => sendAction({ type: 'assassinate', targetId })}
        />
      )}

      {gs.phase !== 'role_reveal' && gs.phase !== 'game_over' && (
        <PlayerStatusPanel
          players={gs.players}
          myId={myId}
          leaderId={leader.id}
          selectedTeam={gs.selectedTeam}
          phase={gs.phase}
          teamVotes={gs.teamVotes}
          awaitingTeamVoteFrom={gs.awaitingTeamVoteFrom}
        />
      )}

      {gs.phase === 'game_over' && (
        <GameOver gameState={gs} onLeave={onLeave} onRestart={isHost ? onRestart : undefined} />
      )}
    </GameShell>
  );
}

// ============================================================
// Sub-components
// ============================================================

function QuestTrack({
  phase,
  questResults,
  currentQuest,
  playerCount,
  roleAcknowledgeProgress,
}: {
  phase: AvalonPhase;
  questResults: ('success' | 'fail' | 'pending')[];
  currentQuest: number;
  playerCount: number;
  roleAcknowledgeProgress?: GameProgressValue;
}) {
  const sizes = QUEST_TEAM_SIZES[playerCount] || [2, 3, 2, 3, 3];

  if (phase === 'role_reveal' && roleAcknowledgeProgress) {
    const { current, total } = roleAcknowledgeProgress;
    return (
      <GameProgressTrack
        ariaLabel="ความพร้อมรับทราบบทบาท"
        items={Array.from({ length: total }, (_, i) => ({
          id: `player-${i}`,
          label: readyLabel(i < current),
          state:
            i < current ? ('success' as const) : i === current ? ('active' as const) : 'pending',
        }))}
      />
    );
  }

  return (
    <GameProgressTrack
      ariaLabel="ความคืบหน้า Quest"
      items={questResults.map((result, i) => ({
        id: `quest-${i}`,
        label: `Quest ${i + 1}`,
        meta: `${sizes[i]} คน`,
        state:
          result === 'success'
            ? 'success'
            : result === 'fail'
              ? 'fail'
              : i === currentQuest
                ? 'active'
                : 'pending',
      }))}
    />
  );
}

function readyLabel(ready: boolean) {
  return ready ? 'พร้อมแล้ว' : 'รอ';
}

function PlayerStatusPanel({
  players,
  myId,
  leaderId,
  selectedTeam,
  phase,
  teamVotes,
  awaitingTeamVoteFrom,
}: {
  players: { id: string; name: string; role?: AvalonRole; team?: AvalonTeam }[];
  myId: string;
  // myRole: AvalonRole;
  leaderId: string;
  selectedTeam: string[];
  phase: AvalonPhase;
  teamVotes: Record<string, boolean>;
  awaitingTeamVoteFrom?: { id: string; name: string }[];
}) {
  const waitingVoteSet = new Set((awaitingTeamVoteFrom ?? []).map((p) => p.id));

  return (
    <GamePhasePanel title="สถานะผู้เล่น" as="section">
      <PlayerRosterStrip
        layout="grid"
        myId={myId}
        seats={players.map((p) => {
          const isMe = p.id === myId;
          const isInQuestTeam = selectedTeam.includes(p.id);
          const voted = teamVotes[p.id] !== undefined;
          const voteStatus =
            phase !== 'team_vote'
              ? null
              : voted
                ? 'โหวตแล้ว'
                : waitingVoteSet.has(p.id)
                  ? 'ยังไม่โหวต'
                  : 'รอผล';

          return {
            id: p.id,
            name: p.name,
            active: p.id === leaderId,
            badges: (
              <>
                {p.id === leaderId ? (
                  <Badge size="sm" variant="warning">
                    <Crown size={11} aria-hidden /> Leader
                  </Badge>
                ) : null}
                {isInQuestTeam ? (
                  <Badge size="sm" variant="accent">
                    <Swords size={11} aria-hidden /> Quest
                  </Badge>
                ) : null}
              </>
            ),
            status: voteStatus ? (
              <span className={voted ? 'text-success' : 'text-ink-2'}>{voteStatus}</span>
            ) : (
              <span className="text-ink-2">{isMe ? 'มุมมองของคุณ' : 'พร้อมเล่น'}</span>
            ),
          };
        })}
      />
    </GamePhasePanel>
  );
}

function QuestHistoryDock({
  quests,
  players,
}: {
  quests: AvalonPlayerView['quests'];
  players: AvalonPlayerView['players'];
}) {
  const getName = (id: string) => players.find((p) => p.id === id)?.name ?? '?';

  if (!quests || quests.length === 0) return null;

  return (
    <GameHistoryDisclosure
      title={`ประวัติ Quest (${quests.length})`}
      note="แสดงเฉพาะข้อมูลสาธารณะ: ผู้เล่นที่ไป Quest และผลสำเร็จหรือล้มเหลว"
    >
      <div className="grid gap-2">
        {[...quests]
          .slice(-5)
          .reverse()
          .map((q) => {
            const result = q.result ?? 'pending';
            const resultLabel =
              result === 'success' ? 'สำเร็จ' : result === 'fail' ? 'ล้มเหลว' : 'รอผล';
            return (
              <article
                key={q.questNumber}
                className="flex flex-col gap-2 rounded-input border border-rule bg-paper-3 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <strong className="font-label text-sm text-ink">Quest {q.questNumber + 1}</strong>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {q.teamPlayerIds.map((id) => (
                      <Badge key={id} size="sm" variant="outline">
                        {getName(id)}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Badge
                  variant={
                    result === 'success' ? 'success' : result === 'fail' ? 'danger' : 'outline'
                  }
                >
                  {result === 'success' ? (
                    <Check size={12} aria-hidden />
                  ) : result === 'fail' ? (
                    <X size={12} aria-hidden />
                  ) : null}
                  {resultLabel}
                </Badge>
              </article>
            );
          })}
      </div>
    </GameHistoryDisclosure>
  );
}

/** ช่วงเวลาโหมด “เปิดเผยบทบาททั้งหมด” — ปรับได้ที่เดียว (ต้องสอดคล้องกับ motion) */
const ROLE_REVEAL_FLIP_STAGGER_SEC = 0.3;
const ROLE_REVEAL_FLIP_DURATION_SEC = 1;
const ROLE_REVEAL_DWELL_AFTER_LAST_MS = 1500;

function RoleReveal({
  role,
  team,
  knownInfo,
  hasAcknowledged,
  progress,
  onAcknowledge,
  roleRevealAllRoles,
  roleRevealPortraitVariants,
  myPortraitVariant,
}: {
  role: AvalonRole;
  team: AvalonTeam;
  roleRevealAllRoles?: AvalonRole[];
  roleRevealPortraitVariants?: number[];
  myPortraitVariant?: number;
  knownInfo: { id: string; name: string; detail: string }[];
  hasAcknowledged: boolean;
  progress?: GameProgressValue;
  onAcknowledge: () => void;
}) {
  const roleLabel = ROLE_LABEL[role];
  const roleArt = getAvalonRolePortraitUrl(role, myPortraitVariant);
  const p = progress ?? { current: 0, total: 1 };

  const [showAllRoles, setShowAllRoles] = useState(() => (roleRevealAllRoles?.length ?? 0) > 0);

  const allRoleSlots = useMemo(() => {
    if (!roleRevealAllRoles?.length) return [];
    const variants = roleRevealPortraitVariants ?? roleRevealAllRoles.map(() => 0);
    return roleRevealAllRoles.map((r, i) => ({
      role: r,
      portraitVariant: variants[i] ?? 0,
    }));
  }, [roleRevealAllRoles, roleRevealPortraitVariants]);

  useEffect(() => {
    if (!roleRevealAllRoles?.length) return;
    const n = roleRevealAllRoles.length;
    const totalMs =
      Math.max(0, n - 1) * ROLE_REVEAL_FLIP_STAGGER_SEC * 1000 +
      ROLE_REVEAL_FLIP_DURATION_SEC * 1000 +
      ROLE_REVEAL_DWELL_AFTER_LAST_MS;
    const t = window.setTimeout(() => setShowAllRoles(false), totalMs);
    return () => window.clearTimeout(t);
  }, [roleRevealAllRoles]);

  if (showAllRoles) {
    return (
      <div className="role-reveal-all-container" aria-live="polite">
        <p className="font-label text-sm text-ink-2">กำลังเปิดเผยบทบาททั้งหมด…</p>
        <div className="role-reveal-grid role-reveal-all-grid">
          {allRoleSlots.map((slot, idx) => {
            const r = slot.role;
            const art = getAvalonRolePortraitUrl(r, slot.portraitVariant);
            const label = ROLE_LABEL[r];
            const rTeam = getTeamForRole(r);
            return (
              <div
                key={`${r}-${idx}-${slot.portraitVariant}`}
                className={`role-reveal-item role-reveal-all-item role-reveal-all-flip ${rTeam}`}
              >
                <div className="role-flip-perspective">
                  <motion.div
                    className="role-flip-inner"
                    initial={{ rotateY: 0 }}
                    animate={{ rotateY: 180 }}
                    transition={{
                      delay: idx * ROLE_REVEAL_FLIP_STAGGER_SEC,
                      duration: ROLE_REVEAL_FLIP_DURATION_SEC,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    <div className="role-flip-face role-flip-face--back" aria-hidden>
                      <img
                        src={imageMap.avalon.roleCardBack}
                        alt=""
                        className="role-flip-img"
                        loading="eager"
                        decoding="async"
                      />
                    </div>
                    <div className="role-flip-face role-flip-face--front">
                      <img
                        src={art}
                        alt={label}
                        className="role-flip-img"
                        loading="eager"
                        decoding="async"
                      />
                      <div className="player-role">{label}</div>
                    </div>
                  </motion.div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <SecretIdentityReveal
      imageSrc={roleArt}
      imageAlt={roleLabel}
      title={roleLabel}
      affiliation={team === 'good' ? 'Arthur & Knights' : 'Minions of Mordred'}
      tone={team}
      acknowledged={hasAcknowledged}
      onAcknowledge={onAcknowledge}
      progress={p}
      details={
        knownInfo.length > 0 ? (
          <section className="rounded-input border border-rule bg-paper-3 p-3 text-left">
            <h3 className="font-display text-base font-bold text-ink">ข้อมูลที่คุณรู้</h3>
            <div className="mt-3 grid gap-2">
              {knownInfo.map((known) => {
                const { label, tone } = knownInfoPresentation(known.detail);
                return (
                  <div
                    key={known.id}
                    className="flex flex-wrap items-baseline gap-x-2 rounded-input border border-rule bg-paper-2 px-3 py-2"
                  >
                    <strong className="text-sm text-ink">{known.name}</strong>
                    <Badge
                      size="sm"
                      variant={
                        tone === 'good'
                          ? 'success'
                          : tone === 'evil' || tone === 'evil_ally'
                            ? 'danger'
                            : 'outline'
                      }
                    >
                      {label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null
      }
    />
  );
}

function TeamBuilding({
  players,
  leader,
  isLeader,
  questNumber,
  playerCount,
  selectedTeam,
  onSelectTeam,
  onSubmitTeam,
}: {
  players: { id: string; name: string }[];
  leader: { id: string; name: string };
  isLeader: boolean;
  questNumber: number;
  playerCount: number;
  selectedTeam: string[];
  onSelectTeam: (ids: string[]) => void;
  onSubmitTeam: () => void;
}) {
  const requiredSize = QUEST_TEAM_SIZES[playerCount]?.[questNumber] || 2;
  const failCardsNeededForEvil = QUEST_TWO_FAILS[playerCount]?.[questNumber] ? 2 : 1;

  const togglePlayer = (playerId: string) => {
    if (!isLeader) return;
    if (selectedTeam.includes(playerId)) {
      onSelectTeam(selectedTeam.filter((id) => id !== playerId));
    } else if (selectedTeam.length < requiredSize) {
      onSelectTeam([...selectedTeam, playerId]);
    }
  };

  return (
    <GamePhasePanel
      title={
        <span className="inline-flex items-center gap-2">
          <Swords size={21} aria-hidden />
          เลือกทีม Quest {questNumber + 1}
        </span>
      }
      description={
        isLeader
          ? `เลือกผู้เล่น ${requiredSize} คนเพื่อออกทำภารกิจ`
          : `รอ ${leader.name} เลือกทีม ${requiredSize} คน`
      }
      meta={
        <span>
          Quest นี้ต้องมีการ์ด Fail อย่างน้อย{' '}
          <strong className="text-error">{failCardsNeededForEvil} ใบ</strong> จึงจะล้มเหลว
          {failCardsNeededForEvil === 2 ? ' เพราะมีผู้เล่นตั้งแต่ 7 คนขึ้นไป' : ''}
        </span>
      }
      actions={
        isLeader ? (
          <Button size="lg" disabled={selectedTeam.length !== requiredSize} onClick={onSubmitTeam}>
            ส่งทีม ({selectedTeam.length}/{requiredSize})
          </Button>
        ) : null
      }
    >
      <PlayerChoiceGrid
        players={players}
        selectedIds={selectedTeam}
        disabled={!isLeader}
        onToggle={togglePlayer}
        ariaLabel={`เลือกผู้เล่น ${requiredSize} คนไป Quest`}
      />
    </GamePhasePanel>
  );
}

function LadyRevealModals({
  broadcast,
  secret,
  onAcknowledgeLady,
}: {
  broadcast?: {
    holderId: string;
    holderName: string;
    targetId: string;
    targetName: string;
  };
  secret?: { targetName: string; team: AvalonTeam };
  onAcknowledgeLady: () => void;
}) {
  const broadcastKey = broadcast ? `${broadcast.holderId}:${broadcast.targetId}` : null;
  const [publicDismissedKey, setPublicDismissedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!broadcastKey) setPublicDismissedKey(null);
  }, [broadcastKey]);

  const showPublic = Boolean(broadcast && !secret && publicDismissedKey !== broadcastKey);
  const showHolderReveal = Boolean(secret && broadcast);

  return (
    <>
      <Dialog
        open={showPublic && Boolean(broadcast)}
        onOpenChange={(open) => {
          if (!open) setPublicDismissedKey(broadcastKey);
        }}
        className="room-night-dialog max-w-md"
        aria-labelledby="lady-public-title"
        aria-describedby="lady-public-description"
      >
        {broadcast ? (
          <div className="text-center">
            <img
              src={imageMap.avalon.ladyOfTheLake}
              alt=""
              className="mx-auto mb-4 size-24 rounded-card border border-rule object-cover"
            />
            <DialogTitle
              id="lady-public-title"
              className="font-display text-xl font-extrabold text-ink"
            >
              Lady of the Lake
            </DialogTitle>
            <DialogDescription
              id="lady-public-description"
              className="mt-3 text-base leading-relaxed text-ink-2"
            >
              <strong className="text-ink">{broadcast.holderName}</strong> ใช้ Lady of the Lake กับ{' '}
              <strong className="text-ink">{broadcast.targetName}</strong>
            </DialogDescription>
            <p className="mt-2 text-sm text-ink-2">
              เฉพาะผู้ถือ Lady เท่านั้นที่เห็นฝ่ายของเป้าหมาย
            </p>
            <Button
              type="button"
              variant="secondary"
              className="mt-5"
              onClick={() => setPublicDismissedKey(broadcastKey)}
            >
              รับทราบ
            </Button>
          </div>
        ) : null}
      </Dialog>

      <Dialog
        open={showHolderReveal && Boolean(secret && broadcast)}
        onOpenChange={() => undefined}
        dismissible={false}
        className="room-night-dialog max-w-md"
        aria-labelledby="lady-secret-title"
        aria-describedby="lady-secret-description"
      >
        {secret && broadcast ? (
          <div className="text-center">
            <img
              src={imageMap.avalon.ladyOfTheLake}
              alt=""
              className="mx-auto mb-4 size-24 rounded-card border border-rule object-cover"
            />
            <DialogTitle
              id="lady-secret-title"
              className="font-display text-xl font-extrabold text-ink"
            >
              Lady of the Lake
            </DialogTitle>
            <DialogDescription
              id="lady-secret-description"
              className="mt-3 text-base leading-relaxed text-ink-2"
            >
              คุณตรวจสอบ <strong className="text-ink">{broadcast.targetName}</strong>
            </DialogDescription>
            <Badge
              size="lg"
              variant={secret.team === 'good' ? 'success' : 'danger'}
              className="mt-4"
              role="status"
            >
              {secret.team === 'good' ? (
                <Shield size={15} aria-hidden />
              ) : (
                <Skull size={15} aria-hidden />
              )}
              {secret.team === 'good' ? 'ฝ่ายดี' : 'ฝ่ายชั่ว'}
            </Badge>
            <p className="mt-3 text-sm text-ink-2">
              รับทราบผลเพื่อให้เกมดำเนินไปยังการเลือกทีม Quest
            </p>
            <Button type="button" className="mt-5" onClick={onAcknowledgeLady}>
              รับทราบผล
            </Button>
          </div>
        ) : null}
      </Dialog>
    </>
  );
}

function LadyOfLakePhase({
  myId,
  players,
  ladyHolderId,
  prompt,
  onInspect,
}: {
  myId: string;
  players: { id: string; name: string }[];
  ladyHolderId?: string;
  prompt?: { holderId: string; canInspectIds: { id: string; name: string }[] };
  onInspect: (targetId: string) => void;
}) {
  const holderName = players.find((p) => p.id === ladyHolderId)?.name ?? '?';
  const isHolder = ladyHolderId === myId;

  if (!isHolder) {
    return (
      <GameWaitingState surface="panel">
        ช่วง Lady of the Lake — รอ {holderName} ตรวจสอบฝ่ายของผู้เล่น
      </GameWaitingState>
    );
  }

  return (
    <GamePhasePanel
      title={
        <span className="inline-flex items-center gap-2">
          <FlaskConical size={21} aria-hidden />
          Lady of the Lake
        </span>
      }
      description="เลือกผู้เล่นหนึ่งคนเพื่อดูฝ่ายจริง ผู้ที่เคยถือ Lady มาก่อนจะไม่สามารถถูกเลือกได้ และโทเคนจะย้ายไปยังผู้เล่นที่เลือก"
    >
      <PlayerChoiceGrid
        players={prompt?.canInspectIds ?? []}
        selectedIds={[]}
        onToggle={onInspect}
        ariaLabel="เลือกผู้เล่นที่จะตรวจสอบฝ่าย"
      />
    </GamePhasePanel>
  );
}

function TeamVote({
  players,
  selectedTeam,
  teamVotes,
  teamVoteProgress,
  awaitingTeamVoteFrom,
  leaderId,
  myId,
  onVote,
}: {
  players: { id: string; name: string }[];
  selectedTeam: string[];
  teamVotes: Record<string, boolean>;
  teamVoteProgress?: GameProgressValue;
  awaitingTeamVoteFrom?: { id: string; name: string }[];
  leaderId: string;
  myId: string;
  onVote: (approve: boolean) => void;
}) {
  const hasVoted = teamVotes[myId] !== undefined;
  const allVoted =
    teamVoteProgress !== undefined
      ? teamVoteProgress.current >= teamVoteProgress.total
      : Object.keys(teamVotes).length === players.length;

  const teamNames = selectedTeam
    .map((id) => players.find((p) => p.id === id)?.name || '?')
    .join(', ');

  const proposedPlayers = selectedTeam
    .map((id) => players.find((p) => p.id === id))
    .filter((p): p is { id: string; name: string } => Boolean(p));

  const approvesCount = Object.values(teamVotes).filter(Boolean).length;
  const approved = approvesCount > players.length / 2;

  return (
    <GamePhasePanel
      title={
        <span className="inline-flex items-center gap-2">
          <Vote size={21} aria-hidden />
          โหวตทีม
        </span>
      }
      description="อนุมัติหรือปฏิเสธทีมที่ Leader เลือกให้ออกทำ Quest"
      meta={
        !allVoted && teamVoteProgress
          ? `โหวตแล้ว ${teamVoteProgress.current}/${teamVoteProgress.total} คน`
          : undefined
      }
    >
      <section
        className="rounded-input border border-rule bg-paper-3 p-3 sm:p-4"
        aria-labelledby="team-vote-quest-title"
      >
        <h3
          id="team-vote-quest-title"
          className="flex items-center gap-2 font-display text-base font-bold text-ink"
        >
          <Swords size={18} className="text-pear" aria-hidden />
          ทีมที่ไปทำภารกิจ
        </h3>
        {proposedPlayers.length > 0 ? (
          <div
            className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-2"
            aria-label="ผู้เล่นที่ถูกเลือกให้ไปทำภารกิจ"
          >
            {proposedPlayers.map((p) => (
              <div
                key={p.id}
                className="flex min-w-0 items-center gap-2 rounded-input border border-rule bg-paper-2 p-2.5"
              >
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-pill bg-pear font-label text-sm font-bold text-accent-ink"
                  aria-hidden
                >
                  {p.name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <strong className="block truncate text-sm text-ink">{p.name}</strong>
                  <span className="font-label text-xs text-ink-2">ไป Quest</span>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink-2">
            <strong>{teamNames}</strong>
          </p>
        )}
      </section>

      {!allVoted && awaitingTeamVoteFrom && awaitingTeamVoteFrom.length > 0 && (
        <section
          className="mt-3 rounded-input border border-rule bg-paper-3 p-3 sm:p-4"
          aria-labelledby="team-vote-pending-title"
        >
          <h3
            id="team-vote-pending-title"
            className="flex items-center gap-2 font-display text-base font-bold text-ink"
          >
            <Vote size={18} className="text-pear" aria-hidden />
            ยังไม่โหวต
          </h3>
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="ผู้เล่นที่ยังไม่โหวต">
            {awaitingTeamVoteFrom.map((p) => (
              <li key={p.id}>
                <Badge variant="outline">{p.name}</Badge>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!hasVoted ? (
        <GameDecisionActions
          className="mt-5"
          primary={{
            label: (
              <>
                <Check size={18} aria-hidden /> เห็นด้วย
              </>
            ),
            onSelect: () => onVote(true),
          }}
          secondary={{
            label: (
              <>
                <X size={18} aria-hidden /> ไม่เห็นด้วย
              </>
            ),
            onSelect: () => onVote(false),
          }}
        />
      ) : !allVoted ? (
        <GameWaitingState className="mt-5" progress={teamVoteProgress}>
          คุณโหวตแล้ว — รอผู้เล่นคนอื่น
        </GameWaitingState>
      ) : (
        <section
          className="mt-4 rounded-input border border-rule bg-paper-3 p-3 sm:p-4"
          aria-label="ผลโหวตทีมทั้งหมด"
        >
          <p
            className={`flex items-center gap-2 font-display text-base font-bold ${
              approved ? 'text-success' : 'text-error'
            }`}
          >
            {approved ? <Check size={19} aria-hidden /> : <X size={19} aria-hidden />}
            {approved ? 'โหวตผ่าน — ทีมเข้าสู่ Quest' : 'โหวตไม่ผ่าน — ทีมถูกปฏิเสธ'}
          </p>
          <p className="mt-1 text-sm text-ink-2">
            โหวตเห็นด้วย {approvesCount} / {players.length} คน (ต้องมากกว่าครึ่งเพื่อผ่าน)
          </p>
          <h4 className="mt-4 font-display text-sm font-bold text-ink">ผลโหวตรายคน</h4>
          <div
            className="mt-2 overflow-hidden rounded-input border border-rule bg-paper-2"
            role="list"
          >
            <div
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-rule bg-paper-4 px-3 py-2 font-label text-xs text-ink-2"
              aria-hidden
            >
              <span>ผู้เล่น</span>
              <span>การโหวต</span>
            </div>
            {players.map((p) => {
              const v = teamVotes[p.id];
              const isApprove = v === true;
              return (
                <div
                  key={p.id}
                  role="listitem"
                  className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-rule px-3 py-2.5 last:border-b-0"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-semibold text-ink">{p.name}</span>
                    {p.id === leaderId ? (
                      <Crown size={14} className="shrink-0 text-pear" aria-label="Leader" />
                    ) : null}
                  </div>
                  <Badge
                    variant={isApprove ? 'success' : 'danger'}
                    aria-label={isApprove ? 'เห็นด้วย' : 'ไม่เห็นด้วย'}
                  >
                    {isApprove ? <Check size={12} aria-hidden /> : <X size={12} aria-hidden />}
                    <span>{isApprove ? 'เห็นด้วย' : 'ไม่เห็นด้วย'}</span>
                  </Badge>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </GamePhasePanel>
  );
}

const QUEST_REVEAL_FLIP_SEC = 0.58;

function QuestRevealOverlay({
  sequence,
  shown,
  questVotesCount,
}: {
  sequence: boolean[];
  shown: number;
  questVotesCount?: { success: number; fail: number };
}) {
  const total = sequence.length;

  return (
    <GamePhasePanel
      className="quest-reveal-overlay"
      title={
        <span className="inline-flex items-center gap-2">
          <Swords size={21} aria-hidden />
          เปิดผลการ์ด Quest
        </span>
      }
      description="ระบบสับลำดับและเปิดทีละใบ โดยไม่เปิดเผยว่าใครลง Success หรือ Fail"
    >
      {questVotesCount && (questVotesCount.success > 0 || questVotesCount.fail > 0) && (
        <div
          className="mb-4 flex flex-wrap items-center justify-center gap-2"
          role="status"
          aria-live="polite"
        >
          <span className="w-full text-center font-label text-xs text-ink-2">ที่เปิดแล้ว</span>
          <Badge variant="success">
            <Check size={12} aria-hidden /> Success {questVotesCount.success}
          </Badge>
          <Badge variant="danger">
            <X size={12} aria-hidden /> Fail {questVotesCount.fail}
          </Badge>
        </div>
      )}

      <div className="quest-reveal-grid">
        {sequence.map((success, i) => {
          const revealed = i < shown;
          const justRevealed = revealed && i === shown - 1;
          return (
            <div
              key={i}
              className={`quest-reveal-card-slot ${revealed ? 'is-revealed' : 'is-face-down'} ${justRevealed ? 'just-flipped' : ''}`}
            >
              <div className="quest-reveal-flip-perspective">
                <motion.div
                  className="quest-reveal-flip-inner"
                  initial={false}
                  animate={{ rotateY: revealed ? 180 : 0 }}
                  transition={{
                    duration: justRevealed ? QUEST_REVEAL_FLIP_SEC : 0.02,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <div className="quest-reveal-flip-face quest-reveal-flip-face--back" aria-hidden>
                    <img
                      src={imageMap.avalon.roleCardBack}
                      alt=""
                      className="quest-reveal-flip-img"
                      loading="eager"
                      decoding="async"
                    />
                  </div>
                  <div className="quest-reveal-flip-face quest-reveal-flip-face--front">
                    <img
                      src={success ? imageMap.avalon.quest.success : imageMap.avalon.quest.fail}
                      alt={success ? 'Success' : 'Fail'}
                      className="quest-reveal-flip-img"
                      loading="eager"
                      decoding="async"
                    />
                  </div>
                </motion.div>
              </div>
            </div>
          );
        })}
      </div>

      {shown === 0 && (
        <p className="mt-4 animate-pulse text-center text-sm text-ink-2 motion-reduce:animate-none">
          กำลังสับการ์ด…
        </p>
      )}
      {shown > 0 && shown < total && (
        <p className="mt-4 text-center text-sm text-ink-2">
          เปิดแล้ว <strong>{shown}</strong> / {total} ใบ
        </p>
      )}
      {shown === total && (
        <p className="mt-4 text-center text-sm font-bold text-pear">
          ครบทุกใบแล้ว — กำลังสรุปผล Quest…
        </p>
      )}
    </GamePhasePanel>
  );
}

function QuestPhase({
  selectedTeam,
  players,
  myId,
  onVote,
  myTeam,
}: {
  selectedTeam: string[];
  players: { id: string; name: string }[];
  myId: string;
  onVote: (success: boolean) => void;
  myTeam: string;
}) {
  const isOnQuest = selectedTeam.includes(myId);
  const [voted, setVoted] = useState(false);

  const teamNames = selectedTeam
    .map((id) => players.find((p) => p.id === id)?.name || '?')
    .join(', ');

  const handleVote = (success: boolean) => {
    setVoted(true);
    onVote(success);
  };

  return (
    <GamePhasePanel
      title={
        <span className="inline-flex items-center gap-2">
          <Swords size={21} aria-hidden />
          Quest
        </span>
      }
      description={
        <>
          ทีม Quest: <strong className="text-ink">{teamNames}</strong>
        </>
      }
    >
      {isOnQuest ? (
        !voted ? (
          <div>
            <p className="mb-5 text-center text-base leading-relaxed text-ink-2">
              {myTeam === 'good'
                ? 'คุณเป็นฝ่ายดี — ต้องเลือก Success เท่านั้น'
                : 'คุณเป็นฝ่ายชั่ว — เลือก Success หรือ Fail ก็ได้'}
            </p>
            {myTeam === 'evil' ? (
              <GameDecisionActions
                primary={{
                  label: (
                    <>
                      <Check size={18} aria-hidden /> Success
                    </>
                  ),
                  onSelect: () => handleVote(true),
                }}
                secondary={{
                  label: (
                    <>
                      <X size={18} aria-hidden /> Fail
                    </>
                  ),
                  onSelect: () => handleVote(false),
                }}
              />
            ) : (
              <Button size="lg" variant="success" block onClick={() => handleVote(true)}>
                <Check size={18} aria-hidden /> Success
              </Button>
            )}
          </div>
        ) : (
          <GameWaitingState>คุณลงการ์ดแล้ว — รอผลลัพธ์</GameWaitingState>
        )
      ) : (
        <GameWaitingState>คุณไม่ได้อยู่ใน Quest นี้ — รอผลลัพธ์</GameWaitingState>
      )}
    </GamePhasePanel>
  );
}

function Assassination({
  players,
  myId,
  myRole,
  knownInfo,
  onAssassinate,
}: {
  players: { id: string; name: string }[];
  myId: string;
  myRole: string;
  knownInfo: { id: string; name: string; detail: string }[];
  onAssassinate: (targetId: string) => void;
}) {
  const [target, setTarget] = useState<string | null>(null);
  const isAssassin = myRole === 'assassin';

  const goodPlayers = players.filter((p) => p.id !== myId);
  // Assassin รู้เฉพาะ evil ally ที่ระบบบอกได้ (ตามกติกา Oberon จะไม่ถูกเปิดให้รู้ในข้อมูล knownInfo)
  const knownEvilIds = new Set(
    knownInfo.filter((k) => k.detail === 'Evil ally' || k.detail === 'Evil').map((k) => k.id),
  );

  if (!isAssassin) {
    const assassinCardArt = getAvalonRolePortraitUrl('assassin');
    return (
      <GamePhasePanel
        title={
          <span className="inline-flex items-center gap-2">
            <Target size={21} aria-hidden />
            ช่วงลอบสังหาร
          </span>
        }
        description="ฝ่ายดีทำ Quest สำเร็จสามครั้ง แต่ Assassin ยังมีโอกาสพลิกผลด้วยการตามหา Merlin"
      >
        <GameWaitingState>รอ Assassin เลือกเป้าหมาย</GameWaitingState>
        <div className="mx-auto mt-5 grid max-w-md gap-3 text-center">
          <div className="mx-auto w-full max-w-48 overflow-hidden rounded-card border border-rule bg-paper-3">
            <img
              src={assassinCardArt}
              alt="การ์ดบท Assassin"
              className="aspect-[3/4] w-full object-cover"
              loading="lazy"
            />
          </div>
          <p className="text-sm leading-relaxed text-ink-2">
            การ์ดนี้แสดงบท <strong>Assassin</strong> เท่านั้น — ไม่ได้เปิดเผยว่าใครในห้องถือบทนี้
          </p>
        </div>
      </GamePhasePanel>
    );
  }

  return (
    <GamePhasePanel
      tone="danger"
      title={
        <span className="inline-flex items-center gap-2">
          <Target size={21} aria-hidden />
          คุณคือ Assassin
        </span>
      }
      description="เลือกผู้เล่นที่คุณคิดว่าเป็น Merlin หากเลือกถูก ฝ่ายชั่วจะชนะทันที"
      actions={
        <Button
          variant="danger"
          size="lg"
          disabled={!target}
          onClick={() => target && onAssassinate(target)}
        >
          <Target size={18} aria-hidden /> ยืนยันเป้าหมาย
        </Button>
      }
    >
      <PlayerChoiceGrid
        players={goodPlayers.map((player) => ({
          ...player,
          badge: knownEvilIds.has(player.id) ? (
            <Badge size="sm" variant="danger">
              ฝ่ายเดียวกับคุณ
            </Badge>
          ) : null,
        }))}
        selectedIds={target ? [target] : []}
        onToggle={(id) => setTarget(id)}
        ariaLabel="เลือกเป้าหมายที่คิดว่าเป็น Merlin"
      />
    </GamePhasePanel>
  );
}

function GameOver({
  gameState,
  onLeave,
  onRestart,
}: {
  gameState: AvalonPlayerView;
  onLeave: () => void;
  onRestart?: () => void;
}) {
  const winner = gameState.winner;

  return (
    <GameOverModal
      titleId="avalon-game-over-title"
      onLeave={onLeave}
      onRestart={onRestart}
      panelClassName="max-w-2xl"
      startCelebration={startWinCelebrationLoop}
    >
      <div className="text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-pill border border-rule bg-paper-3 text-pear">
          {winner === 'good' ? <Trophy size={32} aria-hidden /> : <Skull size={32} aria-hidden />}
        </div>
        <h2
          id="avalon-game-over-title"
          className={`font-display text-xl font-extrabold ${
            winner === 'good' ? 'text-success' : 'text-error'
          }`}
        >
          {winner === 'good' ? 'ฝ่ายดีชนะ' : 'ฝ่ายชั่วชนะ'}
        </h2>
        <p className="mt-2 text-ink-2">{gameState.winReason}</p>

        <h3 className="mt-6 font-display text-lg font-bold text-ink">เปิดเผย Role ทั้งหมด</h3>
        <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(min(100%,8rem),1fr))] gap-2">
          {gameState.players.map((p) => {
            const label = p.role ? ROLE_LABEL[p.role] : '?';
            const art = p.role
              ? getAvalonRolePortraitUrl(p.role, p.portraitVariant)
              : imageMap.avalon.cover;
            const rTeam = p.role ? getTeamForRole(p.role) : (p.team ?? 'good');
            return (
              <div
                key={p.id}
                className={`rounded-input border bg-paper-3 p-2 ${
                  rTeam === 'good' ? 'border-success/60' : 'border-error/60'
                }`}
              >
                <img
                  src={art}
                  alt={label}
                  className="aspect-square w-full rounded-input border border-rule object-cover"
                  loading="lazy"
                />
                <div className="mt-2 truncate text-sm font-bold text-ink">{p.name}</div>
                <div className="truncate text-xs text-ink-2">{label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </GameOverModal>
  );
}
