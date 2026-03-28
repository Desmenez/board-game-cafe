import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { AvalonPlayerView, AvalonAction, AvalonPhase, AvalonRole, AvalonTeam } from 'shared';
import { QUEST_TEAM_SIZES, QUEST_TWO_FAILS } from 'shared';
import './avalon.css';
import { getAvalonRolePortraitUrl, imageMap } from '../../imageMap';
import { fireQuestSuccessConfetti, startWinCelebrationLoop } from '../../utils/winCelebration';

/** Display name per role (art uses `getAvalonRolePortraitUrl` + optional portrait variant). */
const ROLE_LABEL: Record<AvalonRole, string> = {
  merlin: 'Merlin',
  percival: 'Percival',
  loyal_servant: 'Loyal Servant',
  assassin: 'Assassin',
  morgana: 'Morgana',
  mordred: 'Mordred',
  oberon: 'Oberon',
  minion: 'Minion of Mordred',
};

function getTeamForRole(role: AvalonRole): AvalonTeam {
  return ['assassin', 'morgana', 'mordred', 'oberon', 'minion'].includes(role) ? 'evil' : 'good';
}

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

export function AvalonGame({ gameState, myId, sendAction, onLeave, onRestart }: Props) {
  const gs = gameState;
  const playerCount = gs.players.length;
  const leader = gs.players[gs.currentLeaderIndex];
  const isLeader = leader?.id === myId;
  const myPlayer = gs.players.find((p) => p.id === myId);
  const myRoleLabel = ROLE_LABEL[gs.myRole];
  const myRoleArt = getAvalonRolePortraitUrl(gs.myRole, gs.myPortraitVariant);

  useEffect(() => {
    if (gs.phase !== 'game_over') return;
    return startWinCelebrationLoop();
  }, [gs.phase]);

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

  return (
    <div className="avalon-container">
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
        <div className={`card avalon-my-info-card ${isLeader ? 'is-leader-turn' : ''}`}>
          <div className="avalon-my-info-head">
            <div className="avalon-my-info-profile">
              <img
                src={myRoleArt}
                alt={myRoleLabel}
                className="avalon-my-info-role-thumb"
                loading="lazy"
              />
              <div className="avalon-my-info-text-stack">
                <div className="avalon-my-info-primary">
                  <div className="avalon-my-info-meta" aria-label="สถานะรอบนี้">
                    <div className="avalon-my-info-meta-row">
                      <span className="avalon-my-info-meta-ico" aria-hidden>
                        👑
                      </span>
                      <div className="avalon-my-info-meta-line">
                        <span className="avalon-my-info-meta-label">หัวหน้า (Leader)</span>
                        <span className="avalon-my-info-meta-sep" aria-hidden>
                          {' — '}
                        </span>
                        <span className="avalon-my-info-meta-val">
                          {isLeader ? 'คุณคือ Leader รอบนี้' : `รอบนี้: ${leader?.name ?? '—'}`}
                        </span>
                      </div>
                    </div>
                    {gs.ladyOfTheLakeEnabled && (
                      <div className="avalon-my-info-meta-row">
                        <span className="avalon-my-info-meta-ico" aria-hidden>
                          🧪
                        </span>
                        <div className="avalon-my-info-meta-line">
                          <span className="avalon-my-info-meta-label">Lady of the Lake</span>
                          <span className="avalon-my-info-meta-sep" aria-hidden>
                            {' — '}
                          </span>
                          <span className="avalon-my-info-meta-val">
                            {gs.ladyHolderId === myId
                              ? 'คุณถือ Lady อยู่'
                              : `ผู้ถือ: ${gs.players.find((p) => p.id === gs.ladyHolderId)?.name ?? 'ไม่ทราบ'}`}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="avalon-my-info-kv">
                    <span className="avalon-my-info-key">ชื่อที่แสดง</span>
                    <span className="avalon-my-info-val">{myPlayer?.name ?? 'ผู้เล่น'}</span>
                  </div>
                  <div className="avalon-my-info-kv">
                    <span className="avalon-my-info-key">บทบาท</span>
                    <span className="avalon-my-info-val">{myRoleLabel}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className={`avalon-reject-pill ${gs.consecutiveRejects >= 3 ? 'danger' : 'warn'}`}>
              โหวตไม่ผ่านสะสม: {gs.consecutiveRejects}/5
            </div>
          </div>
        </div>
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
          result={gs.ladyResult}
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
          // myRole={gs.myRole}
          leaderId={leader.id}
          selectedTeam={gs.selectedTeam}
          phase={gs.phase}
          teamVotes={gs.teamVotes}
          awaitingTeamVoteFrom={gs.awaitingTeamVoteFrom}
        />
      )}

      {gs.phase === 'game_over' && (
        <GameOver gameState={gs} onLeave={onLeave} onRestart={onRestart} />
      )}
    </div>
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
  roleAcknowledgeProgress?: { current: number; total: number };
}) {
  const sizes = QUEST_TEAM_SIZES[playerCount] || [2, 3, 2, 3, 3];

  if (phase === 'role_reveal' && roleAcknowledgeProgress) {
    const { current, total } = roleAcknowledgeProgress;
    return (
      <div className="quest-track quest-track-role-ready" aria-label="ความพร้อมรับทราบบทบาท">
        {Array.from({ length: total }, (_, i) => {
          const ready = i < current;
          return (
            <div
              key={i}
              className={`quest-circle ${ready ? 'role-ready' : ''} ${!ready && i === current ? 'active' : ''}`}
            >
              {ready ? '✓' : i + 1}
              <span className={`quest-team-size ${ready ? 'role-ready-label' : ''}`}>
                {ready ? 'พร้อมแล้ว' : 'รอ'}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="quest-track">
      {questResults.map((result, i) => (
        <div
          key={i}
          className={`quest-circle ${result !== 'pending' ? result : ''} ${i === currentQuest && result === 'pending' ? 'active' : ''}`}
        >
          {result === 'success' ? '✓' : result === 'fail' ? '✗' : i + 1}
          <span className="quest-team-size">👥 {sizes[i]}</span>
        </div>
      ))}
    </div>
  );
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
    <div className="card avalon-player-status-panel">
      <div className="avalon-player-status-head">
        <h3>สถานะผู้เล่น</h3>
      </div>

      <div className="avalon-player-status-grid">
        {players.map((p) => {
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

          return (
            <div
              key={p.id}
              className={`avalon-player-card ${isMe ? 'is-me' : ''} ${p.id === leaderId ? 'is-leader' : ''} ${
                isInQuestTeam ? 'is-quest-member' : ''
              }`}
            >
              <div className="avalon-player-card-head">
                <div className="avalon-player-card-title-wrap">
                  <div className="avalon-player-card-title">
                    {p.name} {isMe ? '(คุณ)' : ''}
                  </div>
                </div>
              </div>
              <div className="avalon-player-card-body">
                <div>
                  Leader:{' '}
                  <strong className={p.id === leaderId ? 'status-on leader' : 'status-off'}>
                    {p.id === leaderId ? 'ใช่ 👑' : 'ไม่ใช่'}
                  </strong>
                </div>
                <div>
                  ทีม Quest:{' '}
                  <strong className={isInQuestTeam ? 'status-on quest' : 'status-off'}>
                    {isInQuestTeam ? 'อยู่ในทีม' : 'ไม่ได้อยู่'}
                  </strong>
                </div>
                {voteStatus && (
                  <div>
                    สถานะโหวต:{' '}
                    <strong className={voted ? 'status-on vote' : 'status-wait'}>
                      {voteStatus}
                    </strong>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuestHistoryDock({
  quests,
  players,
}: {
  quests: AvalonPlayerView['quests'];
  players: AvalonPlayerView['players'];
}) {
  const [open, setOpen] = useState(false);

  const getName = (id: string) => players.find((p) => p.id === id)?.name ?? '?';

  if (!quests || quests.length === 0) return null;

  return (
    <div
      className={`quest-history-dock ${open ? 'open' : ''}`}
      aria-label="ประวัติทีมที่ไปทำ Quest"
    >
      <button
        type="button"
        className="quest-history-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        ประวัติ Quest {open ? '▾' : '▴'}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="quest-history-panel"
            className="quest-history-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="quest-history-title">ทีมที่ไปทำภารกิจ (ย้อนหลัง)</div>
            <div className="quest-history-list">
              {[...quests]
                .slice(-5)
                .reverse()
                .map((q) => {
                  const result = q.result ?? 'pending';
                  const resultLabel =
                    result === 'success' ? 'สำเร็จ' : result === 'fail' ? 'ล้มเหลว' : '—';
                  return (
                    <div key={q.questNumber} className="quest-history-item">
                      <div className="quest-history-row">
                        <span className="quest-history-quest">Quest {q.questNumber + 1}</span>
                        <span className={`quest-history-result ${result}`}>
                          {result === 'success' ? '✓' : result === 'fail' ? '✗' : '•'} {resultLabel}
                        </span>
                      </div>
                      <div className="quest-history-team">
                        {q.teamPlayerIds.map((id) => (
                          <span key={id} className="quest-history-chip">
                            {getName(id)}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
            <div className="quest-history-note">
              แสดงเฉพาะข้อมูลสาธารณะ: ใครไป Quest + ผลสำเร็จ/ล้มเหลว
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
  progress?: { current: number; total: number };
  onAcknowledge: () => void;
}) {
  const roleLabel = ROLE_LABEL[role];
  const roleArt = getAvalonRolePortraitUrl(role, myPortraitVariant);
  const p = progress ?? { current: 0, total: 1 };

  const [showAllRoles, setShowAllRoles] = useState(() => (roleRevealAllRoles?.length ?? 0) > 0);

  const allRoleSlotsShuffled = useMemo(() => {
    if (!roleRevealAllRoles?.length) return [];
    const variants = roleRevealPortraitVariants ?? roleRevealAllRoles.map(() => 0);
    const pairs = roleRevealAllRoles.map((r, i) => ({
      role: r,
      portraitVariant: variants[i] ?? 0,
    }));
    const arr = [...pairs];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
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
        <p className="role-ack-hint" style={{ marginBottom: 0 }}>
          กำลังเปิดเผยบทบาททั้งหมด…
        </p>
        <div className="role-reveal-grid role-reveal-all-grid">
          {allRoleSlotsShuffled.map((slot, idx) => {
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
    <div className="card role-card role-card-visual role-card-just-revealed">
      <div className="role-card-art">
        <img src={roleArt} alt={roleLabel} className="role-card-art-img" loading="eager" />
        <div className={`role-card-art-badge ${team}`}>
          {team === 'good' ? 'ฝ่ายดี' : 'ฝ่ายชั่ว'}
        </div>
      </div>
      <div className="role-card-body">
        <div className="role-name">{roleLabel}</div>
        <div className={`role-team ${team}`}>
          {team === 'good' ? 'Arthur & Knights' : 'Minions of Mordred'}
        </div>

        {knownInfo.length > 0 && (
          <div className="known-list">
            <p className="known-list-title">ข้อมูลที่คุณรู้</p>
            {knownInfo.map((k) => {
              const { label, tone } = knownInfoPresentation(k.detail);
              return (
                <div className={`known-item known-item--line known-item--tone-${tone}`} key={k.id}>
                  <span className="known-item-name">{k.name}</span>
                  <span className="known-item-sep" aria-hidden>
                    {' · '}
                  </span>
                  <span className="known-item-label">{label}</span>
                </div>
              );
            })}
          </div>
        )}

        <p className="role-ack-hint">
          ผู้เล่นรับทราบบทบาทแล้ว {p.current}/{p.total} คน — ต้องครบทุกคนถึงจะเริ่มเลือกทีม Quest
        </p>

        {hasAcknowledged ? (
          <button type="button" className="btn btn-secondary btn-block" disabled>
            คุณรับทราบแล้ว — รอผู้เล่นคนอื่น…
          </button>
        ) : (
          <button type="button" className="btn btn-primary btn-block" onClick={onAcknowledge}>
            รับทราบ พร้อมเล่น!
          </button>
        )}
      </div>
    </div>
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
    <div>
      <div className="phase-header">
        <h2>🏗️ เลือกทีม Quest {questNumber + 1}</h2>
        <p>
          {isLeader
            ? `เลือกผู้เล่น ${requiredSize} คนเพื่อไป Quest`
            : `รอ ${leader.name} เลือกทีม (${requiredSize} คน)`}
        </p>
        <p className="team-building-evil-fail-hint">
          เมื่อทีมไป Quest แล้ว ฝ่ายชั่วต้องให้มีการ์ด <strong>Fail {failCardsNeededForEvil}</strong> ใบ
          {failCardsNeededForEvil === 2 ? ' (Quest 4 เมื่อมีผู้เล่น 7 คนขึ้นไป)' : ''}{' '}
          ถึงจะทำให้ Quest นี้ล้มเหลว
        </p>
      </div>

      <div className="team-select-grid">
        {players.map((p) => (
          <div
            key={p.id}
            className={`team-select-item ${selectedTeam.includes(p.id) ? 'selected' : ''} ${!isLeader ? 'disabled' : ''}`}
            onClick={() => togglePlayer(p.id)}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>
              {selectedTeam.includes(p.id) ? '✅' : '👤'}
            </div>
            {p.name}
          </div>
        ))}
      </div>

      {isLeader && (
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button
            className="btn btn-primary btn-lg"
            disabled={selectedTeam.length !== requiredSize}
            onClick={onSubmitTeam}
          >
            ส่งทีม ({selectedTeam.length}/{requiredSize})
          </button>
        </div>
      )}
    </div>
  );
}

function LadyOfLakePhase({
  myId,
  players,
  ladyHolderId,
  prompt,
  result,
  onInspect,
}: {
  myId: string;
  players: { id: string; name: string }[];
  ladyHolderId?: string;
  prompt?: { holderId: string; canInspectIds: { id: string; name: string }[] };
  result?: { holderId: string; targetId: string; targetName: string; team: AvalonTeam };
  onInspect: (targetId: string) => void;
}) {
  const holderName = players.find((p) => p.id === ladyHolderId)?.name ?? '?';
  const isHolder = ladyHolderId === myId;

  if (!isHolder) {
    return (
      <div className="waiting-indicator">
        <p>🧪 ช่วง Lady of the Lake — รอ {holderName} ตรวจสอบฝ่ายของผู้เล่น</p>
        <div className="waiting-dots">
          <span />
          <span />
          <span />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="phase-header">
        <h2>🧪 Lady of the Lake</h2>
        <p>เลือกผู้เล่น 1 คนเพื่อดูว่าอยู่ฝ่ายดีหรือฝ่ายชั่ว</p>
      </div>
      {result && (
        <div className="team-vote-outcome-sub" style={{ textAlign: 'center', marginBottom: 10 }}>
          ผลล่าสุด: <strong>{result.targetName}</strong> คือฝ่าย{' '}
          <strong>{result.team === 'good' ? 'ดี' : 'ชั่ว'}</strong>
        </div>
      )}
      <div className="team-select-grid">
        {(prompt?.canInspectIds ?? []).map((p) => (
          <button
            key={p.id}
            type="button"
            className="btn btn-secondary"
            onClick={() => onInspect(p.id)}
          >
            ตรวจสอบ {p.name}
          </button>
        ))}
      </div>
    </div>
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
  teamVoteProgress?: { current: number; total: number };
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
    <div className="team-vote-phase">
      <div className="phase-header team-vote-phase-header">
        <h2>🗳️ โหวตทีม</h2>
        <p className="team-vote-phase-lead">
          อนุมัติหรือไม่อนุมัติทีมที่ Leader เลือกให้ไปทำภารกิจ (Quest)
        </p>
      </div>

      <section className="team-vote-quest-panel" aria-labelledby="team-vote-quest-title">
        <h3 id="team-vote-quest-title" className="team-vote-section-title">
          <span className="team-vote-section-ico" aria-hidden>
            ⚔️
          </span>
          ทีมที่ไปทำภารกิจ
        </h3>
        {proposedPlayers.length > 0 ? (
          <div
            className="team-proposed-list team-proposed-list--quest"
            aria-label="ผู้เล่นที่ถูกเลือกให้ไปทำภารกิจ"
            style={
              {
                '--team-quest-guard-url': `url("${imageMap.avalon.questHistoryGuard}")`,
              } as CSSProperties
            }
          >
            {proposedPlayers.map((p) => (
              <div key={p.id} className="team-proposed-card team-proposed-card--quest">
                <div className="team-proposed-initial">{p.name.charAt(0).toUpperCase()}</div>
                <div className="team-proposed-name">{p.name}</div>
                <span className="team-proposed-badge">ไป Quest</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="team-proposed-fallback">
            <strong>{teamNames}</strong>
          </p>
        )}
      </section>

      {!allVoted && teamVoteProgress && (
        <p className="team-vote-progress-line">
          โหวตแล้ว {teamVoteProgress.current}/{teamVoteProgress.total} คน
        </p>
      )}

      {!allVoted && awaitingTeamVoteFrom && awaitingTeamVoteFrom.length > 0 && (
        <section className="team-vote-pending-panel" aria-labelledby="team-vote-pending-title">
          <h3
            id="team-vote-pending-title"
            className="team-vote-section-title team-vote-section-title--pending"
          >
            <span className="team-vote-section-ico" aria-hidden>
              ⏳
            </span>
            ยังไม่โหวต
          </h3>
          <ul className="team-vote-pending-chips" aria-label="ผู้เล่นที่ยังไม่โหวต">
            {awaitingTeamVoteFrom.map((p) => (
              <li key={p.id} className="team-vote-pending-chip">
                {p.name}
              </li>
            ))}
          </ul>
        </section>
      )}

      {!hasVoted ? (
        <div className="team-vote-actions quest-vote-buttons">
          <button type="button" className="btn btn-success btn-lg" onClick={() => onVote(true)}>
            👍 เห็นด้วย
          </button>
          <button type="button" className="btn btn-danger btn-lg" onClick={() => onVote(false)}>
            👎 ไม่เห็นด้วย
          </button>
        </div>
      ) : !allVoted ? (
        <div className="waiting-indicator">
          <p>
            ✅ คุณโหวตแล้ว — รอผู้เล่นคนอื่น
            {teamVoteProgress ? ` (${teamVoteProgress.current}/${teamVoteProgress.total})` : ''}
          </p>
          <div className="waiting-dots">
            <span />
            <span />
            <span />
          </div>
        </div>
      ) : (
        <section className="team-vote-outcome-panel" aria-label="ผลโหวตทีมทั้งหมด">
          <p className={`team-vote-outcome ${approved ? 'approve' : 'reject'}`}>
            {approved ? '✅ โหวตผ่าน — ทีมเข้าสู่ Quest' : '❌ โหวตไม่ผ่าน — ทีมถูกปฏิเสธ'}
          </p>
          <p className="team-vote-outcome-sub">
            โหวตเห็นด้วย {approvesCount} / {players.length} คน (ต้องมากกว่าครึ่งเพื่อผ่าน)
          </p>
          <h4 className="team-vote-results-heading">ผลโหวตรายคน</h4>
          <div className="team-vote-results" role="list">
            <div className="team-vote-results-row team-vote-results-row--head" aria-hidden>
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
                  className={`team-vote-results-row ${isApprove ? 'is-approve' : 'is-reject'}`}
                >
                  <div className="team-vote-results-name">
                    <span className="team-vote-results-name-text">{p.name}</span>
                    {p.id === leaderId ? (
                      <span className="team-vote-results-leader" title="Leader">
                        👑
                      </span>
                    ) : null}
                  </div>
                  <div
                    className={`team-vote-results-pill ${isApprove ? 'approve' : 'reject'}`}
                    aria-label={isApprove ? 'เห็นด้วย' : 'ไม่เห็นด้วย'}
                  >
                    <span className="team-vote-results-pill-ico" aria-hidden>
                      {isApprove ? '👍' : '👎'}
                    </span>
                    <span>{isApprove ? 'เห็นด้วย' : 'ไม่เห็นด้วย'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
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
    <div className="quest-reveal-overlay">
      <div className="phase-header quest-reveal-phase-header">
        <h2 className="quest-reveal-title">⚔️ เปิดผลการ์ด Quest</h2>
        <p className="quest-reveal-subtitle">
          ทีละใบ — ลำดับสับสุ่ม — ลุ้นว่าเป็น Success หรือ Fail
        </p>
      </div>

      {questVotesCount && (questVotesCount.success > 0 || questVotesCount.fail > 0) && (
        <div className="quest-reveal-count" role="status" aria-live="polite">
          <span className="quest-reveal-count-label">ที่เปิดแล้ว</span>
          <span className="quest-reveal-stat-pill success">
            ✓ Success {questVotesCount.success}
          </span>
          <span className="quest-reveal-stat-pill fail">✗ Fail {questVotesCount.fail}</span>
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
        <p className="quest-reveal-shuffle quest-reveal-shuffle--pulse">กำลังสับการ์ด…</p>
      )}
      {shown > 0 && shown < total && (
        <p className="quest-reveal-progress">
          เปิดแล้ว <strong>{shown}</strong> / {total} ใบ
        </p>
      )}
      {shown === total && (
        <p className="quest-reveal-resolve">ครบทุกใบแล้ว — กำลังสรุปผล Quest…</p>
      )}
    </div>
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
    <div>
      <div className="phase-header">
        <h2>⚔️ Quest</h2>
        <p>
          ทีม Quest: <strong>{teamNames}</strong>
        </p>
      </div>

      {isOnQuest ? (
        !voted ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>
              {myTeam === 'good'
                ? 'คุณเป็นฝ่ายดี — ต้องเลือก Success เท่านั้น'
                : 'คุณเป็นฝ่ายชั่ว — เลือก Success หรือ Fail ก็ได้'}
            </p>
            <div className="quest-vote-buttons">
              <button className="btn btn-success btn-lg" onClick={() => handleVote(true)}>
                ✨ Success
              </button>
              {myTeam === 'evil' && (
                <button className="btn btn-danger btn-lg" onClick={() => handleVote(false)}>
                  💀 Fail
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="waiting-indicator">
            <p>✅ คุณโหวตแล้ว — รอผลลัพธ์</p>
            <div className="waiting-dots">
              <span />
              <span />
              <span />
            </div>
          </div>
        )
      ) : (
        <div className="waiting-indicator">
          <p>⏳ คุณไม่ได้อยู่ใน Quest นี้ — รอผลลัพธ์</p>
          <div className="waiting-dots">
            <span />
            <span />
            <span />
          </div>
        </div>
      )}
    </div>
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
    return (
      <div>
        <div className="phase-header">
          <h2>🗡️ ช่วงลอบสังหาร</h2>
          <p>ฝ่ายดีชนะ 3 Quest — แต่ Assassin มีโอกาสหา Merlin</p>
        </div>
        <div className="waiting-indicator">
          <p>⏳ รอ Assassin เลือกเป้าหมาย...</p>
          <div className="waiting-dots">
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="phase-header">
        <h2>🗡️ คุณคือ Assassin!</h2>
        <p>เลือกผู้เล่นที่คุณคิดว่าเป็น Merlin — ถ้าถูกฝ่ายชั่วชนะ!</p>
      </div>

      <div className="team-select-grid">
        {goodPlayers.map((p) => (
          <div
            key={p.id}
            className={`team-select-item ${target === p.id ? 'selected' : ''} ${
              knownEvilIds.has(p.id) ? 'known-evil' : ''
            }`}
            onClick={() => setTarget(p.id)}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>
              {target === p.id ? '🎯' : '👤'}
            </div>
            {p.name}
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginTop: '16px' }}>
        <button
          className="btn btn-danger btn-lg"
          disabled={!target}
          onClick={() => target && onAssassinate(target)}
        >
          🗡️ ลอบสังหาร!
        </button>
      </div>
    </div>
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
    <div className="game-over-container">
      <div style={{ fontSize: '4rem', marginBottom: '16px' }}>
        {winner === 'good' ? '🏆' : '💀'}
      </div>
      <h2 className={winner === 'good' ? 'winner-good' : 'winner-evil'}>
        {winner === 'good' ? '⚔️ ฝ่ายดีชนะ!' : '💀 ฝ่ายชั่วชนะ!'}
      </h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>{gameState.winReason}</p>

      {/* Reveal all roles */}
      <h3 style={{ marginBottom: '16px' }}>เปิดเผย Role ทั้งหมด</h3>
      <div className="role-reveal-grid">
        {gameState.players.map((p) => {
          const label = p.role ? ROLE_LABEL[p.role] : '?';
          const art = p.role
            ? getAvalonRolePortraitUrl(p.role, p.portraitVariant)
            : imageMap.avalon.cover;
          const rTeam = p.role ? getTeamForRole(p.role) : (p.team ?? 'good');
          return (
            <div key={p.id} className={`role-reveal-item ${rTeam}`}>
              <img src={art} alt={label} className="role-reveal-thumb" loading="lazy" />
              <div className="player-name">{p.name}</div>
              <div className="player-role">{label}</div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          justifyContent: 'center',
          marginTop: '32px',
        }}
      >
        {onRestart && (
          <button type="button" className="btn btn-secondary btn-lg" onClick={onRestart}>
            🔄 เริ่มเกมใหม่ (สุ่ม role)
          </button>
        )}
        <button className="btn btn-primary btn-lg" onClick={onLeave}>
          🏠 กลับหน้าหลัก
        </button>
      </div>
    </div>
  );
}
