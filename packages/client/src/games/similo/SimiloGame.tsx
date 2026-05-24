import {
  DndContext,
  DragOverlay,
  pointerWithin,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  SimiloAction,
  SimiloHandCardView,
  SimiloPlayedClueView,
  SimiloPlayerEliminationReason,
  SimiloPlayerSeat,
  SimiloPlayerView,
  SimiloRoundResolutionView,
} from 'shared';
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
          <div
            key={p.id}
            role="listitem"
            className={[
              'similo-discuss-viewer__chip',
              'similo-discuss-viewer__chip--static',
              p.eliminated ? 'similo-discuss-viewer__chip--eliminated' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-disabled={p.eliminated}
          >
            <span className="similo-discuss-viewer__name">{p.name}</span>
            <span className="similo-discuss-viewer__meta">
              {p.eliminated ? 'ถูกคัดออก' : 'ยังอยู่ในเกม'}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

function playerEliminationReasonLabel(reason: SimiloPlayerEliminationReason): string {
  if (reason === 'secret') return 'เลือกตัวละครลับ';
  return 'หมดเวลาไม่ยืนยัน';
}

function PlayedClueRoundResolution({ resolution }: { resolution: SimiloRoundResolutionView }) {
  const hasPlayers = resolution.playersEliminated.length > 0;
  const guesserRemovals = resolution.removalsByGuesser.filter((g) => g.cards.length > 0);
  const hasRemovals = guesserRemovals.length > 0;
  if (!hasPlayers && !hasRemovals) return null;

  return (
    <section className="similo-played-clue-modal__round-summary" aria-label="สรุปการคัดออกในรอบนี้">
      <h3 className="similo-played-clue-modal__round-summary-title">สรุปหลังรอบนี้</h3>
      {hasPlayers && (
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
      )}
      {hasRemovals && (
        <div className="similo-played-clue-modal__elim-block">
          <h4 className="similo-played-clue-modal__elim-heading">การ์ดที่เอาออก</h4>
          {guesserRemovals.map((g) => (
            <div key={g.guesserId} className="similo-played-clue-modal__guesser-removals">
              <p className="similo-played-clue-modal__guesser-name">{g.guesserName}</p>
              <ul className="similo-played-clue-modal__removed-cards">
                {g.cards.map((c) => (
                  <li key={c.id} className="similo-played-clue-modal__removed-card">
                    <img
                      src={c.imageUrl}
                      alt=""
                      className="similo-played-clue-modal__removed-thumb"
                      loading="lazy"
                    />
                    <span>{c.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function formatCountdown(endsAtMs: number | null): string | null {
  if (endsAtMs == null) return null;
  const sec = Math.max(0, Math.ceil((endsAtMs - Date.now()) / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
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
          {iWon ? 'ชนะ' : winners.length > 0 ? 'แพ้' : 'จบเกม'}
        </p>
        <h2 id="similo-game-over-title" className="similo-game-over-hero__title">
          {iWon ? 'ชนะ!' : winners.length > 0 ? 'จบเกม' : 'ไม่มีผู้ชนะ'}
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

      <div className="similo-game-over-rosters">
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
  const [tick, setTick] = useState(0);
  const [viewDiscussGuesserId, setViewDiscussGuesserId] = useState<string | null>(null);
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
    if (gs.phase !== 'discuss' || gs.discussEndsAtMs == null) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [gs.phase, gs.discussEndsAtMs]);

  void tick;

  const countdown = useMemo(() => formatCountdown(gs.discussEndsAtMs), [gs.discussEndsAtMs, tick]);
  const canPlayClue = gs.canAct && gs.phase === 'play_clue' && isClueGiver;
  const canPickGrid = gs.canAct && gs.phase === 'discuss' && !isClueGiver;

  const viewedDiscussGuesser = discussGuessers.find((g) => g.id === viewDiscussGuesserId);
  const viewedMarkIndices =
    gs.phase === 'discuss'
      ? (viewedDiscussGuesser?.picks ?? [])
      : (viewedDiscussGuesser?.eliminatedIndices ?? []);
  const viewingOwnDiscussPicks = viewDiscussGuesserId === myId;
  const canEditDiscussGrid = viewingOwnDiscussPicks && canPickGrid;

  useYourTurnToast(gs.canAct, gs.phase === 'play_clue' || gs.phase === 'discuss');

  const modeLabel = gs.gameMode === 'team' ? 'โหมดทีม' : 'โหมดแข่งขัน';
  const subtitle = (
    <span>
      รอบ {gs.round}/5 · ลบ {gs.removalsRequired} ใบ · {modeLabel}
      {gs.phase === 'discuss' && countdown != null ? ` · เหลือ ${countdown}` : ''}
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
                กดชื่อคนทายที่กระดานเพื่อดูว่าแต่ละคนเลือกการ์ดใดจะเอาออก
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
                return (
                  <button
                    key={cell.index}
                    type="button"
                    className={[
                      'similo-grid-card',
                      canToggleDiscussPick ? 'similo-grid-card--selectable' : '',
                      showCurrentPickHighlight ? 'similo-grid-card--discuss-current' : '',
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
                    {discussGuessers.map((g) => {
                      const active = g.id === viewDiscussGuesserId;
                      const markCount =
                        gs.phase === 'discuss' ? g.picks.length : g.eliminatedIndices.length;
                      return (
                        <button
                          key={g.id}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          className={[
                            'similo-discuss-viewer__chip',
                            active ? 'similo-discuss-viewer__chip--active' : '',
                            g.confirmed ? 'similo-discuss-viewer__chip--confirmed' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          onClick={() => setViewDiscussGuesserId(g.id)}
                        >
                          <span className="similo-discuss-viewer__name">{g.name}</span>
                          <span className="similo-discuss-viewer__meta">
                            {gs.phase === 'discuss'
                              ? `${markCount}/${gs.removalsRequired}${g.confirmed ? ' · ยืนยันแล้ว' : ''}`
                              : `เอาออกแล้ว ${markCount} ใบ`}
                          </span>
                        </button>
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
                    เลือก {gs.removalsRequired} การ์ด — <strong>ขอบส้ม</strong> = รอบนี้ ·{' '}
                    <strong>เทา</strong> = รอบก่อน
                  </p>
                  <p className="similo-guesser-discuss-panel__hint">
                    {canPickGrid
                      ? 'แตะการ์ดขอบส้มเพื่อยกเลิก — แตะการ์ดอื่นเพื่อเลือก'
                      : 'ยืนยันแล้ว — รอคนอื่น'}
                  </p>
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

      {terminal && (
        <GameOverModal
          titleId="similo-game-over-title"
          panelClassName="similo-game-over-modal"
          onLeave={onLeave}
          onRestart={onRestart}
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
