// src/socket/socketClient.ts
// ─────────────────────────────────────────────────────────────────────────────
// One socket instance for the entire app lifetime.
// Components and hooks import `socketActions` to SEND events.
// socketEvents.ts imports `getSocket()` to BIND incoming events.
//
// This file never imports from the store — it is purely outbound.
// Inbound event → store wiring lives exclusively in socketEvents.ts.
// ─────────────────────────────────────────────────────────────────────────────

import { io, type Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  Difficulty,
} from "../types/game";
import BASE_URL from "../constants/server";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// ─── Singleton ────────────────────────────────────────────────────────────────

let socket: TypedSocket | null = null;

/**
 * Returns the socket instance, creating it if needed.
 * Does NOT connect — call connectSocket() explicitly.
 */
export function getSocket(): TypedSocket {
  if (!socket) {
    socket = io(BASE_URL, {
      // Manual connect — we call connectSocket() in Lobby on mount,
      // so the socket is not open until the user actually arrives.
      autoConnect: false,

      // Reconnection config
      reconnection: true,
      reconnectionAttempts: 6,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,

      // Transport: prefer WebSocket, fall back to polling
      transports: ["websocket", "polling"],

      // Prevent massive payloads from the server
      // (mirrors maxHttpBufferSize on the server)
      // maxHttpBufferSize: 1e5,
    });
  }

  return socket;
}

/**
 * Open the connection.  Safe to call multiple times — ignored if already open.
 */
export function connectSocket(): void {
  const s = getSocket();
  if (!s.connected) s.connect();
}

/**
 * Gracefully close and destroy the singleton.
 * Call this only on intentional app teardown, not on room leave.
 */
export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

// ─── Outbound action wrappers ─────────────────────────────────────────────────
// Typed wrappers so no component ever calls socket.emit() directly.
// All validation of preconditions (e.g. "am I in a room?") is done on the
// server; the client just fires and waits for the authoritative response.

export const socketActions = {
  // ── Matchmaking ─────────────────────────────────────────────────────────────

  joinPublicQueue(displayName: string, difficulty: Difficulty): void {
    getSocket().emit("join_public_queue", {
      displayName: sanitiseName(displayName),
      difficulty,
    });
  },

  createPrivateRoom(displayName: string, difficulty: Difficulty): void {
    getSocket().emit("create_private_room", {
      displayName: sanitiseName(displayName),
      difficulty,
    });
  },

  joinPrivateRoom(displayName: string, roomCode: string): void {
    getSocket().emit("join_private_room", {
      displayName: sanitiseName(displayName),
      roomCode: roomCode.toUpperCase().trim(),
    });
  },

  rejoinRoom(roomCode: string, displayName: string): void {
    getSocket().emit("rejoin_room", { roomCode, displayName });
  },

  // ── Gameplay ─────────────────────────────────────────────────────────────────

  makeMove(row: number, col: number, value: number | null): void {
    getSocket().emit("move_made", {
      cell: [row, col],
      value,
    });
  },

  // ── Room lifecycle ────────────────────────────────────────────────────────────

  leaveRoom(): void {
    getSocket().emit("leave_room");
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Strip HTML tags and enforce max length before sending to server.
 * Server also sanitises, but defence in depth is cheap.
 */
function sanitiseName(name: string): string {
  return (
    name
      .replace(/<[^>]*>/g, "") // strip tags
      .trim()
      .slice(0, 20) || "Anonymous"
  );
}
