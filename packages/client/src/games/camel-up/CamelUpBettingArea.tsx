import { useMemo, useState, type CSSProperties } from 'react';
import {
  CAMEL_UP_OVERALL_PAYOUT_BY_ORDER,
  type CamelUpAction,
  type CamelUpColor,
  type CamelUpMyOverallBet,
  type CamelUpPlayerView,
} from 'shared';
import { Badge, Button, Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui';
import { camelUpFaceDownBetUrl, camelUpRaceCardUrl } from './assetMeta';
import { colorsForActionType } from './camelUpLegalActions';
import { CamelUpLegBetStacks } from './CamelUpLegBetStacks';
import { CAMEL_COLOR_LABEL, camelColorClass } from './camelMeta';

type Props = {
  legBetStacks: CamelUpPlayerView['legBetStacks'];
  draggableLegColors: readonly CamelUpColor[];
  overallWinnerPiles: CamelUpPlayerView['overallWinnerPiles'];
  overallLoserPiles: CamelUpPlayerView['overallLoserPiles'];
  myOverallBets: CamelUpMyOverallBet[];
  overallWinnerFaceDownCount: number;
  overallLoserFaceDownCount: number;
  players: CamelUpPlayerView['players'];
  revealed: boolean;
  canAct: boolean;
  legalActions: CamelUpAction[];
  raceCardsInHand: CamelUpColor[];
  sendAction: (action: unknown) => void;
};

type OverallBetKind = 'winner' | 'loser';

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
    <div className="camel-up-overall-table camel-up-leg-taken">
      <h4 className="camel-up-overall-table__title">
        เดิมพันแล้ว Leg นี้ ({takenCount}/{players.length})
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
    </div>
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

function FaceDownStack({ count, label }: { count: number; label: string }) {
  const faceDownUrl = camelUpFaceDownBetUrl();
  const previewCount = Math.min(count, 8);
  const overflow = count - previewCount;

  return (
    <div className="camel-up-facedown-stack">
      <div className="camel-up-facedown-stack__head">
        <h4 className="camel-up-facedown-stack__title">{label}</h4>
        <Badge variant="outline">{count} ใบ</Badge>
      </div>
      {count === 0 ? (
        <p className="camel-up-facedown-stack__empty">ยังไม่มีการ์ดวาง</p>
      ) : (
        <div className="camel-up-facedown-stack__cards" aria-hidden>
          {Array.from({ length: previewCount }, (_, index) => (
            <img
              key={index}
              src={faceDownUrl}
              alt=""
              className="camel-up-facedown-stack__card"
              style={{ '--stack-index': index } as CSSProperties}
              loading="lazy"
            />
          ))}
          {overflow > 0 ? <span className="camel-up-facedown-stack__more">+{overflow}</span> : null}
        </div>
      )}
    </div>
  );
}

function OverallHiddenBoard({
  winnerCount,
  loserCount,
}: {
  winnerCount: number;
  loserCount: number;
}) {
  return (
    <div className="camel-up-overall-hidden">
      <p className="camel-up-betting__hint">
        การ์ดบนโต๊ะคว่ำ — ยังไม่เปิดเผยว่าใครเดิมพันสีใด (จะเปิดเมื่อจบเกม)
      </p>
      <div className="camel-up-overall-hidden__stacks">
        <FaceDownStack count={winnerCount} label="เดิมพันผู้ชนะทั้งเกม" />
        <FaceDownStack count={loserCount} label="เดิมพันผู้แพ้ทั้งเกม" />
      </div>
    </div>
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

function OverallBetPicker({
  canAct,
  legalActions,
  raceCardsInHand,
  sendAction,
}: {
  canAct: boolean;
  legalActions: CamelUpAction[];
  raceCardsInHand: CamelUpColor[];
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

  const [betKind, setBetKind] = useState<OverallBetKind>('winner');

  const effectiveKind: OverallBetKind | null = useMemo(() => {
    if (canBetWinner && canBetLoser) return betKind;
    if (canBetWinner) return 'winner';
    if (canBetLoser) return 'loser';
    return null;
  }, [betKind, canBetLoser, canBetWinner]);

  if (effectiveKind === null) return null;

  const activeColors = effectiveKind === 'winner' ? winnerColors : loserColors;
  const playableCards = raceCardsInHand.filter((color) => activeColors.includes(color));
  const pileLabel = effectiveKind === 'winner' ? 'ผู้ชนะทั้งเกม' : 'ผู้แพ้ทั้งเกม';

  return (
    <div className="camel-up-overall-picker" aria-label={`วางเดิมพัน${pileLabel}`}>
      <div className="camel-up-overall-picker__head">
        <Badge variant="accent">ตาคุณ</Badge>
        <div>
          <p className="camel-up-overall-picker__lead">เลือกการ์ดจากมือเพื่อวางเดิมพัน (คว่ำ)</p>
          <p className="camel-up-betting__hint">
            ผู้เล่นอื่นจะไม่เห็นสีที่คุณเลือกจนกว่าเกมจะจบ · ลำดับยิ่งต้น จ่ายยิ่งสูง (8/5/3/2/1 EP)
          </p>
        </div>
      </div>

      {canBetWinner && canBetLoser ? (
        <div
          className="camel-up-overall-picker__kinds"
          role="group"
          aria-label="ประเภทเดิมพันทั้งเกม"
        >
          <Button
            type="button"
            size="sm"
            variant={effectiveKind === 'winner' ? 'primary' : 'secondary'}
            onClick={() => setBetKind('winner')}
          >
            เดิมพันผู้ชนะ
          </Button>
          <Button
            type="button"
            size="sm"
            variant={effectiveKind === 'loser' ? 'primary' : 'secondary'}
            onClick={() => setBetKind('loser')}
          >
            เดิมพันผู้แพ้
          </Button>
        </div>
      ) : (
        <p className="camel-up-overall-picker__kind-label">{pileLabel}</p>
      )}

      {playableCards.length === 0 ? (
        <p className="camel-up-overall-picker__empty">ไม่มีการ์ดในมือที่วางประเภทนี้ได้</p>
      ) : (
        <div className="camel-up-overall-picker__cards">
          {playableCards.map((color) => (
            <button
              key={`${effectiveKind}-${color}`}
              type="button"
              className={['camel-up-overall-picker__card', camelColorClass(color)].join(' ')}
              onClick={() =>
                sendAction({
                  type: effectiveKind === 'winner' ? 'bet-overall-winner' : 'bet-overall-loser',
                  color,
                })
              }
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
              <span className="camel-up-overall-picker__card-meta">วางคว่ำบนโต๊ะ</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function CamelUpBettingArea({
  legBetStacks,
  draggableLegColors,
  overallWinnerPiles,
  overallLoserPiles,
  myOverallBets,
  overallWinnerFaceDownCount,
  overallLoserFaceDownCount,
  players,
  revealed,
  canAct,
  legalActions,
  raceCardsInHand,
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
          <LegBetTakenTable players={players} />
        </TabsContent>

        <TabsContent value="overall" className="camel-up-betting__panel">
          <OverallBetPicker
            canAct={canAct}
            legalActions={legalActions}
            raceCardsInHand={raceCardsInHand}
            sendAction={sendAction}
          />

          {!revealed ? (
            <>
              <MyOverallBetsPanel bets={myOverallBets} />
              <OverallHiddenBoard
                winnerCount={overallWinnerFaceDownCount}
                loserCount={overallLoserFaceDownCount}
              />
            </>
          ) : (
            <>
              <h4 className="camel-up-overall-board__title">ผลเดิมพันทั้งเกม (เปิดการ์ดแล้ว)</h4>
              <p className="camel-up-betting__hint">เลขในวง = ลำดับเดิมพัน · จ่าย 8/5/3/2/1 EP</p>
              <div className="camel-up-betting__overall-grid">
                <OverallBetTable title="ชนะ" piles={overallWinnerPiles} players={players} />
                <OverallBetTable title="แพ้" piles={overallLoserPiles} players={players} />
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
}
