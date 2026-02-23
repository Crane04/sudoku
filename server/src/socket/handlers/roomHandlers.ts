// server/src/socket/handlers/roomHandlers.ts
import { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  Difficulty,
} from "../../types/Board";

import { MatchmakingService } from "../../services/MatchmakingService";

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export function registerRoomHandlers(
  io: TypedServer,
  socket: TypedSocket,
  mm: MatchmakingService,
): void {
  socket.on("join_public_queue", ({ displayName, difficulty }) => {
    if (!isValidDifficulty(difficulty)) {
      socket.emit("error", {
        code: "INVALID_DIFFICULTY",
        message: "Choose easy, medium, or hard.",
      });
      return;
    }
    mm.joinPublicQueue(socket, sanitize(displayName), difficulty);
  });

  socket.on("create_private_room", ({ displayName, difficulty }) => {
    if (!isValidDifficulty(difficulty)) {
      socket.emit("error", {
        code: "INVALID_DIFFICULTY",
        message: "Choose easy, medium, or hard.",
      });
      return;
    }
    mm.createPrivateRoom(socket, sanitize(displayName), difficulty);
  });

  socket.on("join_private_room", ({ displayName, roomCode }) => {
    if (!roomCode || roomCode.length !== 6) {
      socket.emit("error", {
        code: "INVALID_CODE",
        message: "Room code must be 6 characters.",
      });
      return;
    }
    mm.joinPrivateRoom(socket, sanitize(displayName), roomCode.toUpperCase());
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const VALID_DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

function isValidDifficulty(d: unknown): d is Difficulty {
  return VALID_DIFFICULTIES.includes(d as Difficulty);
}

function sanitize(input: string): string {
  // Strip HTML, limit length — display names come from untrusted clients
  return (
    input
      .replace(/<[^>]*>/g, "")
      .trim()
      .substring(0, 20) || "Anonymous"
  );
}
