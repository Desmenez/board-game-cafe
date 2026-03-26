import { useState } from 'react';
import type { AvalonPlayerView, AvalonAction, AvalonPhase } from 'shared';
import { QUEST_TEAM_SIZES } from 'shared';

import artAssassin from '../../assets/avalon/assassin.jpg';
import artCover from '../../assets/avalon/cover.jpg';
import artLoyalServant from '../../assets/avalon/loyal-servant.jpg';
import artMerlin from '../../assets/avalon/merlin.jpg';
import artMinion from '../../assets/avalon/minion-of-mordred.jpg';
import artMorgana from '../../assets/avalon/morgana.jpg';
import artMordred from '../../assets/avalon/mordred.jpg';
import artOberon from '../../assets/avalon/oberon.jpg';
import artPercival from '../../assets/avalon/percival.jpg';
import questFailImg from '../../assets/avalon/fail.jpg';
import questSuccessImg from '../../assets/avalon/success.jpg';

/** Label + card art per role */
const ROLE_INFO: Record<string, { label: string; art: string }> = {
  merlin: { label: 'Merlin', art: artMerlin },
  percival: { label: 'Percival', art: artPercival },
  loyal_servant: { label: 'Loyal Servant', art: artLoyalServant },
  assassin: { label: 'Assassin', art: artAssassin },
  morgana: { label: 'Morgana', art: artMorgana },
  mordred: { label: 'Mordred', art: artMordred },
  oberon: { label: 'Oberon', art: artOberon },
  minion: { label: 'Minion of Mordred', art: artMinion },
};

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

  return (
    <div className="avalon-container">
      {/* Quest Track */}
      <QuestTrack
        phase={gs.phase}
        questResults={gs.questResults}
        currentQuest={gs.questNumber}
        playerCount={playerCount}
        roleAcknowledgeProgress={gs.roleAcknowledgeProgress}
      />

      {/* Reject counter */}
      {gs.consecutiveRejects > 0 && gs.phase !== 'game_over' && (
        <div className={`reject-counter ${gs.consecutiveRejects >= 3 ? 'warning' : ''}`}>
          ⚠️ ทีมถูกปฏิเสธ {gs.consecutiveRejects}/5 ครั้ง
          {gs.consecutiveRejects >= 4 && ' — ครั้งหน้าถ้าปฏิเสธอีกฝ่ายชั่วชนะ!'}
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

      {gs.phase === 'team_vote' && (
        <TeamVote
          players={gs.players}
          selectedTeam={gs.selectedTeam}
          teamVotes={gs.teamVotes}
          teamVoteProgress={gs.teamVoteProgress}
          awaitingTeamVoteFrom={gs.awaitingTeamVoteFrom}
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

      {gs.phase === 'game_over' && <GameOver gameState={gs} onLeave={onLeave} onRestart={onRestart} />}
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

function RoleReveal({
  role,
  team,
  knownInfo,
  hasAcknowledged,
  progress,
  onAcknowledge,
}: {
  role: string;
  team: string;
  knownInfo: { id: string; name: string; detail: string }[];
  hasAcknowledged: boolean;
  progress?: { current: number; total: number };
  onAcknowledge: () => void;
}) {
  const info = ROLE_INFO[role] ?? { label: role, art: artCover };
  const p = progress ?? { current: 0, total: 1 };

  return (
    <div className="card role-card role-card-visual">
      <div className="role-card-art">
        <img src={info.art} alt={info.label} className="role-card-art-img" loading="eager" />
        <div className={`role-card-art-badge ${team}`}>
          {team === 'good' ? 'ฝ่ายดี' : 'ฝ่ายชั่ว'}
        </div>
      </div>
      <div className="role-card-body">
        <div className="role-name">{info.label}</div>
        <div className={`role-team ${team}`}>
          {team === 'good' ? 'Arthur & Knights' : 'Minions of Mordred'}
        </div>

        {knownInfo.length > 0 && (
          <div className="known-list">
            <p className="known-list-title">ข้อมูลที่คุณรู้</p>
            {knownInfo.map((k) => (
              <div className="known-item" key={k.id}>
                <strong>{k.name}</strong>
                <span className="known-item-detail">— {k.detail}</span>
              </div>
            ))}
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
        <div className="leader-badge">👑 Leader: {leader.name}</div>
        <h2>🏗️ เลือกทีม Quest {questNumber + 1}</h2>
        <p>
          {isLeader
            ? `เลือกผู้เล่น ${requiredSize} คนเพื่อไป Quest`
            : `รอ ${leader.name} เลือกทีม (${requiredSize} คน)`}
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

function TeamVote({
  players,
  selectedTeam,
  teamVotes,
  teamVoteProgress,
  awaitingTeamVoteFrom,
  myId,
  onVote,
}: {
  players: { id: string; name: string }[];
  selectedTeam: string[];
  teamVotes: Record<string, boolean>;
  teamVoteProgress?: { current: number; total: number };
  awaitingTeamVoteFrom?: { id: string; name: string }[];
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

  const pendingNames =
    awaitingTeamVoteFrom && awaitingTeamVoteFrom.length > 0
      ? awaitingTeamVoteFrom.map((p) => p.name).join(' · ')
      : null;

  return (
    <div>
      <div className="phase-header">
        <h2>🗳️ โหวตทีม</h2>
        <p>
          ทีมที่เสนอ: <strong>{teamNames}</strong>
        </p>
        {teamVoteProgress && !allVoted && (
          <p className="team-vote-progress-line">
            โหวตแล้ว {teamVoteProgress.current}/{teamVoteProgress.total} คน
          </p>
        )}
      </div>

      {pendingNames && (
        <div className="team-vote-pending-box">
          <span className="team-vote-pending-label">ยังไม่โหวต:</span> {pendingNames}
        </div>
      )}

      {!hasVoted ? (
        <div className="vote-buttons">
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
            {teamVoteProgress
              ? ` (${teamVoteProgress.current}/${teamVoteProgress.total})`
              : ''}
          </p>
          <div className="waiting-dots">
            <span />
            <span />
            <span />
          </div>
        </div>
      ) : (
        <div>
          <p style={{ textAlign: 'center', marginBottom: '16px', color: 'var(--text-secondary)' }}>
            ผลโหวต:
          </p>
          <div className="vote-results">
            {players.map((p) => (
              <div
                key={p.id}
                className={`vote-result-item ${teamVotes[p.id] ? 'approve' : 'reject'}`}
              >
                {p.name}: {teamVotes[p.id] ? '👍' : '👎'}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

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
      <div className="phase-header">
        <h2>ผลการ์ด Quest</h2>
        <p>เปิดการ์ดทีละใบ — ลำดับสับสุ่ม</p>
      </div>

      {questVotesCount && (questVotesCount.success > 0 || questVotesCount.fail > 0) && (
        <p className="quest-reveal-count">
          ที่เปิดแล้ว: <span className="quest-reveal-stat success">Success {questVotesCount.success}</span>
          {' · '}
          <span className="quest-reveal-stat fail">Fail {questVotesCount.fail}</span>
        </p>
      )}

      <div className="quest-reveal-grid">
        {sequence.map((success, i) => {
          const revealed = i < shown;
          const justRevealed = revealed && i === shown - 1;
          return (
            <div
              key={i}
              className={`quest-reveal-card-slot ${revealed ? 'revealed' : 'face-down'} ${justRevealed ? 'just-revealed' : ''}`}
            >
              {revealed ? (
                <img
                  src={success ? questSuccessImg : questFailImg}
                  alt={success ? 'Success' : 'Fail'}
                  className="quest-reveal-card-img"
                />
              ) : (
                <div className="quest-reveal-card-back" aria-hidden />
              )}
            </div>
          );
        })}
      </div>

      {shown === 0 && <p className="quest-reveal-shuffle">กำลังสับการ์ด…</p>}
      {shown > 0 && shown < total && (
        <p className="quest-reveal-progress">
          เปิดแล้ว {shown} / {total}
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
            <div className="vote-buttons">
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
    knownInfo
      .filter((k) => k.detail === 'Evil ally' || k.detail === 'Evil')
      .map((k) => k.id),
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
        {gameState.players.map((p: any) => {
          const info = ROLE_INFO[p.role || ''] ?? { label: p.role || '?', art: artCover };
          return (
            <div key={p.id} className={`role-reveal-item ${p.team || 'good'}`}>
              <img src={info.art} alt={info.label} className="role-reveal-thumb" loading="lazy" />
              <div className="player-name">{p.name}</div>
              <div className="player-role">{info.label}</div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', marginTop: '32px' }}>
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
