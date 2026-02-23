// src/components/Game/ProgressBar.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Renders one animated progress bar for a player.
// Used twice in GameScreen — once for "me", once for opponent.
// The fill width is CSS-transitioned so it animates smoothly on each update.
// ─────────────────────────────────────────────────────────────────────────────

import { memo } from "react";

interface ProgressBarProps {
  displayName: string;
  completedCells: number; // 0–81
  isMe: boolean;
  isFinished: boolean;
}

const TOTAL_CELLS = 81;

function ProgressBarComponent({
  displayName,
  completedCells,
  isMe,
  isFinished,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.round((completedCells / TOTAL_CELLS) * 100));
  const variant = isFinished ? "finished" : isMe ? "me" : "opponent";

  return (
    <div
      className={`progress-bar progress-bar--${variant}`}
      role="progressbar"
      aria-valuenow={completedCells}
      aria-valuemin={0}
      aria-valuemax={TOTAL_CELLS}
      aria-label={`${displayName}: ${completedCells} of ${TOTAL_CELLS} cells`}
    >
      {/* Name row */}
      <div className="progress-bar__header">
        <span className="progress-bar__name">
          {isMe ? "▶ You" : `⚔ ${displayName}`}
        </span>
        <span className="progress-bar__count">
          {completedCells}
          <span className="progress-bar__total">/{TOTAL_CELLS}</span>
        </span>
      </div>

      {/* Track + fill */}
      <div className="progress-bar__track">
        <div className="progress-bar__fill" style={{ width: `${pct}%` }} />
        <span className="progress-bar__pct" aria-hidden="true">
          {pct}%
        </span>
      </div>
    </div>
  );
}

export const ProgressBar = memo(ProgressBarComponent);
ProgressBar.displayName = "ProgressBar";
