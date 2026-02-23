// src/components/Game/Cell.tsx
// ─────────────────────────────────────────────────────────────────────────────
// A single 9×9 board cell. Pure presentational — all state comes from props.
// Re-renders are kept surgical via React.memo + stable prop references.
//
// Visual states (can combine):
//   isClue       → cream/bold, not clickable
//   isSelected   → amber ring inset border
//   isSameRow/Col/Box → dim highlight background
//   isSameNumber → amber tint (helps find duplicates)
//   isOptimistic → amber text, value pending server confirm
//   isConfirmed  → steel-blue text, server-accepted
//   isRejected   → crimson flash + shake animation
// ─────────────────────────────────────────────────────────────────────────────

import { memo } from "react";
import type { Cell as CellType, CellPos } from "../../types/game";

interface CellProps {
  cell: CellType;
  row: number;
  col: number;
  isSelected: boolean;
  isSameRow: boolean;
  isSameCol: boolean;
  isSameBox: boolean;
  isSameNumber: boolean;
  onSelect: (pos: CellPos) => void;
}

function CellComponent({
  cell,
  row,
  col,
  isSelected,
  isSameRow,
  isSameCol,
  isSameBox,
  isSameNumber,
  onSelect,
}: CellProps) {
  const displayValue = cell.optimistic ?? cell.value;

  const classes = [
    "cell",
    cell.isClue ? "cell--clue" : "cell--input",
    isSelected ? "cell--selected" : "",
    (isSameRow || isSameCol || isSameBox) && !isSelected
      ? "cell--highlight"
      : "",
    isSameNumber && displayValue !== null ? "cell--same-num" : "",
    cell.optimistic !== null ? "cell--optimistic" : "",
    cell.isConfirmed && !cell.isClue ? "cell--confirmed" : "",
    cell.isRejected ? "cell--rejected" : "",
    col === 2 || col === 5 ? "cell--box-right" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const handleClick = () => {
    if (!cell.isClue) onSelect([row, col]);
  };

  return (
    <td
      className={classes}
      onClick={handleClick}
      role="gridcell"
      aria-selected={isSelected}
      aria-label={
        `Row ${row + 1}, Column ${col + 1}` +
        (displayValue ? `, value ${displayValue}` : ", empty") +
        (cell.isClue ? ", given" : "")
      }
      aria-readonly={cell.isClue}
    >
      <span className="cell__value" aria-hidden="true">
        {displayValue ?? ""}
      </span>
    </td>
  );
}

export const Cell = memo(CellComponent, (prev, next) => {
  return (
    prev.cell.value === next.cell.value &&
    prev.cell.optimistic === next.cell.optimistic &&
    prev.cell.isConfirmed === next.cell.isConfirmed &&
    prev.cell.isRejected === next.cell.isRejected &&
    prev.isSelected === next.isSelected &&
    prev.isSameRow === next.isSameRow &&
    prev.isSameCol === next.isSameCol &&
    prev.isSameBox === next.isSameBox &&
    prev.isSameNumber === next.isSameNumber
  );
});

Cell.displayName = "Cell";
