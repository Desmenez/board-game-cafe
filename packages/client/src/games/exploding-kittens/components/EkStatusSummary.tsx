import type { ExplodingKittensPlayerView } from 'shared';
import { GameHistoryDisclosure } from '../../../components/game-shell';
import { PlayerAvatar } from '../../../components/player-avatar';
import { PlayerRosterStrip } from '../../../components/player-roster';
import { Badge } from '../../../components/ui';
import { getTurnSpotlight } from '../lib/turnSpotlight';
import { spotlightColClass } from '../lib/playerBadges';
import { CARD_LABEL } from '../lib/cardMeta';
import { EkSpotlightFrontBadges } from './EkTurnOrderUi';
import { buildEkPlayerRosterSeats } from './ekPlayerRosterSeats';

type TurnSpotlight = ReturnType<typeof getTurnSpotlight>;
type SpotlightPlayer = NonNullable<TurnSpotlight['current']>;
type Me = ExplodingKittensPlayerView['players'][number] | undefined;

type Props = {
  gs: ExplodingKittensPlayerView;
  myId: string;
  turnSpotlight: TurnSpotlight;
  phaseHint: string | undefined;
  aliveCount: number;
  me: Me;
};

type SpotlightColProps = {
  gs: ExplodingKittensPlayerView;
  myId: string;
  label: string;
  player: SpotlightPlayer | null;
  variant: 'prev' | 'current' | 'next';
  /** Meta under the name — e.g. pending turns */
  meta?: string;
};

function EkSpotlightCol({ gs, myId, label, player, variant, meta }: SpotlightColProps) {
  const isCurrent = variant === 'current';
  const isMe = Boolean(player && player.id === myId);
  const avatarSize = isCurrent ? 48 : 40;

  return (
    <div
      className={[
        'ek-turn-spotlight__col',
        isCurrent ? 'ek-turn-spotlight__col--current' : '',
        spotlightColClass(gs, player),
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="ek-turn-spotlight__label">{label}</span>
      {player ? (
        <>
          <PlayerAvatar
            playerId={player.id}
            name={player.name}
            size={avatarSize}
            decorative
            className={[
              'ek-turn-spotlight__avatar',
              !player.alive ? 'ek-turn-spotlight__avatar--dead' : '',
              isCurrent && player.alive ? 'ek-turn-spotlight__avatar--current' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          />
          <div className="ek-turn-spotlight__who">
            <span className="ek-turn-spotlight__name">{player.name}</span>
            {isMe && player.alive ? (
              <Badge size="sm" variant="purple">
                คุณ
              </Badge>
            ) : null}
            {!player.alive ? (
              <Badge size="sm" variant="danger">
                ตาย
              </Badge>
            ) : null}
          </div>
          {player.alive ? (
            <span className="ek-turn-spotlight__hand">มือ {player.handCount} ใบ</span>
          ) : null}
          <EkSpotlightFrontBadges gs={gs} player={player} />
          {meta ? <span className="ek-turn-spotlight__meta">{meta}</span> : null}
        </>
      ) : (
        <span className="ek-turn-spotlight__empty">—</span>
      )}
    </div>
  );
}

export function EkStatusSummary({ gs, myId, turnSpotlight, phaseHint, aliveCount, me }: Props) {
  const { prev, current, next } = turnSpotlight;

  return (
    <div className="card ek-status-summary">
      <div className="ek-turn-spotlight" aria-label="ลำดับการเล่นรอบโต๊ะ">
        <EkSpotlightCol
          gs={gs}
          myId={myId}
          label="คนที่แล้ว"
          player={prev}
          variant="prev"
          meta={prev && prev.pendingTurns > 1 ? `ค้าง ${prev.pendingTurns} เทิร์น` : undefined}
        />
        <EkSpotlightCol
          gs={gs}
          myId={myId}
          label="ตาปัจจุบัน"
          player={current}
          variant="current"
          meta={
            current?.alive
              ? `เหลือ ${gs.pendingTurnsForCurrent} เทิร์น`
              : current
                ? 'ตายแล้ว'
                : undefined
          }
        />
        <EkSpotlightCol
          gs={gs}
          myId={myId}
          label="คนต่อไป"
          player={next}
          variant="next"
          meta={next && next.pendingTurns > 1 ? `ค้าง ${next.pendingTurns} เทิร์น` : undefined}
        />
      </div>

      <GameHistoryDisclosure
        title={`ลำดับการเล่น · ${gs.players.length} คน`}
        note="ลำดับรอบโต๊ะและคนเริ่มก่อนถูกสุ่มตอนเริ่มเกม"
        className="ek-status-summary__roster"
      >
        <PlayerRosterStrip
          layout="grid"
          myId={myId}
          ariaLabel="ลำดับผู้เล่นรอบโต๊ะ"
          seats={buildEkPlayerRosterSeats(gs)}
        />
      </GameHistoryDisclosure>

      <ul className="ek-status-summary__tiles">
        <li className="ek-stat-tile ek-stat-tile--you">
          <span className="ek-stat-tile__label">คุณ</span>
          <span className="ek-stat-tile__value ek-stat-tile__value--you">
            {me ? (
              <PlayerAvatar
                playerId={me.id}
                name={me.name}
                size={28}
                decorative
                className="ek-stat-tile__avatar"
              />
            ) : null}
            <span className="ek-status-summary__strong">{me?.name ?? '-'}</span>
            {!me?.alive && <span className="ek-status-summary__dead"> · ตายแล้ว</span>}
          </span>
        </li>
        <li className="ek-stat-tile">
          <span className="ek-stat-tile__label">กองจั่ว / ทิ้ง</span>
          <span className="ek-stat-tile__value ek-status-summary__strong">
            {gs.drawPileCount} / {gs.discardCount}
          </span>
        </li>
        {gs.discardTop != null && (
          <li className="ek-stat-tile">
            <span className="ek-stat-tile__label">บนกองทิ้ง</span>
            <span className="ek-stat-tile__value">{CARD_LABEL[gs.discardTop]}</span>
          </li>
        )}
        <li className="ek-stat-tile">
          <span className="ek-stat-tile__label">ผู้รอด</span>
          <span className="ek-stat-tile__value ek-status-summary__strong">
            {aliveCount}/{gs.players.length}
          </span>
        </li>
        <li className="ek-stat-tile">
          <span className="ek-stat-tile__label">มือคุณ</span>
          <span className="ek-stat-tile__value ek-status-summary__strong">
            {gs.myHand.length} ใบ
          </span>
        </li>
        {phaseHint && (
          <li className="ek-stat-tile ek-stat-tile--wide">
            <span className="ek-stat-tile__label">สถานะเกม</span>
            <span className="ek-stat-tile__value">{phaseHint}</span>
          </li>
        )}
      </ul>
      {gs.lastEvent && (
        <p className="ek-status-summary__event">
          <span className="ek-status-summary__event-label">เหตุการณ์ล่าสุด</span>
          {gs.lastEvent}
        </p>
      )}
    </div>
  );
}
