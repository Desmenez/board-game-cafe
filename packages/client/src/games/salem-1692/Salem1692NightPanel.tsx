import type { Salem1692PublicPlayer, Salem1692TownHallId, Salem1692TryalCard } from 'shared';
import { SALEM_1692_TOWN_HALL_IDS } from 'shared';
import { Button } from '../../components/ui';
import { PlayerTargetPicker } from '../../components/player-target';
import { useDeadlineCountdown } from '../../hooks/useDeadlineCountdown';
import { Salem1692TryalRow } from './Salem1692TryalRow';
import { salem1692TownHallImage, salem1692TownHallLabel } from './cardMeta';

type Props = {
  phase: 'night_witch' | 'night_constable' | 'night_confess';
  players: Salem1692PublicPlayer[];
  myId: string;
  myTryals: Salem1692TryalCard[];
  nightStepEndsAtMs: number | null;
  canNightWitchKill: boolean;
  canNightConstableSave: boolean;
  canNightConfess: boolean;
  onWitchKill: (townHallId: Salem1692TownHallId) => void;
  onConstableSave: (targetId: string) => void;
  onConfess: (tryalId: string) => void;
  onSkipConfess: () => void;
  onAckNight: () => void;
};

export function Salem1692NightPanel({
  phase,
  players,
  myId,
  myTryals,
  nightStepEndsAtMs,
  canNightWitchKill,
  canNightConstableSave,
  canNightConfess,
  onWitchKill,
  onConstableSave,
  onConfess,
  onSkipConfess,
  onAckNight,
}: Props) {
  const { remainMs, label } = useDeadlineCountdown(nightStepEndsAtMs);
  const remainingSec =
    nightStepEndsAtMs != null ? Math.max(0, Math.ceil(remainMs / 1000)) : null;

  const constableTargets = players
    .filter((p) => p.alive && p.id !== myId)
    .map((p) => ({
      id: p.id,
      name: `${p.name} · ${salem1692TownHallLabel(p.townHallId)}`,
    }));

  return (
    <section className="s1692-panel s1692-night-panel" aria-label="Night">
      <h3 style={{ marginTop: 0 }}>Night</h3>
      {remainingSec != null && (
        <p className="s1692-timer">เวลาเหลือ ~{label ?? `${remainingSec} วิ`}</p>
      )}

      {phase === 'night_witch' && canNightWitchKill && (
        <>
          <p>Witches — เลือก Town Hall ที่จะฆ่า</p>
          <div className="s1692-town-hall-grid">
            {SALEM_1692_TOWN_HALL_IDS.map((id) => (
              <button
                key={id}
                type="button"
                className="s1692-town-hall-card"
                onClick={() => onWitchKill(id)}
              >
                <img src={salem1692TownHallImage(id)} alt="" />
                <span>{salem1692TownHallLabel(id)}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {phase === 'night_constable' && canNightConstableSave && (
        <>
          <p>Constable — เลือกผู้เล่นที่จะได้รับ Gavel (ห้ามเลือกตัวเอง)</p>
          <PlayerTargetPicker
            options={constableTargets}
            onSelect={onConstableSave}
            emptyMessage="ไม่มีผู้เล่นให้เลือก"
          />
        </>
      )}

      {phase === 'night_confess' && (
        <>
          <p>Confess — เปิด Tryal 1 ใบ หรือข้าม</p>
          {canNightConfess && (
            <>
              <Salem1692TryalRow
                tryals={myTryals.filter((t) => !t.revealed)}
                title="Tryal ที่ยังไม่เปิด"
              />
              <div className="s1692-play-panel">
                {myTryals
                  .filter((t) => !t.revealed)
                  .map((t) => (
                    <Button key={t.id} type="button" onClick={() => onConfess(t.id)}>
                      Confess {t.id.slice(-4)}
                    </Button>
                  ))}
                <Button type="button" variant="secondary" onClick={onSkipConfess}>
                  ข้าม
                </Button>
              </div>
            </>
          )}
          <Button type="button" onClick={onAckNight}>
            ยืนยันผล Night
          </Button>
        </>
      )}
    </section>
  );
}
