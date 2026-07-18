import type { Flip7Card, Flip7PlayerView } from 'shared';
import { PlayerAvatar } from '../../../components/player-avatar';
import { GameCardImage } from '../../../components/ui';
import { cardImage, cardLabel } from '../lib/flip7Ui';

type Props = {
  gameState: Flip7PlayerView;
  myId: string;
  displayLineFor: (pid: string, fullLine: Flip7Card[]) => Flip7Card[];
};

export function Flip7PlayerBoard({ gameState, myId, displayLineFor }: Props) {
  return (
    <div className="f7-grid">
      {gameState.players.map((p) => {
        const line = displayLineFor(p.id, gameState.tableLines[p.id] ?? []);
        const mine = p.id === myId;
        const current = p.id === gameState.currentPlayerId;
        const dealer = p.id === gameState.dealerId;
        const disabled = p.busted || p.stayed || !p.active;
        return (
          <section
            key={p.id}
            className={`card f7-player${mine ? ' mine' : ''}${p.active ? ' active' : ''}${current ? ' current' : ''}${disabled ? ' disabled' : ''}`}
          >
            <div className="f7-player-head">
              <div className="f7-player-identity">
                <PlayerAvatar
                  playerId={p.id}
                  name={p.name}
                  size={32}
                  decorative
                  className="f7-player-avatar"
                />
                <h3>
                  {p.name} {mine ? '(คุณ)' : ''}
                </h3>
              </div>
              <span className="f7-total">{p.totalScore}</span>
            </div>
            <div className="f7-player-tags">
              {current ? <span className="f7-tag f7-tag-turn">ถึงตา</span> : null}
              {dealer ? <span className="f7-tag">Dealer</span> : null}
              {p.flip7 ? <span className="f7-tag f7-tag-flip7">+15</span> : null}
              {p.forcedDrawRemaining > 0 ? (
                <span
                  className="f7-tag f7-tag-forced-draw"
                  title="บังคับจั่วจาก Flip / Just One More"
                >
                  จั่วค้าง ×{p.forcedDrawRemaining}
                </span>
              ) : null}
              {current ? (
                <span className="f7-tag f7-tag-round">
                  รอบ {gameState.round} · จั่ว {gameState.deckRemaining} · ทิ้ง{' '}
                  {gameState.discardCount}
                </span>
              ) : null}
            </div>
            <p className="f7-status">
              {p.busted
                ? 'BUST'
                : p.flip7
                  ? 'Flip 7!'
                  : p.stayed
                    ? 'Stay'
                    : p.active
                      ? 'กำลังเล่น'
                      : 'รอรอบใหม่'}{' '}
              · รอบนี้ {p.roundPreviewScore} แต้ม
            </p>
            <div className="f7-line">
              {line.length === 0 ? (
                <span className="muted">ยังไม่มีการ์ด</span>
              ) : (
                [...line]
                  .reverse()
                  .map((c, revIdx) => (
                    <GameCardImage
                      key={`${c.kind}-${line.length - 1 - revIdx}`}
                      className="f7-line-card"
                      src={cardImage(c)}
                      alt={cardLabel(c)}
                      aspectRatio={469 / 768}
                    />
                  ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
