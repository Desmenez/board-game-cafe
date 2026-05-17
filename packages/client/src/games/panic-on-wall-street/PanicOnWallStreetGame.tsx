import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  PowsAction,
  PowsColor,
  PowsCompany,
  PowsPlayerRole,
  PowsPlayerView,
  PowsRoleRevealSlot,
  PowsState,
} from 'shared';
import {
  POWS_MARKET_DICE_FACES,
  POWS_MARKET_ROLL_ANIM_MS_PER_COLOR,
  POWS_MARKET_ROLL_COLOR_ORDER,
  powsFormatMarketDelta,
  powsPossibleMarketPositions,
} from 'shared';
import type { GameResult } from 'shared';
import { Trophy } from 'lucide-react';
import toast from 'react-hot-toast';
import { GameOverActions, GamePlayHeader, GameShell } from '../../components/game-shell';
import { Button } from '../../components/ui';
import { startPowsWinCelebrationLoop } from '../../utils/winCelebration';
import './panic-on-wall-street.css';

const CDN_BASE = 'https://res.cloudinary.com/dpkqjlk3g/image/upload/q_auto/f_auto';

/** Stock company card art (Cloudinary assets) */
const STOCK_CARD_WIDTH = 732;
const STOCK_CARD_HEIGHT = 507;

function powsImg(publicId: string): string {
  return `${CDN_BASE}/${publicId}`;
}

const ROLE_CARD_BACK = 'back-card_cxqlp5';

const ROLE_LABEL_TH: Record<PowsPlayerRole, string> = {
  manager: 'ผู้จัดการ',
  investor: 'นักลงทุน',
  dual: 'ผู้จัดการ + นักลงทุน',
};

const PHASE_LABEL: Record<PowsState['phase'], string> = {
  role_reveal: 'เปิดเผยบทบาท',
  negotiation: 'เจรจา',
  investor_income: 'รายได้นักลงทุน',
  manager_income: 'รายได้ผู้จัดการ',
  debt_resolution: 'จัดการหนี้',
  management_cost: 'ค่าบริหาร',
  auction: 'ประมูล',
  game_over: 'จบเกม',
};

const COLOR_LABEL: Record<PowsColor, string> = {
  blue: 'น้ำเงิน',
  green: 'เขียว',
  yellow: 'เหลือง',
  red: 'แดง',
};

/** Printed board has 8 cells per row; engine position is 0–10 */
const MARKET_BOARD_COLUMNS = 8;
const MARKET_POSITION_MAX = 10;
/** Top → bottom on the physical market-board image */
const MARKET_BOARD_ROW_ORDER: PowsColor[] = ['red', 'yellow', 'green', 'blue'];

const MARKET_COLORS: PowsColor[] = ['blue', 'green', 'yellow', 'red'];

/** Track grid on market-board_jp7deu (percent of board image) */
const MARKET_TRACKS_BOX = {
  top: 51.8,
  left: 12.8,
  width: 84.8,
  height: 37.5,
} as const;

/** Row center within the track overlay (top → bottom) */
const MARKET_ROW_IN_TRACKS_PCT: Record<PowsColor, number> = {
  red: 0,
  yellow: 33.3,
  green: 66.6,
  blue: 100,
};

function marketBoardColumnIndex(position: number): number {
  return Math.max(
    0,
    Math.min(
      MARKET_BOARD_COLUMNS - 1,
      Math.floor((position / MARKET_POSITION_MAX) * (MARKET_BOARD_COLUMNS - 1)),
    ),
  );
}

function marketBoardMarkerLeftInTracksPct(columnIndex: number): number {
  return ((columnIndex + 0.5) / MARKET_BOARD_COLUMNS) * 100;
}

type MarketRollAnimState = {
  from: Record<PowsColor, number>;
  to: Record<PowsColor, number>;
  deltas: Record<PowsColor, number>;
  stepIndex: number;
  displayPositions: Record<PowsColor, number>;
};

function marketPositionsFromState(market: PowsState['market']): Record<PowsColor, number> {
  return {
    blue: market.blue.position,
    green: market.green.position,
    yellow: market.yellow.position,
    red: market.red.position,
  };
}

function PowsMarketBoard({
  market,
  markerPositions,
  possibleAnchorPositions,
  showPossibleOutcomes = false,
  activeRollingColor = null,
  rollingLabel = null,
}: {
  market: PowsState['market'];
  markerPositions: Record<PowsColor, number>;
  possibleAnchorPositions: Record<PowsColor, number>;
  showPossibleOutcomes?: boolean;
  activeRollingColor?: PowsColor | null;
  rollingLabel?: string | null;
}) {
  return (
    <div className="pows__market-board-wrap">
      <img className="pows__market-board" src={powsImg('market-board_jp7deu')} alt="กระดานตลาด" />
      {rollingLabel ? (
        <div className="pows__market-roll-banner" role="status" aria-live="polite">
          {rollingLabel}
        </div>
      ) : null}
      <div
        className="pows__market-markers"
        style={{
          top: `${MARKET_TRACKS_BOX.top}%`,
          left: `${MARKET_TRACKS_BOX.left}%`,
          width: `${MARKET_TRACKS_BOX.width}%`,
          height: `${MARKET_TRACKS_BOX.height}%`,
        }}
        aria-label="ตำแหน่งราคาหุ้นบนกระดาน"
      >
        {showPossibleOutcomes &&
          MARKET_BOARD_ROW_ORDER.map((color) => {
            const possible = powsPossibleMarketPositions(
              possibleAnchorPositions[color],
              POWS_MARKET_DICE_FACES[color],
            );
            const isActive = activeRollingColor === color;
            return possible.map((pos) => (
              <div
                key={`possible-${color}-${pos}`}
                className={`pows__market-possible pows__market-possible--${color}${isActive ? ' pows__market-possible--active' : ''}`}
                style={{
                  left: `${marketBoardMarkerLeftInTracksPct(marketBoardColumnIndex(pos))}%`,
                  top: `${MARKET_ROW_IN_TRACKS_PCT[color]}%`,
                }}
                aria-hidden
              />
            ));
          })}
        {MARKET_BOARD_ROW_ORDER.map((color) => {
          const position = markerPositions[color];
          const { value } = market[color];
          const columnIndex = marketBoardColumnIndex(position);
          const isRolling = activeRollingColor === color;
          return (
            <div
              key={color}
              className={`pows__market-marker pows__market-marker--${color}${isRolling ? ' pows__market-marker--rolling' : ''}`}
              style={{
                left: `${marketBoardMarkerLeftInTracksPct(columnIndex)}%`,
                top: `${MARKET_ROW_IN_TRACKS_PCT[color]}%`,
              }}
              title={`${COLOR_LABEL[color]} · $${value.toLocaleString()} · ตำแหน่ง ${position}`}
              role="img"
              aria-label={`${COLOR_LABEL[color]} มูลค่า ${value.toLocaleString()} ดอลลาร์`}
            />
          );
        })}
      </div>
    </div>
  );
}

const AUCTION_BID_INCREMENTS = [5_000, 10_000, 20_000, 50_000, 100_000] as const;

/** คิวที่เหลือ + ใบที่กำลังประมูล (ไม่ให้ใบสุดท้ายโชว์ 0) */
function powsAuctionLotCount(auction: PowsState['auction']): number {
  return auction.companyQueue.length + (auction.currentCompanyId ? 1 : 0);
}

function powsCanFinishAuctionMonth(auction: PowsState['auction']): boolean {
  return (
    auction.status !== 'bidding' &&
    !auction.currentCompanyId &&
    auction.companyQueue.length === 0 &&
    (auction.status === 'idle' || auction.status === 'selecting_lot')
  );
}

function auctionBidAfterIncrement(currentBid: number, increment: number): number {
  return currentBid === 0 ? increment : currentBid + increment;
}

function formatBidK(amount: number): string {
  if (amount >= 1000 && amount % 1000 === 0) return `+${amount / 1000}k`;
  return `+$${amount.toLocaleString()}`;
}

function PowsAuctionDock({
  gameState,
  myId,
  isHostPlayer,
  auctionCompany,
  send,
}: {
  gameState: PowsPlayerView;
  myId: string;
  isHostPlayer: boolean;
  auctionCompany: PowsCompany | null;
  send: (a: PowsAction) => void;
}) {
  const auction = gameState.auction;
  const me = gameState.players[myId];
  const isManager = gameState.managerIds.includes(myId);
  const inAuction = gameState.phase === 'auction';
  if (!inAuction) return null;

  const isBidding = auction.status === 'bidding' && auctionCompany != null;
  const leaderId = auction.currentHighestBidderId;
  const leader = leaderId ? gameState.players[leaderId] : null;
  const currentBid = auction.currentBid;
  const stillBidding = auction.activeBidderIds.includes(myId);
  const isLeader = leaderId === myId && currentBid > 0;
  const canBid = isBidding && isManager && stillBidding && !me?.isBankrupt;

  return (
    <aside className="pows__auction-dock" aria-label="แถบประมูล">
      <div className="pows__auction-dock-inner">
        {isBidding ? (
          <>
            <div
              className={`pows__card pows__card--${auctionCompany.color} pows__auction-dock-card`}
            >
              {auctionCompany.isDoubleIncome && <span className="pows__card-badge">2×</span>}
              <img
                src={powsImg(auctionCompany.imagePublicId)}
                alt=""
                width={STOCK_CARD_WIDTH}
                height={STOCK_CARD_HEIGHT}
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="pows__auction-dock-main">
              <div className="pows__auction-dock-leader">
                <span className="pows__auction-dock-label">ผู้นำประมูล</span>
                {leader && currentBid > 0 ? (
                  <p className="pows__auction-dock-leader-name">
                    <strong>{leader.name}</strong>
                    <span className="pows__auction-dock-bid">${currentBid.toLocaleString()}</span>
                  </p>
                ) : (
                  <p className="pows__auction-dock-leader-name pows__muted">ยังไม่มีผู้ประมูล</p>
                )}
              </div>
              <p className="pows__auction-dock-meta">
                คิว {powsAuctionLotCount(auction)} ใบ · ประมูล{' '}
                {gameState.players[auction.auctioneerId ?? '']?.name ?? '—'}
              </p>
            </div>
            <div className="pows__auction-dock-actions">
              {canBid ? (
                <>
                  <div className="pows__auction-dock-bids">
                    {AUCTION_BID_INCREMENTS.map((inc) => {
                      const amount = auctionBidAfterIncrement(currentBid, inc);
                      const affordable = (me?.money ?? 0) >= amount;
                      return (
                        <Button
                          key={inc}
                          type="button"
                          className="pows__auction-inc-btn"
                          disabled={!affordable}
                          onClick={() => send({ type: 'auction_bid', amount })}
                        >
                          {formatBidK(inc)}
                          <span className="pows__auction-inc-total">
                            ${amount.toLocaleString()}
                          </span>
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isLeader}
                    onClick={() => send({ type: 'auction_pass' })}
                  >
                    ผ่าน
                  </Button>
                </>
              ) : isManager && !stillBidding ? (
                <p className="pows__muted">คุณผ่านการประมูลใบนี้แล้ว</p>
              ) : !isManager ? (
                <p className="pows__muted">เฉพาะผู้จัดการประมูลได้</p>
              ) : me?.isBankrupt ? (
                <p className="pows__muted">ล้มละลาย — ประมูลไม่ได้</p>
              ) : null}
            </div>
          </>
        ) : (
          <div className="pows__auction-dock-idle">
            <p className="pows__auction-dock-meta">
              {powsCanFinishAuctionMonth(auction)
                ? 'ประมูลจบแล้ว — หัวห้องกดจบเดือน'
                : auction.status === 'selecting_lot' || auction.companyQueue.length > 0
                  ? auction.companyQueue.length > 0
                    ? `รอหัวห้องเปิดประมูล · คิว ${powsAuctionLotCount(auction)} ใบ`
                    : 'รอหัวห้องเปิดประมูลใบถัดไป'
                  : 'ประมูลจบแล้ว'}
            </p>
            {isHostPlayer && (
              <div className="pows__auction-dock-host">
                {auction.status !== 'bidding' && auction.companyQueue.length > 0 && (
                  <Button type="button" onClick={() => send({ type: 'host_start_auction_lot' })}>
                    เปิดประมูลใบถัดไป
                  </Button>
                )}
                {powsCanFinishAuctionMonth(auction) && (
                  <Button type="button" onClick={() => send({ type: 'host_finish_auction_month' })}>
                    จบประมูล / เดือนถัดไป
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

type DealDraft = { investorId: string; price: string };

type PowsGameOverRow = {
  id: string;
  name: string;
  money: number;
  place: number;
  isWinner: boolean;
  isBankrupt: boolean;
};

function buildPowsGameOverRows(
  ids: string[],
  players: PowsState['players'],
  winners: Set<string>,
): PowsGameOverRow[] {
  return [...ids]
    .map((id) => {
      const p = players[id];
      return {
        id,
        name: p?.name ?? id,
        money: p?.money ?? 0,
        isWinner: winners.has(id),
        isBankrupt: p?.isBankrupt ?? false,
      };
    })
    .sort((a, b) => {
      if (b.money !== a.money) return b.money - a.money;
      return a.name.localeCompare(b.name, 'th');
    })
    .map((row, i) => ({ ...row, place: i + 1 }));
}

function PowsGameOverTable({
  title,
  rows,
  myId,
}: {
  title: string;
  rows: PowsGameOverRow[];
  myId: string;
}) {
  return (
    <div className="pows-game-over__table-block">
      <h3 className="pows-game-over__table-title">{title}</h3>
      <div className="pows-game-over__table-wrap">
        <table className="pows-game-over__table">
          <thead>
            <tr>
              <th scope="col" className="pows-game-over__th-rank">
                อันดับ
              </th>
              <th scope="col">ผู้เล่น</th>
              <th scope="col" className="pows-game-over__th-money">
                เงิน
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className={
                  row.isWinner
                    ? 'pows-game-over__row--winner'
                    : row.id === myId
                      ? 'pows-game-over__row--me'
                      : undefined
                }
              >
                <td className="pows-game-over__rank">{row.place}</td>
                <td className="pows-game-over__name">
                  {row.name}
                  {row.id === myId ? ' (คุณ)' : ''}
                  {row.isBankrupt ? (
                    <span className="pows__bankrupt-tag">ล้มละลาย</span>
                  ) : null}
                  {row.isWinner ? (
                    <span className="pows-game-over__winner-badge">
                      <Trophy size={12} aria-hidden />
                      ชนะ
                    </span>
                  ) : null}
                </td>
                <td className="pows-game-over__money">${row.money.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PowsGameOverModal({
  gameState,
  myId,
  onLeave,
  onRestart,
  isHostPlayer,
}: {
  gameState: PowsPlayerView;
  myId: string;
  onLeave: () => void;
  onRestart?: () => void;
  isHostPlayer: boolean;
}) {
  const result = gameState.gameResult as GameResult;
  const dualMode = gameState.playerOrder.length <= 4;
  const winners = useMemo(() => new Set(result.winners), [result.winners]);

  const dualRows = useMemo(() => {
    if (!dualMode) return [];
    return buildPowsGameOverRows(gameState.playerOrder, gameState.players, winners);
  }, [dualMode, gameState.playerOrder, gameState.players, winners]);

  const managerRows = useMemo(() => {
    if (dualMode) return [];
    return buildPowsGameOverRows(gameState.managerIds, gameState.players, winners);
  }, [dualMode, gameState.managerIds, gameState.players, winners]);

  const investorRows = useMemo(() => {
    if (dualMode) return [];
    return buildPowsGameOverRows(gameState.investorIds, gameState.players, winners);
  }, [dualMode, gameState.investorIds, gameState.players, winners]);

  const winnerLine = useMemo(() => {
    return result.winners
      .map((id) => gameState.players[id]?.name ?? id)
      .filter(Boolean)
      .join(' · ');
  }, [result.winners, gameState.players]);

  return (
    <div
      className="modal-overlay pows-game-over-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pows-game-over-title"
    >
      <div className="modal pows-game-over-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pows-game-over__hero">
          <p className="pows-game-over__kicker" id="pows-game-over-title">
            <Trophy size={20} aria-hidden />
            เกมจบแล้ว
          </p>
          <p className="pows-game-over__winners">{winnerLine || '—'}</p>
          <p className="pows-game-over__reason">{result.reason}</p>
        </div>

        {dualMode ? (
          <PowsGameOverTable title="อันดับรวม" rows={dualRows} myId={myId} />
        ) : (
          <div className="pows-game-over__tables-grid">
            <PowsGameOverTable title="ผู้จัดการ" rows={managerRows} myId={myId} />
            <PowsGameOverTable title="นักลงทุน" rows={investorRows} myId={myId} />
          </div>
        )}

        <GameOverActions
          onLeave={onLeave}
          onRestart={isHostPlayer ? onRestart : undefined}
        />
      </div>
    </div>
  );
}

type Props = {
  gameState: PowsPlayerView;
  myId: string;
  sendAction: (action: unknown) => void;
  onLeave: () => void;
  onRestart?: () => void;
  isHost?: boolean;
};

function PowsRoleReveal({
  slots,
  myId,
  roleAcknowledged,
  hasAcknowledged,
  progress,
  onAcknowledge,
  lastEvent,
}: {
  slots: PowsRoleRevealSlot[];
  myId: string;
  roleAcknowledged: Record<string, boolean>;
  hasAcknowledged: boolean;
  progress: { current: number; total: number };
  onAcknowledge: () => void;
  lastEvent: string;
}) {
  const [pendingAck, setPendingAck] = useState<Record<string, boolean>>({});

  const isPlayerReady = useCallback(
    (playerId: string) => roleAcknowledged[playerId] === true || pendingAck[playerId] === true,
    [roleAcknowledged, pendingAck],
  );

  const handleAcknowledge = () => {
    setPendingAck((prev) => ({ ...prev, [myId]: true }));
    onAcknowledge();
  };

  return (
    <div className="pows__role-reveal" aria-live="polite">
      <p className="pows__role-reveal-hint">{lastEvent}</p>
      <div className="pows__role-reveal-grid">
        {slots.map((slot) => {
          const ready = isPlayerReady(slot.playerId);
          return (
            <div
              key={slot.playerId}
              className={`pows__role-card pows__role-card--${slot.role}${slot.playerId === myId ? ' pows__role-card--me' : ''}${ready ? ' pows__role-card--ready' : ''}`}
              style={
                ready
                  ? undefined
                  : { borderColor: slot.seatColor, boxShadow: `0 0 0 1px ${slot.seatColor}55` }
              }
              aria-disabled={ready}
            >
              <div
                className="pows__role-card-accent"
                style={{ background: ready ? '#3fb950' : slot.seatColor }}
                aria-hidden
              />
              <img
                className="pows__role-card-bg"
                src={powsImg(ROLE_CARD_BACK)}
                alt=""
                loading="eager"
                decoding="async"
              />
              <div className="pows__role-card-body">
                <div className="pows__role-card-name">{slot.name}</div>
                <div className="pows__role-card-role">{ROLE_LABEL_TH[slot.role]}</div>
                {ready && <div className="pows__role-card-ready">พร้อมแล้ว</div>}
              </div>
            </div>
          );
        })}
      </div>
      <p className="pows__role-ack-hint">
        ผู้เล่นรับทราบแล้ว {progress.current}/{progress.total} คน — ต้องครบทุกคนถึงจะเริ่มเกม
      </p>
      {hasAcknowledged || pendingAck[myId] ? (
        <Button type="button" variant="secondary" className="pows__role-ack-btn" disabled>
          คุณรับทราบแล้ว — รอผู้เล่นคนอื่น…
        </Button>
      ) : (
        <Button type="button" className="pows__role-ack-btn" onClick={handleAcknowledge}>
          รับทราบ พร้อมเล่น!
        </Button>
      )}
    </div>
  );
}

const DEAL_PRICE_STEPS = [5_000, 10_000, 20_000, 50_000] as const;

function PowsManagerDealForm({
  companyId,
  draft,
  savedInvestorId,
  savedPrice,
  investorOptions,
  onDraftChange,
  onSave,
  onClear,
  onCloseDeal,
}: {
  companyId: string;
  draft: DealDraft;
  savedInvestorId: string | null;
  savedPrice: number | null;
  investorOptions: { id: string; name: string }[];
  onDraftChange: (patch: Partial<DealDraft>) => void;
  onSave: () => void;
  onClear: () => void;
  onCloseDeal: () => void;
}) {
  const draftPriceNum = draft.price === '' ? null : Number(draft.price);
  const draftValid =
    draft.investorId !== '' && draftPriceNum != null && !Number.isNaN(draftPriceNum);
  const savedReady = savedInvestorId != null && savedPrice != null;
  const canClose = savedReady;

  const addPrice = (amount: number) => {
    const base = draft.price === '' ? 0 : Number(draft.price);
    const next = (Number.isNaN(base) ? 0 : base) + amount;
    onDraftChange({ price: String(next) });
  };

  return (
    <div className="pows__deal-panel" data-company-id={companyId}>
      <div className="pows__deal-panel-head">
        <span className="pows__deal-panel-title">ตั้งดีล</span>
        <span className="pows__deal-panel-hint">1. บันทึก → 2. ปิดดีล</span>
      </div>

      <label className="pows__deal-field">
        <span className="pows__deal-label">นักลงทุน</span>
        <select
          className="pows__deal-input"
          value={draft.investorId}
          onChange={(e) => onDraftChange({ investorId: e.target.value })}
        >
          <option value="">เลือกนักลงทุน…</option>
          {investorOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </label>

      <div className="pows__deal-field">
        <span className="pows__deal-label">ราคาซื้อหุ้น</span>
        <div className="pows__deal-price-row">
          <span className="pows__deal-currency" aria-hidden>
            $
          </span>
          <input
            className="pows__deal-input pows__deal-input--price"
            type="number"
            min={0}
            step={1000}
            inputMode="numeric"
            placeholder="0"
            value={draft.price}
            onChange={(e) => onDraftChange({ price: e.target.value })}
            aria-label="ราคาซื้อหุ้น"
          />
        </div>
        <div className="pows__deal-price-chips" role="group" aria-label="เพิ่มราคาอย่างรวดเร็ว">
          {DEAL_PRICE_STEPS.map((amount) => (
            <button
              key={amount}
              type="button"
              className="pows__deal-chip"
              onClick={() => addPrice(amount)}
            >
              +{amount >= 1000 ? `${amount / 1000}k` : amount}
            </button>
          ))}
        </div>
      </div>

      {savedReady && (
        <p className="pows__deal-saved" role="status">
          บันทึกแล้ว:{' '}
          <strong>
            {investorOptions.find((o) => o.id === savedInvestorId)?.name ?? savedInvestorId} · $
            {savedPrice.toLocaleString()}
          </strong>
        </p>
      )}

      <div className="pows__deal-actions">
        <Button
          type="button"
          variant="secondary"
          className="pows__deal-btn"
          disabled={!draftValid}
          onClick={onSave}
        >
          บันทึกข้อเสนอ
        </Button>
        <Button type="button" variant="ghost" className="pows__deal-btn" onClick={onClear}>
          ล้าง
        </Button>
        <Button
          type="button"
          variant="success"
          className="pows__deal-btn pows__deal-btn--close"
          disabled={!canClose}
          onClick={onCloseDeal}
          title={canClose ? 'ล็อกดีล — แก้ไขไม่ได้จนจบเดือน' : 'บันทึกข้อเสนอก่อน'}
        >
          ปิดดีล (ล็อกสัญญา)
        </Button>
      </div>
    </div>
  );
}

function dealStatusLabel(c: PowsCompany, players: PowsPlayerView['players']): string {
  if (c.dealClosed && c.investorId != null && c.agreedPrice != null) {
    const inv = players[c.investorId]?.name ?? c.investorId;
    return `ปิดดีล · ${inv} · $${c.agreedPrice.toLocaleString()}`;
  }
  if (c.investorId != null && c.agreedPrice != null) {
    const inv = players[c.investorId]?.name ?? c.investorId;
    return `เสนอ · ${inv} · $${c.agreedPrice.toLocaleString()}`;
  }
  if (c.investorId != null) {
    return `นักลงทุน: ${players[c.investorId]?.name ?? c.investorId}`;
  }
  return 'ยังไม่มีดีล';
}

export function PanicOnWallStreetGame({
  gameState,
  myId,
  sendAction,
  onLeave,
  onRestart,
  isHost = false,
}: Props) {
  const [dealDrafts, setDealDrafts] = useState<Record<string, DealDraft>>({});
  const [tick, setTick] = useState(0);
  const [marketRollAnim, setMarketRollAnim] = useState<MarketRollAnimState | null>(null);
  const marketBeforeRollRef = useRef(gameState.market);
  const lastRollAnimKeyRef = useRef<string | null>(null);
  const lastInvestorMarketToastKeyRef = useRef<string | null>(null);
  const lastManagerIncomeToastKeyRef = useRef<string | null>(null);
  const lastManagementCostToastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const pnl = gameState.lastInvestorMarketPnl;
    if (!pnl || gameState.phase === 'investor_income') return;
    const amount = pnl[myId];
    if (amount == null || amount >= 0) return;
    const loss = Math.abs(amount);
    const toastKey = `${gameState.month}:${myId}:${loss}`;
    if (lastInvestorMarketToastKeyRef.current === toastKey) return;
    lastInvestorMarketToastKeyRef.current = toastKey;
    toast.error(`คุณขาดทุนจากตลาด $${loss.toLocaleString()}`, {
      id: 'pows-investor-loss',
      duration: 4500,
    });
  }, [gameState.lastInvestorMarketPnl, gameState.phase, gameState.month, myId]);

  useEffect(() => {
    const paid = gameState.lastManagerIncomePaid;
    if (!paid || gameState.phase === 'manager_income') return;
    const amount = paid[myId];
    if (amount == null || amount <= 0) return;
    const toastKey = `${gameState.month}:${myId}:${amount}`;
    if (lastManagerIncomeToastKeyRef.current === toastKey) return;
    lastManagerIncomeToastKeyRef.current = toastKey;
    toast.success(`คุณได้รับรายได้ผู้จัดการ $${amount.toLocaleString()}`, {
      id: 'pows-manager-income',
      duration: 4500,
    });
  }, [gameState.lastManagerIncomePaid, gameState.phase, gameState.month, myId]);

  useEffect(() => {
    const paid = gameState.lastManagementCostPaid;
    if (!paid || gameState.phase === 'management_cost') return;
    const amount = paid[myId];
    if (amount == null || amount <= 0) return;
    const toastKey = `${gameState.month}:${myId}:${amount}`;
    if (lastManagementCostToastKeyRef.current === toastKey) return;
    lastManagementCostToastKeyRef.current = toastKey;
    toast.error(`คุณจ่ายค่าบริหาร $${amount.toLocaleString()}`, {
      id: 'pows-management-cost',
      duration: 4500,
    });
  }, [gameState.lastManagementCostPaid, gameState.phase, gameState.month, myId]);

  useEffect(() => {
    if (gameState.phase !== 'negotiation' || !gameState.negotiationEndsAtMs) return;
    const id = window.setInterval(() => setTick((x) => x + 1), 1000);
    return () => window.clearInterval(id);
  }, [gameState.phase, gameState.negotiationEndsAtMs]);

  const me = gameState.players[myId];
  const isHostPlayer = isHost || myId === gameState.hostId;
  const dualMode = gameState.playerOrder.length <= 4;

  const negotiationLeftMs =
    gameState.phase === 'negotiation' && gameState.negotiationEndsAtMs != null
      ? Math.max(0, gameState.negotiationEndsAtMs - Date.now()) + tick * 0
      : null;

  const investorOptions = useMemo(() => {
    return gameState.playerOrder
      .filter((id) => {
        const p = gameState.players[id];
        return p && !p.isBankrupt && (p.role === 'investor' || p.role === 'dual');
      })
      .map((id) => ({ id, name: gameState.players[id]?.name ?? id }));
  }, [gameState.playerOrder, gameState.players]);

  const myDebts = useMemo(
    () => (gameState.debts ?? []).filter((d) => d.debtorId === myId),
    [gameState.debts, myId],
  );

  const debtsOwedToMe = useMemo(
    () => (gameState.debts ?? []).filter((d) => d.creditorId === myId),
    [gameState.debts, myId],
  );

  const myPendingShortfalls = useMemo(
    () => (gameState.pendingShortfalls ?? []).filter((p) => p.creditorId === myId),
    [gameState.pendingShortfalls, myId],
  );

  const managerLanes = useMemo(() => {
    return gameState.managerIds.map((mgrId) => {
      const mgr = gameState.players[mgrId];
      const companies = Object.values(gameState.companies)
        .filter((c) => c.ownerManagerId === mgrId && !c.eliminated)
        .sort((a, b) => a.color.localeCompare(b.color) || a.id.localeCompare(b.id));
      return { mgrId, mgr, companies };
    });
  }, [gameState.managerIds, gameState.players, gameState.companies]);

  const myInvestments = useMemo(() => {
    return Object.values(gameState.companies).filter(
      (c) => c.investorId === myId && !c.eliminated && c.ownerManagerId,
    );
  }, [gameState.companies, myId]);

  const auctionCompany = useMemo(() => {
    const id = gameState.auction.currentCompanyId;
    return id ? gameState.companies[id] : null;
  }, [gameState.auction.currentCompanyId, gameState.companies]);

  const send = (a: PowsAction) => sendAction(a);

  const lastRoll = gameState.lastDiceRoll;
  const gameOver = gameState.phase === 'game_over' && gameState.gameResult;

  useEffect(() => {
    if (gameState.phase !== 'game_over') return;
    return startPowsWinCelebrationLoop();
  }, [gameState.phase]);

  useEffect(() => {
    if (gameState.phase === 'investor_income') {
      marketBeforeRollRef.current = gameState.market;
    }
  }, [gameState.phase, gameState.market]);

  useEffect(() => {
    if (gameState.phase !== 'manager_income' || !gameState.lastDiceRoll) return;
    const key = JSON.stringify(gameState.lastDiceRoll);
    if (lastRollAnimKeyRef.current === key) return;
    lastRollAnimKeyRef.current = key;

    const from = marketPositionsFromState(marketBeforeRollRef.current);
    const to = marketPositionsFromState(gameState.market);
    setMarketRollAnim({
      from,
      to,
      deltas: gameState.lastDiceRoll,
      stepIndex: 0,
      displayPositions: { ...from },
    });
  }, [gameState.phase, gameState.lastDiceRoll, gameState.market]);

  useEffect(() => {
    if (!marketRollAnim) return;
    if (marketRollAnim.stepIndex >= POWS_MARKET_ROLL_COLOR_ORDER.length) {
      const doneTimer = window.setTimeout(() => setMarketRollAnim(null), 400);
      return () => window.clearTimeout(doneTimer);
    }

    const color = POWS_MARKET_ROLL_COLOR_ORDER[marketRollAnim.stepIndex]!;
    const possible = powsPossibleMarketPositions(
      marketRollAnim.from[color],
      POWS_MARKET_DICE_FACES[color],
    );
    let tick = 0;
    const interval = window.setInterval(() => {
      const pos = possible[tick % possible.length]!;
      tick += 1;
      setMarketRollAnim((prev) =>
        prev ? { ...prev, displayPositions: { ...prev.displayPositions, [color]: pos } } : null,
      );
    }, 140);

    const stepTimer = window.setTimeout(() => {
      setMarketRollAnim((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          stepIndex: prev.stepIndex + 1,
          displayPositions: { ...prev.displayPositions, [color]: prev.to[color] },
        };
      });
    }, POWS_MARKET_ROLL_ANIM_MS_PER_COLOR);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(stepTimer);
    };
  }, [marketRollAnim?.stepIndex]);

  const marketMarkerPositions = useMemo(() => {
    if (marketRollAnim) return marketRollAnim.displayPositions;
    return marketPositionsFromState(gameState.market);
  }, [marketRollAnim, gameState.market]);

  const activeRollingColor =
    marketRollAnim && marketRollAnim.stepIndex < POWS_MARKET_ROLL_COLOR_ORDER.length
      ? POWS_MARKET_ROLL_COLOR_ORDER[marketRollAnim.stepIndex]!
      : null;

  const marketRollingLabel = activeRollingColor
    ? `กำลังทอย ${COLOR_LABEL[activeRollingColor]}… (${marketRollAnim!.stepIndex + 1}/${POWS_MARKET_ROLL_COLOR_ORDER.length})`
    : null;

  const showMarketPossibleOutcomes =
    gameState.phase === 'investor_income' || marketRollAnim != null;

  const marketPossibleAnchors = useMemo(() => {
    if (marketRollAnim) return marketRollAnim.from;
    return marketMarkerPositions;
  }, [marketRollAnim, marketMarkerPositions]);

  const getDraft = (c: PowsCompany): DealDraft => {
    const saved = dealDrafts[c.id];
    if (saved) return saved;
    return {
      investorId: c.investorId ?? '',
      price: c.agreedPrice != null ? String(c.agreedPrice) : '',
    };
  };

  const setDraft = (companyId: string, patch: Partial<DealDraft>) => {
    setDealDrafts((prev) => {
      const c = gameState.companies[companyId];
      const base = prev[companyId] ?? {
        investorId: c?.investorId ?? '',
        price: c?.agreedPrice != null ? String(c.agreedPrice) : '',
      };
      return { ...prev, [companyId]: { ...base, ...patch } };
    });
  };

  const submitDeal = (companyId: string) => {
    const d = getDraft(gameState.companies[companyId]!);
    const price = d.price === '' ? null : Number(d.price);
    send({
      type: 'set_deal',
      companyId,
      investorId: d.investorId === '' ? null : d.investorId,
      agreedPrice: price == null || Number.isNaN(price) ? null : price,
    });
  };

  const inAuctionPhase = gameState.phase === 'auction';

  if (gameState.phase === 'role_reveal') {
    const slots = gameState.roleRevealSlots ?? [];
    const progress = gameState.roleAcknowledgeProgress ?? {
      current: gameState.roleAcknowledgeCount ?? 0,
      total: gameState.playerOrder.length,
    };
    return (
      <GameShell className="pows pows--role-reveal">
        <GamePlayHeader
          title="Panic on Wall Street"
          subtitle={PHASE_LABEL.role_reveal}
          onLeave={onLeave}
          onRestart={onRestart}
        />
        <PowsRoleReveal
          slots={slots}
          myId={myId}
          roleAcknowledged={gameState.roleAcknowledged ?? {}}
          hasAcknowledged={gameState.hasAcknowledgedRole ?? false}
          progress={progress}
          lastEvent={gameState.lastEvent}
          onAcknowledge={() => send({ type: 'acknowledge_role' })}
        />
      </GameShell>
    );
  }

  return (
    <GameShell className={`pows${inAuctionPhase ? ' pows--auction-dock-open' : ''}`}>
      <GamePlayHeader
        title="Panic on Wall Street"
        trailing={
          <>
            <div className="pows__game-status" role="status" aria-live="polite">
              <span className="pows__status-chip pows__status-chip--month">
                เดือน {gameState.month}/{gameState.totalMonths}
              </span>
              <span
                className={`pows__status-chip pows__status-chip--phase pows__status-chip--${gameState.phase}`}
              >
                {PHASE_LABEL[gameState.phase]}
              </span>
              {gameState.phase === 'negotiation' &&
                gameState.negotiationDuration === 'unlimited' &&
                gameState.negotiationEndsAtMs == null && (
                  <span className="pows__status-chip pows__status-chip--timer">ไม่จำกัด</span>
                )}
              {negotiationLeftMs != null && gameState.phase === 'negotiation' && (
                <span
                  className={`pows__status-chip pows__status-chip--timer${
                    negotiationLeftMs <= 30_000 ? ' pows__status-chip--urgent' : ''
                  }`}
                >
                  เหลือ {Math.ceil(negotiationLeftMs / 1000)} วิ
                </span>
              )}
            </div>
            {me ? (
              <span className="pows__pill">
                {me.name} · ${me.money.toLocaleString()} ·{' '}
                {me.role === 'dual' ? 'ผจก.+นลท.' : me.role === 'manager' ? 'ผู้จัดการ' : 'นักลงทุน'}
              </span>
            ) : null}
          </>
        }
        onLeave={onLeave}
        onRestart={isHostPlayer ? onRestart : undefined}
      />

      <div className="pows__grid">
        <section className="pows__panel">
          <h3>กระดานตลาด</h3>
          <div className="pows__market-board-center">
            <PowsMarketBoard
              market={gameState.market}
              markerPositions={marketMarkerPositions}
              possibleAnchorPositions={marketPossibleAnchors}
              showPossibleOutcomes={showMarketPossibleOutcomes}
              activeRollingColor={activeRollingColor}
              rollingLabel={marketRollingLabel}
            />
          </div>
          <div className="pows__market-row">
            {MARKET_COLORS.map((c) => (
              <div key={c} className={`pows__market-cell pows__market-cell--${c}`}>
                {COLOR_LABEL[c]}
                <strong>${gameState.market[c].value.toLocaleString()}</strong>
                <span className="pows__muted">ตำแหน่ง {gameState.market[c].position}</span>
              </div>
            ))}
          </div>
          {lastRoll ? (
            <div className="pows__dice">
              ทอยล่าสุด:
              {MARKET_COLORS.map((c) => (
                <span key={c} className={`pows__pill pows__pill--${c}`}>
                  {COLOR_LABEL[c]} {powsFormatMarketDelta(lastRoll[c])}
                </span>
              ))}
            </div>
          ) : null}
          <p className="pows__event">{gameState.lastEvent}</p>
        </section>

        <section className="pows__panel">
          <h3>ผู้เล่น</h3>
          <div className="pows__players">
            {gameState.playerOrder.map((id) => {
              const p = gameState.players[id];
              if (!p) return null;
              return (
                <div key={id} className={`pows__player ${id === myId ? 'pows__player--me' : ''}`}>
                  <span>
                    {p.name}
                    {p.isBankrupt && <span className="pows__bankrupt-tag">ล้มละลาย</span>}
                    {p.bankTokenColor && (
                      <span className="pows__bank-dot" style={{ background: p.bankTokenColor }} />
                    )}
                  </span>
                  <strong>${p.money.toLocaleString()}</strong>
                </div>
              );
            })}
          </div>

          {(myDebts.length > 0 || debtsOwedToMe.length > 0) && (
            <div className="pows__debts">
              <h4>หนี้ / ลูกหนี้</h4>
              {myDebts.length > 0 && (
                <div className="pows__debt-block">
                  <p className="pows__muted">คุณเป็นหนี้</p>
                  <ul>
                    {myDebts.map((d) => {
                      const creditor = gameState.players[d.creditorId]?.name ?? d.creditorId;
                      const co = gameState.companies[d.companyId];
                      return (
                        <li key={d.id} className="pows__debt-row">
                          <span>
                            → {creditor} · {co ? COLOR_LABEL[co.color] : d.companyId} · $
                            {d.amountOwed.toLocaleString()}
                          </span>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => send({ type: 'pay_debt', debtId: d.id })}
                            disabled={!me || me.money <= 0 || me.isBankrupt}
                          >
                            จ่าย
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {debtsOwedToMe.length > 0 && (
                <div className="pows__debt-block">
                  <p className="pows__muted">ลูกหนี้ของคุณ</p>
                  <ul>
                    {debtsOwedToMe.map((d) => {
                      const debtor = gameState.players[d.debtorId]?.name ?? d.debtorId;
                      const co = gameState.companies[d.companyId];
                      return (
                        <li key={d.id}>
                          {debtor} · {co ? COLOR_LABEL[co.color] : d.companyId} · $
                          {d.amountOwed.toLocaleString()}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}

          {gameState.phase === 'debt_resolution' && myPendingShortfalls.length > 0 && (
            <div className="pows__shortfalls">
              <h4>หนี้ค้าง — เลือกผ่อนหรือล้มละลาย</h4>
              {myPendingShortfalls.map((sf) => {
                const debtor = gameState.players[sf.debtorId]?.name ?? sf.debtorId;
                const co = gameState.companies[sf.companyId];
                return (
                  <div key={sf.companyId} className="pows__shortfall-row">
                    <p>
                      {debtor} ค้าง ${sf.amountOwed.toLocaleString()}
                      {co ? ` (${COLOR_LABEL[co.color]})` : ''}
                    </p>
                    <div className="pows__shortfall-actions">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() =>
                          send({ type: 'resolve_shortfall_defer', companyId: sf.companyId })
                        }
                      >
                        ผ่อนหนี้
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        onClick={() =>
                          send({ type: 'resolve_shortfall_bankrupt', companyId: sf.companyId })
                        }
                      >
                        ล้มละลาย
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {myInvestments.length > 0 && (
            <div className="pows__investments">
              <h4>การลงทุนของคุณ</h4>
              <ul>
                {myInvestments.map((c) => {
                  const mgr = c.ownerManagerId ? gameState.players[c.ownerManagerId]?.name : '—';
                  return (
                    <li key={c.id}>
                      <span className={`pows__color-dot pows__color-dot--${c.color}`} />
                      {COLOR_LABEL[c.color]}
                      {c.isDoubleIncome ? ' 2x' : ''} · ผจก. {mgr} ·{' '}
                      {dealStatusLabel(c, gameState.players)}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {isHostPlayer && !gameOver && (
            <div className="pows__host-actions">
              <h3>หัวห้อง — เฟส</h3>
              {gameState.phase === 'negotiation' && (
                <Button type="button" onClick={() => send({ type: 'host_end_negotiation' })}>
                  จบการเจรจา (ทันที)
                </Button>
              )}
              {gameState.phase === 'investor_income' && (
                <Button
                  type="button"
                  disabled={marketRollAnim != null}
                  onClick={() => send({ type: 'host_roll_market' })}
                >
                  {marketRollAnim ? 'กำลังทอยตลาด…' : 'ทอยตลาด 4 สี + จ่ายรายได้นักลงทุน'}
                </Button>
              )}
              {gameState.phase === 'manager_income' && (
                <Button type="button" onClick={() => send({ type: 'host_apply_manager_income' })}>
                  จ่ายรายได้ให้ผู้จัดการ
                </Button>
              )}
              {gameState.phase === 'management_cost' && (
                <Button type="button" onClick={() => send({ type: 'host_apply_management_costs' })}>
                  จ่ายค่าบริหาร ($10k/ใบ)
                </Button>
              )}
              {gameState.phase === 'auction' &&
                gameState.auction.status !== 'bidding' &&
                gameState.auction.companyQueue.length > 0 && (
                  <Button type="button" onClick={() => send({ type: 'host_start_auction_lot' })}>
                    เริ่มใบประมูลถัดไป ({powsAuctionLotCount(gameState.auction)} คิว)
                  </Button>
                )}
              {gameState.phase === 'auction' && powsCanFinishAuctionMonth(gameState.auction) && (
                <Button type="button" onClick={() => send({ type: 'host_finish_auction_month' })}>
                  จบประมูล · เริ่มเดือนถัดไป
                </Button>
              )}
            </div>
          )}
        </section>
      </div>

      <section className="pows__panel pows__floor">
        <div className="pows__floor-head">
          <h3>โต๊ะบริษัท</h3>
          {gameState.phase === 'negotiation' && (
            <p className="pows__muted">
              {dualMode
                ? 'ลงทุนได้เฉพาะบริษัทของผู้อื่น — ปิดดีลเมื่อตกลงราคาแล้ว'
                : 'ผู้จัดการตั้งดีล · นักลงทุนปิดสัญญาเมื่อพร้อม'}
            </p>
          )}
        </div>

        <div className="pows__lanes">
          {managerLanes.map(({ mgrId, mgr, companies }) => (
            <article
              key={mgrId}
              className={`pows__lane ${mgrId === myId ? 'pows__lane--mine' : ''}`}
            >
              <header className="pows__lane-head">
                <span className="pows__lane-name">
                  {mgr?.name ?? mgrId}
                  {mgrId === myId ? ' (คุณ)' : ''}
                </span>
                <span className="pows__muted">{companies.length} ใบ</span>
              </header>

              {companies.length === 0 ? (
                <p className="pows__muted pows__lane-empty">ไม่มีบริษัท</p>
              ) : (
                <div className="pows__lane-cards">
                  {companies.map((c) => {
                    const isOwner = c.ownerManagerId === myId;
                    const isInvestor = c.investorId === myId;
                    const draft = getDraft(c);
                    const canEditDeal =
                      gameState.phase === 'negotiation' && !c.dealClosed && isOwner;
                    const canCloseAsInvestor =
                      gameState.phase === 'negotiation' &&
                      !c.dealClosed &&
                      isInvestor &&
                      c.investorId != null &&
                      c.agreedPrice != null;

                    return (
                      <div
                        key={c.id}
                        className={[
                          'pows__card',
                          `pows__card--${c.color}`,
                          isOwner ? 'pows__card--mine' : '',
                          c.dealClosed ? 'pows__card--closed' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        {c.isDoubleIncome && <span className="pows__card-badge">2× รายได้</span>}
                        <img
                          src={powsImg(c.imagePublicId)}
                          alt=""
                          width={STOCK_CARD_WIDTH}
                          height={STOCK_CARD_HEIGHT}
                          loading="lazy"
                          decoding="async"
                        />
                        <div className="pows__card-meta">
                          <span className={`pows__color-tag pows__color-tag--${c.color}`}>
                            {COLOR_LABEL[c.color]}
                          </span>
                          <p className="pows__deal-line">{dealStatusLabel(c, gameState.players)}</p>
                        </div>

                        {canEditDeal && (
                          <PowsManagerDealForm
                            companyId={c.id}
                            draft={draft}
                            savedInvestorId={c.investorId}
                            savedPrice={c.agreedPrice}
                            investorOptions={investorOptions.filter(
                              (o) => !dualMode || o.id !== myId,
                            )}
                            onDraftChange={(patch) => setDraft(c.id, patch)}
                            onSave={() => submitDeal(c.id)}
                            onClear={() => send({ type: 'clear_deal', companyId: c.id })}
                            onCloseDeal={() => send({ type: 'close_deal', companyId: c.id })}
                          />
                        )}

                        {canCloseAsInvestor && !isOwner && (
                          <div className="pows__deal-panel pows__deal-panel--investor">
                            <p className="pows__deal-panel-title">ยืนยันดีล</p>
                            <p className="pows__deal-panel-summary">
                              ราคา ${c.agreedPrice?.toLocaleString()} — กดปิดดีลเมื่อพร้อมผูกสัญญา
                            </p>
                            <Button
                              type="button"
                              className="pows__deal-close-btn"
                              onClick={() => send({ type: 'close_deal', companyId: c.id })}
                            >
                              ปิดดีล (นักลงทุน)
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      <PowsAuctionDock
        gameState={gameState}
        myId={myId}
        isHostPlayer={isHostPlayer}
        auctionCompany={auctionCompany}
        send={send}
      />

      {gameOver && (
        <PowsGameOverModal
          gameState={gameState}
          myId={myId}
          onLeave={onLeave}
          onRestart={onRestart}
          isHostPlayer={isHostPlayer}
        />
      )}
    </GameShell>
  );
}
