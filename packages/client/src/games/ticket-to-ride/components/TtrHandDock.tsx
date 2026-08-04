import { useEffect, useMemo, useState } from 'react';
import type {
  TtrCardColor,
  TtrClaimOption,
  TtrDestinationTicket,
  TtrMapDefinition,
  TtrRouteView,
  TtrTrainColor,
} from 'shared';
import { ttrCityName } from 'shared';
import { Badge, Button } from '../../../components/ui';
import { useResponsiveSize } from '../../../hooks/useResponsiveSize';
import { cn } from '../../../utils/cn';
import { TTR_DROP_TRAIN_HAND } from '../ttrDrawDrag';
import { TTR_ROUTE_COLOR_LABEL, TTR_TRAIN_COLOR_LABEL } from '../ttrLabels';
import { TtrTicketHand } from './TtrTicketHand';
import { TtrTrainHand } from './TtrTrainHand';

type HandTab = 'trains' | 'tickets';

type ClaimPayment = {
  color: TtrCardColor | null;
  colorCards: number;
  locomotives: number;
};

const EMPTY_PAYMENT: ClaimPayment = { color: null, colorCards: 0, locomotives: 0 };

type Props = {
  map: TtrMapDefinition;
  hand: Record<TtrTrainColor, number>;
  tickets: TtrDestinationTicket[];
  completedIds: ReadonlySet<string>;
  selectedTicketId: string | null;
  onSelectTicket: (ticketId: string) => void;
  canDrop: boolean;
  myTrainsLeft: number;
  myTrainCardTotal: number;
  selectedRoute: TtrRouteView | null;
  claimOptions: TtrClaimOption[];
  canClaim: boolean;
  ownerName?: string;
  onClaim: (option: TtrClaimOption) => void;
  onCancelClaim: () => void;
};

function matchClaimOption(
  payment: ClaimPayment,
  options: TtrClaimOption[],
): TtrClaimOption | null {
  if (payment.colorCards === 0 && payment.locomotives > 0) {
    return options.find((o) => o.colorCards === 0 && o.locomotives === payment.locomotives) ?? null;
  }
  if (payment.color == null || payment.colorCards <= 0) return null;
  return (
    options.find(
      (o) =>
        o.color === payment.color &&
        o.colorCards === payment.colorCards &&
        o.locomotives === payment.locomotives,
    ) ?? null
  );
}

/** Fixed bottom hand dock: train/ticket tabs, drop target, and claim-from-hand. */
export function TtrHandDock({
  map,
  hand,
  tickets,
  completedIds,
  selectedTicketId,
  onSelectTicket,
  canDrop,
  myTrainsLeft,
  myTrainCardTotal,
  selectedRoute,
  claimOptions,
  canClaim,
  ownerName,
  onClaim,
  onCancelClaim,
}: Props) {
  const actionButtonSize = useResponsiveSize({ base: 'xs', md: 'md' });
  const [tab, setTab] = useState<HandTab>('trains');
  const [payment, setPayment] = useState<ClaimPayment>(EMPTY_PAYMENT);
  const claimMode = selectedRoute != null;

  useEffect(() => {
    if (!claimMode) {
      setPayment(EMPTY_PAYMENT);
      return;
    }
    setTab('trains');
    setPayment(EMPTY_PAYMENT);
  }, [claimMode, selectedRoute?.id]);

  const playableColors = useMemo(() => {
    if (!claimMode) return undefined;
    const colors = new Set<TtrTrainColor>();
    for (const option of claimOptions) {
      if (option.colorCards > 0) colors.add(option.color);
      if (option.locomotives > 0) colors.add('locomotive');
    }
    return colors;
  }, [claimMode, claimOptions]);

  const matchedOption = useMemo(
    () => (claimMode ? matchClaimOption(payment, claimOptions) : null),
    [claimMode, payment, claimOptions],
  );

  const selectedCounts = useMemo(() => {
    if (!claimMode) return undefined;
    const counts: Partial<Record<TtrTrainColor, number>> = {};
    if (payment.color && payment.colorCards > 0) counts[payment.color] = payment.colorCards;
    if (payment.locomotives > 0) counts.locomotive = payment.locomotives;
    return counts;
  }, [claimMode, payment]);

  const onCardTap = (color: TtrTrainColor) => {
    if (!claimMode) return;
    setPayment((prev) => {
      if (color === 'locomotive') {
        const next = prev.locomotives >= hand.locomotive ? 0 : prev.locomotives + 1;
        return { ...prev, locomotives: next };
      }
      if (prev.color !== color) {
        return { color, colorCards: 1, locomotives: prev.locomotives };
      }
      const next = prev.colorCards >= hand[color] ? 0 : prev.colorCards + 1;
      return {
        color: next === 0 ? null : color,
        colorCards: next,
        locomotives: prev.locomotives,
      };
    });
  };

  const routeMeta = selectedRoute
    ? (() => {
        const { def } = selectedRoute;
        const title = `${ttrCityName(map, def.a)} – ${ttrCityName(map, def.b)}`;
        const points = map.routePoints[def.length] ?? 0;
        return { title, points, def };
      })()
    : null;

  return (
    <aside className="ttr-hand-dock" role="region" aria-label="การ์ดบนมือคุณ">
      <div className="ttr-hand-dock__inner">
        <div className="ttr-hand-dock__header">
          <div className="ttr-hand-dock__tabs" role="tablist" aria-label="ประเภทการ์ดบนมือ">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'trains'}
              className={cn('ttr-hand-dock__tab', tab === 'trains' && 'is-active')}
              onClick={() => setTab('trains')}
            >
              รถไฟ
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'tickets'}
              className={cn('ttr-hand-dock__tab', tab === 'tickets' && 'is-active')}
              onClick={() => setTab('tickets')}
              disabled={claimMode}
            >
              ตั๋ว
            </button>
          </div>

          {claimMode && routeMeta ? (
            <div className="ttr-hand-dock__claim-meta">
              <p className="ttr-hand-dock__claim-title">
                {routeMeta.title}
                {routeMeta.def.tunnel ? (
                  <Badge size="sm" variant="warning">
                    อุโมงค์
                  </Badge>
                ) : null}
                {routeMeta.def.ferryLocomotives ? (
                  <Badge size="sm" variant="info">
                    เรือ ×{routeMeta.def.ferryLocomotives}
                  </Badge>
                ) : null}
              </p>
              <p className="ttr-hand-dock__claim-sub">
                {routeMeta.def.length} คัน · {TTR_ROUTE_COLOR_LABEL[routeMeta.def.color]} ·{' '}
                {routeMeta.points} แต้ม
                {selectedRoute.ownerId != null
                  ? ` · ยึดแล้วโดย ${ownerName ?? selectedRoute.ownerId}`
                  : ''}
              </p>
            </div>
          ) : (
            <p className="ttr-hand-dock__stats">
              รถไฟคงเหลือ {myTrainsLeft} · การ์ดรถไฟ {myTrainCardTotal} · หัวรถจักร{' '}
              {hand.locomotive}
            </p>
          )}

          {claimMode ? (
            <div className="ttr-hand-dock__actions">
              <Button type="button" size={actionButtonSize} variant="ghost" onClick={onCancelClaim}>
                ยกเลิก
              </Button>
              <Button
                type="button"
                size={actionButtonSize}
                disabled={!canClaim || matchedOption == null}
                onClick={() => {
                  if (matchedOption) onClaim(matchedOption);
                }}
              >
                ลงเส้นทาง
              </Button>
            </div>
          ) : null}
        </div>

        {claimMode && claimOptions.length === 0 ? (
          <p className="ttr-hand-dock__hint">
            {canClaim
              ? selectedRoute?.ownerId
                ? 'เส้นทางนี้ถูกยึดแล้ว'
                : `ยังลงเส้นนี้ไม่ได้ — เลือกสีที่ตรงกับตัวเลือกที่จ่ายได้ · บนมือมีหัวรถจักร ${hand.locomotive} ใบ`
              : 'รอถึงตาคุณก่อนจึงจะลงเส้นทางได้'}
          </p>
        ) : null}

        {claimMode && claimOptions.length > 0 ? (
          <p className="ttr-hand-dock__hint">
            แตะการ์ดเพื่อเลือกจำนวนที่จ่าย
            {matchedOption
              ? ` · ${TTR_TRAIN_COLOR_LABEL[matchedOption.color]} ×${matchedOption.colorCards}${
                  matchedOption.locomotives > 0
                    ? ` + ${TTR_TRAIN_COLOR_LABEL.locomotive} ×${matchedOption.locomotives}`
                    : ''
                }`
              : payment.colorCards + payment.locomotives > 0
                ? ' · ยังไม่ตรงกับวิธีจ่ายที่ถูกต้อง'
                : ''}
          </p>
        ) : null}

        <div className="ttr-hand-dock__body" role="tabpanel">
          {tab === 'trains' ? (
            <TtrTrainHand
              dropId={TTR_DROP_TRAIN_HAND}
              hand={hand}
              canDrop={canDrop}
              compact
              cardsClassName="ttr-hand-dock__card-row"
              visibleColors={playableColors}
              selectedCounts={selectedCounts}
              onCardTap={claimMode && claimOptions.length > 0 ? onCardTap : undefined}
              emptyHint={
                claimMode
                  ? claimOptions.length === 0
                    ? 'ยังไม่มีสีที่จ่ายลงเส้นนี้ได้'
                    : 'ไม่มีสีที่จ่ายได้บนมือ'
                  : undefined
              }
            />
          ) : (
            <TtrTicketHand
              map={map}
              tickets={tickets}
              completedIds={completedIds}
              selectedTicketId={selectedTicketId}
              onSelect={onSelectTicket}
              variant="dock"
            />
          )}
        </div>
      </div>
    </aside>
  );
}
