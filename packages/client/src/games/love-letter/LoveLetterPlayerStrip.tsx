import type { LoveLetterPublicPlayer } from 'shared';
import { Shield } from 'lucide-react';
import { PlayerRosterStrip } from '../../components/player-roster';
import { LoveLetterCardFace } from './LoveLetterCardFace';
import { AFFECTION_TOKEN_URL } from './cardMeta';

type Props = {
  players: LoveLetterPublicPlayer[];
  myId: string;
  tokensToWin: number;
};

export function LoveLetterPlayerStrip({ players, myId, tokensToWin }: Props) {
  return (
    <PlayerRosterStrip
      className="card ll-strip"
      layout="grid"
      myId={myId}
      seats={players.map((p) => {
        const out = !p.inRound;
        return {
          id: p.id,
          name: p.name,
          active: p.isCurrent,
          muted: out,
          badges: p.handmaidProtected ? (
            <Shield size={14} className="ll-strip__shield" aria-label="ได้รับความคุ้มครอง" />
          ) : null,
          trailing: (
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
          ),
          status: (
            <div className="ll-strip__meta">
              <span>มือ: {out ? '—' : p.handCount}</span>
              {out ? <span className="ll-strip__out-label">ออกจากรอบ</span> : null}
            </div>
          ),
          extra:
            p.discardPile.length > 0 ? (
              <div className="ll-strip__discards" role="list" aria-label="การ์ดที่ทิ้ง">
                {p.discardPile.map((card, idx) => (
                  <div key={`${card.id}-${idx}`} role="listitem" className="ll-strip__discard-slot">
                    <LoveLetterCardFace card={card} size="tiny" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="ll-strip__no-discard">ยังไม่ทิ้งการ์ด</p>
            ),
        };
      })}
    />
  );
}
