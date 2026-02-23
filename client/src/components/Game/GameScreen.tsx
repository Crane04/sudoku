// src/components/Game/GameScreen.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The top-level game view. Rendered by App.tsx whenever phase is one of:
//   countdown | in_progress | victory
//
// Responsibilities:
//   • Provide the full-screen layout shell
//   • Render the game header (room info, difficulty badge, live clock)
//   • Compose <BoardGrid /> + optional <CountdownOverlay /> + <VictoryOverlay />
//   • Handle "Play Again" — resets store and returns to Lobby
//   • Render a connection-lost banner if the socket drops mid-game
//
// It does NOT handle board logic — that lives in BoardGrid.
// It does NOT own any game state — everything comes from Zustand selectors.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from "react";
import {
  useGameStore,
  selectPhase,
  selectMyProgress,
  selectOpponentProgress,
  selectDifficulty,
  selectConnectionStatus,
} from "../../store/gameStore";
import { socketActions } from "../../socket/socketClient";
import { DIFFICULTY_LABELS } from "../../types/game";

import { BoardGrid } from "./BoardGrid";
import { CountdownOverlay } from "../Countdown/CountdownOverlay";
import { VictoryOverlay } from "../Victory/VictoryOverlay";

import "./GameScreen.css";

// ─── Live game clock ──────────────────────────────────────────────────────────
// Counts up from 0 when phase becomes 'in_progress'.
// Paused when phase is 'countdown' or 'victory'.

function useGameClock(active: boolean) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [active]);

  // Reset on re-mount (new game)
  useEffect(() => {
    setSeconds(0);
  }, []);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

// ─── Connection lost banner ───────────────────────────────────────────────────

function ConnectionBanner() {
  return (
    <div className="connection-banner" role="alert" aria-live="assertive">
      <span className="status-dot status-dot--red" aria-hidden="true" />
      <span className="connection-banner__msg">
        Connection lost — attempting to reconnect…
      </span>
    </div>
  );
}

// ─── Game header ──────────────────────────────────────────────────────────────

interface GameHeaderProps {
  difficulty: string;
  clock: string;
  phase: string;
  onForfeit: () => void;
}

function GameHeader({ difficulty, clock, phase, onForfeit }: GameHeaderProps) {
  const isActive = phase === "in_progress";
  const [confirm, setConfirm] = useState(false);

  const handleForfeit = () => {
    if (!confirm) {
      // First click: arm the button (shows "Sure?")
      setConfirm(true);
      setTimeout(() => setConfirm(false), 3000); // auto-disarm
    } else {
      onForfeit();
    }
  };

  return (
    <header className="game-header">
      {/* Left — wordmark */}
      <div className="game-header__brand">
        <span className="game-header__sudo">SUDO</span>
        <span className="game-header__race">RACE</span>
      </div>

      {/* Centre — difficulty + clock */}
      <div className="game-header__centre">
        <span className="badge badge--amber">{difficulty}</span>
        <span
          className={`game-header__clock ${isActive ? "game-header__clock--active" : ""}`}
          aria-label={`Game time: ${clock}`}
          aria-live="off"
        >
          {clock}
        </span>
      </div>

      {/* Right — forfeit */}
      <div className="game-header__actions">
        {phase !== "victory" && (
          <button
            className={`btn btn--sm ${confirm ? "btn--danger" : "btn--ghost"}`}
            onClick={handleForfeit}
            aria-label={confirm ? "Confirm forfeit" : "Forfeit game"}
          >
            {confirm ? "Sure?" : "Forfeit"}
          </button>
        )}
      </div>
    </header>
  );
}

// ─── GameScreen ───────────────────────────────────────────────────────────────

export function GameScreen() {
  const phase = useGameStore(selectPhase);
  const difficulty = useGameStore(selectDifficulty);
  const myProgress = useGameStore(selectMyProgress);
  const opponentProgress = useGameStore(selectOpponentProgress);
  const connectionStatus = useGameStore(selectConnectionStatus);
  const setPhase = useGameStore((s) => s.setPhase);
  const resetGame = useGameStore((s) => s.resetGame);

  const isActive = phase === "in_progress";
  const clock = useGameClock(isActive);

  const diffLabel = difficulty ? DIFFICULTY_LABELS[difficulty] : "—";

  // ── Countdown complete ─────────────────────────────────────────────────────
  // Called by CountdownOverlay when "GO" hold finishes.
  // Flips phase to 'in_progress' so the board becomes interactive.
  const handleCountdownComplete = useCallback(() => {
    setPhase("in_progress");
  }, [setPhase]);

  // ── Play again ─────────────────────────────────────────────────────────────
  const handlePlayAgain = useCallback(() => {
    socketActions.leaveRoom();
    resetGame();
    // phase resets to 'idle' inside resetGame → App.tsx renders <Lobby />
  }, [resetGame]);

  // ── Forfeit ────────────────────────────────────────────────────────────────
  const handleForfeit = useCallback(() => {
    socketActions.leaveRoom();
    resetGame();
  }, [resetGame]);

  return (
    <div className="game-screen">
      {/* Connection lost banner — floats above everything */}
      {connectionStatus === "disconnected" && <ConnectionBanner />}

      {/* Game header */}
      <GameHeader
        difficulty={diffLabel}
        clock={clock}
        phase={phase}
        onForfeit={handleForfeit}
      />

      {/* ── Main play area ────────────────────────────────────────────────── */}
      {/* BoardGrid is ALWAYS mounted during game phases so the board is
          visible beneath the countdown overlay. Pointer-events on the
          overlay block accidental interaction during the countdown. */}
      <main className="game-screen__main">
        <BoardGrid />
      </main>

      {/* ── Countdown overlay ─────────────────────────────────────────────── */}
      {phase === "countdown" && (
        <CountdownOverlay
          onComplete={handleCountdownComplete}
          myName={myProgress?.displayName ?? "You"}
          opponentName={opponentProgress?.displayName ?? "???"}
          difficulty={diffLabel}
        />
      )}

      {/* ── Victory overlay ────────────────────────────────────────────────── */}
      {phase === "victory" && <VictoryOverlay onPlayAgain={handlePlayAgain} />}
    </div>
  );
}
