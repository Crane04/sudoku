// server/src/socket/middleware/gameMiddleware.ts
import { Server, Socket, ExtendedError } from "socket.io";
import { GameStateManager } from "../../services/GameStateManager";

// Augment Socket type so handlers can access validated room data
// without re-querying the store on every event
declare module "socket.io" {
  interface Socket {
    roomId?: string; // Populated by middleware after validation
    playerId: string; // Always socket.id — typed explicitly for clarity
  }
}

export function applyGameMiddleware(io: Server, gsm: GameStateManager): void {
  // ── Middleware 1: Identity ──────────────────────────────────────────────────
  // Runs on every new connection — stamps playerId so handlers never use
  // socket.id directly (prevents raw id leaking into business logic)
  io.use((socket: Socket, next: (err?: ExtendedError) => void) => {
    socket.playerId = socket.id;
    next();
  });

  // ── Middleware 2: Move Guard ────────────────────────────────────────────────
  // Intercepts ONLY move_made events before they reach the handler.
  // Any socket not attached to an in-progress room is rejected here.
  io.use((socket: Socket, next: (err?: ExtendedError) => void) => {
    socket.onAny((event: string) => {
      if (event !== "move_made") return; // Only guard game moves

      const roomId = gsm.getRoomIdBySocket(socket.playerId);
      console.log({ roomId });

      if (!roomId) {
        socket.emit("error", {
          code: "NOT_IN_ROOM",
          message: "You must be in an active room to make moves.",
        });
        return; // Do NOT call next() — handler is skipped
      }

      const room = gsm.getRoom(roomId);

      if (!room) {
        socket.emit("error", {
          code: "ROOM_NOT_FOUND",
          message: "Your room no longer exists.",
        });
        return;
      }

      if (room.status !== "in_progress") {
        socket.emit("error", {
          code: "GAME_NOT_ACTIVE",
          message: `Cannot move: game is currently "${room.status}".`,
        });
        return;
      }

      // Check the player hasn't already finished (no moves after victory)
      const player = room.players.find((p) => p?.id === socket.playerId);
      if (player?.isFinished) {
        socket.emit("error", {
          code: "ALREADY_FINISHED",
          message: "You have already completed this puzzle.",
        });
        return;
      }

      // Stamp roomId onto socket for the handler to consume without re-querying
      socket.roomId = roomId;
    });

    next(); // Always advance — the onAny guard handles the blocking
  });
}
