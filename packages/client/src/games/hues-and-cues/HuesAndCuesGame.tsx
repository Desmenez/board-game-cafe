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
import { LogOut, RotateCcw } from 'lucide-react';
import './hues-and-cues.css';

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

type MarkersMap = Map<string, { id: string; round: 1 | 2 }[]>;

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
}

function HuesBoardGrid({
  gs,
  markersAtCell,
  canPlace1,
  canPlace2,
  onCellClick,
  showChebyshevScores,
  showTargetRing,
}: HuesBoardGridProps) {
  const tc = gs.target?.col;
  const tr = gs.target?.row;

  const cellInner = (col: number, row: number) => {
    const hex = huesAndCuesCellHex(col, row);
    const clickable = canPlace1 || canPlace2;
    const k = `${col},${row}`;
    const coordLabel = huesAndCuesCellLabel(col, row);
    const markers = markersAtCell.get(k) ?? [];
    const isTarget = showTargetRing && tc === col && tr === row;

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
          style={{ backgroundColor: hex }}
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
        style={{ backgroundColor: hex }}
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
  const [clue2Draft, setClue2Draft] = useState('');
  const finished = gs.phase === 'game_over';

  useEffect(() => {
    if (!finished) return;
    return startWinCelebrationLoop();
  }, [finished]);

  useEffect(() => {
    setClue1Draft('');
    setClue2Draft('');
  }, [gs.roundIndex, gs.subPhase]);

  const send = useCallback((a: HuesAndCuesAction) => sendAction(a), [sendAction]);

  const maxScore = useMemo(() => Math.max(0, ...Object.values(gs.scores)), [gs.scores]);

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
                กระดานรอบสุดท้าย — ตัวเลขกลางช่อง = คะแนนถ้าทายช่องนั้น (วงขาว = เป้าหมาย)
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

      <p className="hac-meta">
        รอบ {gs.roundIndex + 1}/{gs.totalRounds}
        {gs.amCueGiver ? ' · คุณเป็นผู้ให้คำใบ้' : ' · คุณเป็นผู้ทาย'}
        {' · '}
        มาร์กเกอร์รอบ 1: {gs.progress.guess1Done}/{gs.progress.guess1Total} · รอบ 2:{' '}
        {gs.progress.guess2Done}/{gs.progress.guess2Total}
      </p>

      <div className="hac-scores">
        {gs.playerOrder.map((id) => {
          const lead = (gs.scores[id] ?? 0) === maxScore && maxScore > 0;
          return (
            <span
              key={id}
              className={`hac-score-pill${id === myId ? ' hac-score-pill--me' : ''}${lead ? ' hac-score-pill--lead' : ''}`}
            >
              {gs.playerNames[id]}: {gs.scores[id] ?? 0}
            </span>
          );
        })}
      </div>

      {gs.clue1 && (
        <p className="hac-meta">
          <strong>คำใบ้ 1:</strong> {gs.clue1}
          {gs.clue2 && (
            <>
              {' '}
              · <strong>คำใบ้ 2:</strong> {gs.clue2}
            </>
          )}
        </p>
      )}

      {gs.amCueGiver && gs.subPhase === 'clue1' && (
        <div className="hac-clue-panel">
          <h3>ส่งคำใบ้แรก (หนึ่งคำ)</h3>
          <p className="hac-meta">ห้ามใช้ชื่อสีพื้นฐาน — ไม่นับช่องว่างหลายคำ</p>
          {gs.target && gs.targetHex && (
            <div className="hac-target-preview">
              <div
                className="hac-swatch"
                style={{ backgroundColor: gs.targetHex }}
                title="สีเป้าหมาย"
              />
              <span className="hac-meta">
                เป้าหมายของคุณ (ซ่อนจากผู้ทาย) ช่อง{' '}
                {huesAndCuesCellLabel(gs.target.col, gs.target.row)}
              </span>
            </div>
          )}
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
          <p className="hac-meta">คั่นด้วยช่องว่างหนึ่งช่อง — ห้ามชื่อสีพื้นฐาน</p>
          {gs.target && gs.targetHex && (
            <div className="hac-target-preview">
              <div
                className="hac-swatch"
                style={{ backgroundColor: gs.targetHex }}
                title="สีเป้าหมาย"
              />
            </div>
          )}
          <div className="hac-clue-row">
            <Input
              value={clue2Draft}
              onChange={(e) => setClue2Draft(e.target.value)}
              placeholder="เช่น น้ำแข็ง หวาน"
              aria-label="คำใบ้สองคำ"
              onKeyDown={(e) =>
                e.key === 'Enter' &&
                clue2Draft.trim() &&
                send({ type: 'submit_clue2', text: clue2Draft })
              }
            />
            <Button
              type="button"
              disabled={!clue2Draft.trim()}
              onClick={() => send({ type: 'submit_clue2', text: clue2Draft })}
            >
              ส่งคำใบ้
            </Button>
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
          {canPlace2 && 'คลิกช่องบนกระดานเพื่อวางมาร์กเกอร์รอบสอง (ช่องว่างถ้ายังไม่ถูกจอง)'}
        </p>
      )}

      <div className="hac-legend">
        <span>
          <span
            className="hac-marker hac-marker--legend hac-marker--r1"
            style={{ '--hac-marker-bg': 'hsl(210 92% 44%)' } as CSSProperties}
            aria-hidden
          >
            <span className="hac-marker__glyph">1</span>
          </span>
          รอบ 1 — วงทึบ ย่อชื่อจนไม่ชน (ถ้ายังซ้ำต่อเลขตามลำดับในห้อง)
        </span>
        <span>
          <span
            className="hac-marker hac-marker--legend hac-marker--r2"
            style={{ '--hac-marker-bg': 'hsl(330 92% 44%)' } as CSSProperties}
            aria-hidden
          >
            <span className="hac-marker__glyph">2</span>
          </span>
          รอบ 2 — ขอบส้มล้อม (ยังเป็นสีผู้เล่นเดิม)
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
      />

      {gs.subPhase === 'reveal' && gs.revealBreakdown && gs.target && (
        <div className="hac-reveal">
          <h3>เปิดเฉลย</h3>
          <p className="hac-meta">
            สีเป้าหมาย: ช่อง {huesAndCuesCellLabel(gs.target.col, gs.target.row)}
            {gs.targetHex && (
              <>
                {' '}
                <span
                  className="hac-swatch"
                  style={{
                    display: 'inline-block',
                    verticalAlign: 'middle',
                    backgroundColor: gs.targetHex,
                  }}
                />
              </>
            )}
          </p>
          <p className="hac-meta">
            คะแนนต่อช่องบนกระดาน: +3 ตรงช่อง · +2 ในกรอบ 3×3 (ห่างสูงสุด 1 ช่อง) · +1 ห่าง 2 ช่อง
          </p>
          <table>
            <thead>
              <tr>
                <th>ผู้เล่น</th>
                <th>รอบ 1</th>
                <th>รอบ 2</th>
                <th>รวมรอบ</th>
              </tr>
            </thead>
            <tbody>
              {gs.playerOrder
                .filter((id) => id !== gs.cueGiverId)
                .map((id) => {
                  const b = gs.revealBreakdown!.byPlayer[id];
                  return (
                    <tr key={id}>
                      <td>{gs.playerNames[id]}</td>
                      <td>{b?.guess1 ?? '—'}</td>
                      <td>{b?.guess2 ?? '—'}</td>
                      <td>{b?.roundTotal ?? '—'}</td>
                    </tr>
                  );
                })}
              <tr>
                <td>
                  <strong>{gs.playerNames[gs.cueGiverId]} (ผู้ให้คำใบ้)</strong>
                </td>
                <td colSpan={2}>ได้คะแนนจากผู้ทายรวม</td>
                <td>
                  <strong>+{gs.revealBreakdown.cueGiverRoundGain}</strong>
                </td>
              </tr>
            </tbody>
          </table>
          <div style={{ marginTop: 16 }}>
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
