import type {
  SplendorCardActionNotice,
  SplendorGem,
  SplendorGemTakeNotice,
  SplendorNobleVisitNotice,
} from 'shared';
import { PlayerAvatar } from '../../../components/player-avatar';
import {
  splendorDeckBackUrl,
  splendorDevCardImageUrl,
  splendorNobleImageUrl,
  splendorChipImageUrl,
} from '../cardMeta';
import { GEM_SHORT } from '../splendorUtils';

type GemTakeToastProps = { notice: SplendorGemTakeNotice; visible: boolean };
type CardActionToastProps = { notice: SplendorCardActionNotice; visible: boolean };
type NobleVisitToastProps = { notice: SplendorNobleVisitNotice; visible: boolean };

function toastClass(visible: boolean): string {
  return `splendor-action-toast${visible ? ' is-visible' : ''}`;
}

function formatGemList(colors: SplendorGem[]): string {
  const counts = new Map<SplendorGem, number>();
  for (const color of colors) counts.set(color, (counts.get(color) ?? 0) + 1);
  return [...counts.entries()]
    .map(([color, count]) => (count > 1 ? `${GEM_SHORT[color]} ${count}` : GEM_SHORT[color]))
    .join(', ');
}

function cardDetail(card: NonNullable<SplendorCardActionNotice['card']>): string {
  const prestige = card.prestige > 0 ? ` · +${card.prestige}` : '';
  return `Lv.${card.level} · โบนัส${GEM_SHORT[card.bonus]}${prestige}`;
}

export function SplendorGemTakeToast({ notice, visible }: GemTakeToastProps) {
  const isTakeTwo = notice.colors.length === 2 && notice.colors[0] === notice.colors[1];
  const actionLabel = isTakeTwo ? 'หยิบอัญมณี 2 เม็ด' : 'หยิบอัญมณี';
  const detail = formatGemList(notice.colors);

  return (
    <div
      className={toastClass(visible)}
      role="status"
      aria-live="polite"
      aria-label={`${notice.playerName} ${actionLabel} ${detail}`}
    >
      <PlayerAvatar
        playerId={notice.playerId}
        name={notice.playerName}
        size={36}
        decorative
        className="splendor-action-toast__avatar"
      />
      <div className="splendor-action-toast__visuals" aria-hidden>
        {notice.colors.map((color, index) => (
          <img
            key={`${color}-${index}`}
            className="splendor-action-toast__chip"
            src={splendorChipImageUrl(color)}
            alt=""
          />
        ))}
      </div>
      <div className="splendor-action-toast__copy">
        <strong>{notice.playerName}</strong>
        <span>{actionLabel}</span>
        <span className="splendor-action-toast__detail">{detail}</span>
      </div>
    </div>
  );
}

export function SplendorCardActionToast({ notice, visible }: CardActionToastProps) {
  const actionLabel = notice.kind === 'buy' ? 'ซื้อการ์ด' : 'จองการ์ด';
  const imageSrc =
    notice.card !== null
      ? splendorDevCardImageUrl(notice.card.artKey)
      : notice.level !== undefined
        ? splendorDeckBackUrl(notice.level)
        : '';
  const detail =
    notice.card !== null
      ? cardDetail(notice.card)
      : notice.level !== undefined
        ? `จองจากกอง Lv.${notice.level}`
        : 'จองจากกอง';

  return (
    <div
      className={toastClass(visible)}
      role="status"
      aria-live="polite"
      aria-label={`${notice.playerName} ${actionLabel} ${detail}`}
    >
      <PlayerAvatar
        playerId={notice.playerId}
        name={notice.playerName}
        size={36}
        decorative
        className="splendor-action-toast__avatar"
      />
      <div className="splendor-action-toast__visuals" aria-hidden>
        {imageSrc ? <img className="splendor-action-toast__card" src={imageSrc} alt="" /> : null}
      </div>
      <div className="splendor-action-toast__copy">
        <strong>{notice.playerName}</strong>
        <span>{actionLabel}</span>
        <span className="splendor-action-toast__detail">{detail}</span>
      </div>
    </div>
  );
}

export function SplendorNobleVisitToast({ notice, visible }: NobleVisitToastProps) {
  const detail = `${notice.noble.name} · +${notice.noble.prestige}`;

  return (
    <div
      className={toastClass(visible)}
      role="status"
      aria-live="polite"
      aria-label={`${notice.playerName} ได้โนเบิล ${detail}`}
    >
      <PlayerAvatar
        playerId={notice.playerId}
        name={notice.playerName}
        size={36}
        decorative
        className="splendor-action-toast__avatar"
      />
      <div className="splendor-action-toast__visuals" aria-hidden>
        <img
          className="splendor-action-toast__noble"
          src={splendorNobleImageUrl(notice.noble.artKey)}
          alt=""
        />
      </div>
      <div className="splendor-action-toast__copy">
        <strong>{notice.playerName}</strong>
        <span>ได้โนเบิล</span>
        <span className="splendor-action-toast__detail">{detail}</span>
      </div>
    </div>
  );
}
