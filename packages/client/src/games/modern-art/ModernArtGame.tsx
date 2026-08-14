import { useEffect, useMemo, useState } from 'react';
import {
  modernArtArtistLabel,
  modernArtAuctionLabelTh,
  modernArtPhaseLabelTh,
  type ModernArtAction,
  type ModernArtCard,
  type ModernArtPlayerView,
} from 'shared';
import {
  GameHistoryDisclosure,
  GameOverModal,
  GamePlayHeader,
  GameShell,
} from '../../components/game-shell';
import { PlayerIdentity } from '../../components/player-avatar';
import { PlayerRosterStrip } from '../../components/player-roster';
import { PlayerHand, PLAYER_HAND_DOCK_PEEK_RESERVE_PX } from '../../components/player-hand';
import { useYourTurnToast } from '../../hooks/useYourTurnToast';
import { modernArtPaintingAlt, modernArtPaintingUrl } from './art';
import { ModernArtActionPanel } from './components/ModernArtActionPanel';
import { ModernArtAuctionTable, ModernArtGalleries } from './components/ModernArtAuctionTable';
import { ModernArtSealedModal } from './components/ModernArtSealedModal';
import { ModernArtValueBoard } from './components/ModernArtValueBoard';
import { MoneyChip, buildModernArtRosterSeats } from './components/modernArtRosterSeats';
import './modern-art.css';

type Props = {
  gameState: ModernArtPlayerView;
  myId: string;
  sendAction: (action: unknown) => void;
  onLeave: () => void;
  onRestart?: () => void;
};

function send(sendAction: Props['sendAction'], action: ModernArtAction) {
  sendAction(action);
}

function isYourTurn(you: ModernArtPlayerView['you']): boolean {
  return (
    you.canOffer ||
    you.canPlayDoubleSecond ||
    you.canSkipDouble ||
    you.canSetPrice ||
    you.canBid ||
    you.canPass ||
    you.canBuyFixed ||
    you.canSubmitSealed ||
    you.canCloseOpen ||
    you.canAckRound
  );
}

export function ModernArtGame({ gameState, myId, sendAction, onLeave, onRestart }: Props) {
  const view = gameState;
  const you = view.you;
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const yourTurn = isYourTurn(you) && view.phase !== 'game_over';
  useYourTurnToast(yourTurn);

  useEffect(() => {
    setSelectedId(null);
  }, [view.phase, view.auctioneerId, view.doubleWait?.currentChooserId, view.auction?.kind]);

  const rosterSeats = useMemo(() => buildModernArtRosterSeats(view), [view]);
  const winners = new Set(view.result?.winners ?? []);
  const iWon = winners.has(myId);
  const showHand = you.hand.length > 0 && view.phase !== 'game_over';

  const disabledHandIds =
    you.canPlayDoubleSecond || you.canSkipDouble
      ? you.hand.filter((c) => !you.legalDoubleSeconds.includes(c.id)).map((c) => c.id)
      : !you.canOffer
        ? you.hand.map((c) => c.id)
        : [];

  const subtitle = `${modernArtPhaseLabelTh(view.phase)} · รอบ ${view.round}/4`;

  const ranked = view.seats
    .slice()
    .sort((a, b) => (b.money ?? 0) - (a.money ?? 0));

  return (
    <GameShell
      className="ma-page"
      style={{ paddingBottom: showHand ? PLAYER_HAND_DOCK_PEEK_RESERVE_PX : undefined }}
    >
      <GamePlayHeader
        title="Modern Art"
        subtitle={subtitle}
        trailing={<MoneyChip amount={you.money} />}
        leaveLabel={view.phase === 'game_over' ? 'full' : 'short'}
        onLeave={onLeave}
        onRestart={onRestart}
      />

      <p className="mb-1 text-sm text-ink-2">{view.lastEvent}</p>

      <GameHistoryDisclosure
        title={`ผู้เล่น · ${view.seats.length} คน`}
        defaultOpen
        className="sticky top-4 z-20"
      >
        <PlayerRosterStrip
          layout="grid"
          myId={myId}
          ariaLabel="ผู้เล่น Modern Art"
          seats={rosterSeats}
        />
      </GameHistoryDisclosure>

      <div className="ma-layout">
        <div className="ma-layout__board">
          <ModernArtValueBoard view={view} />
        </div>
        <div className="ma-layout__auction">
          <ModernArtAuctionTable view={view} />
          <ModernArtActionPanel
            view={view}
            selectedId={selectedId}
            send={(action) => send(sendAction, action)}
          />
        </div>
        <div className="ma-layout__galleries">
          <ModernArtGalleries view={view} myId={myId} />
        </div>
      </div>

      {showHand ? (
        <PlayerHand
          cards={you.hand}
          getCardId={(c: ModernArtCard) => c.id}
          dragMode="none"
          dockPeek
          selectedIds={selectedId ? [selectedId] : []}
          disabledCardIds={you.canOffer || you.canPlayDoubleSecond ? disabledHandIds : you.hand.map((c) => c.id)}
          onSelectToggle={(id) => {
            if (!(you.canOffer || you.canPlayDoubleSecond)) return;
            if (you.canPlayDoubleSecond && !you.legalDoubleSeconds.includes(id)) return;
            setSelectedId((prev) => (prev === id ? null : id));
          }}
          getPreview={(card) => ({
            src: modernArtPaintingUrl(card),
            alt: modernArtPaintingAlt(card),
            caption: (
              <>
                {modernArtArtistLabel(card.artist)}
                <br />
                {modernArtAuctionLabelTh(card.auction)}
              </>
            ),
          })}
          renderCard={({ card }) => (
            <img
              src={modernArtPaintingUrl(card)}
              alt={modernArtPaintingAlt(card)}
              className="ma-hand-card-img"
              loading="lazy"
            />
          )}
          aria-label={`มือของคุณ (${you.hand.length} ใบ)`}
        />
      ) : null}

      <ModernArtSealedModal
        view={view}
        myId={myId}
        send={(action) => send(sendAction, action)}
      />

      {view.phase === 'game_over' ? (
        <GameOverModal
          titleId="ma-game-over-title"
          onLeave={onLeave}
          onRestart={onRestart}
          tone={iWon ? 'win' : 'default'}
        >
          <h2 id="ma-game-over-title" className="font-display text-xl font-extrabold">
            {iWon ? 'คุณชนะ!' : 'จบเกม'}
          </h2>
          <p className="mt-1 text-sm text-ink-2">{view.result?.reason}</p>
          <ul className="mt-4 space-y-2 text-sm">
            {ranked.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-4">
                <PlayerIdentity
                  playerId={s.id}
                  name={s.name}
                  avatarSize={32}
                  trailing={winners.has(s.id) ? '★' : undefined}
                />
                <span className="shrink-0 tabular-nums font-extrabold">${s.money ?? 0}</span>
              </li>
            ))}
          </ul>
        </GameOverModal>
      ) : null}
    </GameShell>
  );
}
