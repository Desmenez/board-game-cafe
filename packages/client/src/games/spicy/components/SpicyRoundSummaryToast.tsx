import {
  spicyRoundSummaryHintTh,
  spicyRoundSummaryTitleTh,
  type SpicyPublicSeat,
  type SpicyRoundSummary,
} from 'shared';
import { PlayerAvatar } from '../../../components/player-avatar';
import { spicyCardBackUrl, spicyCardFaceUrl, spicyCardLabelTh, spicyTrophyUrl } from '../art';

type Props = {
  summary: SpicyRoundSummary;
  seats: SpicyPublicSeat[];
  myId: string;
  visible: boolean;
};

export function SpicyRoundSummaryToast({ summary, seats, myId, visible }: Props) {
  const scored = [...summary.rows]
    .map((row) => ({
      ...row,
      name: seats.find((s) => s.id === row.playerId)?.name ?? row.name,
    }))
    .filter((row) => row.points > 0)
    .sort((a, b) => b.points - a.points);
  const lead = scored[0];
  const hasTrophy = summary.rows.some((r) => r.trophies > 0);
  const revealed = summary.revealed;
  const cardSrc = revealed
    ? spicyCardFaceUrl(revealed)
    : hasTrophy
      ? spicyTrophyUrl()
      : spicyCardBackUrl();
  const cardAlt = revealed
    ? spicyCardLabelTh(revealed)
    : hasTrophy
      ? 'ถ้วยรางวัล'
      : 'กองเผ็ด';
  const detail = scored
    .map((row) => {
      const bits: string[] = [];
      if (row.wonCards > 0) bits.push(`กอง ${row.wonCards}`);
      if (row.trophies > 0) bits.push('ถ้วย +10');
      const who = row.playerId === myId ? 'คุณ' : row.name;
      return `${who} +${row.points}${bits.length ? ` (${bits.join(' · ')})` : ''}`;
    })
    .join(' · ');

  return (
    <div
      className={`spicy-round-toast${visible ? ' is-visible' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={`${spicyRoundSummaryTitleTh(summary.reason)} ${revealed ? cardAlt : ''} ${detail}`}
    >
      {lead ? (
        <PlayerAvatar
          playerId={lead.playerId}
          name={lead.name}
          size={36}
          decorative
          className="spicy-round-toast__avatar"
        />
      ) : null}
      <img className="spicy-round-toast__card" src={cardSrc} alt="" />
      <div className="spicy-round-toast__copy">
        <strong>{spicyRoundSummaryTitleTh(summary.reason)}</strong>
        <span>{spicyRoundSummaryHintTh(summary.reason)}</span>
        {revealed ? <span className="spicy-round-toast__detail">เปิดได้ {cardAlt}</span> : null}
        {detail ? <span className="spicy-round-toast__detail">{detail}</span> : null}
      </div>
    </div>
  );
}

type PassToastProps = {
  playerId: string;
  playerName: string;
  myId: string;
  visible: boolean;
};

export function SpicyPassToast({ playerId, playerName, myId, visible }: PassToastProps) {
  const who = playerId === myId ? 'คุณ' : playerName;
  return (
    <div
      className={`spicy-round-toast${visible ? ' is-visible' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={`${who} ข้าม จั่ว 1 ใบ`}
    >
      <PlayerAvatar
        playerId={playerId}
        name={playerName}
        size={36}
        decorative
        className="spicy-round-toast__avatar"
      />
      <img className="spicy-round-toast__card" src={spicyCardBackUrl()} alt="" />
      <div className="spicy-round-toast__copy">
        <strong>{who} ข้าม</strong>
        <span>จั่ว 1 ใบ</span>
      </div>
    </div>
  );
}
