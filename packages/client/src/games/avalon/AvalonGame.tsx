import { useState } from 'react';
import type { AvalonPlayerView, AvalonAction } from 'shared';
import { QUEST_TEAM_SIZES } from 'shared';

// Role display config
const ROLE_INFO: Record<string, { emoji: string; label: string }> = {
  merlin: { emoji: '🧙', label: 'Merlin' },
  percival: { emoji: '🛡️', label: 'Percival' },
  loyal_servant: { emoji: '⚔️', label: 'Loyal Servant' },
  assassin: { emoji: '🗡️', label: 'Assassin' },
  morgana: { emoji: '🧙‍♀️', label: 'Morgana' },
  mordred: { emoji: '👹', label: 'Mordred' },
  oberon: { emoji: '👤', label: 'Oberon' },
  minion: { emoji: '💀', label: 'Minion of Mordred' },
};

interface Props {
  gameState: AvalonPlayerView;
  myId: string;
  sendAction: (action: AvalonAction) => void;
  onLeave: () => void;
}

export function AvalonGame({ gameState, myId, sendAction, onLeave }: Props) {
  const gs = gameState;
  const playerCount = gs.players.length;
  const leader = gs.players[gs.currentLeaderIndex];
  const isLeader = leader?.id === myId;

  return (
    <div className="avalon-container">
      {/* Quest Track */}
      <QuestTrack
        questResults={gs.questResults}
        currentQuest={gs.questNumber}
        playerCount={playerCount}
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

      {gs.phase === 'assassination' && (
        <Assassination
          players={gs.players}
          myId={myId}
          myRole={gs.myRole}
          onAssassinate={(targetId) => sendAction({ type: 'assassinate', targetId })}
        />
      )}

      {gs.phase === 'game_over' && <GameOver gameState={gs} onLeave={onLeave} />}
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function QuestTrack({
  questResults,
  currentQuest,
  playerCount,
}: {
  questResults: ('success' | 'fail' | 'pending')[];
  currentQuest: number;
  playerCount: number;
}) {
  const sizes = QUEST_TEAM_SIZES[playerCount] || [2, 3, 2, 3, 3];

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
  onAcknowledge,
}: {
  role: string;
  team: string;
  knownInfo: { id: string; name: string; detail: string }[];
  onAcknowledge: () => void;
}) {
  const info = ROLE_INFO[role] || { emoji: '❓', label: role };

  return (
    <div className="card role-card">
      <div className="role-icon">{info.emoji}</div>
      <div className="role-name">{info.label}</div>
      <div className={`role-team ${team}`}>
        {team === 'good' ? '⚔️ ฝ่ายดี (Arthur)' : '💀 ฝ่ายชั่ว (Mordred)'}
      </div>

      {knownInfo.length > 0 && (
        <div className="known-list">
          <p style={{ marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            🔍 ข้อมูลที่คุณรู้:
          </p>
          {knownInfo.map((k) => (
            <div className="known-item" key={k.id}>
              <strong>{k.name}</strong>
              <span style={{ color: 'var(--text-muted)' }}>— {k.detail}</span>
            </div>
          ))}
        </div>
      )}

      <button
        className="btn btn-primary btn-block"
        onClick={onAcknowledge}
        style={{ marginTop: '24px' }}
      >
        รับทราบ พร้อมเล่น!
      </button>
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
  myId,
  onVote,
}: {
  players: { id: string; name: string }[];
  selectedTeam: string[];
  teamVotes: Record<string, boolean>;
  myId: string;
  onVote: (approve: boolean) => void;
}) {
  const hasVoted = teamVotes[myId] !== undefined;
  const allVoted = Object.keys(teamVotes).length === players.length;

  const teamNames = selectedTeam
    .map((id) => players.find((p) => p.id === id)?.name || '?')
    .join(', ');

  return (
    <div>
      <div className="phase-header">
        <h2>🗳️ โหวตทีม</h2>
        <p>
          ทีมที่เสนอ: <strong>{teamNames}</strong>
        </p>
      </div>

      {!hasVoted ? (
        <div className="vote-buttons">
          <button className="btn btn-success btn-lg" onClick={() => onVote(true)}>
            👍 เห็นด้วย
          </button>
          <button className="btn btn-danger btn-lg" onClick={() => onVote(false)}>
            👎 ไม่เห็นด้วย
          </button>
        </div>
      ) : !allVoted ? (
        <div className="waiting-indicator">
          <p>
            ✅ คุณโหวตแล้ว — รอผู้เล่นคนอื่น ({Object.keys(teamVotes).length}/{players.length})
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
  onAssassinate,
}: {
  players: { id: string; name: string }[];
  myId: string;
  myRole: string;
  onAssassinate: (targetId: string) => void;
}) {
  const [target, setTarget] = useState<string | null>(null);
  const isAssassin = myRole === 'assassin';

  const goodPlayers = players.filter((p) => p.id !== myId);

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
            className={`team-select-item ${target === p.id ? 'selected' : ''}`}
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

function GameOver({ gameState, onLeave }: { gameState: AvalonPlayerView; onLeave: () => void }) {
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
          const info = ROLE_INFO[p.role || ''] || { emoji: '❓', label: p.role || '?' };
          return (
            <div key={p.id} className={`role-reveal-item ${p.team || 'good'}`}>
              <div style={{ fontSize: '1.5rem' }}>{info.emoji}</div>
              <div className="player-name">{p.name}</div>
              <div className="player-role">{info.label}</div>
            </div>
          );
        })}
      </div>

      <button className="btn btn-primary btn-lg" onClick={onLeave} style={{ marginTop: '32px' }}>
        🏠 กลับหน้าหลัก
      </button>
    </div>
  );
}
