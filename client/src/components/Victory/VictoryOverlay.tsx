// src/components/Victory/VictoryOverlay.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Full-screen victory/defeat result card.
// Rendered by GameScreen when phase === 'victory'.
//
// Shows:
//   • Win or lose glyph + headline
//   • Finish time (winner's) or forfeit message
//   • Both player progress at end of game
//   • Play Again button → resets store → returns to Lobby
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import {
  useGameStore,
  selectVictoryPayload,
  selectMyProgress,
  selectOpponentProgress,
  selectIAmWinner,
  selectMyPlayerId,
} from "../../store/gameStore";
import "./VictoryOverlay.css";

// ─── Time formatter ────────────────────────────────────────────────────────────

function formatTime(ms: number): string {
  if (ms === 0) return "—";
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  const frac = Math.floor((ms % 1000) / 100); // tenths
  if (mins > 0) {
    return `${mins}m ${secs}.${frac}s`;
  }
  return `${secs}.${frac}s`;
}

// ─── Animated count-up number ─────────────────────────────────────────────────

function CountUp({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const duration = 800;
    const steps = 30;
    const step = target / steps;
    let i = 0;
    const t = setInterval(() => {
      i++;
      setCurrent(Math.min(Math.round(step * i), target));
      if (i >= steps) clearInterval(t);
    }, duration / steps);
    return () => clearInterval(t);
  }, [target]);

  return (
    <>
      {current}
      {suffix}
    </>
  );
}

// ─── Player result row ────────────────────────────────────────────────────────

interface PlayerResultProps {
  displayName: string;
  completedCells: number;
  finishTimeMs: number | undefined;
  isWinner: boolean;
  isMe: boolean;
}

function PlayerResult({
  displayName,
  completedCells,
  finishTimeMs,
  isWinner,
  isMe,
}: PlayerResultProps) {
  return (
    <div
      className={`result-player ${isWinner ? "result-player--winner" : "result-player--loser"} ${isMe ? "result-player--me" : ""}`}
    >
      {/* Crown / sword glyph */}
      <span className="result-player__glyph" aria-hidden="true">
        {isWinner ? "♛" : "✦"}
      </span>

      <div className="result-player__info">
        <span className="result-player__name">
          {isMe ? `${displayName} (You)` : displayName}
        </span>

        <div className="result-player__stats">
          <span className="result-player__cells">
            <CountUp target={completedCells} />
            /81 cells
          </span>
          {finishTimeMs !== undefined && finishTimeMs > 0 && (
            <span className="result-player__time">
              {formatTime(finishTimeMs)}
            </span>
          )}
        </div>
      </div>

      {isWinner && (
        <span className="result-player__badge badge badge--amber">Winner</span>
      )}
    </div>
  );
}

// ─── VictoryOverlay ───────────────────────────────────────────────────────────

interface VictoryOverlayProps {
  onPlayAgain: () => void;
}

export function VictoryOverlay({ onPlayAgain }: VictoryOverlayProps) {
  const payload = useGameStore(selectVictoryPayload);
  const myProgress = useGameStore(selectMyProgress);
  const opponentProgress = useGameStore(selectOpponentProgress);
  const iAmWinner = useGameStore(selectIAmWinner);
  const myPlayerId = useGameStore(selectMyPlayerId);

  if (!payload) return null;

  const wasForfeit = payload.finishTimeMs === 0;

  // Determine winner / loser progress objects
  const winnerProgress = iAmWinner ? myProgress : opponentProgress;
  const loserProgress = iAmWinner ? opponentProgress : myProgress;

  const winnerIsMe = payload.winnerId === myPlayerId;

  return (
    <div
      className="victory-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={iAmWinner ? "Victory screen" : "Defeat screen"}
    >
      {/* Frosted backdrop */}
      <div className="victory-backdrop" aria-hidden="true" />

      {/* Spotlight tint */}
      <div
        className={`victory-spotlight ${iAmWinner ? "victory-spotlight--win" : "victory-spotlight--loss"}`}
        aria-hidden="true"
      />

      {/* ── Card ────────────────────────────────────────────────────────── */}
      <div
        className={`victory-card ${iAmWinner ? "victory-card--win" : "victory-card--loss"}`}
      >
        {/* Hero glyph */}
        <div className="victory-card__glyph" aria-hidden="true">
          {iAmWinner ? "♛" : "✦"}
        </div>

        {/* Headline */}
        <h2 className="victory-card__title">
          {iAmWinner ? "Victory" : "Defeated"}
        </h2>

        {/* Subtitle */}
        <p className="victory-card__subtitle">
          {wasForfeit
            ? iAmWinner
              ? "Your opponent left the game."
              : "You left the game."
            : iAmWinner
              ? `Solved in ${formatTime(payload.finishTimeMs)}`
              : "Your opponent was faster."}
        </p>

        {/* ── Player results ────────────────────────────────────────────── */}
        {winnerProgress && loserProgress && (
          <div className="victory-results">
            <PlayerResult
              displayName={winnerProgress.displayName}
              completedCells={winnerProgress.completedCells}
              finishTimeMs={payload.finishTimeMs}
              isWinner
              isMe={winnerIsMe}
            />
            <div className="victory-results__divider" aria-hidden="true">
              —
            </div>
            <PlayerResult
              displayName={loserProgress.displayName}
              completedCells={loserProgress.completedCells}
              finishTimeMs={undefined}
              isWinner={false}
              isMe={!winnerIsMe}
            />
          </div>
        )}

        {/* ── Actions ──────────────────────────────────────────────────── */}
        <div className="victory-card__actions">
          <button
            className="btn btn--primary btn--lg"
            onClick={onPlayAgain}
            autoFocus
          >
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
}
