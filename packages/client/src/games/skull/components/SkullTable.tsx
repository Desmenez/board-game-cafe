import { Skull } from 'lucide-react';
import { type SkullPublicSeat, type SkullPublicStackDisc } from 'shared';
import { PlayerAvatar } from '../../../components/player-avatar';
import { cn } from '../../../utils/cn';
import { skullCoasterUrl, skullMatUrl } from '../art';

type Props = {
  seats: SkullPublicSeat[];
  myId: string;
  activePlayerId: string | null;
  challengerId: string | null;
  legalFlipOwnerIds: string[];
  onFlipOwner?: (ownerId: string) => void;
};

function discSrc(disc: SkullPublicStackDisc) {
  return skullCoasterUrl(disc.color, {
    faceUp: disc.faceUp,
    face: disc.face,
    isLastChance: disc.isLastChance,
  });
}

function discLabel(disc: SkullPublicStackDisc) {
  if (!disc.faceUp) return '';
  if (disc.face === 'skull') return 'skull';
  if (disc.face === 'flower') return 'ดอกไม้';
  return '';
}

/** Face-down stay stacked; face-up fan out so each reveal is readable. */
function MatStack({ stack }: { stack: SkullPublicStackDisc[] }) {
  const faceDown = stack.filter((d) => !d.faceUp);
  const faceUp = stack.filter((d) => d.faceUp);
  const empty = stack.length === 0;

  return (
    <div
      className="pointer-events-none absolute inset-0"
      aria-hidden={empty}
    >
      {/* Remaining face-down pile (center of mat) */}
      <div className="absolute left-1/2 top-[46%] h-[44%] w-[44%] -translate-x-1/2 -translate-y-1/2">
        {faceDown.map((disc, i) => {
          const offset = i * 7;
          return (
            <img
              key={disc.id}
              src={discSrc(disc)}
              alt=""
              className="absolute inset-0 m-auto h-full w-full rounded-full object-contain drop-shadow-[0_2px_4px_rgb(0_0_0_/_0.35)] transition-transform duration-300 ease-out"
              style={{
                transform: `translate(${offset}px, ${-offset * 0.35}px)`,
                zIndex: i + 1,
              }}
              loading="lazy"
            />
          );
        })}
      </div>

      {/* Revealed discs — fan so flower/skull art stays visible */}
      {faceUp.map((disc, i) => {
        const n = faceUp.length;
        const mid = (n - 1) / 2;
        const t = i - mid;
        const dx = t * 34;
        const dy = 6 + Math.abs(t) * 2;
        const rot = t * 10;
        const isLatest = i === n - 1;
        return (
          <img
            key={disc.id}
            src={discSrc(disc)}
            alt={discLabel(disc)}
            title={discLabel(disc)}
            className={cn(
              'absolute left-1/2 top-[56%] h-[40%] w-[40%] rounded-full object-contain',
              'drop-shadow-[0_4px_10px_rgb(0_0_0_/_0.45)] transition-transform duration-300 ease-out',
              isLatest && 'ring-2 ring-[#ffe6a3]/80',
            )}
            style={{
              transform: `translate(calc(-50% + ${dx}px), ${dy}px) rotate(${rot}deg)${
                isLatest ? ' scale(1.06)' : ''
              }`,
              zIndex: 20 + i,
            }}
            loading="lazy"
          />
        );
      })}
    </div>
  );
}

function SeatMat({
  seat,
  isMe,
  isActive,
  isChallenger,
  canFlip,
  onFlip,
}: {
  seat: SkullPublicSeat;
  isMe: boolean;
  isActive: boolean;
  isChallenger: boolean;
  canFlip: boolean;
  onFlip?: () => void;
}) {
  const displayName = isMe ? `${seat.name} (คุณ)` : seat.name;

  const seatClass = cn(
    'flex w-full max-w-[196px] flex-col items-center gap-1.5 rounded-[14px]',
    'px-[0.28rem] pt-[0.3rem] pb-1.5',
    'bg-[color-mix(in_srgb,var(--bg-elevated,#161b26)_88%,transparent)]',
    'border border-[color-mix(in_srgb,white_8%,transparent)]',
    'transition-[box-shadow,border-color,transform,opacity] duration-150 ease-out',
    isMe && 'border-[color-mix(in_srgb,var(--accent,#c8e06a)_55%,transparent)]',
    isActive &&
      'shadow-[0_0_0_2px_color-mix(in_srgb,var(--accent,#c8e06a)_65%,transparent),0_10px_28px_rgb(0_0_0_/_0.28)]',
    isChallenger && 'border-[color-mix(in_srgb,#e85d4c_50%,transparent)]',
    seat.matAside && 'scale-95 opacity-70',
    seat.eliminated && 'opacity-[0.45]',
    canFlip && 'border-[color-mix(in_srgb,#f0c14a_70%,transparent)]',
  );

  const nameClass =
    'max-w-full truncate text-center text-[0.82rem] font-semibold leading-tight';

  const avatarClass =
    'absolute -top-1.5 -left-1.5 z-[4] rounded-full shadow-[0_0_0_2px_var(--bg-elevated,#161b26)]';

  const matImgClass =
    'h-full w-full rounded-lg object-contain drop-shadow-[0_6px_14px_rgb(0_0_0_/_0.4)]';

  if (seat.eliminated) {
    return (
      <div className={seatClass}>
        <div className="relative w-full">
          <PlayerAvatar
            playerId={seat.id}
            name={seat.name}
            size={32}
            decorative
            className={avatarClass}
          />
          <div className="pointer-events-none relative aspect-square w-full p-0" aria-hidden>
            <img
              src={skullMatUrl(seat.color, seat.wins)}
              alt=""
              className={matImgClass}
              loading="lazy"
            />
          </div>
        </div>
        <span className={nameClass}>{displayName}</span>
      </div>
    );
  }

  const matSrc = skullMatUrl(seat.color, seat.wins);

  return (
    <div className={seatClass}>
      <div className="relative w-full">
        <PlayerAvatar
          playerId={seat.id}
          name={seat.name}
          size={32}
          decorative
          className={avatarClass}
        />

        <button
          type="button"
          className={cn(
            'relative aspect-square w-full border-0 bg-transparent p-0',
            canFlip && 'cursor-pointer hover:-translate-y-0.5 transition-transform duration-150',
          )}
          disabled={!canFlip}
          onClick={onFlip}
          aria-label={
            canFlip ? `พลิกดิสก์บนของ ${seat.name}` : `เสื่อของ ${seat.name}`
          }
        >
          <img src={matSrc} alt="" className={matImgClass} loading="lazy" />
          <MatStack stack={seat.stack} />
          {canFlip ? (
            <span className="pointer-events-none absolute bottom-[6%] left-1/2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-black/70 px-1.5 py-0.5 text-[0.62rem] font-semibold text-[#ffe6a3]">
              <Skull size={14} aria-hidden />
              แตะเพื่อพลิก
            </span>
          ) : null}
        </button>
      </div>

      <span className={nameClass} title={displayName}>
        {displayName}
      </span>
      {seat.matAside && !seat.eliminated ? (
        <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--text-muted,#a8b0c0)]">
          ผ่านแล้ว
        </span>
      ) : null}
    </div>
  );
}

export function SkullTable({
  seats,
  myId,
  activePlayerId,
  challengerId,
  legalFlipOwnerIds,
  onFlipOwner,
}: Props) {
  return (
    <div className="relative grid w-full max-w-240 grid-cols-2 sm:grid-cols-3 justify-items-center gap-3 py-1 pb-2 mx-auto">
      {seats.map((s) => (
        <SeatMat
          key={s.id}
          seat={s}
          isMe={s.id === myId}
          isActive={s.id === activePlayerId}
          isChallenger={s.id === challengerId}
          canFlip={legalFlipOwnerIds.includes(s.id)}
          onFlip={
            legalFlipOwnerIds.includes(s.id) ? () => onFlipOwner?.(s.id) : undefined
          }
        />
      ))}
    </div>
  );
}
