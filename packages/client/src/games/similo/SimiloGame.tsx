import {
  DndContext,
  DragOverlay,
  pointerWithin,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  SimiloAction,
  SimiloDeckId,
  SimiloHandCardView,
  SimiloPlayedClueView,
  SimiloPlayerEliminationReason,
  SimiloPlayerSeat,
  SimiloPlayerView,
  SimiloRoundResolutionView,
} from 'shared';
import { similoDeckLabel } from 'shared';
import { GameOverModal, GamePlayHeader, GameShell } from '../../components/game-shell';
import {
  PlayerHand,
  PLAYER_HAND_DOCK_RESERVE_PX,
  usePlayDragSensors,
} from '../../components/player-hand';
import { Badge, Button, Dialog, DialogFooter, DialogTitle } from '../../components/ui';
import { useYourTurnToast } from '../../hooks/useYourTurnToast';
import { SimiloClueDropZones } from './SimiloClueDropZones';
import { parseSimiloClueDropTarget } from './similoClueDrop';
import './similo.css';

type Props = {
  gameState: SimiloPlayerView;
  myId: string;
  sendAction: (action: unknown) => void;
  onLeave: () => void;
  onRestart?: () => void;
};

type GuesserChipProps = {
  name: string;
  meta: string;
  eliminated: boolean;
  active?: boolean;
  confirmed?: boolean;
  /** แท็บสลับมุมมอง (คนใบ้) — ถ้าไม่ใส่ แสดงเป็นรายการอ่านอย่างเดียว */
  selectable?: boolean;
  onSelect?: () => void;
};

function GuesserRosterChip({
  name,
  meta,
  eliminated,
  active,
  confirmed,
  selectable,
  onSelect,
}: GuesserChipProps) {
  const className = [
    'similo-discuss-viewer__chip',
    !selectable ? 'similo-discuss-viewer__chip--static' : '',
    eliminated ? 'similo-discuss-viewer__chip--eliminated' : '',
    active ? 'similo-discuss-viewer__chip--active' : '',
    confirmed && !eliminated ? 'similo-discuss-viewer__chip--confirmed' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const body = (
    <>
      {eliminated && (
        <span className="similo-discuss-viewer__elim-badge" aria-hidden>
          OUT
        </span>
      )}
      <span className="similo-discuss-viewer__name">{name}</span>
      <span className="similo-discuss-viewer__meta">{meta}</span>
    </>
  );

  if (selectable) {
    return (
      <button
        type="button"
        role="tab"
        aria-selected={active ?? false}
        className={className}
        disabled={eliminated}
        onClick={eliminated ? undefined : onSelect}
      >
        {body}
      </button>
    );
  }

  return (
    <div role="listitem" className={className} aria-disabled={eliminated}>
      {body}
    </div>
  );
}

function GuesserRosterReadonly({ seats }: { seats: SimiloPlayerSeat[] }) {
  return (
    <>
      <h3 className="similo-board-panel__guessers-title">คนทาย</h3>
      <div
        className="similo-discuss-viewer similo-discuss-viewer--readonly"
        role="list"
        aria-label="รายชื่อคนทาย"
      >
        {seats.map((p) => (
          <GuesserRosterChip
            key={p.id}
            name={p.name}
            meta={p.eliminated ? 'ถูกคัดออกจากเกม' : 'ยังอยู่ในเกม'}
            eliminated={p.eliminated}
          />
        ))}
      </div>
    </>
  );
}

function playerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || '?';
}

function RoundEliminationModal({
  round,
  resolution,
  open,
  onOpenChange,
}: {
  round: number;
  resolution: SimiloRoundResolutionView;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const eliminated = resolution.playersEliminated;

  const title = eliminated.length === 1 ? 'มีผู้ถูกคัดออก' : `มี ${eliminated.length} คนถูกคัดออก`;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      className="similo-round-elim-modal"
      aria-labelledby="similo-round-elim-title"
      aria-describedby="similo-round-elim-desc"
    >
      <div className="similo-round-elim">
        <header className="similo-round-elim__hero">
          <span className="similo-round-elim__round-pill">รอบ {round}</span>
          <DialogTitle id="similo-round-elim-title" className="similo-round-elim__title">
            {title}
          </DialogTitle>
          <p id="similo-round-elim-desc" className="similo-round-elim__subtitle">
            ผู้เล่นเหล่านี้จะไม่ได้ทายในรอบถัดไป
          </p>
        </header>

        <div className="similo-round-elim__body">
          <ul className="similo-round-elim__players" aria-label="ผู้ที่ถูกคัดออก">
            {eliminated.map((p) => (
              <li key={p.playerId} className="similo-round-elim__player">
                <div className="similo-round-elim__avatar" aria-hidden>
                  {playerInitials(p.playerName)}
                </div>
                <div className="similo-round-elim__player-text">
                  <span className="similo-round-elim__player-name">{p.playerName}</span>
                  <span
                    className={[
                      'similo-round-elim__reason',
                      p.reason === 'secret'
                        ? 'similo-round-elim__reason--secret'
                        : 'similo-round-elim__reason--timeout',
                    ].join(' ')}
                  >
                    {playerEliminationReasonLabel(p.reason)}
                  </span>
                </div>
                <span className="similo-round-elim__out" aria-hidden>
                  OUT
                </span>
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter className="similo-round-elim__footer">
          <Button block onClick={() => onOpenChange(false)}>
            เข้าใจแล้ว
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}

function playerEliminationReasonLabel(reason: SimiloPlayerEliminationReason): string {
  if (reason === 'secret') return 'เลือกตัวละครลับ';
  return 'หมดเวลาไม่ยืนยัน';
}

function PlayedClueRoundResolution({ resolution }: { resolution: SimiloRoundResolutionView }) {
  if (resolution.playersEliminated.length === 0) return null;

  return (
    <section className="similo-played-clue-modal__round-summary" aria-label="สรุปการคัดออกในรอบนี้">
      <h3 className="similo-played-clue-modal__round-summary-title">สรุปหลังรอบนี้</h3>
      <div className="similo-played-clue-modal__elim-block">
        <h4 className="similo-played-clue-modal__elim-heading">ผู้เล่นที่ถูกคัดออก</h4>
        <ul className="similo-played-clue-modal__player-elim-list">
          {resolution.playersEliminated.map((p) => (
            <li key={p.playerId} className="similo-played-clue-modal__player-elim-item">
              <strong>{p.playerName}</strong>
              <span className="similo-played-clue-modal__player-elim-reason">
                {playerEliminationReasonLabel(p.reason)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function PlayedClueRailItem({ clue }: { clue: SimiloPlayedClueView }) {
  const [modalOpen, setModalOpen] = useState(false);
  const similar = clue.orientation === 'similar';
  const orientationLabel = similar ? 'คล้าย ↑' : 'ต่าง →';

  return (
    <>
      <button
        type="button"
        className={[
          'similo-played-clue-card',
          similar ? 'similo-played-clue-card--similar' : 'similo-played-clue-card--different',
        ].join(' ')}
        onClick={() => setModalOpen(true)}
        aria-label={`${clue.label} — ${orientationLabel} — รอบ ${clue.round} — ขยายการ์ด`}
      >
        <div
          className={[
            'similo-played-clue-card__frame similo-played-clue-card__frame--portrait',
          ].join(' ')}
        >
          <img src={clue.imageUrl} alt="" className="similo-played-clue-card__img" loading="lazy" />
        </div>
        <div className="similo-played-clue-card__body">
          <span
            className={[
              'similo-played-clue-card__badge',
              similar
                ? 'similo-played-clue-card__badge--similar'
                : 'similo-played-clue-card__badge--different',
            ].join(' ')}
          >
            {orientationLabel}
          </span>
          <span className="similo-played-clue-card__round">รอบ {clue.round}</span>
          <strong className="similo-played-clue-card__name">{clue.label}</strong>
        </div>
      </button>

      <Dialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        className="similo-played-clue-modal"
        aria-labelledby={`similo-played-clue-title-${clue.round}-${clue.characterId}`}
      >
        <DialogTitle id={`similo-played-clue-title-${clue.round}-${clue.characterId}`}>
          {clue.label}
        </DialogTitle>
        <p className="similo-played-clue-modal__meta">
          รอบ {clue.round} ·{' '}
          <span
            className={[
              'similo-played-clue-card__badge',
              similar
                ? 'similo-played-clue-card__badge--similar'
                : 'similo-played-clue-card__badge--different',
            ].join(' ')}
          >
            {orientationLabel}
          </span>
        </p>
        <div
          className={[
            'similo-played-clue-modal__frame',
            'similo-played-clue-modal__frame--portrait',
            similar
              ? 'similo-played-clue-modal__frame--similar'
              : 'similo-played-clue-modal__frame--different',
          ].join(' ')}
        >
          <img
            src={clue.imageUrl}
            alt=""
            className="similo-played-clue-modal__img"
            loading="lazy"
          />
        </div>
        {clue.roundResolution && <PlayedClueRoundResolution resolution={clue.roundResolution} />}
        <DialogFooter>
          <Button block onClick={() => setModalOpen(false)}>
            ปิด
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}

function SimiloGameOverPanel({ gs, myId }: { gs: SimiloPlayerView; myId: string }) {
  const roster = useMemo(() => {
    const winnerIds = new Set(gs.gameResult?.winners ?? []);
    return gs.players.map((p) => ({
      id: p.id,
      name: p.name,
      roleLabel: p.role === 'clue_giver' ? 'คนใบ้' : 'คนทาย',
      won: winnerIds.has(p.id),
      isMe: p.id === myId,
    }));
  }, [gs.players, gs.gameResult, myId]);

  const winners = roster.filter((p) => p.won);
  const losers = roster.filter((p) => !p.won);
  const isTeam = gs.gameMode === 'team';
  const teamWin = isTeam && winners.length === roster.length && roster.length > 0;
  const teamLose = isTeam && winners.length === 0;
  const iWon = gs.phase === 'game_over' && winners.some((p) => p.isMe);
  const isAbort = gs.phase === 'aborted';

  if (isAbort) {
    return (
      <div className="similo-game-over">
        <div className="similo-game-over-hero similo-game-over-hero--neutral">
          <p className="similo-game-over-hero__eyebrow">เกมหยุด</p>
          <h2 id="similo-game-over-title" className="similo-game-over-hero__title">
            เกมถูกยกเลิก
          </h2>
          {gs.abortReason && <p className="similo-game-over-hero__reason">{gs.abortReason}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="similo-game-over">
      <div
        className={[
          'similo-game-over-hero',
          iWon
            ? 'similo-game-over-hero--win'
            : winners.length > 0
              ? 'similo-game-over-hero--lose'
              : 'similo-game-over-hero--neutral',
        ].join(' ')}
      >
        <p className="similo-game-over-hero__eyebrow">
          {teamWin
            ? 'ทีมชนะ'
            : teamLose
              ? 'ทีมแพ้'
              : iWon
                ? 'ชนะ'
                : winners.length > 0
                  ? 'แพ้'
                  : 'จบเกม'}
        </p>
        <h2 id="similo-game-over-title" className="similo-game-over-hero__title">
          {teamWin
            ? 'ทีมชนะ!'
            : teamLose
              ? 'ทีมแพ้'
              : iWon
                ? 'ชนะ!'
                : winners.length > 0
                  ? 'จบเกม'
                  : 'ไม่มีผู้ชนะ'}
        </h2>
        {gs.gameResult?.reason && (
          <p className="similo-game-over-hero__reason">{gs.gameResult.reason}</p>
        )}
      </div>

      {gs.gameOverReveal && (
        <div className="similo-game-over-secret">
          <span className="similo-game-over-secret__label">ตัวละครลับ</span>
          <img src={gs.gameOverReveal.secretImageUrl} alt="" loading="lazy" />
          <strong className="similo-game-over-secret__name">{gs.gameOverReveal.secretLabel}</strong>
        </div>
      )}

      <div className="similo-game-over-rosters" tabIndex={0} aria-label="รายชื่อผู้เล่น">
        {winners.length > 0 && (
          <section
            className="similo-game-over-roster similo-game-over-roster--win"
            aria-label="ผู้ชนะ"
          >
            <h3 className="similo-game-over-roster__title">ชนะ</h3>
            <ul className="similo-game-over-roster__list">
              {winners.map((p) => (
                <li
                  key={p.id}
                  className={[
                    'similo-game-over-roster__item',
                    p.isMe ? 'similo-game-over-roster__item--me' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <span className="similo-game-over-roster__name">
                    {p.name}
                    {p.isMe ? ' (คุณ)' : ''}
                  </span>
                  <span className="similo-game-over-roster__role">{p.roleLabel}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        {losers.length > 0 && (
          <section
            className="similo-game-over-roster similo-game-over-roster--lose"
            aria-label="ผู้แพ้"
          >
            <h3 className="similo-game-over-roster__title">แพ้</h3>
            <ul className="similo-game-over-roster__list">
              {losers.map((p) => (
                <li
                  key={p.id}
                  className={[
                    'similo-game-over-roster__item',
                    p.isMe ? 'similo-game-over-roster__item--me' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <span className="similo-game-over-roster__name">
                    {p.name}
                    {p.isMe ? ' (คุณ)' : ''}
                  </span>
                  <span className="similo-game-over-roster__role">{p.roleLabel}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

function ClueHandCard({ card }: { card: SimiloHandCardView }) {
  return (
    <div className="similo-clue-hand-card">
      <img src={card.imageUrl} alt="" className="similo-clue-hand-card__img" loading="lazy" />
      <span className="similo-clue-hand-card__label">{card.label}</span>
    </div>
  );
}

const HAND_DRAG_PREFIX = 'hand';

export function SimiloGame({ gameState: gs, myId, sendAction, onLeave, onRestart }: Props) {
  const send = (action: SimiloAction) => sendAction(action);
  const [dragHandId, setDragHandId] = useState<string | null>(null);
  const [viewDiscussGuesserId, setViewDiscussGuesserId] = useState<string | null>(null);
  const [roundElimModal, setRoundElimModal] = useState<{
    round: number;
    resolution: SimiloRoundResolutionView;
  } | null>(null);
  const prevPhaseRef = useRef(gs.phase);
  const prevRoundRef = useRef(gs.round);
  const lastShownElimRoundRef = useRef(0);
  const playSensors = usePlayDragSensors();

  const discussGuessers = gs.discussGuessers ?? [];
  const guesserSeats = useMemo(() => gs.players.filter((p) => p.role === 'guesser'), [gs.players]);
  const isClueGiver = gs.myRole === 'clue_giver';
  const showGuessersSidebar =
    guesserSeats.length > 0 &&
    (gs.phase === 'play_clue' ||
      (isClueGiver && gs.phase === 'discuss') ||
      (gs.phase === 'discuss' && !isClueGiver && !gs.eliminated));

  useEffect(() => {
    if (!isClueGiver) {
      setViewDiscussGuesserId(gs.phase === 'discuss' ? myId : null);
      return;
    }
    if (discussGuessers.length === 0) {
      setViewDiscussGuesserId(null);
      return;
    }
    setViewDiscussGuesserId((current) => {
      if (current && discussGuessers.some((g) => g.id === current)) return current;
      return discussGuessers[0]?.id ?? null;
    });
  }, [gs.phase, discussGuessers, isClueGiver, myId]);

  useEffect(() => {
    const wasDiscuss = prevPhaseRef.current === 'discuss';
    if (wasDiscuss && gs.phase !== 'discuss') {
      const completedRound = gs.phase === 'play_clue' ? gs.round - 1 : prevRoundRef.current;
      if (completedRound > lastShownElimRoundRef.current && completedRound >= 1) {
        const clue = gs.playedClues.find(
          (c) =>
            c.round === completedRound && (c.roundResolution?.playersEliminated.length ?? 0) > 0,
        );
        if (clue?.roundResolution) {
          setRoundElimModal({ round: completedRound, resolution: clue.roundResolution });
          lastShownElimRoundRef.current = completedRound;
        }
      }
    }
    prevPhaseRef.current = gs.phase;
    prevRoundRef.current = gs.round;
  }, [gs.phase, gs.round, gs.playedClues]);

  const canPlayClue = gs.canAct && gs.phase === 'play_clue' && isClueGiver;
  const canPickGrid = gs.canAct && gs.phase === 'discuss' && !isClueGiver;

  const viewedDiscussGuesser = discussGuessers.find((g) => g.id === viewDiscussGuesserId);
  const viewedMarkIndices =
    gs.phase === 'discuss'
      ? (viewedDiscussGuesser?.picks ?? [])
      : (viewedDiscussGuesser?.eliminatedIndices ?? []);
  const viewingOwnDiscussPicks = viewDiscussGuesserId === myId;
  const canEditDiscussGrid = viewingOwnDiscussPicks && canPickGrid;

  const teamDiscussPickCounts = useMemo(() => {
    if (gs.gameMode !== 'team' || gs.phase !== 'discuss') return null;
    const counts = new Map<number, number>();
    for (const g of discussGuessers) {
      for (const idx of g.picks) {
        counts.set(idx, (counts.get(idx) ?? 0) + 1);
      }
    }
    return counts;
  }, [gs.gameMode, gs.phase, discussGuessers]);

  useYourTurnToast(gs.canAct, gs.phase === 'play_clue' || gs.phase === 'discuss');

  const modeLabel = gs.gameMode === 'team' ? 'โหมดทีม' : 'โหมดแข่งขัน';
  const deckLabel = useMemo(() => {
    const ids: SimiloDeckId[] = gs.selectedDeckIds ?? [];
    if (ids.length === 0) return '';
    return ids.map((id) => similoDeckLabel(id)).join(' + ');
  }, [gs.selectedDeckIds]);
  const removalLabel =
    gs.gameMode === 'team'
      ? `ลบ ${gs.removalsRequired} ใบ (ร่วมกัน)`
      : `ลบ ${gs.removalsRequired} ใบ`;
  const subtitle = (
    <span>
      รอบ {gs.round}/5 · {removalLabel} · {modeLabel}
      {deckLabel ? ` · Deck: ${deckLabel}` : ''}
    </span>
  );

  const roleBadge = isClueGiver ? (
    <Badge variant="warning">Clue Giver</Badge>
  ) : gs.eliminated ? (
    <Badge variant="outline">ถูกคัดออก</Badge>
  ) : (
    <Badge variant="default">Guesser</Badge>
  );

  const playClueFromDrag = useCallback(
    (handInstanceId: string, orientation: 'similar' | 'different') => {
      if (!canPlayClue) return;
      send({ type: 'play_clue', handInstanceId, orientation });
    },
    [canPlayClue, send],
  );

  const onClueDragStart = useCallback((event: DragStartEvent) => {
    const id = String(event.active.id);
    if (!id.startsWith(`${HAND_DRAG_PREFIX}-`)) return;
    setDragHandId(id.slice(HAND_DRAG_PREFIX.length + 1));
  }, []);

  const onClueDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDragHandId(null);
      if (!canPlayClue) return;

      const activeId = String(event.active.id);
      if (!activeId.startsWith(`${HAND_DRAG_PREFIX}-`)) return;
      const handInstanceId = activeId.slice(HAND_DRAG_PREFIX.length + 1);
      const orientation = parseSimiloClueDropTarget(event.over?.id?.toString());
      if (!orientation) return;

      playClueFromDrag(handInstanceId, orientation);
    },
    [canPlayClue, playClueFromDrag],
  );

  const draggingHandCard = useMemo(() => {
    if (!dragHandId || !gs.clueHand) return null;
    return gs.clueHand.find((c) => c.instanceId === dragHandId) ?? null;
  }, [dragHandId, gs.clueHand]);

  useEffect(() => {
    if (gs.phase !== 'play_clue') setDragHandId(null);
  }, [gs.phase]);

  const cluePlayActive = isClueGiver && gs.phase === 'play_clue' && Boolean(gs.clueHand);
  const isClueDragging = dragHandId !== null;

  const terminal = gs.phase === 'game_over' || gs.phase === 'aborted';
  const won =
    gs.phase === 'game_over' && gs.gameResult != null && gs.gameResult.winners.includes(myId);

  const shell = (
    <GameShell
      className={['similo-page', isClueDragging ? 'similo-page--dragging' : '']
        .filter(Boolean)
        .join(' ')}
      style={cluePlayActive ? { paddingBottom: PLAYER_HAND_DOCK_RESERVE_PX } : undefined}
    >
      <GamePlayHeader
        title="Similo"
        subtitle={subtitle}
        trailing={roleBadge}
        onLeave={onLeave}
        onRestart={onRestart}
        leaveLabel={terminal ? 'full' : 'short'}
      />

      {gs.phase === 'aborted' && gs.abortReason && (
        <div className="similo-abort-banner" role="alert">
          {gs.abortReason}
        </div>
      )}

      {gs.lastEvent && !terminal && (
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          {gs.lastEvent}
        </p>
      )}

      {isClueGiver && gs.secretCharacter && gs.phase !== 'game_over' && (
        <section className="card similo-clue-station" aria-label="Clue Giver">
          <div className="similo-clue-station__head">
            <h2 className="similo-clue-station__title">ตัวละครลับ & คำใบ้</h2>
            {cluePlayActive ? (
              <p className="similo-clue-station__hint">
                ลากการ์ดจากมือ → กล่อง<strong> คล้าย </strong>หรือ<strong> ต่าง </strong>
              </p>
            ) : gs.phase === 'discuss' ? (
              <p className="similo-clue-station__hint">
                {gs.gameMode === 'team'
                  ? `โหมดทีม — คนทายต้องเลือกการ์ด ${gs.removalsRequired} ใบชุดเดียวกันก่อนยืนยัน`
                  : 'กดชื่อคนทายที่กระดานเพื่อดูว่าแต่ละคนเลือกการ์ดใดจะเอาออก'}
              </p>
            ) : (
              <p className="similo-clue-station__hint">
                รอคนทายเลือกการ์ด — ดูตัวละครลับได้ตลอดรอบนี้
              </p>
            )}
          </div>
          <div className="similo-clue-station__body">
            <div className="similo-clue-station__secret" aria-label="ตัวละครลับ">
              <img
                src={gs.secretCharacter.imageUrl}
                alt=""
                className="similo-clue-station__secret-img"
                loading="lazy"
              />
              <div className="similo-clue-station__secret-copy">
                <span className="similo-clue-station__secret-label">ตัวละครลับ</span>
                <strong className="similo-clue-station__secret-name">
                  {gs.secretCharacter.label}
                </strong>
              </div>
            </div>
            {cluePlayActive && (
              <div className="similo-clue-station__drops">
                <SimiloClueDropZones isDragging={isClueDragging} disabled={!canPlayClue} />
              </div>
            )}
          </div>
        </section>
      )}

      <section className="card similo-board-panel" aria-label="กระดานและคำใบ้">
        <div className="similo-board-panel__head">
          <h2 className="similo-board-panel__title">กระดาน & คำใบ้</h2>
          {isClueGiver && gs.secretCharacter && (
            <p className="similo-board-panel__secret-hint">
              การ์ดที่มีขอบทองคือ<strong> ตัวละครลับ </strong>(เฉพาะคุณ)
            </p>
          )}
        </div>
        <div className="similo-board-panel__body">
          <aside className="similo-board-panel__clues" aria-label="คำใบ้ที่เล่นแล้ว">
            <h3 className="similo-board-panel__clues-title">คำใบ้ที่เล่นแล้ว</h3>
            {gs.playedClues.length === 0 ? (
              <p className="similo-board-panel__clues-empty">ยังไม่มีคำใบ้ในรอบนี้</p>
            ) : (
              <div className="similo-played-clues-rail">
                {gs.playedClues.map((cl, i) => (
                  <PlayedClueRailItem key={`${cl.round}-${cl.characterId}-${i}`} clue={cl} />
                ))}
              </div>
            )}
          </aside>
          <div className="similo-board-panel__grid-wrap">
            <h3 className="similo-board-panel__grid-title">กระดาน 4×3</h3>
            <div className="similo-grid">
              {gs.grid.map((cell) => {
                const inViewedMarks = viewedMarkIndices.includes(cell.index);
                const isMyCurrentDiscussPick =
                  gs.phase === 'discuss' && (gs.myDiscussPicks?.includes(cell.index) ?? false);
                const isPastElimination =
                  !isClueGiver && Boolean(cell.grayedForViewer) && !isMyCurrentDiscussPick;
                const showGray = isClueGiver ? inViewedMarks : isPastElimination;
                const showCurrentPickHighlight = !isClueGiver && isMyCurrentDiscussPick;
                const canToggleDiscussPick = canEditDiscussGrid && !isPastElimination;
                const isSecretOnGrid =
                  isClueGiver &&
                  gs.secretCharacter != null &&
                  !cell.removed &&
                  cell.characterId === gs.secretCharacter.id;
                const teamPickCount = teamDiscussPickCounts?.get(cell.index) ?? 0;
                const showTeamPickCount = teamPickCount > 0;
                return (
                  <button
                    key={cell.index}
                    type="button"
                    className={[
                      'similo-grid-card',
                      canToggleDiscussPick ? 'similo-grid-card--selectable' : '',
                      showCurrentPickHighlight ? 'similo-grid-card--discuss-current' : '',
                      showTeamPickCount && !showCurrentPickHighlight
                        ? 'similo-grid-card--team-pick'
                        : '',
                      showGray ? 'similo-grid-card--discuss-pick' : '',
                      isSecretOnGrid ? 'similo-grid-card--secret' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    disabled={gs.phase === 'discuss' && !canToggleDiscussPick}
                    onClick={() => {
                      if (canToggleDiscussPick) {
                        send({ type: 'toggle_discuss_pick', gridIndex: cell.index });
                      }
                    }}
                    aria-label={
                      isSecretOnGrid
                        ? `${cell.label} — ตัวละครลับ`
                        : canToggleDiscussPick && isMyCurrentDiscussPick
                          ? `${cell.label} — เลือกแล้ว แตะเพื่อยกเลิก`
                          : canToggleDiscussPick
                            ? `${cell.label} — แตะเพื่อเลือกเอาออก`
                            : showTeamPickCount
                              ? `${cell.label} — ${teamPickCount} คนเลือก`
                              : showGray
                                ? `${cell.label} — เอาออกแล้ว${isClueGiver ? ` (${viewedDiscussGuesser?.name ?? ''})` : ''}`
                                : cell.label
                    }
                  >
                    {isSecretOnGrid && (
                      <span className="similo-grid-card__secret-badge" aria-hidden>
                        ลับ
                      </span>
                    )}
                    {showTeamPickCount && (
                      <span
                        className="similo-grid-card__team-pick-count"
                        aria-label={`${teamPickCount} คนเลือก`}
                      >
                        {teamPickCount}
                      </span>
                    )}
                    {showCurrentPickHighlight && (
                      <span className="similo-grid-card__round-pick-badge" aria-hidden>
                        รอบนี้
                      </span>
                    )}
                    <img
                      src={cell.imageUrl}
                      alt=""
                      className="similo-grid-card__img"
                      loading="lazy"
                    />
                    <span className="similo-grid-card__label">{cell.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          {showGuessersSidebar ? (
            <aside
              className="similo-board-panel__guessers"
              aria-label={gs.phase === 'play_clue' || isClueGiver ? 'คนทาย' : 'เลือกการ์ดเอาออก'}
            >
              {gs.phase === 'play_clue' && !isClueGiver ? (
                <GuesserRosterReadonly seats={guesserSeats} />
              ) : isClueGiver ? (
                <>
                  <h3 className="similo-board-panel__guessers-title">คนทาย</h3>
                  <div
                    className="similo-discuss-viewer"
                    role="tablist"
                    aria-label="ดูกระดานคนทายแต่ละคน"
                  >
                    {guesserSeats.map((seat) => {
                      const g = discussGuessers.find((x) => x.id === seat.id);
                      const isEliminated = seat.eliminated;
                      const active = seat.id === viewDiscussGuesserId;
                      const markCount = g
                        ? gs.phase === 'discuss'
                          ? g.picks.length
                          : g.eliminatedIndices.length
                        : 0;
                      const meta = isEliminated
                        ? 'ถูกคัดออกจากเกม'
                        : gs.phase === 'discuss' && g
                          ? `${markCount}/${gs.removalsRequired}${g.confirmed ? ' · ยืนยันแล้ว' : ''}`
                          : g
                            ? `เอาออกแล้ว ${markCount} ใบ`
                            : 'ยังอยู่ในเกม';
                      return (
                        <GuesserRosterChip
                          key={seat.id}
                          name={seat.name}
                          meta={meta}
                          eliminated={isEliminated}
                          active={active}
                          confirmed={g?.confirmed}
                          selectable
                          onSelect={() => setViewDiscussGuesserId(seat.id)}
                        />
                      );
                    })}
                  </div>
                  {viewedDiscussGuesser && (
                    <p className="similo-discuss-viewer__hint similo-discuss-viewer__hint--sidebar">
                      การ์ดเทาคือที่ {viewedDiscussGuesser.name} เลือกเอาออก
                    </p>
                  )}
                </>
              ) : (
                <div className="similo-guesser-discuss-panel">
                  <h3 className="similo-board-panel__guessers-title">เลือกเอาออก</h3>
                  <p className="similo-guesser-discuss-panel__intro">
                    {gs.gameMode === 'team' ? (
                      <>
                        โหมดทีม — เลือก <strong>{gs.removalsRequired} การ์ดชุดเดียวกัน</strong>
                        กับคนทายทุกคน · <strong>ขอบส้ม</strong> = รอบนี้ · <strong>เทา</strong> =
                        รอบก่อน
                      </>
                    ) : (
                      <>
                        เลือก {gs.removalsRequired} การ์ด — <strong>ขอบส้ม</strong> = รอบนี้ ·{' '}
                        <strong>เทา</strong> = รอบก่อน
                      </>
                    )}
                  </p>
                  <p className="similo-guesser-discuss-panel__hint">
                    {canPickGrid
                      ? gs.gameMode === 'team'
                        ? 'แตะการ์ดเพื่อเลือก — แตะการ์ดอื่นเพื่อเปลี่ยน'
                        : 'แตะการ์ดขอบส้มเพื่อยกเลิก — แตะการ์ดอื่นเพื่อเลือก'
                      : 'ยืนยันแล้ว — รอคนอื่น'}
                  </p>
                  {gs.gameMode === 'team' && gs.phase === 'discuss' && (
                    <ul className="similo-team-pick-status" aria-label="การเลือกของทีม">
                      {guesserSeats.map((seat) => {
                        const g = discussGuessers.find((x) => x.id === seat.id);
                        const pickLabels =
                          g?.picks
                            .map((idx) => gs.grid[idx]?.label)
                            .filter((label): label is string => Boolean(label)) ?? [];
                        const pickSummary = pickLabels.length > 0 ? pickLabels.join(', ') : null;
                        return (
                          <li
                            key={seat.id}
                            className={[
                              'similo-team-pick-status__row',
                              seat.eliminated ? 'similo-team-pick-status__row--eliminated' : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                          >
                            <span className="similo-team-pick-status__name">{seat.name}</span>
                            <span className="similo-team-pick-status__pick">
                              {seat.eliminated ? 'ถูกคัดออก' : (pickSummary ?? 'ยังไม่เลือก')}
                              {!seat.eliminated && g?.confirmed ? ' · ยืนยันแล้ว' : ''}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {gs.gameMode === 'team' && gs.teamDiscussAligned && canPickGrid && (
                    <p className="similo-team-pick-ready">
                      ทุกคนเลือกการ์ดชุดเดียวกันแล้ว — กดยืนยันได้
                    </p>
                  )}
                  {gs.gameMode === 'team' &&
                    !gs.teamDiscussAligned &&
                    (gs.myDiscussPicks?.length ?? 0) >= 1 &&
                    canPickGrid && (
                      <p className="similo-guesser-discuss-panel__hint">
                        รอคนทายเลือกการ์ดชุดเดียวกันกับคุณ
                      </p>
                    )}
                  <p className="similo-guesser-discuss-panel__progress">
                    ยืนยันแล้ว {gs.discussProgress.confirmed}/{gs.discussProgress.total}
                    {gs.myDiscussPicks && gs.myDiscussPicks.length > 0
                      ? ` · เลือกแล้ว ${gs.myDiscussPicks.length}/${gs.removalsRequired}`
                      : ''}
                  </p>
                  <Button
                    block
                    disabled={!gs.canConfirmDiscuss}
                    onClick={() => send({ type: 'confirm_discuss' })}
                  >
                    ยืนยันการเลือก
                  </Button>
                </div>
              )}
            </aside>
          ) : null}
        </div>
      </section>

      {gs.eventLog.length > 0 && (
        <section className="card">
          <h2 style={{ marginTop: 0, fontSize: '1rem' }}>บันทึกเกม</h2>
          <ul className="similo-event-log">
            {[...gs.eventLog].reverse().map((line, i) => (
              <li key={`${i}-${line}`}>{line}</li>
            ))}
          </ul>
        </section>
      )}

      {cluePlayActive && (
        <PlayerHand
          cards={gs.clueHand!}
          getCardId={(c) => c.instanceId}
          dragMode={canPlayClue ? 'play' : 'none'}
          draggableIdPrefix={HAND_DRAG_PREFIX}
          className="similo-player-hand-dock"
          renderCard={({ card }) => <ClueHandCard card={card} />}
          getPreview={(card) => ({ src: card.imageUrl, alt: card.label })}
          aria-label="มือการ์ดคำใบ้"
        />
      )}

      {roundElimModal && (
        <RoundEliminationModal
          round={roundElimModal.round}
          resolution={roundElimModal.resolution}
          open
          onOpenChange={(open) => {
            if (!open) setRoundElimModal(null);
          }}
        />
      )}

      {terminal && (
        <GameOverModal
          titleId="similo-game-over-title"
          panelClassName="similo-game-over-modal"
          onLeave={onLeave}
          onRestart={onRestart}
          restartLabel="เล่นใหม่"
          leaveLabel="ออกจากเกม"
          restartWaitLabel="รอหัวห้องกด «เล่นใหม่»"
          celebrate={won}
        >
          <SimiloGameOverPanel gs={gs} myId={myId} />
        </GameOverModal>
      )}
    </GameShell>
  );

  if (!cluePlayActive) return shell;

  return (
    <DndContext
      sensors={playSensors}
      collisionDetection={pointerWithin}
      onDragStart={onClueDragStart}
      onDragEnd={onClueDragEnd}
    >
      {shell}
      <DragOverlay dropAnimation={null}>
        {draggingHandCard ? (
          <div className="similo-clue-drag-overlay">
            <img src={draggingHandCard.imageUrl} alt="" className="similo-clue-drag-overlay__img" />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
