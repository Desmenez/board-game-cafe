import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { HuesAndCuesAction, HuesAndCuesPlayerView } from 'shared';
import {
  HUES_AND_CUES_COLS,
  HUES_AND_CUES_ROWS,
  huesAndCuesCellHex,
  huesAndCuesCellLabel,
  huesAndCuesChebyshevScore,
} from 'shared';
import { Button, Input } from '../../components/ui';
import { startWinCelebrationLoop } from '../../utils/winCelebration';
import { Lightbulb, LogOut, RotateCcw } from 'lucide-react';
import './hues-and-cues.css';

/** ช่องอยู่ในพื้นที่ให้คะแนน (Chebyshev ≤ 2 จากเป้าหมาย) */
function huesInChebyshevFootprint(tc: number, tr: number, col: number, row: number): boolean {
  if (col < 0 || col >= HUES_AND_CUES_COLS || row < 0 || row >= HUES_AND_CUES_ROWS) {
    return false;
  }
  return Math.max(Math.abs(col - tc), Math.abs(row - tr)) <= 2;
}

/** เส้นขอบรอบ footprint — inset box-shadow เฉพาะด้านที่ติดช่องนอก footprint (ไม่ทาสีทับ) */
function huesScoreFootprintEdgeShadow(
  tc: number,
  tr: number,
  col: number,
  row: number,
): string | undefined {
  if (!huesInChebyshevFootprint(tc, tr, col, row)) return undefined;
  const parts: string[] = [];
  if (!huesInChebyshevFootprint(tc, tr, col, row - 1)) {
    parts.push('inset 0 2px 0 0 rgb(255 255 255 / 0.25)');
  }
  if (!huesInChebyshevFootprint(tc, tr, col + 1, row)) {
    parts.push('inset -2px 0 0 0 rgb(255 255 255 / 0.25)');
  }
  if (!huesInChebyshevFootprint(tc, tr, col, row + 1)) {
    parts.push('inset 0 -2px 0 0 rgb(255 255 255 / 0.25)');
  }
  if (!huesInChebyshevFootprint(tc, tr, col - 1, row)) {
    parts.push('inset 2px 0 0 0 rgb(255 255 255 / 0.25)');
  }
  return parts.length > 0 ? parts.join(', ') : undefined;
}

function playerMarkerBg(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) % 360;
  return `hsl(${h} 92% 44%)`;
}

function nameGlyphs(pid: string, names: Record<string, string>): string[] {
  return [...(names[pid] ?? '').trim().normalize('NFC')];
}

/**
 * ข้อความบนมาร์กเกอร์: ใช้คำนำหน้าสั้นสุดที่ **ไม่ซ้ำใคร** (ขยายทีละตัวอักษร)
 * เช่น สมชาย / สมหญิง → สมช / สมห แทน ส1 / ส2
 * ถ้าชื่อว่างหรือเหมือนกันทุกตัวจนยืดไม่แยกได้ → ต่อเลขลำดับในห้อง (ตาม playerOrder)
 */
function playerMarkerLabel(id: string, gs: HuesAndCuesPlayerView): string {
  const entries = gs.playerOrder.map((pid) => ({
    id: pid,
    glyphs: nameGlyphs(pid, gs.playerNames),
  }));

  const maxLen = Math.max(1, ...entries.map((e) => e.glyphs.length));

  function slicePrefix(e: (typeof entries)[0], len: number): string {
    if (e.glyphs.length === 0) return '?';
    return e.glyphs.slice(0, Math.min(len, e.glyphs.length)).join('');
  }

  const cap = Math.min(5, maxLen + 1);

  for (let len = 1; len <= cap; len += 1) {
    const groups = new Map<string, string[]>();
    for (const e of entries) {
      const p = slicePrefix(e, len);
      const arr = groups.get(p) ?? [];
      arr.push(e.id);
      groups.set(p, arr);
    }
    const mine = entries.find((e) => e.id === id)!;
    const myPrefix = slicePrefix(mine, len);
    const peers = groups.get(myPrefix) ?? [];
    if (peers.length === 1) return myPrefix;
  }

  const idx = gs.playerOrder.indexOf(id) + 1;
  const mine = entries.find((e) => e.id === id)!;
  const base =
    mine.glyphs.length === 0 ? '?' : mine.glyphs.slice(0, Math.min(2, mine.glyphs.length)).join('');
  return `${base}${idx}`;
}

/** มาร์กเกอร์บนกระดาน — สี + glyph เดียวกับ HuesBoardGrid */
function HuesPlayerMarkerGlyph({
  gs,
  playerId,
  round,
  legend = false,
}: {
  gs: HuesAndCuesPlayerView;
  playerId: string;
  round: 1 | 2;
  legend?: boolean;
}) {
  const bg = playerMarkerBg(playerId);
  const label = playerMarkerLabel(playerId, gs);
  const compact = [...label].length > 2 ? 'true' : undefined;
  return (
    <span
      className={`hac-marker${legend ? ' hac-marker--legend' : ''} hac-marker--r${round}`}
      style={{ '--hac-marker-bg': bg } as CSSProperties}
      aria-hidden
    >
      <span className="hac-marker__glyph" data-compact={compact}>
        {label}
      </span>
    </span>
  );
}

type MarkersMap = Map<string, { id: string; round: 1 | 2 }[]>;

function subPhaseHint(gs: HuesAndCuesPlayerView): string {
  if (gs.phase !== 'playing') return '';
  const cue = gs.playerNames[gs.cueGiverId] ?? gs.cueGiverId;
  switch (gs.subPhase) {
    case 'clue1':
      return gs.amCueGiver ? 'พิมพ์คำใบ้แรก (หนึ่งคำ) ด้านล่าง' : `รอ ${cue} ส่งคำใบ้แรก`;
    case 'guess1':
      return gs.amCueGiver
        ? 'ผู้ทายกำลังวางมาร์กเกอร์รอบที่ 1 บนกระดาน'
        : 'คลิกช่องเพื่อวางมาร์กเกอร์รอบที่ 1';
    case 'clue2':
      return gs.amCueGiver ? 'พิมพ์คำใบ้ที่สอง (สองคำ) ด้านล่าง' : `รอ ${cue} ส่งคำใบ้ที่สอง`;
    case 'guess2':
      return gs.amCueGiver
        ? 'ผู้ทายกำลังวางมาร์กเกอร์รอบที่ 2'
        : 'คลิกช่องเพื่อวางมาร์กเกอร์รอบที่ 2';
    case 'reveal':
      return 'เปิดเฉลยคะแนน — ดูด้านล่าง';
    default:
      return '';
  }
}

function clue2Placehold(gs: HuesAndCuesPlayerView): string {
  if (gs.clue2) return gs.clue2;
  if (gs.subPhase === 'clue2') return gs.amCueGiver ? 'พิมพ์ด้านล่าง' : 'รอผู้ใบ้พิมพ์…';
  if (gs.subPhase === 'guess2' || gs.subPhase === 'reveal') return '—';
  return 'หลังทายรอบ 1 ครบ';
}

function formatRevealPts(v: number | undefined): string {
  if (v === undefined) return '—';
  return v === 0 ? '0' : `+${v}`;
}

/** สีเป้าหมาย + รหัสช่อง — แสดงตลอดที่เป็นผู้ใบ้ในรอบ (หลังส่งคำใบ้แล้วก็ยังเห็น) */
function HuesCueTargetHero({ gs }: { gs: HuesAndCuesPlayerView }) {
  if (!gs.amCueGiver || gs.phase !== 'playing' || !gs.target || !gs.targetHex) return null;
  const code = huesAndCuesCellLabel(gs.target.col, gs.target.row);
  return (
    <div
      className="hac-cue-target-hero"
      role="region"
      aria-label={`เป้าหมายของคุณ ช่อง ${code} สี ${gs.targetHex}`}
    >
      <div
        className="hac-cue-target-hero__swatch"
        style={{ backgroundColor: gs.targetHex }}
        title="สีเป้าหมายของรอบนี้"
      />
      <div className="hac-cue-target-hero__text">
        <div className="hac-cue-target-hero__kicker">เป้าหมายของคุณ · ซ่อนจากผู้ทาย</div>
        <div className="hac-cue-target-hero__code" lang="en">
          {code}
        </div>
        <div className="hac-cue-target-hero__hex">
          <code>{gs.targetHex}</code>
        </div>
      </div>
    </div>
  );
}

/** กล่องลำดับผู้เล่นแนวเดียวกับ Exploding Kittens (แถบเลื่อนแนวนอน + ชิป) */
function HuesPlayerOrderStrip({
  gs,
  myId,
  maxScore,
}: {
  gs: HuesAndCuesPlayerView;
  myId: string;
  maxScore: number;
}) {
  const n = gs.playerOrder.length;
  return (
    <section className="hac-player-strip" role="region" aria-labelledby="hac-roster-heading">
      <div className="hac-player-strip__head">
        <h2 id="hac-roster-heading" className="hac-player-strip__title">
          ลำดับผู้เล่น
        </h2>
        <span className="hac-player-strip__sub">เรียงตามรอบโต๊ะ · {n} คน</span>
      </div>
      <p className="hac-player-strip__hint">
        คะแนนรวมตามด้านล่าง · <strong>ผู้ใบ้</strong> = ผู้ให้คำใบ้ในรอบนี้
      </p>
      <div className="hac-player-strip__scroll" role="list">
        {gs.playerOrder.map((id, idx) => {
          const score = gs.scores[id] ?? 0;
          const lead = score === maxScore && maxScore > 0;
          const isCue = id === gs.cueGiverId;
          const isMe = id === myId;
          return (
            <div
              key={id}
              role="listitem"
              className={`hac-player-strip__chip${isCue ? ' hac-player-strip__chip--cue' : ''}${isMe ? ' hac-player-strip__chip--me' : ''}`}
            >
              <span className="hac-player-strip__seat" aria-hidden>
                {idx + 1}
              </span>
              <div className="hac-player-strip__body">
                <span className="hac-player-strip__name">{gs.playerNames[id] ?? id}</span>
                <div className="hac-player-strip__badges">
                  <span
                    className={`hac-player-strip__score${lead ? ' hac-player-strip__score--lead' : ''}`}
                    title="คะแนนรวม"
                  >
                    {score}
                  </span>
                  {isCue && (
                    <span
                      className="hac-player-strip__badge hac-player-strip__badge--cue"
                      title="ผู้ให้คำใบ้ในรอบนี้"
                    >
                      ผู้ใบ้
                    </span>
                  )}
                  {lead && (
                    <span
                      className="hac-player-strip__badge hac-player-strip__badge--lead"
                      title="คะแนนสูงสุด (หรือเสมอกัน)"
                    >
                      นำ
                    </span>
                  )}
                  {isMe && (
                    <span className="hac-player-strip__badge hac-player-strip__badge--me">คุณ</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

interface HuesBoardGridProps {
  gs: HuesAndCuesPlayerView;
  markersAtCell: MarkersMap;
  canPlace1: boolean;
  canPlace2: boolean;
  onCellClick: (col: number, row: number) => void;
  /** แสดงตัวเลขคะแนนต่อช่องจากเป้าหมาย (กฎเดียวกับเซิร์ฟเวอร์) */
  showChebyshevScores: boolean;
  /** วงขาวรอบช่องเป้าหมาย */
  showTargetRing: boolean;
  /** วงขาวรอบช่องเป้าหมายของผู้ใบ้ (ระหว่างเล่น — ไม่ทับช่วง reveal ที่มีคะแนน) */
  showCueGiverTargetRing: boolean;
  /** กรอบขาวรอบพื้นที่ให้คะแนน 5×5 (Chebyshev ≤ 2 จากเป้าหมาย) — เส้นขอบ ไม่ทาสีทับช่อง */
  showScoreFootprint: boolean;
}

function HuesBoardGrid({
  gs,
  markersAtCell,
  canPlace1,
  canPlace2,
  onCellClick,
  showChebyshevScores,
  showTargetRing,
  showCueGiverTargetRing,
  showScoreFootprint,
}: HuesBoardGridProps) {
  const tc = gs.target?.col;
  const tr = gs.target?.row;

  /** รอบ 2 ห้ามทับช่องที่มีมาร์กเกอร์รอบ 1 หรือที่ผู้อื่นวางรอบ 2 แล้ว */
  const blockedForGuess2Placement = useMemo(() => {
    const o = new Set<string>();
    for (const c of Object.values(gs.guess1)) {
      if (c) o.add(`${c.col},${c.row}`);
    }
    for (const c of Object.values(gs.guess2)) {
      if (c) o.add(`${c.col},${c.row}`);
    }
    return o;
  }, [gs.guess1, gs.guess2]);

  const cellInner = (col: number, row: number) => {
    const hex = huesAndCuesCellHex(col, row);
    const k = `${col},${row}`;
    const clickable =
      canPlace1 || (canPlace2 && !blockedForGuess2Placement.has(k));
    const coordLabel = huesAndCuesCellLabel(col, row);
    const markers = markersAtCell.get(k) ?? [];
    const isTarget = showTargetRing && tc === col && tr === row;
    const isCueOwnTarget = showCueGiverTargetRing && tc === col && tr === row;
    const footprintShadow =
      showScoreFootprint && tc != null && tr != null
        ? huesScoreFootprintEdgeShadow(tc, tr, col, row)
        : undefined;

    const cellStyle: CSSProperties = {
      backgroundColor: hex,
      ...(footprintShadow ? { boxShadow: footprintShadow } : {}),
    };

    let pts: 0 | 1 | 2 | 3 | null = null;
    if (showChebyshevScores && tc != null && tr != null) {
      pts = huesAndCuesChebyshevScore(tc, tr, col, row);
    }
    const a11yScoreLabel = pts != null && pts >= 1 ? ` คะแนน +${pts}` : '';

    const scoreOverlay =
      showChebyshevScores && tc != null && tr != null && pts != null && pts >= 1 ? (
        <span className="hac-cell-pts" aria-hidden>
          +{pts}
        </span>
      ) : null;

    const children = (
      <>
        <span className="hac-cell-coord" aria-hidden>
          {coordLabel}
        </span>
        {scoreOverlay}
        {isTarget && <span className="hac-cell-target-ring" aria-hidden />}
        {isCueOwnTarget && <span className="hac-cell-cue-own-ring" aria-hidden />}
        {markers.length > 0 && (
          <div className="hac-cell-markers">
            {markers.map((m) => {
              const label = playerMarkerLabel(m.id, gs);
              return (
                <span
                  key={`${m.id}-${m.round}`}
                  className={`hac-marker hac-marker--r${m.round}`}
                  style={{ '--hac-marker-bg': playerMarkerBg(m.id) } as CSSProperties}
                  title={`${gs.playerNames[m.id] ?? m.id} · รอบ ${m.round}`}
                >
                  <span
                    className="hac-marker__glyph"
                    data-compact={[...label].length > 2 ? 'true' : undefined}
                  >
                    {label}
                  </span>
                </span>
              );
            })}
          </div>
        )}
      </>
    );

    if (clickable) {
      return (
        <button
          key={k}
          type="button"
          className={`hac-cell hac-cell--data hac-cell--clickable`}
          style={cellStyle}
          aria-label={`ช่อง ${coordLabel}`}
          tabIndex={0}
          onClick={() => onCellClick(col, row)}
        >
          {children}
        </button>
      );
    }

    return (
      <div
        key={k}
        className="hac-cell hac-cell--data hac-cell--static"
        style={cellStyle}
        role="img"
        aria-label={`ช่อง ${coordLabel}${a11yScoreLabel}`}
      >
        {children}
      </div>
    );
  };

  return (
    <div className="hac-grid-wrap">
      <div
        className="hac-board"
        role="group"
        aria-label="กระดานสี 30 คูณ 16 แกนแนวตั้ง A ถึง P แกนแนวนอน 1 ถึง 30"
      >
        <div className="hac-axis hac-axis--corner" aria-hidden />
        {Array.from({ length: HUES_AND_CUES_COLS }, (_, col) => (
          <div key={`hac-x-${col}`} className="hac-axis hac-axis--x">
            {col + 1}
          </div>
        ))}
        {Array.from({ length: HUES_AND_CUES_ROWS }, (_, row) => {
          const letter = String.fromCharCode(65 + row);
          const rowCells = Array.from({ length: HUES_AND_CUES_COLS }, (_, col) =>
            cellInner(col, row),
          );
          return [
            <div key={`hac-y-${row}`} className="hac-axis hac-axis--y">
              {letter}
            </div>,
            ...rowCells,
          ];
        }).flat()}
      </div>
    </div>
  );
}

interface Props {
  gameState: HuesAndCuesPlayerView;
  myId: string;
  sendAction: (a: HuesAndCuesAction) => void;
  onLeave: () => void;
  onRestart?: () => void;
}

export function HuesAndCuesGame({ gameState: gs, myId, sendAction, onLeave, onRestart }: Props) {
  const [clue1Draft, setClue1Draft] = useState('');
  const [clue2Word1, setClue2Word1] = useState('');
  const [clue2Word2, setClue2Word2] = useState('');
  const finished = gs.phase === 'game_over';

  useEffect(() => {
    if (!finished) return;
    return startWinCelebrationLoop();
  }, [finished]);

  useEffect(() => {
    setClue1Draft('');
    setClue2Word1('');
    setClue2Word2('');
  }, [gs.roundIndex, gs.subPhase]);

  const send = useCallback((a: HuesAndCuesAction) => sendAction(a), [sendAction]);

  const maxScore = useMemo(() => Math.max(0, ...Object.values(gs.scores)), [gs.scores]);
  const phaseHint = useMemo(() => subPhaseHint(gs), [gs]);

  const canPlace1 =
    !gs.amCueGiver && gs.subPhase === 'guess1' && gs.guess1[myId] == null && gs.phase === 'playing';
  const canPlace2 =
    !gs.amCueGiver && gs.subPhase === 'guess2' && gs.guess2[myId] == null && gs.phase === 'playing';

  const markersAtCell = useMemo(() => {
    const m = new Map<string, { id: string; round: 1 | 2 }[]>();
    const add = (col: number, row: number, id: string, round: 1 | 2) => {
      const k = `${col},${row}`;
      const arr = m.get(k) ?? [];
      arr.push({ id, round });
      m.set(k, arr);
    };
    for (const [id, c] of Object.entries(gs.guess1)) {
      if (c) add(c.col, c.row, id, 1);
    }
    for (const [id, c] of Object.entries(gs.guess2)) {
      if (c) add(c.col, c.row, id, 2);
    }
    return m;
  }, [gs.guess1, gs.guess2]);

  const winnerNames =
    gs.gameResult?.winners.map((id) => gs.playerNames[id] ?? id).join(' · ') ?? '';

  const handleCellClick = (col: number, row: number) => {
    if (canPlace1) send({ type: 'place_guess1', col, row });
    else if (canPlace2) send({ type: 'place_guess2', col, row });
  };

  const showBoardScoring = gs.subPhase === 'reveal' && gs.target != null;
  const showCueGiverTargetRing =
    gs.amCueGiver &&
    gs.phase === 'playing' &&
    gs.target != null &&
    gs.subPhase !== 'reveal';
  /** กรอบพื้นที่คะแนน 5×5 รอบเป้าหมาย — ตอนเปิดเฉลย / ผู้ใบ้ระหว่างเล่น / หน้าจบเกมที่มีกระดาน */
  const showScoreFootprint =
    gs.target != null && (showBoardScoring || showCueGiverTargetRing);

  if (finished && gs.gameResult) {
    const result = gs.gameResult;
    return (
      <div className="hac-page">
        <header className="hac-header">
          <h1 className="hac-title">Hues and Cues</h1>
          <div className="hac-header-actions">
            {onRestart && (
              <Button type="button" variant="secondary" onClick={onRestart}>
                <RotateCcw size={16} aria-hidden />
                เล่นใหม่
              </Button>
            )}
            <Button type="button" variant="danger" onClick={onLeave}>
              <LogOut size={16} aria-hidden />
              ออกจากห้อง
            </Button>
          </div>
        </header>
        <div className="hac-over card">
          <h2>จบเกม</h2>
          <p>{result.reason}</p>
          {winnerNames && <p>ผู้ชนะ: {winnerNames}</p>}
          <div className="hac-scores" style={{ justifyContent: 'center', marginTop: 16 }}>
            {gs.playerOrder.map((id) => (
              <span key={id} className="hac-score-pill hac-score-pill--lead">
                {gs.playerNames[id]}: {result.scores[id] ?? 0}
              </span>
            ))}
          </div>
          {gs.target && (
            <>
              <p className="hac-meta hac-postgame-board-hint">
                กระดานรอบสุดท้าย — กรอบขาวรอบพื้นที่ (5×5) = ช่วงมีคะแนนรอบเป้าหมาย · ตัวเลขกลางช่อง = คะแนนถ้าทายช่องนั้น · วงขาว = เป้าหมาย
              </p>
              <div className="hac-postgame-grid">
                <HuesBoardGrid
                  gs={gs}
                  markersAtCell={markersAtCell}
                  canPlace1={false}
                  canPlace2={false}
                  onCellClick={() => {}}
                  showChebyshevScores
                  showTargetRing
                  showCueGiverTargetRing={false}
                  showScoreFootprint
                />
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="hac-page">
      <header className="hac-header">
        <h1 className="hac-title">Hues and Cues</h1>
        <div className="hac-header-actions">
          {onRestart && (
            <Button type="button" variant="secondary" onClick={onRestart}>
              <RotateCcw size={16} aria-hidden />
              เล่นใหม่
            </Button>
          )}
          <Button type="button" variant="danger" onClick={onLeave}>
            <LogOut size={16} aria-hidden />
            ออก
          </Button>
        </div>
      </header>

      <div className="hac-round-bar">
        <span className="hac-round-bar__main">
          รอบ {gs.roundIndex + 1} / {gs.totalRounds}
        </span>
        <span className="hac-round-bar__sep" aria-hidden>
          ·
        </span>
        <span className="hac-round-bar__markers">
          มาร์กเกอร์ รอบ 1: {gs.progress.guess1Done}/{gs.progress.guess1Total} · รอบ 2:{' '}
          {gs.progress.guess2Done}/{gs.progress.guess2Total}
        </span>
      </div>

      <div className="hac-cue-clue-row">
        <div className="hac-cue-clue-row__callout">
          <div className="hac-cue-callout" role="status" aria-live="polite">
            <div className="hac-cue-callout__icon" aria-hidden>
              <Lightbulb size={22} strokeWidth={2} />
            </div>
            <div className="hac-cue-callout__body">
              <div className="hac-cue-callout__label">ผู้ให้คำใบ้ในรอบนี้</div>
              <div className="hac-cue-callout__name">
                {gs.playerNames[gs.cueGiverId] ?? gs.cueGiverId}
              </div>
              {gs.amCueGiver ? (
                <div className="hac-cue-callout__role hac-cue-callout__role--you">
                  คุณเป็นผู้ใบ้ — ผู้เล่นอื่นเป็นผู้ทาย
                </div>
              ) : (
                <div className="hac-cue-callout__role">
                  คุณเป็นผู้ทาย — ดูคำใบ้ด้านล่างแล้ววางมาร์กเกอร์
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="hac-cue-clue-row__main">
          {phaseHint && <p className="hac-phase-hint">{phaseHint}</p>}

          <HuesCueTargetHero gs={gs} />

          {!gs.amCueGiver && gs.clue1 && (
            <div
              className="hac-my-markers-preview"
              role="region"
              aria-label="มาร์กเกอร์ของคุณบนกระดาน"
            >
              <span className="hac-my-markers-preview__label">มาร์กเกอร์ของคุณ</span>
              <span className="hac-my-markers-preview__pair">
                <HuesPlayerMarkerGlyph gs={gs} playerId={myId} round={1} />
                <HuesPlayerMarkerGlyph gs={gs} playerId={myId} round={2} />
              </span>
              <span className="hac-my-markers-preview__hint">รอบ 1 · รอบ 2</span>
            </div>
          )}

          {gs.clue1 && (
            <div className="hac-clues-showcase" aria-labelledby="hac-clues-heading">
              <div id="hac-clues-heading" className="hac-clues-showcase__title">
                คำใบ้ของรอบนี้
              </div>
              <div className="hac-clues-showcase__grid">
                <div className="hac-clue-card">
                  <div className="hac-clue-card__label">คำใบ้ที่ 1</div>
                  <div className="hac-clue-card__text" lang="th">
                    {gs.clue1}
                  </div>
                  <div className="hac-clue-card__hint">หนึ่งคำ</div>
                </div>
                <div className={`hac-clue-card${gs.clue2 ? '' : ' hac-clue-card--waiting'}`}>
                  <div className="hac-clue-card__label">คำใบ้ที่ 2</div>
                  <div className="hac-clue-card__text" lang="th">
                    {clue2Placehold(gs)}
                  </div>
                  <div className="hac-clue-card__hint">สองคำ</div>
                </div>
              </div>
            </div>
          )}

          {gs.amCueGiver && gs.subPhase === 'clue1' && (
            <div className="hac-clue-panel">
              <h3>ส่งคำใบ้แรก (หนึ่งคำ)</h3>
              <p className="hac-meta">ห้ามใช้ชื่อสีพื้นฐาน — ไม่นับช่องว่างหลายคำ</p>
              <div className="hac-clue-row">
                <Input
                  value={clue1Draft}
                  onChange={(e) => setClue1Draft(e.target.value)}
                  placeholder="เช่น มะนาว"
                  aria-label="คำใบ้หนึ่งคำ"
                  onKeyDown={(e) =>
                    e.key === 'Enter' &&
                    clue1Draft.trim() &&
                    send({ type: 'submit_clue1', text: clue1Draft })
                  }
                />
                <Button
                  type="button"
                  disabled={!clue1Draft.trim()}
                  onClick={() => send({ type: 'submit_clue1', text: clue1Draft })}
                >
                  ส่งคำใบ้
                </Button>
              </div>
            </div>
          )}

          {gs.amCueGiver && gs.subPhase === 'clue2' && (
            <div className="hac-clue-panel">
              <h3>ส่งคำใบ้ที่สอง (สองคำ)</h3>
              <p className="hac-meta">
                คำละช่อง — ห้ามชื่อสีพื้นฐาน · หรือกดข้ามถ้าไม่ใบ้รอบนี้ (แสดงเป็น -)
              </p>
              <div className="hac-clue-row hac-clue-row--clue2">
                <div className="hac-clue2-pair">
                  <Input
                    value={clue2Word1}
                    onChange={(e) => setClue2Word1(e.target.value)}
                    placeholder="คำแรก"
                    aria-label="คำใบ้รอบสอง คำแรก"
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return;
                      e.preventDefault();
                      if (clue2Word1.trim() && clue2Word2.trim()) {
                        send({
                          type: 'submit_clue2',
                          text: `${clue2Word1.trim()} ${clue2Word2.trim()}`,
                        });
                      }
                    }}
                  />
                  <Input
                    value={clue2Word2}
                    onChange={(e) => setClue2Word2(e.target.value)}
                    placeholder="คำที่สอง"
                    aria-label="คำใบ้รอบสอง คำที่สอง"
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return;
                      e.preventDefault();
                      if (clue2Word1.trim() && clue2Word2.trim()) {
                        send({
                          type: 'submit_clue2',
                          text: `${clue2Word1.trim()} ${clue2Word2.trim()}`,
                        });
                      }
                    }}
                  />
                </div>
                <div className="hac-clue2-actions">
                  <Button
                    type="button"
                    disabled={!clue2Word1.trim() || !clue2Word2.trim()}
                    onClick={() =>
                      send({
                        type: 'submit_clue2',
                        text: `${clue2Word1.trim()} ${clue2Word2.trim()}`,
                      })
                    }
                  >
                    ส่งคำใบ้
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => send({ type: 'skip_clue2' })}>
                    ข้าม
                  </Button>
                </div>
              </div>
            </div>
          )}

          {!gs.amCueGiver && gs.subPhase === 'clue1' && (
            <p className="hac-meta">รอผู้ให้คำใบ้ส่งคำแรก…</p>
          )}
          {!gs.amCueGiver && gs.subPhase === 'clue2' && (
            <p className="hac-meta">รอผู้ให้คำใบ้ส่งคำที่สอง…</p>
          )}

          {(canPlace1 || canPlace2) && (
            <p className="hac-meta">
              {canPlace1 && 'คลิกช่องบนกระดานเพื่อวางมาร์กเกอร์รอบแรก'}
              {canPlace2 &&
                'คลิกช่องบนกระดานเพื่อวางมาร์กเกอร์รอบสอง — เฉพาะช่องที่ยังไม่มีมาร์กเกอร์ (ห้ามทับรอบแรกหรือของผู้อื่นในรอบนี้)'}
            </p>
          )}
        </div>
      </div>

      <HuesPlayerOrderStrip gs={gs} myId={myId} maxScore={maxScore} />

      <div className="hac-legend">
        <span>
          <HuesPlayerMarkerGlyph gs={gs} playerId={myId} round={1} legend />
          รอบ 1 — วงทึบ ไม่มีขอบ
        </span>
        <span>
          <HuesPlayerMarkerGlyph gs={gs} playerId={myId} round={2} legend />
          รอบ 2 — วงทึบ มีขอบสีส้ม
        </span>
      </div>

      <HuesBoardGrid
        gs={gs}
        markersAtCell={markersAtCell}
        canPlace1={canPlace1}
        canPlace2={canPlace2}
        onCellClick={handleCellClick}
        showChebyshevScores={showBoardScoring}
        showTargetRing={showBoardScoring}
        showCueGiverTargetRing={showCueGiverTargetRing}
        showScoreFootprint={showScoreFootprint}
      />

      {gs.subPhase === 'reveal' && gs.revealBreakdown && gs.target && (
        <div className="hac-reveal">
          <h3 className="hac-reveal__title">เปิดเฉลย</h3>

          <div
            className="hac-reveal-target"
            aria-label={`สีเป้าหมาย ช่อง ${huesAndCuesCellLabel(gs.target.col, gs.target.row)}${gs.targetHex ? ` ${gs.targetHex}` : ''}`}
          >
            <div
              className="hac-reveal-target__swatch"
              style={
                gs.targetHex
                  ? ({ backgroundColor: gs.targetHex } as CSSProperties)
                  : undefined
              }
              role="img"
              aria-hidden
            />
            <div className="hac-reveal-target__meta">
              <span className="hac-reveal-target__kicker">สีเป้าหมายของรอบนี้</span>
              <span className="hac-reveal-target__code" lang="en">
                {huesAndCuesCellLabel(gs.target.col, gs.target.row)}
              </span>
              {gs.targetHex && <code className="hac-reveal-target__hex">{gs.targetHex}</code>}
              <span className="hac-reveal-target__hint">เทียบกับกระดานด้านบน</span>
            </div>
          </div>

          <p className="hac-reveal__scoring-note">
            คะแนนผู้ทายต่อมาร์กเกอร์: +3 ตรงช่อง · +2 ในกรอบ 3×3 (ห่างสูงสุด 1 ช่อง) · +1 ห่าง 2 ช่อง
          </p>

          <div className="hac-reveal-table-wrap">
            <table className="hac-reveal-table">
              <thead>
                <tr>
                  <th scope="col">ผู้เล่น</th>
                  <th scope="col">รอบ 1</th>
                  <th scope="col">รอบ 2</th>
                  <th scope="col">รวมรอบ</th>
                </tr>
              </thead>
              <tbody>
                {gs.playerOrder
                  .filter((id) => id !== gs.cueGiverId)
                  .map((id) => {
                    const b = gs.revealBreakdown!.byPlayer[id];
                    return (
                      <tr key={id}>
                        <th scope="row" className="hac-reveal-table__name">
                          {gs.playerNames[id]}
                        </th>
                        <td className="hac-reveal-table__pts">{formatRevealPts(b?.guess1)}</td>
                        <td className="hac-reveal-table__pts">{formatRevealPts(b?.guess2)}</td>
                        <td className="hac-reveal-table__pts hac-reveal-table__pts--total">
                          {b?.roundTotal !== undefined ? formatRevealPts(b.roundTotal) : '—'}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
              <tfoot>
                <tr className="hac-reveal-table__cue-row">
                  <th scope="row" className="hac-reveal-table__name">
                    {gs.playerNames[gs.cueGiverId]}
                    <span className="hac-reveal-table__cue-badge">ผู้ให้คำใบ้</span>
                  </th>
                  <td colSpan={2} className="hac-reveal-table__cue-rule">
                    คะแนน = จำนวนมาร์กเกอร์ในกรอบ 5×5
                  </td>
                  <td className="hac-reveal-table__pts hac-reveal-table__pts--cue">
                    +{gs.revealBreakdown.cueGiverRoundGain}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="hac-reveal__actions">
            <Button type="button" onClick={() => send({ type: 'continue_after_reveal' })}>
              {gs.roundIndex + 1 >= gs.totalRounds ? 'จบเกม' : 'ไปรอบถัดไป'}
            </Button>
          </div>
        </div>
      )}

      {gs.lastEvent && gs.subPhase !== 'reveal' && <p className="hac-meta">{gs.lastEvent}</p>}
    </div>
  );
}
