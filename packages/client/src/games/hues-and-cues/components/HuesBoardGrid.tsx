import { useMemo, type CSSProperties } from 'react';
import type { HuesAndCuesPlayerView } from 'shared';
import {
  HUES_AND_CUES_COLS,
  HUES_AND_CUES_ROWS,
  huesAndCuesCellHex,
  huesAndCuesCellLabel,
  huesAndCuesChebyshevScore,
} from 'shared';
import { PlayerAvatar } from '../../../components/player-avatar';
import { huesScoreFootprintEdgeShadow, type MarkersMap } from '../lib/boardHelpers';

type Props = {
  gs: HuesAndCuesPlayerView;
  myId: string;
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
};

export function HuesBoardGrid({
  gs,
  myId,
  markersAtCell,
  canPlace1,
  canPlace2,
  onCellClick,
  showChebyshevScores,
  showTargetRing,
  showCueGiverTargetRing,
  showScoreFootprint,
}: Props) {
  const tc = gs.target?.col;
  const tr = gs.target?.row;

  /**
   * รอบ 2: ห้ามทับมาร์กเกอร์คนอื่น (รอบ 1 หรือ 2) —
   * ทับช่องมาร์กเกอร์รอบ 1 ของตัวเองได้ตามกฎจริง
   */
  const blockedForGuess2Placement = useMemo(() => {
    const o = new Set<string>();
    for (const [id, c] of Object.entries(gs.guess1)) {
      if (!c) continue;
      if (id === myId) continue;
      o.add(`${c.col},${c.row}`);
    }
    for (const c of Object.values(gs.guess2)) {
      if (c) o.add(`${c.col},${c.row}`);
    }
    return o;
  }, [gs.guess1, gs.guess2, myId]);

  const cellInner = (col: number, row: number) => {
    const hex = huesAndCuesCellHex(col, row);
    const k = `${col},${row}`;
    const clickable = canPlace1 || (canPlace2 && !blockedForGuess2Placement.has(k));
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
              const name = gs.playerNames[m.id] ?? m.id;
              return (
                <span
                  key={`${m.id}-${m.round}`}
                  className={`hac-marker hac-marker--r${m.round}`}
                  title={`${name} · รอบ ${m.round}`}
                >
                  <PlayerAvatar
                    playerId={m.id}
                    name={name}
                    size={24}
                    decorative
                    className="hac-marker__avatar"
                  />
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
          className="hac-cell hac-cell--data hac-cell--clickable"
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
