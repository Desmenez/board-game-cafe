import type { WavelengthAction, WavelengthPlayerView } from 'shared';
import {
  GameDecisionActions,
  GamePhasePanel,
  GameWaitingState,
} from '../../../components/game-shell';
import { Button, Input, Slider } from '../../../components/ui';
import { WL_TEAM_LABEL } from '../art';

type Props = {
  view: WavelengthPlayerView;
  clueDraft: string;
  setClueDraft: (value: string) => void;
  send: (action: WavelengthAction) => void;
  onDialChange: (position: number) => void;
};

export function WavelengthActionPanel({
  view,
  clueDraft,
  setClueDraft,
  send,
  onDialChange,
}: Props) {
  const psychicName = view.playerNames[view.psychicId] ?? 'Psychic';
  const canDial = view.canAct && view.phase === 'team_dial' && !view.amPsychic;
  const dialValue = view.dial ?? 0.5;

  if (view.phase === 'psychic_setup' && view.amPsychic && view.setupStep === 'choose_side') {
    return (
      <GamePhasePanel
        title="เลือกสเปกตรัม"
        description="สุ่มมาสองคู่ — แตะคู่ที่จะใบ้ในรอบนี้"
        density="compact"
      >
        <WavelengthSpectrumChoices
          sides={view.cardSides}
          onChoose={(side) => send({ type: 'choose-card-side', side })}
        />
      </GamePhasePanel>
    );
  }

  if (view.phase === 'clue' && view.amPsychic) {
    return (
      <GamePhasePanel
        title="ส่งคำใบ้หนึ่งไอเดีย"
        description="ดูแถบเป้าบนจานตัวเองได้ตลอด — ห้ามใช้คำปลายสเปกตรัม และห้ามใส่ตัวเลข"
        density="compact"
        actionsPlacement="footer"
        actions={
          <Button
            type="button"
            disabled={!clueDraft.trim()}
            onClick={() => send({ type: 'submit-clue', text: clueDraft })}
          >
            ส่งคำใบ้
          </Button>
        }
      >
        <Input
          value={clueDraft}
          onChange={(event) => setClueDraft(event.target.value)}
          placeholder="เช่น pizza, first apartment"
          aria-label="คำใบ้"
          onKeyDown={(event) => {
            if (event.key === 'Enter' && clueDraft.trim()) {
              send({ type: 'submit-clue', text: clueDraft });
            }
          }}
        />
      </GamePhasePanel>
    );
  }

  if (view.phase === 'team_dial' && canDial) {
    return (
      <GamePhasePanel
        title="หมุนเข็มให้ตรงคำใบ้"
        description="ใครในทีมก็ขยับได้ — Psychic ใบ้แล้ว ห้ามพูดเพิ่ม"
        density="compact"
        actionsPlacement="footer"
        actions={
          <Button type="button" onClick={() => send({ type: 'confirm-dial' })}>
            ล็อกเข็ม
          </Button>
        }
      >
        <Slider
          label="ตำแหน่งบนสเปกตรัม"
          min={0}
          max={1}
          step={0.002}
          value={dialValue}
          valueLabel={`${Math.round(dialValue * 100)}%`}
          onChange={(event) => onDialChange(Number(event.target.value))}
        />
      </GamePhasePanel>
    );
  }

  if (view.phase === 'left_right' && view.canAct) {
    return (
      <GamePhasePanel
        title="แถบ 4 แต้มอยู่ซ้ายหรือขวาของเข็ม?"
        description="ถ้าทีมที่เล่นทับ 4 พอดี ฝั่งคุณจะไม่ได้แต้มนี้"
        density="compact"
      >
        <GameDecisionActions
          primary={{
            label: 'ซ้าย',
            variant: 'secondary',
            onSelect: () => send({ type: 'guess-left-right', guess: 'left' }),
          }}
          secondary={{
            label: 'ขวา',
            variant: 'secondary',
            onSelect: () => send({ type: 'guess-left-right', guess: 'right' }),
          }}
        />
      </GamePhasePanel>
    );
  }

  if (view.phase === 'reveal') {
    const breakdown = view.revealBreakdown;
    return (
      <GamePhasePanel
        title="เปิดจอ — คะแนนรอบนี้"
        description={
          breakdown
            ? `${WL_TEAM_LABEL[view.activeTeam]} +${breakdown.activeScore} · ฝั่งตรงข้าม +${breakdown.opposingScore}${
                breakdown.bonusTurn ? ' · ได้เล่นต่อเพราะทำ 4 แล้วยังตามอยู่' : ''
              }`
            : view.lastEvent
        }
        density="compact"
        actionsPlacement="footer"
        actions={
          <Button type="button" onClick={() => send({ type: 'ack-reveal' })}>
            ไปรอบถัดไป
          </Button>
        }
      />
    );
  }

  if (view.amPsychic && view.phase === 'team_dial') {
    return <GameWaitingState surface="panel">คุณใบ้แล้ว — ห้ามพูด รอทีมหมุนเข็ม</GameWaitingState>;
  }

  if (view.amPsychic && view.phase === 'left_right') {
    return <GameWaitingState surface="panel">รอฝั่งตรงข้ามทายซ้ายหรือขวา…</GameWaitingState>;
  }

  const waitCopy = (() => {
    if (view.phase === 'psychic_setup') return `รอ ${psychicName} ตั้งค่าวงล้อ…`;
    if (view.phase === 'clue') return `รอ ${psychicName} ส่งคำใบ้…`;
    if (view.phase === 'team_dial') return `รอ ${WL_TEAM_LABEL[view.activeTeam]} หมุนเข็ม…`;
    if (view.phase === 'left_right') {
      return `รอทีม${view.activeTeam === 'orange' ? 'ม่วง' : 'ส้ม'} ทายซ้ายหรือขวา…`;
    }
    return view.lastEvent;
  })();

  return <GameWaitingState surface="panel">{waitCopy}</GameWaitingState>;
}

function WavelengthSpectrumChoices({
  sides,
  onChoose,
}: {
  sides: WavelengthPlayerView['cardSides'];
  onChoose: (side: 'a' | 'b') => void;
}) {
  if (!sides) {
    return (
      <div className="wl-side-pick" aria-busy="true" aria-live="polite">
        <p className="sr-only">กำลังจั่วการ์ด</p>
        <div className="wl-side-pick__skeleton" />
        <div className="wl-side-pick__skeleton" />
      </div>
    );
  }

  return (
    <div className="wl-side-pick" role="group" aria-label="สเปกตรัมที่จั่วได้">
      {(['a', 'b'] as const).map((side) => {
        const spectrum = sides[side];
        return (
          <button
            key={side}
            type="button"
            className="wl-side-pick__card"
            onClick={() => onChoose(side)}
            aria-label={`เลือก ${spectrum.left} ถึง ${spectrum.right}`}
          >
            <span className="wl-side-pick__pole">{spectrum.left}</span>
            <span className="wl-side-pick__bar" aria-hidden />
            <span className="wl-side-pick__pole">{spectrum.right}</span>
          </button>
        );
      })}
    </div>
  );
}
