import type { CupTheCrabPhase, CupTheCrabPlayerView } from 'shared';
import { PlayerRosterStrip } from '../../components/player-roster';

type PlayerRow = CupTheCrabPlayerView['players'][number];

type StatusTone = 'neutral' | 'pending' | 'ready' | 'done' | 'active' | 'waiting';

function playerStatus(
  phase: CupTheCrabPhase,
  player: PlayerRow,
  myId: string,
  mySelectionCount: number,
): { primary: string; secondary?: string; tone: StatusTone } {
  if (phase === 'card_selection') {
    if (player.id === myId && !player.hasConfirmedSelection) {
      return {
        primary: `เลือกมือ ${mySelectionCount}/3`,
        secondary: mySelectionCount === 3 ? 'พร้อมยืนยัน' : 'เลือกจากกริดด้านล่าง',
        tone: mySelectionCount === 3 ? 'ready' : 'pending',
      };
    }
    if (player.hasConfirmedSelection) {
      return { primary: 'ยืนยันมือแล้ว', secondary: 'รอผู้เล่นอื่น', tone: 'done' };
    }
    return { primary: 'ยังไม่เลือกมือ', secondary: 'ต้องเลือก 3 ใบ', tone: 'waiting' };
  }

  if (phase === 'play') {
    const left = 3 - player.cardsPlayedThisRound;
    if (left <= 0) {
      return {
        primary: 'เล่นครบ 3 ใบ',
        secondary: `กองคะแนน ${player.scorePileCount} ใบ`,
        tone: 'done',
      };
    }
    return {
      primary: `มือเหลือ ${left} ใบ`,
      secondary: `เล่นแล้ว ${player.cardsPlayedThisRound}/3`,
      tone: 'neutral',
    };
  }

  return {
    primary: `กองคะแนน ${player.scorePileCount} ใบ`,
    tone: 'neutral',
  };
}

function panelHint(gameState: CupTheCrabPlayerView, myId: string): string {
  const { phase } = gameState;
  if (phase === 'card_selection') {
    const waiting = gameState.players.filter((p) => !p.hasConfirmedSelection).length;
    if (waiting === 0) return 'ทุกคนยืนยันมือแล้ว — เริ่มเล่นการ์ด';
    const me = gameState.players.find((p) => p.id === myId);
    if (me && !me.hasConfirmedSelection) {
      return `เลือกการ์ด 3 ใบลับ · ยังมี ${waiting} คนที่ยังไม่ยืนยัน`;
    }
    return `รอผู้เล่นเลือกมือ · เหลือ ${waiting} คน`;
  }
  if (phase === 'play') {
    const active = gameState.players.find((p) => p.id === gameState.activePlayerId);
    const starter = gameState.players.find((p) => p.isStartPlayer);
    const activeName = active?.name ?? '—';
    const startNote = starter ? ` · เริ่มกอง: ${starter.name}` : '';
    return `ตาของ ${activeName}${startNote}`;
  }
  return 'สรุปผู้เล่น';
}

type Props = {
  gameState: CupTheCrabPlayerView;
  myId: string;
  mySelectionCount: number;
};

export function CtcPlayerStrip({ gameState, myId, mySelectionCount }: Props) {
  const byId = new Map(gameState.players.map((p) => [p.id, p]));

  return (
    <section className="card ctc-players-panel" aria-label="ผู้เล่นและลำดับเทิร์น">
      <header className="ctc-players-panel__head">
        <div>
          <h2 className="ctc-players-panel__title">ผู้เล่น · รอบ {gameState.round}</h2>
          <p className="ctc-players-panel__hint">{panelHint(gameState, myId)}</p>
        </div>
        <dl className="ctc-players-panel__legend" aria-label="คำอธิบายสัญลักษณ์">
          <div className="ctc-players-panel__legend-item">
            <span className="ctc-players-panel__legend-dot ctc-players-panel__legend-dot--start" />
            <span>เริ่มกองรอบนี้</span>
          </div>
          <div className="ctc-players-panel__legend-item">
            <span className="ctc-players-panel__legend-dot ctc-players-panel__legend-dot--active" />
            <span>ตาปัจจุบัน</span>
          </div>
        </dl>
      </header>

      <PlayerRosterStrip
        className="ctc-players-roster"
        myId={myId}
        seats={gameState.playerOrder.flatMap((playerId, index) => {
          const player = byId.get(playerId);
          if (!player) return [];

          const isActive = playerId === gameState.activePlayerId;
          const status = playerStatus(gameState.phase, player, myId, mySelectionCount);

          return [
            {
              id: playerId,
              name: player.name,
              active: isActive,
              className: [
                'ctc-player-card',
                playerId === myId ? 'ctc-player-card--me' : '',
                isActive ? 'ctc-player-card--active' : '',
                player.isStartPlayer ? 'ctc-player-card--start' : '',
                `ctc-player-card--${status.tone}`,
              ]
                .filter(Boolean)
                .join(' '),
              leading: (
                <span className="ctc-player-card__order" aria-label={`ลำดับที่ ${index + 1}`}>
                  {index + 1}
                </span>
              ),
              badges: (
                <span className="ctc-player-card__badges">
                  {playerId === myId ? (
                    <span className="ctc-player-card__badge ctc-player-card__badge--me">คุณ</span>
                  ) : null}
                  {player.isStartPlayer ? (
                    <span className="ctc-player-card__badge ctc-player-card__badge--start">
                      เริ่มกอง
                    </span>
                  ) : null}
                  {isActive && gameState.phase === 'play' ? (
                    <span className="ctc-player-card__badge ctc-player-card__badge--turn">
                      ตาคุณ
                    </span>
                  ) : null}
                </span>
              ),
              status: (
                <>
                  <p className="ctc-player-card__status">{status.primary}</p>
                  {status.secondary ? (
                    <p className="ctc-player-card__sub">{status.secondary}</p>
                  ) : null}
                </>
              ),
              aside:
                gameState.phase === 'play' ? (
                  <div
                    className="ctc-player-card__hand-meter"
                    aria-label={`เล่นแล้ว ${player.cardsPlayedThisRound} จาก 3`}
                  >
                    {Array.from({ length: 3 }, (_, i) => (
                      <span
                        key={i}
                        className={[
                          'ctc-player-card__pip',
                          i < player.cardsPlayedThisRound ? 'ctc-player-card__pip--spent' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      />
                    ))}
                  </div>
                ) : (
                  <div
                    className={[
                      'ctc-player-card__select-icon',
                      player.hasConfirmedSelection ? 'ctc-player-card__select-icon--done' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    aria-hidden
                  >
                    {player.hasConfirmedSelection ? '✓' : '…'}
                  </div>
                ),
            },
          ];
        })}
      />
    </section>
  );
}
