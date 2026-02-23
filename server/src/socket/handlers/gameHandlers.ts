// server/src/socket/handlers/gameHandlers.ts
import { Server, Socket } from "socket.io";
import { GameStateManager } from "../../services/GameStateManager";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "../../types/Board";

// Full typing for our io/socket so TypeScript enforces the event contract
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export function registerGameHandlers(
  io: TypedServer,
  socket: TypedSocket,
  gsm: GameStateManager,
): void {
  // ── move_made ───────────────────────────────────────────────────────────────
  // Client sends: { cell: [row, col], value: number }
  // Server:
  //   1. Validates the move against the solution
  //   2. On success → broadcasts progress_update to the room
  //   3. On victory → emits victory_declared to the room
  //   4. On failure → emits move_rejected to sender ONLY

  socket.on("move_made", ({ cell, value }) => {
    const [row, col] = cell;

    // roomId was stamped by middleware — if absent, middleware failed (shouldn't happen)
    const roomId = socket.roomId;

    if (!roomId) {
      socket.emit("error", {
        code: "MIDDLEWARE_FAULT",
        message: "Room context missing. Please reconnect.",
      });
      return;
    }

    // ── Delegate all mutation + validation to GameStateManager ────────────────
    const result = gsm.applyMove(roomId, socket.playerId, row, col, value);

    if (!result.valid) {
      // ── REJECTED: Only the sender hears this ─────────────────────────────
      // Opponent never knows you made a wrong guess
      socket.emit("move_rejected", {
        cell: [row, col],
        reason: result.reason ?? "INVALID_MOVE",
      });
      return;
    }

    // ── VALID MOVE ────────────────────────────────────────────────────────────

    // progress_update: broadcast to the entire room (both players)
    // Note: we send playerId + count ONLY — never the cell coordinates or value
    // An observer tapping network traffic learns nothing useful
    emitProgressUpdate(io, roomId, socket.playerId, result.completedCells);

    // ── victory_declared ──────────────────────────────────────────────────────
    if (result.isVictory) {
      emitVictoryDeclared(io, socket, gsm, roomId);
    }
  });

  // ── Explicit leave ────────────────────────────────────────────────────────
  socket.on("leave_room", () => {
    handlePlayerExit(io, socket, gsm);
  });

  // ── Disconnect (tab close, network drop, etc.) ────────────────────────────
  socket.on("disconnect", () => {
    gsm.removeSocket(socket.id);
  });

  socket.on(
    "rejoin_room",
    ({ roomCode, displayName }: { roomCode: string; displayName: string }) => {
      const result = gsm.rejoinRoom(roomCode, socket.id, displayName);

      if (!result.success || !result.room) {
        socket.emit("error", {
          code: "REJOIN_FAILED",
          message: result.reason ?? "Could not rejoin room.",
        });
        return;
      }

      const room = result.room;
      const opponent = room.players.find((p) => p?.id !== socket.id);

      // Put socket back into the Socket.io room
      socket.join(roomCode);

      // Send full game state back to the rejoining player
      socket.emit("game_rejoined", {
        clues: room.originalClues,
        boardSnapshot: result.boardSnapshot ?? [],
        difficulty: room.difficulty,
        opponentProgress: opponent?.completedCells ?? 0,
        opponentName: opponent?.displayName ?? "Opponent",
        myProgress:
          room.players.find((p) => p?.id === socket.id)?.completedCells ?? 0,
      });
    },
  );
}

// ─── Event Emitters (extracted for reuse + testability) ──────────────────────

function emitProgressUpdate(
  io: TypedServer,
  roomId: string,
  playerId: string,
  completedCells: number,
): void {
  // Broadcast to ALL sockets in the room — sender included
  // (sender needs to update their own progress bar too)
  io.to(roomId).emit("progress_update", {
    playerId,
    completedCells,
  });
}

function emitVictoryDeclared(
  io: TypedServer,
  socket: TypedSocket,
  gsm: GameStateManager,
  roomId: string,
): void {
  const room = gsm.getRoom(roomId);
  if (!room) return;

  const winner = room.players.find(
    (p) => p?.isFinished && p.id === socket.playerId,
  );
  const loser = room.players.find((p) => p?.id !== socket.playerId);

  if (!winner || !loser) return;

  io.to(roomId).emit("victory_declared", {
    winnerId: winner.id,
    losingPlayerId: loser.id,
    finishTimeMs: winner.finishTimeMs ?? 0,
  });

  setTimeout(() => {
    io.socketsLeave(roomId);
    gsm.removeRoomFromSocketMap(roomId);
    gsm.rooms.delete(roomId);
  }, 5000);
}

function handlePlayerExit(
  io: TypedServer,
  socket: TypedSocket,
  gsm: GameStateManager,
): void {
  const room = gsm.removeSocket(socket.playerId);
  if (!room) return;

  // Notify remaining player — they win by default
  socket.to(room.roomId).emit("opponent_left", {
    playerId: socket.playerId,
  });

  socket.leave(room.roomId);

  io.socketsLeave(room.roomId);
  gsm.removeRoomFromSocketMap(room.roomId);
  gsm.rooms.delete(room.roomId);
}
