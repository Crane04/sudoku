// client/src/components/Board/BoardGrid.tsx
import React, { useCallback, useEffect, useRef } from "react";
import { useGame } from "../../hooks/useGame";
import type { LocalCell } from "../../store/gameStore";
import "./BoardGrid.css";

// ── Cell ──────────────────────────────────────────────────────────────────────
interface CellProps {
  cell: LocalCell;
  row: number;
  col: number;
  isSelected: boolean;
  isSameRow: boolean;
  isSameCol: boolean;
  isSameBox: boolean;
  isSameNum: boolean;
  onSelect: (pos: [number, number]) => void;
}

const Cell = React.memo(
  ({
    cell,
    row,
    col,
    isSelected,
    isSameRow,
    isSameCol,
    isSameBox,
    isSameNum,
    onSelect,
  }: CellProps) => {
    const displayValue = cell.optimistic ?? cell.value;

    const classes = [
      "cell",
      cell.isClue ? "cell--clue" : "cell--input",
      isSelected ? "cell--selected" : "",
      isSameRow || isSameCol || isSameBox ? "cell--highlight" : "",
      isSameNum && displayValue ? "cell--same-num" : "",
      cell.isCorrect && !cell.isClue ? "cell--correct" : "",
      cell.isRejected ? "cell--rejected" : "",
      cell.optimistic !== null ? "cell--optimistic" : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <td
        className={classes}
        onClick={() => !cell.isClue && onSelect([row, col])}
        aria-label={`Row ${row + 1}, Column ${col + 1}${displayValue ? `, value ${displayValue}` : ", empty"}`}
        role="gridcell"
        aria-selected={isSelected}
      >
        <span className="cell__value">{displayValue ?? ""}</span>
      </td>
    );
  },
);
Cell.displayName = "Cell";

// ── Progress Bar ──────────────────────────────────────────────────────────────
interface ProgressBarProps {
  displayName: string;
  completedCells: number;
  isMe: boolean;
  isFinished: boolean;
}

function ProgressBar({
  displayName,
  completedCells,
  isMe,
  isFinished,
}: ProgressBarProps) {
  const pct = Math.round((completedCells / 81) * 100);
  return (
    <div className={`progress ${isMe ? "progress--me" : "progress--opponent"}`}>
      <div className="progress__header">
        <span className="progress__name">
          {isMe ? "▶ You" : `⚔ ${displayName}`}
        </span>
        <span className="progress__count">
          {completedCells}
          <span className="progress__total">/81</span>
        </span>
      </div>
      <div className="progress__track">
        <div
          className={`progress__fill ${isFinished ? "progress__fill--finished" : ""}`}
          style={{ width: `${pct}%` }}
        />
        <span className="progress__pct">{pct}%</span>
      </div>
    </div>
  );
}

// ── Victory Overlay ───────────────────────────────────────────────────────────
function VictoryOverlay({
  iAmWinner,
  finishTimeMs,
  onPlayAgain,
}: {
  iAmWinner: boolean;
  finishTimeMs: number;
  onPlayAgain: () => void;
}) {
  const secs = (finishTimeMs / 1000).toFixed(1);
  return (
    <div className="victory">
      <div className="victory__card">
        <div className="victory__glyph">{iAmWinner ? "♛" : "✦"}</div>
        <h2 className="victory__title">{iAmWinner ? "Victory" : "Defeated"}</h2>
        <p className="victory__time">
          {iAmWinner ? `Solved in ${secs}s` : "Your opponent was faster"}
        </p>
        <button className="victory__btn" onClick={onPlayAgain}>
          Play Again
        </button>
      </div>
    </div>
  );
}

// ── Number Pad (mobile) ───────────────────────────────────────────────────────
function NumberPad({ onKey }: { onKey: (k: string) => void }) {
  return (
    <div className="numpad" role="group" aria-label="Number input">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
        <button
          key={n}
          className="numpad__btn"
          onClick={() => onKey(String(n))}
          aria-label={`Enter ${n}`}
        >
          {n}
        </button>
      ))}
      <button
        className="numpad__btn numpad__btn--erase"
        onClick={() => onKey("Backspace")}
        aria-label="Erase"
      >
        ⌫
      </button>
    </div>
  );
}

// ── BoardGrid (root export) ───────────────────────────────────────────────────
export function BoardGrid({ onPlayAgain }: { onPlayAgain: () => void }) {
  const {
    board,
    selectedCell,
    myProgress,
    opponentProgress,
    phase,
    victoryPayload,
    iAmWinner,
    selectCell,
    handleKeyPress,
  } = useGame();

  const boardRef = useRef<HTMLTableElement>(null);

  // Auto-focus board so keyboard works without clicking first
  useEffect(() => {
    if (phase === "in_progress") boardRef.current?.focus();
  }, [phase]);

  // Derive context for highlighting
  const [selRow, selCol] = selectedCell ?? [-1, -1];
  const selValue = selectedCell
    ? (board[selRow]?.[selCol]?.optimistic ?? board[selRow]?.[selCol]?.value)
    : null;
  const selBox = selectedCell
    ? { r: Math.floor(selRow / 3), c: Math.floor(selCol / 3) }
    : null;

  const getCellContext = useCallback(
    (row: number, col: number) => ({
      isSelected: row === selRow && col === selCol,
      isSameRow: row === selRow && col !== selCol,
      isSameCol: col === selCol && row !== selRow,
      isSameBox:
        selBox !== null &&
        Math.floor(row / 3) === selBox.r &&
        Math.floor(col / 3) === selBox.c &&
        !(row === selRow && col === selCol),
      isSameNum:
        selValue !== null &&
        (board[row]?.[col]?.optimistic ?? board[row]?.[col]?.value) ===
          selValue,
    }),
    [selRow, selCol, selBox, selValue, board],
  );

  return (
    <div className="game">
      {/* ── Progress bars ─────────────────────────────────────────────────── */}
      <div className="game__progress">
        {myProgress && (
          <ProgressBar
            displayName={myProgress.displayName}
            completedCells={myProgress.completedCells}
            isMe
            isFinished={myProgress.isFinished}
          />
        )}
        {opponentProgress && (
          <ProgressBar
            displayName={opponentProgress.displayName}
            completedCells={opponentProgress.completedCells}
            isMe={false}
            isFinished={opponentProgress.isFinished}
          />
        )}
      </div>

      {/* ── 9×9 Grid ──────────────────────────────────────────────────────── */}
      <div className="board-wrap">
        <table
          className="board"
          ref={boardRef}
          tabIndex={0}
          role="grid"
          aria-label="Sudoku board"
          aria-readonly={phase !== "in_progress"}
        >
          <tbody>
            {board.map((row, ri) => (
              <tr
                key={ri}
                className={`board__row ${ri === 2 || ri === 5 ? "board__row--box-border" : ""}`}
              >
                {row.map((cell, ci) => {
                  const ctx = getCellContext(ri, ci);
                  return (
                    <Cell
                      key={ci}
                      cell={cell}
                      row={ri}
                      col={ci}
                      {...ctx}
                      onSelect={selectCell}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Mobile number pad ─────────────────────────────────────────────── */}
      <NumberPad onKey={handleKeyPress} />

      {/* ── Victory overlay ────────────────────────────────────────────────── */}
      {phase === "victory" && victoryPayload && (
        <VictoryOverlay
          iAmWinner={iAmWinner}
          finishTimeMs={victoryPayload.finishTimeMs}
          onPlayAgain={onPlayAgain}
        />
      )}
    </div>
  );
}
