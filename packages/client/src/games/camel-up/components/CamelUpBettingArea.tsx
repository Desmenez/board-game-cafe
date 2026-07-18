import { useMemo } from 'react';
import {
  CAMEL_UP_COLORS,
  CAMEL_UP_OVERALL_PAYOUT_BY_ORDER,
  type CamelUpAction,
  type CamelUpColor,
  type CamelUpMyOverallBet,
  type CamelUpOverallPlacement,
  type CamelUpPlayerView,
} from 'shared';
import { Badge, Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui';
import { camelUpRaceCardUrl } from '../lib/assetMeta';
import { colorsForActionType } from '../lib/camelUpLegalActions';
import { CamelUpLegBetStacks } from './CamelUpLegBetStacks';
import { CAMEL_COLOR_LABEL, camelColorClass } from '../lib/camelMeta';

type Props = {
  legBetStacks: CamelUpPlayerView['legBetStacks'];
  draggableLegColors: readonly CamelUpColor[];
  overallWinnerPiles: CamelUpPlayerView['overallWinnerPiles'];
  overallLoserPiles: CamelUpPlayerView['overallLoserPiles'];
  myOverallBets: CamelUpMyOverallBet[];
  overallWinnerPlacements: CamelUpOverallPlacement[];
  overallLoserPlacements: CamelUpOverallPlacement[];
  overallWinnerFaceDownCount: number;
  overallLoserFaceDownCount: number;
  players: CamelUpPlayerView['players'];
  revealed: boolean;
  canAct: boolean;
  legalActions: CamelUpAction[];
  raceCardsWinnerInHand: CamelUpColor[];
  raceCardsLoserInHand: CamelUpColor[];
  sendAction: (action: unknown) => void;
};

function playerName(players: CamelUpPlayerView['players'], id: string): string {
  return players.find((p) => p.id === id)?.name ?? id;
}

function ColorSwatch({ color }: { color: CamelUpColor }) {
  return (
    <span className={['camel-up-betting__swatch', camelColorClass(color)].join(' ')} aria-hidden />
  );
}

function LegBetTakenTable({ players }: { players: CamelUpPlayerView['players'] }) {
  const takenCount = players.filter((p) => p.legBet).length;

  return (
    <section
      className="camel-up-betting__placed-card camel-up-leg-taken"
      aria-label="เดิมพัน Leg ที่ลงแล้ว"
    >
      <h4 className="camel-up-overall-table__title">
        เดิมพัน Leg นี้ ({takenCount}/{players.length})
      </h4>
      {takenCount === 0 ? (
        <p className="camel-up-leg-taken__empty">ยังไม่มีใครเดิมพัน</p>
      ) : (
        <ul className="camel-up-overall-table__rows">
          {players
            .filter((p) => p.legBet)
            .map((p) => (
              <li
                key={p.id}
                className="camel-up-overall-table__row camel-up-overall-table__row--leg"
              >
                <span className="camel-up-overall-table__who">{p.name}</span>
                <span className="camel-up-overall-table__leg-bet">
                  <ColorSwatch color={p.legBet!.color} />
                  {CAMEL_COLOR_LABEL[p.legBet!.color]} · {p.legBet!.value} EP
                </span>
              </li>
            ))}
        </ul>
      )}
    </section>
  );
}

function MyOverallBetsPanel({ bets }: { bets: CamelUpMyOverallBet[] }) {
  if (bets.length === 0) return null;

  return (
    <section className="camel-up-my-overall-bets" aria-label="การ์ดเดิมพันทั้งเกมของคุณ">
      <h4 className="camel-up-my-overall-bets__title">การ์ดของคุณที่วางแล้ว</h4>
      <ul className="camel-up-my-overall-bets__list">
        {bets.map((bet, index) => (
          <li key={`${bet.kind}-${bet.color}-${index}`} className="camel-up-my-overall-bets__item">
            <img
              src={camelUpRaceCardUrl(bet.color)}
              alt=""
              className="camel-up-my-overall-bets__card-img"
              loading="lazy"
            />
            <div>
              <span className="camel-up-my-overall-bets__kind">
                {bet.kind === 'winner' ? 'เดิมพันผู้ชนะ' : 'เดิมพันผู้แพ้'}
              </span>
              <span className="camel-up-my-overall-bets__meta">
                {CAMEL_COLOR_LABEL[bet.color]} · ลำดับที่ {bet.orderInPile} ในกอง
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function OverallPlacementColumn({
  label,
  placements,
  players,
}: {
  label: string;
  placements: CamelUpOverallPlacement[];
  players: CamelUpPlayerView['players'];
}) {
  return (
    <div className="camel-up-overall-placement">
      <div className="camel-up-overall-placement__head">
        <h4 className="camel-up-overall-placement__title">{label}</h4>
        <Badge variant="outline">{placements.length} ใบ</Badge>
      </div>
      {placements.length === 0 ? (
        <p className="camel-up-overall-placement__empty">ยังไม่มีการ์ดวาง</p>
      ) : (
        <ol className="camel-up-overall-placement__list">
          {placements.map((placement, index) => (
            <li key={`${placement.playerId}-${index}`} className="camel-up-overall-placement__item">
              <span className="camel-up-overall-table__order">{index + 1}</span>
              <span className="camel-up-overall-table__who">
                {playerName(players, placement.playerId)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function OverallHiddenBoard({
  winnerPlacements,
  loserPlacements,
  players,
}: {
  winnerPlacements: CamelUpOverallPlacement[];
  loserPlacements: CamelUpOverallPlacement[];
  players: CamelUpPlayerView['players'];
}) {
  return (
    <section
      className="camel-up-betting__placed-card camel-up-overall-hidden"
      aria-label="การ์ดเดิมพันทั้งเกมบนโต๊ะ"
    >
      <h4 className="camel-up-overall-table__title">เดิมพันทั้งเกมบนโต๊ะ</h4>
      {/* <p className="camel-up-betting__hint">
        การ์ดคว่ำ — ยังไม่เปิดเผยสีที่เดิมพัน (จะเปิดเมื่อจบเกม)
      </p> */}
      <div className="camel-up-overall-hidden__stacks">
        <OverallPlacementColumn
          label="เดิมพันผู้ชนะทั้งเกม"
          placements={winnerPlacements}
          players={players}
        />
        <OverallPlacementColumn
          label="เดิมพันผู้แพ้ทั้งเกม"
          placements={loserPlacements}
          players={players}
        />
      </div>
    </section>
  );
}

function OverallBetTable({
  title,
  piles,
  players,
}: {
  title: string;
  piles: CamelUpPlayerView['overallWinnerPiles'];
  players: CamelUpPlayerView['players'];
}) {
  return (
    <div className="camel-up-overall-table">
      <h4 className="camel-up-overall-table__title">{title}</h4>
      <ul className="camel-up-overall-table__rows">
        {piles.map((pile) => (
          <li key={pile.color} className="camel-up-overall-table__row">
            <div className="camel-up-overall-table__color">
              <ColorSwatch color={pile.color} />
              <span>{CAMEL_COLOR_LABEL[pile.color]}</span>
            </div>
            <div className="camel-up-overall-table__bets">
              {pile.bets.length === 0 ? (
                <span className="camel-up-overall-table__none">—</span>
              ) : (
                pile.bets.map((bet, idx) => (
                  <span
                    key={`${bet.playerId}-${idx}`}
                    className="camel-up-overall-table__chip"
                    title={`${playerName(players, bet.playerId)} · ลำดับที่ ${idx + 1} · จ่าย ${CAMEL_UP_OVERALL_PAYOUT_BY_ORDER[idx] ?? 1} EP`}
                  >
                    <span className="camel-up-overall-table__order">{idx + 1}</span>
                    <span className="camel-up-overall-table__who">
                      {playerName(players, bet.playerId)}
                    </span>
                    {bet.color ? (
                      <span className="camel-up-overall-table__revealed">
                        {CAMEL_COLOR_LABEL[bet.color]}
                      </span>
                    ) : null}
                  </span>
                ))
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function OverallBetPickerColumn({
  kind,
  label,
  canBet,
  legalColors,
  cardsInHand,
  sendAction,
}: {
  kind: 'winner' | 'loser';
  label: string;
  canBet: boolean;
  legalColors: CamelUpColor[];
  cardsInHand: CamelUpColor[];
  sendAction: (action: unknown) => void;
}) {
  const actionType = kind === 'winner' ? 'bet-overall-winner' : 'bet-overall-loser';

  return (
    <div className="camel-up-overall-picker__column">
      <h4 className="camel-up-overall-picker__column-title">{label}</h4>
      <div className="camel-up-overall-picker__cards">
        {CAMEL_UP_COLORS.map((color) => {
          const inHand = cardsInHand.includes(color);
          const used = !inHand;
          const playable = canBet && inHand && legalColors.includes(color);

          return (
            <button
              key={`${kind}-${color}`}
              type="button"
              disabled={!playable}
              className={[
                'camel-up-overall-picker__card',
                camelColorClass(color),
                used ? 'camel-up-overall-picker__card--used' : '',
              ].join(' ')}
              onClick={() => playable && sendAction({ type: actionType, color })}
            >
              <img
                src={camelUpRaceCardUrl(color)}
                alt=""
                className="camel-up-overall-picker__card-img"
                loading="lazy"
              />
              <span className="camel-up-overall-picker__card-label">
                {CAMEL_COLOR_LABEL[color]}
              </span>
              <span className="camel-up-overall-picker__card-meta">
                {used ? 'วางแล้ว' : playable ? 'วางคว่ำบนโต๊ะ' : '—'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function OverallBetPicker({
  canAct,
  legalActions,
  raceCardsWinnerInHand,
  raceCardsLoserInHand,
  sendAction,
}: {
  canAct: boolean;
  legalActions: CamelUpAction[];
  raceCardsWinnerInHand: CamelUpColor[];
  raceCardsLoserInHand: CamelUpColor[];
  sendAction: (action: unknown) => void;
}) {
  const winnerColors = useMemo(
    () => colorsForActionType(legalActions, 'bet-overall-winner'),
    [legalActions],
  );
  const loserColors = useMemo(
    () => colorsForActionType(legalActions, 'bet-overall-loser'),
    [legalActions],
  );

  const canBetWinner = canAct && winnerColors.length > 0;
  const canBetLoser = canAct && loserColors.length > 0;

  if (!canBetWinner && !canBetLoser) return null;

  return (
    <div className="camel-up-overall-picker" aria-label="วางเดิมพันทั้งเกม">
      <div className="camel-up-overall-picker__head">
        <Badge variant="accent">ตาคุณ</Badge>
        <div>
          <p className="camel-up-overall-picker__lead">เลือกการ์ดจากมือเพื่อวางเดิมพัน (คว่ำ)</p>
          <p className="camel-up-betting__hint">
            ผู้เล่นอื่นจะไม่เห็นสีที่คุณเลือกจนกว่าเกมจะจบ · ลำดับยิ่งต้น จ่ายยิ่งสูง (8/5/3/2/1 EP)
          </p>
        </div>
      </div>

      <div className="camel-up-overall-picker__columns">
        <OverallBetPickerColumn
          kind="winner"
          label="เดิมพันผู้ชนะทั้งเกม"
          canBet={canBetWinner}
          legalColors={winnerColors}
          cardsInHand={raceCardsWinnerInHand}
          sendAction={sendAction}
        />
        <OverallBetPickerColumn
          kind="loser"
          label="เดิมพันผู้แพ้ทั้งเกม"
          canBet={canBetLoser}
          legalColors={loserColors}
          cardsInHand={raceCardsLoserInHand}
          sendAction={sendAction}
        />
      </div>
    </div>
  );
}

export function CamelUpBettingArea({
  legBetStacks,
  draggableLegColors,
  overallWinnerPiles,
  overallLoserPiles,
  myOverallBets,
  overallWinnerPlacements,
  overallLoserPlacements,
  overallWinnerFaceDownCount,
  overallLoserFaceDownCount,
  players,
  revealed,
  canAct,
  legalActions,
  raceCardsWinnerInHand,
  raceCardsLoserInHand,
  sendAction,
}: Props) {
  const legTakenCount = players.filter((p) => p.legBet).length;
  const overallBetCount = revealed
    ? overallWinnerPiles.reduce((n, p) => n + p.bets.length, 0) +
      overallLoserPiles.reduce((n, p) => n + p.bets.length, 0)
    : overallWinnerFaceDownCount + overallLoserFaceDownCount;

  const canOverallBet =
    canAct &&
    (colorsForActionType(legalActions, 'bet-overall-winner').length > 0 ||
      colorsForActionType(legalActions, 'bet-overall-loser').length > 0);

  return (
    <section className="card camel-up-betting" aria-label="กองเดิมพัน">
      <div className="camel-up-betting__placed">
        <h3 className="camel-up-betting__placed-heading">การ์ดที่ลงแล้ว</h3>
        <div className="camel-up-betting__placed-grid">
          <LegBetTakenTable players={players} />
          {!revealed ? (
            <OverallHiddenBoard
              winnerPlacements={overallWinnerPlacements}
              loserPlacements={overallLoserPlacements}
              players={players}
            />
          ) : (
            <section
              className="camel-up-betting__placed-card camel-up-overall-revealed"
              aria-label="ผลเดิมพันทั้งเกม"
            >
              <h4 className="camel-up-overall-board__title">เดิมพันทั้งเกม (เปิดการ์ดแล้ว)</h4>
              <p className="camel-up-betting__hint">เลขในวง = ลำดับเดิมพัน · จ่าย 8/5/3/2/1 EP</p>
              <div className="camel-up-betting__overall-grid">
                <OverallBetTable title="ชนะ" piles={overallWinnerPiles} players={players} />
                <OverallBetTable title="แพ้" piles={overallLoserPiles} players={players} />
              </div>
            </section>
          )}
        </div>
      </div>

      <Tabs defaultValue="leg">
        <TabsList aria-label="ประเภทเดิมพัน">
          <TabsTrigger value="leg">
            Leg
            {legTakenCount > 0 ? (
              <Badge size="sm" variant="default">
                {legTakenCount}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="overall">
            ทั้งเกม
            {overallBetCount > 0 ? (
              <Badge size="sm" variant="default">
                {overallBetCount}
              </Badge>
            ) : null}
            {canOverallBet ? (
              <Badge size="sm" variant="accent">
                เล่น
              </Badge>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leg" className="camel-up-betting__panel">
          <p className="camel-up-betting__hint">
            {draggableLegColors.length > 0
              ? 'ลากการ์ดบนสุดลงมือเพื่อเดิมพัน Leg'
              : 'แผ่นบนสุด = ค่าถัดไป (EP)'}
          </p>
          <CamelUpLegBetStacks stacks={legBetStacks} draggableColors={draggableLegColors} />
        </TabsContent>

        <TabsContent value="overall" className="camel-up-betting__panel">
          <OverallBetPicker
            canAct={canAct}
            legalActions={legalActions}
            raceCardsWinnerInHand={raceCardsWinnerInHand}
            raceCardsLoserInHand={raceCardsLoserInHand}
            sendAction={sendAction}
          />
          <MyOverallBetsPanel bets={myOverallBets} />
        </TabsContent>
      </Tabs>
    </section>
  );
}
