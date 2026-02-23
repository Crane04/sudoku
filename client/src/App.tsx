// src/App.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Top-level component. Single responsibility: read `phase` from Zustand and
// decide which top-level screen to render. Nothing else lives here.
//
// Phase → Screen mapping:
//   idle | queued | waiting | disconnected  →  <Lobby />
//   countdown | in_progress | victory       →  <GameScreen />
//
// The transition between Lobby and Game is handled by the `key` prop on each
// wrapper div, which forces React to unmount/remount the entering screen and
// re-trigger the `page-enter` CSS animation defined in global.css.
//
// Socket event binding happens here on mount (once, for the app lifetime).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect } from "react";
import { useGameStore, selectPhase } from "./store/gameStore";
import { bindSocketEvents } from "./socket/socketEvents";
import { Lobby } from "./components/Lobby/Lobby";
import { GameScreen } from "./components/Game/GameScreen";
import type { GamePhase } from "./types/game";

// ─── Phase groups ─────────────────────────────────────────────────────────────

const LOBBY_PHASES = new Set<GamePhase>([
  "idle",
  "queued",
  "waiting",
  "disconnected",
]);

const GAME_PHASES = new Set<GamePhase>(["countdown", "in_progress", "victory"]);

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const phase = useGameStore(selectPhase);

  // ── Bind socket events once for the entire app lifetime ─────────────────
  // Returns an unbind function for cleanup (React StrictMode fires this
  // twice in dev — the unbind + re-bind ensures no double-listeners).
  useEffect(() => {
    const unbind = bindSocketEvents();
    return unbind;
  }, []);

  // ── Determine active screen ───────────────────────────────────────────────
  const showLobby = LOBBY_PHASES.has(phase);
  const showGame = GAME_PHASES.has(phase);

  return (
    <>
      {showLobby && (
        <div key="lobby" className="page-enter">
          <Lobby />
        </div>
      )}

      {showGame && (
        <div key="game" className="page-enter">
          <GameScreen />
        </div>
      )}
    </>
  );
}
