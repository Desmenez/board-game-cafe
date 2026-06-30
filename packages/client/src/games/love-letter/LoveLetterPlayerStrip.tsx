import type { LoveLetterPublicPlayer } from 'shared';
import { Shield } from 'lucide-react';
import { LoveLetterCardFace } from './LoveLetterCardFace';
import { AFFECTION_TOKEN_URL } from './cardMeta';

type Props = {
  players: LoveLetterPublicPlayer[];
  myId: string;
  tokensToWin: number;
};

export function LoveLetterPlayerStrip({ players, myId, tokensToWin }: Props) {
  return (
    <section className="card ll-strip" aria-label="ผู้เล่น">
      <div className="ll-strip__grid">
        {players.map((p) => {
          const isMe = p.id === myId;
          const out = !p.inRound;
          return (
            <article
              key={p.id}
              className={[
                'll-strip__player',
                isMe ? 'll-strip__player--me' : '',
                p.isCurrent ? 'll-strip__player--current' : '',
                out ? 'll-strip__player--out' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-label={`${p.name}${p.isCurrent ? ' — เทิร์นนี้' : ''}`}
            >
              <header className="ll-strip__header">
                <div className="ll-strip__name-row">
                  <span className="ll-strip__name">{p.name}</span>
                  {isMe ? <span className="ll-strip__you">(คุณ)</span> : null}
                  {p.handmaidProtected ? (
                    <Shield
                      size={14}
                      className="ll-strip__shield"
                      aria-label="ได้รับความคุ้มครอง"
                    />
                  ) : null}
                </div>
                <div
                  className="ll-strip__tokens"
                  aria-label={`โทเคน ${p.affectionTokens} จาก ${tokensToWin}`}
                >
                  {Array.from({ length: tokensToWin }, (_, i) => (
                    <img
                      key={i}
                      src={AFFECTION_TOKEN_URL}
                      alt=""
                      className={[
                        'll-strip__token',
                        i < p.affectionTokens ? 'll-strip__token--earned' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      aria-hidden
                    />
                  ))}
                  <span className="ll-strip__token-count">
                    {p.affectionTokens}/{tokensToWin}
                  </span>
                </div>
              </header>

              <div className="ll-strip__meta">
                <span>มือ: {out ? '—' : p.handCount}</span>
                {out ? <span className="ll-strip__out-label">ออกจากรอบ</span> : null}
              </div>

              {p.discardPile.length > 0 ? (
                <div className="ll-strip__discards" role="list" aria-label="การ์ดที่ทิ้ง">
                  {p.discardPile.map((card, idx) => (
                    <div
                      key={`${card.id}-${idx}`}
                      role="listitem"
                      className="ll-strip__discard-slot"
                    >
                      <LoveLetterCardFace card={card} size="tiny" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="ll-strip__no-discard">ยังไม่ทิ้งการ์ด</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
