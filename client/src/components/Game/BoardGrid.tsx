// src/components/Game/BoardGrid.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Renders the 9×9 Sudoku board and handles all user input.
//
// Responsibilities:
//   • Render 81 <Cell /> components inside an accessible <table>
//   • Derive per-cell context flags (isSelected, isSameRow, etc.)
//   • Handle keyboard input (1–9 to place, Backspace/Delete to clear,
//     arrow keys to move selection)
//   • Dispatch optimistic moves to the store immediately
//   • Emit socket events for server validation
//   • Expose onDigit/onErase for the mobile NumberPad
//
// What it does NOT do:
//   • Validate moves (server-authoritative — store handles rejection)
//   • Manage any state beyond cell selection (lives in Zustand)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useRef, useMemo } from "react";
import {
  useGameStore,
  selectBoard,
  selectSelectedCell,
  selectBoardActive,
  selectMyProgress,
  selectOpponentProgress,
} from "../../store/gameStore";
import { socketActions } from "../../socket/socketClient";
import { getBoxIndex } from "../../types/game";
import { Cell } from "./Cell";
import { ProgressBar } from "./ProgressBar";
import { NumberPad } from "./NumberPad";
import "./BoardGrid.css";

// ─── BoardGrid ────────────────────────────────────────────────────────────────

export function BoardGrid() {
  const board = useGameStore(selectBoard);
  const selectedCell = useGameStore(selectSelectedCell);
  const boardActive = useGameStore(selectBoardActive);
  const myProgress = useGameStore(selectMyProgress);
  const opponentProgress = useGameStore(selectOpponentProgress);

  const selectCell = useGameStore((s) => s.selectCell);
  const applyOptimisticMove = useGameStore((s) => s.applyOptimisticMove);

  const tableRef = useRef<HTMLTableElement>(null);

  // Auto-focus the board when it becomes interactive
  useEffect(() => {
    if (boardActive) tableRef.current?.focus();
  }, [boardActive]);

  // ── Selection helpers ──────────────────────────────────────────────────────
  const [selRow, selCol] = selectedCell ?? [-1, -1];

  const selValue = useMemo(() => {
    if (!selectedCell) return null;
    const cell = board[selRow]?.[selCol];
    return cell?.optimistic ?? cell?.value ?? null;
  }, [board, selectedCell, selRow, selCol]);

  const selBox = useMemo(
    () => (selectedCell ? getBoxIndex(selRow, selCol) : -1),
    [selectedCell, selRow, selCol],
  );

  // ── Per-cell context flags ─────────────────────────────────────────────────
  const getCellFlags = useCallback(
    (row: number, col: number) => {
      const isSelected = row === selRow && col === selCol;
      const isSameRow = !isSelected && row === selRow;
      const isSameCol = !isSelected && col === selCol;
      const isSameBox =
        !isSelected && getBoxIndex(row, col) === selBox && selBox !== -1;
      const cellVal = board[row]?.[col]?.optimistic ?? board[row]?.[col]?.value;
      const isSameNumber =
        selValue !== null && cellVal === selValue && !isSelected;

      return { isSelected, isSameRow, isSameCol, isSameBox, isSameNumber };
    },
    [selRow, selCol, selBox, selValue, board],
  );

  // ── Move dispatcher ────────────────────────────────────────────────────────
  // Called by keyboard handler AND mobile NumberPad.
  // 1. Optimistic update (instant visual)
  // 2. Server emit (authoritative — may reject)
  const dispatchMove = useCallback(
    (row: number, col: number, value: number | null) => {
      const cell = board[row]?.[col];
      if (!cell || cell.isClue || !boardActive) return;

      // Optimistic update
      if (value === null) {
        applyOptimisticMove(row, col, 0); // 0 = clear signal in store
      } else {
        applyOptimisticMove(row, col, value);
      }

      // Server emit
      socketActions.makeMove(row, col, value);
    },
    [board, boardActive, applyOptimisticMove],
  );

  // ── Keyboard handler ───────────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTableElement>) => {
      if (!boardActive) return;

      const key = e.key;

      // ── Arrow navigation ───────────────────────────────────────────────────
      const ARROW_DELTAS: Record<string, [number, number]> = {
        ArrowUp: [-1, 0],
        ArrowDown: [1, 0],
        ArrowLeft: [0, -1],
        ArrowRight: [0, 1],
      };

      if (ARROW_DELTAS[key]) {
        e.preventDefault();
        const [dr, dc] = ARROW_DELTAS[key];
        const newRow = Math.max(0, Math.min(8, selRow + dr));
        const newCol = Math.max(0, Math.min(8, selCol + dc));
        // If nothing selected yet, land on centre
        if (selectedCell) {
          selectCell([newRow, newCol]);
        } else {
          selectCell([4, 4]);
        }
        return;
      }

      // ── Tab navigation (treat like arrow) ────────────────────────────────
      if (key === "Tab") {
        e.preventDefault();
        if (selectedCell) {
          const flat = selRow * 9 + selCol;
          const next = e.shiftKey
            ? Math.max(0, flat - 1)
            : Math.min(80, flat + 1);
          selectCell([Math.floor(next / 9), next % 9]);
        } else {
          selectCell([0, 0]);
        }
        return;
      }

      // ── Digit entry ────────────────────────────────────────────────────────
      const digit = parseInt(key, 10);
      if (!isNaN(digit) && digit >= 1 && digit <= 9 && selectedCell) {
        e.preventDefault();
        dispatchMove(selRow, selCol, digit);
        return;
      }

      // ── Erase ──────────────────────────────────────────────────────────────
      if (
        (key === "Backspace" || key === "Delete" || key === "0") &&
        selectedCell
      ) {
        e.preventDefault();
        dispatchMove(selRow, selCol, null); // Send null for delete
        return;
      }

      // ── Escape — deselect ──────────────────────────────────────────────────
      if (key === "Escape") {
        selectCell(null);
      }
    },
    [
      boardActive,
      selectedCell,
      selRow,
      selCol,
      board,
      selectCell,
      dispatchMove,
    ],
  );

  // ── Mobile NumberPad callbacks ─────────────────────────────────────────────
  const handlePadDigit = useCallback(
    (n: number) => {
      if (!selectedCell) return;
      dispatchMove(selRow, selCol, n);
    },
    [selectedCell, selRow, selCol, dispatchMove],
  );

  const handlePadErase = useCallback(() => {
    if (!selectedCell) return;
    dispatchMove(selRow, selCol, null); // Send null for delete
  }, [selectedCell, selRow, selCol, dispatchMove]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="board-wrap">
      {/* ── Progress bars ──────────────────────────────────────────────────── */}
      <div className="board-progress">
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

      {/* ── 9×9 grid ───────────────────────────────────────────────────────── */}
      <div className="board-outer">
        <table
          ref={tableRef}
          className="board"
          role="grid"
          aria-label="Sudoku board"
          aria-readonly={!boardActive}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onClick={(e) => {
            if ((e.target as HTMLElement).tagName === "TABLE") selectCell(null);
          }}
        >
          <tbody>
            {board.map((row, ri) => (
              <tr
                key={ri}
                className={[
                  "board__row",
                  ri === 2 || ri === 5 ? "board__row--box-bottom" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {row.map((cell, ci) => {
                  const flags = getCellFlags(ri, ci);
                  return (
                    <Cell
                      key={ci}
                      cell={cell}
                      row={ri}
                      col={ci}
                      {...flags}
                      onSelect={selectCell}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Mobile number pad ──────────────────────────────────────────────── */}
      <NumberPad
        onDigit={handlePadDigit}
        onErase={handlePadErase}
        disabled={!boardActive || !selectedCell}
      />
    </div>
  );
}
