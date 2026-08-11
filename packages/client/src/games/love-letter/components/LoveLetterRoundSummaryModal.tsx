import { Crown, Heart } from 'lucide-react';
import type { LoveLetterPlayerView, LoveLetterRoundSummary } from 'shared';
import { PlayerIdentity } from '../../../components/player-avatar';
import { Button } from '../../../components/ui';
import { cn } from '../../../utils/cn';
import { roleLabel } from '../lib/cardMeta';
import { LoveLetterCardFace } from './LoveLetterCardFace';

type Props = {
  summary: LoveLetterRoundSummary;
  players: LoveLetterPlayerView['players'];
  tokensToWin: number;
  myId: string;
  onContinue: () => void;
};

function reasonTitle(reason: LoveLetterRoundSummary['reason']): string {
  switch (reason) {
    case 'last_standing':
      return 'เหลือผู้เล่นคนสุดท้าย';
    case 'deck_empty':
      return 'กองจั่วหมด — เปรียบเลขในมือ';
    default:
      return 'เปรียบเลขในมือ';
  }
}

export function LoveLetterRoundSummaryModal({
  summary,
  players,
  tokensToWin,
  myId,
  onContinue,
}: Props) {
  const winnerSet = new Set(summary.winnerIds);
  const tie = summary.winnerIds.length > 1;

  const rows = summary.revealedHands
    .map((row) => {
      const seat = players.find((p) => p.id === row.playerId);
      const isWinner = winnerSet.has(row.playerId);
      const out = seat ? !seat.inRound : row.card == null;
      const lastDiscard =
        !row.card && seat && seat.discardPile.length > 0
          ? seat.discardPile[seat.discardPile.length - 1]!
          : null;
      return {
        ...row,
        isWinner,
        out,
        tokens: seat?.affectionTokens ?? 0,
        lastDiscard,
        isMe: row.playerId === myId,
      };
    })
    .sort((a, b) => {
      if (a.isWinner !== b.isWinner) return a.isWinner ? -1 : 1;
      if (a.out !== b.out) return a.out ? 1 : -1;
      return (b.card?.rank ?? 0) - (a.card?.rank ?? 0);
    });

  const winnerLine = tie
    ? `${summary.winnerNames.join(' · ')} เสมอ`
    : `${summary.winnerNames[0] ?? '—'} ชนะรอบนี้`;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ll-round-title"
    >
      <div className="modal ll-round-modal">
        <header className="ll-round-modal__hero">
          <div className="ll-round-modal__badge" aria-hidden>
            <Crown size={18} strokeWidth={1.75} />
          </div>
          <p className="ll-round-modal__kicker">สรุปรอบ {summary.roundNo}</p>
          <h2 id="ll-round-title" className="ll-round-modal__title">
            {winnerLine}
          </h2>
          <p className="ll-round-modal__reason">{reasonTitle(summary.reason)}</p>
        </header>

        <ul className="ll-round-modal__list" aria-label="ผลรอบนี้">
          {rows.map((row) => {
            const showCard = row.card ?? row.lastDiscard;
            const status = row.isWinner
              ? tie
                ? 'ได้โทเคน'
                : 'ชนะรอบ'
              : row.out
                ? 'ออกจากรอบ'
                : 'เหลือในรอบ';
            const cardNote = row.card ? 'ในมือ' : row.lastDiscard ? 'ทิ้งสุดท้าย' : null;

            return (
              <li
                key={row.playerId}
                className={cn(
                  'll-round-modal__row',
                  row.isWinner && 'll-round-modal__row--winner',
                  row.out && !row.isWinner && 'll-round-modal__row--out',
                )}
              >
                <div className="ll-round-modal__main">
                  <PlayerIdentity
                    playerId={row.playerId}
                    name={row.playerName}
                    avatarSize={36}
                    secondary={
                      <span
                        className={cn(
                          'll-round-modal__status',
                          row.isWinner && 'll-round-modal__status--win',
                        )}
                      >
                        {status}
                        {row.isMe ? ' · คุณ' : ''}
                      </span>
                    }
                  />
                </div>

                <span
                  className="ll-token-chip ll-round-modal__tokens"
                  title="โทเคนความรัก"
                  aria-label={`โทเคน ${row.tokens} จาก ${tokensToWin}`}
                >
                  <Heart
                    size={11}
                    strokeWidth={2.25}
                    className={cn(
                      'text-[var(--ll-accent,#c41e3a)] shrink-0',
                      row.tokens > 0 && 'fill-current',
                    )}
                    aria-hidden
                  />
                  <span className="tabular-nums">
                    {row.tokens}/{tokensToWin}
                  </span>
                </span>

                <div className="ll-round-modal__card-block">
                  {showCard ? (
                    <>
                      <LoveLetterCardFace card={showCard} size="tiny" />
                      <span className="ll-round-modal__card-cap" title={roleLabel(showCard.role)}>
                        {showCard.rank}
                        {cardNote ? ` · ${cardNote}` : ''}
                      </span>
                    </>
                  ) : (
                    <span className="ll-round-modal__empty-card">—</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <div className="ll-round-modal__footer">
          <Button type="button" onClick={onContinue} className="w-full">
            เริ่มรอบถัดไป
          </Button>
        </div>
      </div>
    </div>
  );
}
