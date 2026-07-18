import type { Flip7Action, Flip7Card, Flip7PendingActionView, Flip7PublicPlayer } from 'shared';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { PlayerAvatar } from '../../../components/player-avatar';
import { Button, GameCardImage } from '../../../components/ui';
import {
  cardImage,
  cardLabel,
  flip7TargetChoiceMeta,
  specialCardDescription,
  type Flip7SpecialUi,
} from '../lib/flip7Ui';

type PendingTargetAction = Extract<
  Flip7PendingActionView,
  { mode: 'action_target' | 'second_chance_gift' }
>;

type Props = {
  overlay: Flip7SpecialUi;
  pendingAction: PendingTargetAction;
  players: Flip7PublicPlayer[];
  tableLines: Record<string, Flip7Card[]>;
  myId: string;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  displayLineFor: (pid: string, fullLine: Flip7Card[]) => Flip7Card[];
  sendAction: (action: Flip7Action) => void;
};

export function Flip7SpecialDock({
  overlay,
  pendingAction: pa,
  players,
  tableLines,
  myId,
  collapsed,
  onCollapsedChange,
  displayLineFor,
  sendAction,
}: Props) {
  const reduceMotion = useReducedMotion();
  const dockTitle = overlay.titleOverride
    ? overlay.titleOverride
    : pa.mode === 'second_chance_gift'
      ? 'Second Chance ซ้ำ'
      : specialCardDescription(overlay.card).title;
  const waitingOnOther = pa.sourcePlayerId !== myId;
  const dockMotion = {
    duration: reduceMotion ? 0 : 0.32,
    ease: [0.22, 1, 0.36, 1] as const,
  };

  const renderTargetButton = (o: { id: string; name: string }, canPick: boolean) => {
    const line = displayLineFor(o.id, tableLines[o.id] ?? []);
    const meta = flip7TargetChoiceMeta(o.id, players, line);
    return (
      <Button
        key={o.id}
        type="button"
        variant="secondary"
        block
        disabled={!canPick}
        className="f7-special-modal__target-btn"
        onClick={() =>
          sendAction({
            type: 'resolve_pending_action',
            targetPlayerId: o.id,
          } satisfies Flip7Action)
        }
      >
        <span className="f7-special-modal__target-stack">
          <span className="f7-special-modal__target-row">
            <PlayerAvatar
              playerId={o.id}
              name={o.name}
              size={28}
              decorative
              className="f7-player-avatar"
            />
            <span className="f7-special-modal__target-name">
              {o.name}
              {o.id === myId ? ' (คุณ)' : ''}
            </span>
          </span>
          {meta ? <span className="f7-special-modal__target-meta">{meta}</span> : null}
        </span>
      </Button>
    );
  };

  return (
    <aside
      className={['f7-special-dock', collapsed ? 'f7-special-dock--collapsed' : '']
        .filter(Boolean)
        .join(' ')}
      role="dialog"
      aria-modal="true"
      aria-labelledby="f7-special-dock-title"
    >
      <button
        type="button"
        className="f7-special-dock__toggle"
        aria-expanded={!collapsed}
        aria-controls="f7-special-dock-panel"
        onClick={() => onCollapsedChange(!collapsed)}
      >
        <span className="f7-special-dock__toggle-grip" aria-hidden />
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={collapsed ? 'collapsed' : 'expanded'}
            className="f7-special-dock__toggle-label"
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: reduceMotion ? 0 : 0.18, ease: dockMotion.ease }}
          >
            {collapsed ? (
              <>
                <strong id="f7-special-dock-title">{dockTitle}</strong>
                <span className="f7-special-dock__toggle-meta">
                  {waitingOnOther
                    ? `รอ ${overlay.playerName} เลือกเป้าหมาย · แตะเพื่อขยาย`
                    : 'เลือกเป้าหมาย · แตะเพื่อขยาย'}
                </span>
              </>
            ) : (
              <span>ย่อเพื่อดูกระดาน</span>
            )}
          </motion.span>
        </AnimatePresence>
        <motion.span
          className="f7-special-dock__toggle-chevron"
          aria-hidden
          initial={false}
          animate={{ rotate: collapsed ? 180 : 0 }}
          transition={dockMotion}
        >
          <ChevronDown size={20} strokeWidth={2.25} />
        </motion.span>
      </button>

      <motion.div
        id="f7-special-dock-panel"
        initial={false}
        animate={{
          height: collapsed ? 0 : 'auto',
          opacity: collapsed ? 0 : 1,
        }}
        transition={dockMotion}
        style={{
          overflow: 'hidden',
          pointerEvents: collapsed ? 'none' : 'auto',
        }}
        aria-hidden={collapsed}
      >
        <div className="f7-special-dock__inner flex flex-col md:flex-row">
          <div className="f7-special-dock__head">
            <div className="f7-special-dock__card">
              <GameCardImage
                src={cardImage(overlay.card)}
                alt={cardLabel(overlay.card)}
                width={88}
                aspectRatio={469 / 768}
                showZoom={false}
              />
            </div>
            <div className="f7-special-dock__copy">
              <h2
                id={collapsed ? undefined : 'f7-special-dock-title'}
                className="f7-special-dock__title"
              >
                {dockTitle}
              </h2>
              <p className="f7-special-dock__who">
                <span className="f7-inline-who">
                  <PlayerAvatar
                    playerId={overlay.playerId}
                    name={overlay.playerName}
                    size={24}
                    decorative
                    className="f7-player-avatar"
                  />
                  <strong>{overlay.playerName}</strong>
                </span>{' '}
                จั่วได้การ์ดพิเศษ
              </p>
              <p className="f7-special-dock__body">
                {pa.mode === 'second_chance_gift'
                  ? 'เลือกผู้เล่นคนอื่นที่ยังไม่มี Second Chance (เลือกตัวเองไม่ได้)'
                  : specialCardDescription(overlay.card).body}
              </p>
            </div>
          </div>

          {pa.mode === 'action_target' &&
          pa.targetOptions.length === 1 &&
          pa.targetOptions[0]!.id === pa.sourcePlayerId ? (
            <p className="f7-hint f7-special-dock__sole-hint">
              เหลือคุณคนเดียวที่ยังเล่น — กดชื่อคุณเพื่อเลือกตัวเองเป็นเป้าหมาย
            </p>
          ) : null}

          <div className="f7-special-dock__targets">
            {pa.mode === 'second_chance_gift'
              ? pa.targetOptions.map((o) =>
                  renderTargetButton(o, pa.sourcePlayerId === myId && o.id !== myId),
                )
              : null}
            {pa.mode === 'action_target'
              ? (() => {
                  const solePickSelf =
                    pa.targetOptions.length === 1 && pa.targetOptions[0]!.id === pa.sourcePlayerId;
                  const rows = solePickSelf
                    ? players.map((p) => ({ id: p.id, name: p.name }))
                    : pa.targetOptions.map((o) => ({ id: o.id, name: o.name }));
                  return rows.map((o) => {
                    const inChoice = pa.targetOptions.some((t) => t.id === o.id);
                    return renderTargetButton(o, pa.sourcePlayerId === myId && inChoice);
                  });
                })()
              : null}
          </div>

          {waitingOnOther ? (
            <p className="f7-hint f7-special-dock__wait">รอผู้เล่นที่จั่วได้เลือกเป้าหมาย</p>
          ) : null}
        </div>
      </motion.div>
    </aside>
  );
}
