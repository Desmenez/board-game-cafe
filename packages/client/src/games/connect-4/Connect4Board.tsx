import { useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import type { Connect4Cell, Connect4CellCoord, Connect4Color, Connect4LastMove } from 'shared';
import {
  CONNECT_4_COLS,
  CONNECT_4_ROWS,
  connect4DropDurationMs,
  connect4LowestEmptyRow,
} from 'shared';
import { cn } from '../../utils/cn';

const COLS = Array.from({ length: CONNECT_4_COLS }, (_, i) => i);
const DISPLAY_ROWS = Array.from({ length: CONNECT_4_ROWS }, (_, i) => CONNECT_4_ROWS - 1 - i);

type Props = {
  board: Connect4Cell[][];
  lastMove: Connect4LastMove | null;
  winningLine: Connect4CellCoord[] | null;
  legalColumns: number[];
  myColor: Connect4Color;
  canAct: boolean;
  onDrop: (col: number) => void;
  onAnimatingChange?: (animating: boolean) => void;
};

function moveKey(move: Connect4LastMove | null): string | null {
  if (!move) return null;
  return `${move.col}:${move.row}:${move.playerId}`;
}

export function Connect4Board({
  board,
  lastMove,
  winningLine,
  legalColumns,
  myColor,
  canAct,
  onDrop,
  onAnimatingChange,
}: Props) {
  const reduceMotion = useReducedMotion();
  const seenMoveKey = useRef<string | null | undefined>(undefined);
  const pendingTimer = useRef<number | null>(null);
  const [dropping, setDropping] = useState<Connect4LastMove | null>(null);
  const [hoverCol, setHoverCol] = useState<number | null>(null);
  const [pendingCol, setPendingCol] = useState<number | null>(null);

  const animating = dropping != null;
  const lastMoveKey = moveKey(lastMove);
  const lastMoveRef = useRef(lastMove);
  lastMoveRef.current = lastMove;
  const reduceMotionRef = useRef(reduceMotion);
  reduceMotionRef.current = reduceMotion;

  useEffect(() => {
    onAnimatingChange?.(animating);
  }, [animating, onAnimatingChange]);

  useEffect(() => {
    if (seenMoveKey.current === undefined) {
      seenMoveKey.current = lastMoveKey;
      return;
    }
    if (!lastMoveKey || lastMoveKey === seenMoveKey.current) return;
    seenMoveKey.current = lastMoveKey;
    setPendingCol(null);
    const move = lastMoveRef.current;
    if (reduceMotionRef.current || !move) {
      setDropping(null);
      return;
    }
    setDropping(move);
    const ms = connect4DropDurationMs(move.row);
    const timer = window.setTimeout(() => setDropping(null), ms);
    return () => window.clearTimeout(timer);
  }, [lastMoveKey]);

  useEffect(() => {
    if (!canAct) setPendingCol(null);
  }, [canAct]);

  useEffect(() => {
    return () => {
      if (pendingTimer.current != null) window.clearTimeout(pendingTimer.current);
    };
  }, []);

  const winSet = useMemo(() => {
    if (animating || !winningLine?.length) return new Set<string>();
    return new Set(winningLine.map((cell) => `${cell.row}:${cell.col}`));
  }, [animating, winningLine]);

  const legalSet = useMemo(() => new Set(legalColumns), [legalColumns]);
  const previewCol = canAct && !animating ? (hoverCol ?? pendingCol) : null;
  const previewRow =
    previewCol != null && legalSet.has(previewCol)
      ? connect4LowestEmptyRow(board, previewCol)
      : null;

  const locked = animating || pendingCol != null;

  const drop = (col: number) => {
    if (!canAct || locked || !legalSet.has(col)) return;
    setPendingCol(col);
    onDrop(col);
    if (pendingTimer.current != null) window.clearTimeout(pendingTimer.current);
    pendingTimer.current = window.setTimeout(() => {
      setPendingCol((current) => (current === col ? null : current));
      pendingTimer.current = null;
    }, 1200);
  };

  return (
    <div className="c4-board">
      <div className="c4-preview" aria-hidden>
        {COLS.map((col) => (
          <div key={col} className="c4-preview-cell">
            {previewCol === col ? (
              <span className={cn('c4-disc c4-disc--preview', `c4-disc--${myColor}`)} />
            ) : null}
          </div>
        ))}
      </div>

      <div className="c4-frame-wrap">
        <div className="c4-slots">
          {DISPLAY_ROWS.flatMap((row) =>
            COLS.map((col) => {
              const color = board[row]![col];
              const isDropTarget = dropping != null && dropping.row === row && dropping.col === col;
              const settled = color && !isDropTarget;
              const isWin = winSet.has(`${row}:${col}`);
              const isPreview =
                previewRow === row && previewCol === col && !settled && !isDropTarget;
              const visualFromTop = CONNECT_4_ROWS - 1 - row;
              return (
                <div key={`${row}:${col}`} className="c4-slot">
                  {settled ? (
                    <span className={cn('c4-disc', `c4-disc--${color}`, isWin && 'c4-disc--win')} />
                  ) : null}
                  {isPreview ? (
                    <span className={cn('c4-disc c4-disc--ghost', `c4-disc--${myColor}`)} />
                  ) : null}
                  {isDropTarget && dropping ? (
                    <span
                      className="c4-disc-fly"
                      style={{
                        ['--c4-drop-from' as string]: `calc(-${visualFromTop + 1} * 100%)`,
                        ['--c4-drop-ms' as string]: `${connect4DropDurationMs(row)}ms`,
                      }}
                    >
                      <span className={cn('c4-disc', `c4-disc--${board[row]![col]}`)} />
                    </span>
                  ) : null}
                </div>
              );
            }),
          )}
        </div>

        <div className="c4-mask" aria-hidden>
          {DISPLAY_ROWS.flatMap((row) =>
            COLS.map((col) => <div key={`${row}:${col}`} className="c4-hole" />),
          )}
        </div>

        <div className="c4-hit" onMouseLeave={() => setHoverCol(null)}>
          {COLS.map((col) => {
            const enabled = canAct && !locked && legalSet.has(col);
            return (
              <button
                key={col}
                type="button"
                className={cn('c4-col', hoverCol === col && enabled && 'c4-col--hot')}
                disabled={!enabled}
                aria-label={`หยอดคอลัมน์ ${col + 1}`}
                onMouseEnter={() => setHoverCol(col)}
                onFocus={() => setHoverCol(col)}
                onBlur={() => setHoverCol((current) => (current === col ? null : current))}
                onClick={() => drop(col)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
