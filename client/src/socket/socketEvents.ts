// src/socket/socketEvents.ts
// ─────────────────────────────────────────────────────────────────────────────
// Binds every server → client Socket.io event to the corresponding
// Zustand store action.
//
// Rules:
//   • This file is the ONLY place socket.on() is called.
//   • It never renders anything or imports React.
//   • It imports from both socketClient (the socket) and gameStore (the actions).
//   • Call bindSocketEvents() once, early in the app lifecycle (main.tsx or App.tsx).
//   • Returns an unbind function for clean teardown (useful in tests).
// ─────────────────────────────────────────────────────────────────────────────

import { getSocket } from "./socketClient";
import { useGameStore } from "../store/gameStore";

// ─── Bind ────────────────────────────────────────────────────────────────────

export function bindSocketEvents(): () => void {
  const socket = getSocket();

  // Convenience alias — avoids calling getState() in every handler
  const store = () => useGameStore.getState();

  // ── connect ────────────────────────────────────────────────────────────────
  // Fires when the WebSocket handshake completes.
  // We stamp the socket.id as myPlayerId here — it's stable for the session.
  function onConnect() {
    store().setConnectionStatus("connected");
    store().setMyPlayerId(socket.id ?? "");
  }

  function onGameRejoined(payload: {
    clues: (number | null)[][];
    boardSnapshot: (number | null)[][];
    difficulty: any;
    opponentProgress: number;
    opponentName: string;
    myProgress: number;
  }) {
    store().onGameRejoined(payload);
  }

  // ── connect_error ──────────────────────────────────────────────────────────
  // Fires on each failed connection attempt (before reconnection kicks in).
  function onConnectError(err: Error) {
    console.warn("[socket] connect_error:", err.message);
    store().setConnectionStatus("disconnected");
    store().setError({
      code: "CONNECT_ERROR",
      message: "Could not reach the server. Retrying…",
    });
  }

  // ── disconnect ─────────────────────────────────────────────────────────────
  // Fires on any disconnection — network drop, server restart, explicit close.
  function onDisconnect(reason: string) {
    console.warn("[socket] disconnect:", reason);
    store().setConnectionStatus("disconnected");

    // Only flip to 'disconnected' phase if the user was mid-game.
    // Being disconnected from the lobby is silent (they can reconnect and rejoin).
    const phase = store().phase;
    if (phase === "in_progress" || phase === "countdown") {
      store().setPhase("disconnected");
    }
  }

  // ── reconnect ─────────────────────────────────────────────────────────────
  // Socket.io's built-in reconnection succeeded.
  function onReconnect(attempt: number) {
    console.info(`[socket] reconnected after ${attempt} attempt(s)`);
    store().setConnectionStatus("connected");
    store().setMyPlayerId(socket.id ?? "");

    // Clear any disconnection error so the banner disappears
    store().setError(null);

    // If the game was in progress when we dropped, we can't recover the room
    // (server already cleaned it up). Return to idle so user can start fresh.
    const phase = store().phase;
    if (phase === "disconnected") {
      store().resetGame();
    }
  }

  // ── room_joined ────────────────────────────────────────────────────────────
  function onRoomJoined(payload: {
    roomId: string;
    players: any[];
    isPrivate: boolean;
  }) {
    store().onRoomJoined(payload);
  }

  // ── game_start ─────────────────────────────────────────────────────────────
  function onGameStart(payload: {
    clues: (number | null)[][];
    difficulty: any;
    countdownMs: number;
  }) {
    store().onGameStart(payload.clues, payload.difficulty);
  }

  // ── progress_update ────────────────────────────────────────────────────────
  function onProgressUpdate(payload: {
    playerId: string;
    completedCells: number;
  }) {
    store().onProgressUpdate(payload.playerId, payload.completedCells);
  }

  // ── move_rejected ──────────────────────────────────────────────────────────
  function onMoveRejected(payload: { cell: [number, number]; reason: string }) {
    store().onMoveRejected(payload.cell, payload.reason);
  }

  // ── victory_declared ───────────────────────────────────────────────────────
  function onVictoryDeclared(payload: {
    winnerId: string;
    losingPlayerId: string;
    finishTimeMs: number;
  }) {
    store().onVictoryDeclared(payload);
  }

  // ── opponent_left ──────────────────────────────────────────────────────────
  function onOpponentLeft(payload: { playerId: string }) {
    store().onOpponentLeft(payload.playerId);
  }

  // ── error ──────────────────────────────────────────────────────────────────
  // Server-sent application errors (wrong room code, room full, etc.)
  // These are distinct from connection errors above.
  function onError(payload: { code: string; message: string }) {
    console.warn("[socket] server error:", payload.code, payload.message);
    store().setError(payload);
  }

  // ── Register all listeners ─────────────────────────────────────────────────
  socket.on("connect", onConnect);
  socket.on("connect_error", onConnectError);
  socket.on("disconnect", onDisconnect);
  socket.io.on("reconnect", onReconnect); // on the Manager, not the socket
  socket.on("room_joined", onRoomJoined);
  socket.on("game_start", onGameStart);
  socket.on("progress_update", onProgressUpdate);
  socket.on("move_rejected", onMoveRejected);
  socket.on("victory_declared", onVictoryDeclared);
  socket.on("opponent_left", onOpponentLeft);
  socket.on("error", onError);
  socket.on("game_rejoined", onGameRejoined);

  // ── Return unbind function ─────────────────────────────────────────────────
  // Call this in cleanup (test teardown, StrictMode double-effect, etc.)
  return function unbindSocketEvents() {
    socket.off("connect", onConnect);
    socket.off("connect_error", onConnectError);
    socket.off("disconnect", onDisconnect);
    socket.io.off("reconnect", onReconnect);
    socket.off("room_joined", onRoomJoined);
    socket.off("game_start", onGameStart);
    socket.off("progress_update", onProgressUpdate);
    socket.off("move_rejected", onMoveRejected);
    socket.off("victory_declared", onVictoryDeclared);
    socket.off("opponent_left", onOpponentLeft);
    socket.off("error", onError);
    socket.off("game_rejoined", onGameRejoined);
  };
}
