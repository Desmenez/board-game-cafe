import { useState } from 'react';
import type { SkullDisc, SkullPlayerView, SkullRoundOutcome } from 'shared';
import { PlayerIdentity } from '../../../components/player-avatar';
import { Button, Dialog, DialogDescription, DialogFooter, DialogTitle } from '../../../components/ui';
import { cn } from '../../../utils/cn';
import { skullDiscLabelTh, skullHandDiscUrl } from '../art';

type Props = {
  view: SkullPlayerView;
  myId: string;
  onConfirmRandom: () => void;
  onChooseDiscard: (discId: string) => void;
  onAckReveal: () => void;
};

function seatName(view: SkullPlayerView, id: string) {
  return view.seats.find((s) => s.id === id)?.name ?? id;
}

function withYou(name: string, id: string, myId: string) {
  return id === myId ? `${name} (คุณ)` : name;
}

function failureMeta(
  view: SkullPlayerView,
  outcome: Extract<SkullRoundOutcome, { kind: 'failure' }>,
  myId: string,
) {
  const challengerId = outcome.challengerId;
  const ownerId = outcome.skullOwnerId;
  const challengerName = withYou(seatName(view, challengerId), challengerId, myId);
  const ownerName = withYou(seatName(view, ownerId), ownerId, myId);
  const ownSkull = challengerId === ownerId;

  if (ownSkull) {
    return {
      title: 'เจอ Skull!',
      lead: `${challengerName} พลิกเจอ skull ของตัวเอง`,
      mode: 'choose' as const,
      actorId: challengerId,
      waitHint: `รอ ${challengerName} เลือกดิสก์ที่จะทิ้ง…`,
      challengerId,
      ownerId,
      challengerName,
      ownerName,
      ownSkull: true,
    };
  }

  return {
    title: 'เจอ Skull!',
    lead: `${challengerName} พลิกเจอ skull ของ ${ownerName}`,
    mode: 'random' as const,
    actorId: ownerId,
    waitHint: `รอ ${ownerName} สุ่มทิ้งดิสก์ของคุณ…`,
    challengerId,
    ownerId,
    challengerName,
    ownerName,
    ownSkull: false,
  };
}

function DiscGrid({
  discs,
  discardedId,
  selectable,
  selectedId,
  onSelect,
}: {
  discs: SkullDisc[];
  discardedId?: string | null;
  selectable?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  return (
    <div
      className={cn(
        'mb-4 flex flex-wrap justify-center gap-3',
        discardedId && 'pt-1',
      )}
      role={selectable ? 'listbox' : 'list'}
      aria-label={selectable ? 'เลือกดิสก์ที่จะทิ้ง' : 'ดิสก์ของ Challenger'}
    >
      {discs.map((disc) => {
        const selected = selectable && selectedId === disc.id;
        const discarded = discardedId === disc.id;
        const Comp = selectable ? 'button' : 'div';
        return (
          <Comp
            key={disc.id}
            {...(selectable
              ? {
                  type: 'button' as const,
                  role: 'option' as const,
                  'aria-selected': selected,
                  onClick: () => onSelect?.(disc.id),
                }
              : { role: 'listitem' as const })}
            className={cn(
              'relative flex size-[4.5rem] shrink-0 items-center justify-center rounded-full',
              'border-0 bg-transparent p-0 transition-[transform,opacity,box-shadow] duration-150',
              selectable &&
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pear',
              selectable &&
                (selected
                  ? 'z-[1] scale-110 shadow-[0_0_0_3px_var(--color-pear),0_8px_20px_rgb(0_0_0_/_0.45)]'
                  : 'opacity-55 hover:opacity-90 hover:scale-105'),
              !selectable && !discarded && 'opacity-70',
              discarded &&
                'z-[1] scale-110 shadow-[0_0_0_3px_#e85d4c,0_8px_20px_rgb(232_93_76_/_0.35)]',
            )}
          >
            <img
              src={skullHandDiscUrl(disc)}
              alt={skullDiscLabelTh(disc)}
              className={cn(
                'size-full rounded-full object-cover',
                discarded && 'opacity-40 grayscale',
              )}
              draggable={false}
            />
            {selected ? (
              <span className="pointer-events-none absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[0.65rem] font-bold text-pear">
                เลือกแล้ว
              </span>
            ) : null}
            {discarded ? (
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-[0.7rem] font-bold text-[#ffb4a8]">
                ทิ้ง
              </span>
            ) : null}
            {discarded ? (
              <span className="pointer-events-none absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[0.65rem] font-bold text-[#e85d4c]">
                ถูกสุ่มทิ้ง
              </span>
            ) : null}
          </Comp>
        );
      })}
    </div>
  );
}

export function SkullDiscardModal({
  view,
  myId,
  onConfirmRandom,
  onChooseDiscard,
  onAckReveal,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const outcome = view.roundOutcome;
  const reveal = view.discardReveal;
  const isReveal = view.phase === 'discard_reveal' && reveal != null;
  const isChoose = view.phase === 'choose_discard' && outcome?.kind === 'failure';

  if (!isReveal && !isChoose) return null;

  const meta =
    outcome?.kind === 'failure'
      ? failureMeta(view, outcome, myId)
      : reveal
        ? failureMeta(view, {
            kind: 'failure',
            challengerId: reveal.challengerId,
            skullOwnerId: reveal.skullOwnerId,
            eliminated: false,
          }, myId)
        : null;
  if (!meta) return null;

  const isActor = myId === meta.actorId;
  const canRandom = isChoose && isActor && view.you.mustConfirmRandomDiscard;
  const choosePool =
    isChoose && meta.mode === 'choose' && isActor ? view.you.discardPool : null;
  const atRiskPool =
    isChoose && meta.mode === 'random' && myId === meta.challengerId
      ? view.you.discardPool
      : null;
  const showRevealFaces = isReveal && !reveal!.facesHidden && reveal!.pool && reveal!.discarded;
  const revealPool = showRevealFaces ? reveal!.pool : null;
  const discardedId = showRevealFaces ? reveal!.discarded!.id : null;

  const titleId = 'skull-discard-title';
  const descId = 'skull-discard-desc';
  const title = isReveal ? 'สุ่มทิ้งแล้ว' : meta.title;

  return (
    <Dialog
      open
      onOpenChange={() => undefined}
      dismissible={false}
      aria-labelledby={titleId}
      aria-describedby={descId}
      overlayClassName="room-night-dialog-overlay"
      className="room-night-dialog w-[min(100%,28rem)]! max-w-md! p-5! text-ink"
    >
      <div className="mb-3 flex flex-col gap-1">
        <p className="m-0 text-[0.7rem] font-bold uppercase tracking-[0.08em] text-[#e85d4c]">
          Skull
        </p>
        <DialogTitle id={titleId} className="m-0! text-xl font-bold text-ink">
          {title}
        </DialogTitle>
        <DialogDescription id={descId} className="sr-only">
          {meta.lead}
        </DialogDescription>
      </div>

      <div
        className="mb-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-3 rounded-xl border border-rule bg-paper-3 px-3 py-3"
        aria-label="ใครทำอะไรใส่ใคร"
      >
        <div className="flex min-w-0 max-w-[12rem] flex-col gap-1.5">
          <span className="text-[0.68rem] font-bold uppercase tracking-wider text-ink-2">
            Challenger
          </span>
          <PlayerIdentity
            playerId={meta.challengerId}
            name={meta.challengerName}
            avatarSize={44}
            secondary={meta.ownSkull ? 'พลิก skull ของตัวเอง' : 'พลิกเจอ skull'}
          />
        </div>

        {!meta.ownSkull ? (
          <>
            <span
              className="shrink-0 self-center pt-5 text-xl font-bold leading-none text-pear"
              aria-hidden
            >
              →
            </span>
            <div className="flex min-w-0 max-w-[12rem] flex-col gap-1.5">
              <span className="text-[0.68rem] font-bold uppercase tracking-wider text-ink-2">
                เจ้าของ Skull
              </span>
              <PlayerIdentity
                playerId={meta.ownerId}
                name={meta.ownerName}
                avatarSize={44}
                secondary={isReveal ? 'สุ่มทิ้งแล้ว' : 'ถูกพลิกเจอ · สุ่มทิ้ง'}
              />
            </div>
          </>
        ) : null}
      </div>

      <p className="m-0! mb-4 text-sm text-ink-2">{meta.lead}</p>

      {isReveal ? (
        <div className="mb-4 rounded-xl border border-rule bg-black/20 px-3 py-3">
          {showRevealFaces && reveal!.discarded ? (
            <>
              <p className="m-0! text-sm font-semibold text-ink">
                ทิ้ง{skullDiscLabelTh(reveal!.discarded)}
              </p>
              <p className="mt-1 mb-0! text-xs leading-snug text-ink-2">
                ใบนี้ถูกสุ่มทิ้งจากมือ/กองของคุณ — คนอื่นมองไม่เห็นหน้า
              </p>
            </>
          ) : (
            <>
              <p className="m-0! text-sm font-semibold text-ink">สุ่มทิ้งดิสก์แล้ว</p>
              <p className="mt-1 mb-0! text-xs leading-snug text-ink-2">
                {meta.challengerName} เสียดิสก์ 1 ใบแบบลับ (ไม่เปิดเผยหน้า)
              </p>
            </>
          )}
        </div>
      ) : meta.mode === 'random' ? (
        <div className="mb-4 rounded-xl border border-rule bg-black/20 px-3 py-3">
          <p className="m-0! text-sm font-semibold text-ink">สุ่มทิ้งดิสก์ของ Challenger</p>
          <p className="mt-1 mb-0! text-xs leading-snug text-ink-2">
            {canRandom
              ? 'คุณเป็นเจ้าของ skull — สุ่มทิ้ง 1 ใบของ Challenger โดยไม่เปิดดู'
              : myId === meta.challengerId
                ? 'ดิสก์ของคุณด้านล่าง — รอเจ้าของ skull สุ่มทิ้ง 1 ใบโดยไม่เปิดดู'
                : `${meta.ownerName} จะสุ่มทิ้ง 1 ใบของ ${meta.challengerName} โดยไม่เปิดดู`}
          </p>
        </div>
      ) : (
        <div className="mb-4 rounded-xl border border-rule bg-black/20 px-3 py-3">
          <p className="m-0! text-sm font-semibold text-ink">เลือกดิสก์ที่จะทิ้ง</p>
          <p className="mt-1 mb-0! text-xs leading-snug text-ink-2">
            {choosePool
              ? 'เลือก 1 ใบจากมือ/กองของคุณ (คนอื่นมองไม่เห็นหน้า)'
              : `รอ ${meta.challengerName} เลือกดิสก์แบบลับ…`}
          </p>
        </div>
      )}

      {atRiskPool ? <DiscGrid discs={atRiskPool} /> : null}

      {choosePool ? (
        <DiscGrid
          discs={choosePool}
          selectable
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      ) : null}

      {revealPool ? (
        <DiscGrid discs={revealPool} discardedId={discardedId} />
      ) : null}

      <DialogFooter
        className={cn(
          'mt-0! flex flex-col gap-2',
          ((choosePool && selectedId) || discardedId) && 'pt-4',
        )}
        style={{ marginTop: 0 }}
      >
        {canRandom ? (
          <Button type="button" className="w-full" onClick={onConfirmRandom}>
            สุ่มทิ้ง
          </Button>
        ) : null}
        {choosePool ? (
          <Button
            type="button"
            className="w-full"
            disabled={!selectedId || !choosePool.some((d) => d.id === selectedId)}
            onClick={() => {
              if (!selectedId) return;
              onChooseDiscard(selectedId);
              setSelectedId(null);
            }}
          >
            {(() => {
              const picked = selectedId ? choosePool.find((d) => d.id === selectedId) : null;
              return picked ? `ทิ้ง${skullDiscLabelTh(picked)}` : 'เลือกดิสก์ก่อนทิ้ง';
            })()}
          </Button>
        ) : null}
        {isReveal ? (
          <Button type="button" className="w-full" disabled={!view.you.canAct} onClick={onAckReveal}>
            {view.result ? 'ดูผลเกม' : 'รับทราบ'}
          </Button>
        ) : null}
        {!canRandom && !choosePool && !isReveal ? (
          <p className="m-0! rounded-xl border border-dashed border-rule bg-paper-3 px-3 py-2.5 text-center text-sm text-ink-2">
            {meta.waitHint}
          </p>
        ) : null}
      </DialogFooter>
    </Dialog>
  );
}
