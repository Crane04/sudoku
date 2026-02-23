// server/src/services/MatchmakingService.ts
import { v4 as uuidv4 } from "uuid";
import type { Difficulty, Room, Player } from "../types/Board";
import { SudokuEngine } from "../engine/SudokuEngine";
import { Server, Socket } from "socket.io";
import { GameStateManager } from "./GameStateManager";

// ─── In-Memory Stores ──────────────────────────────────────────────────────────

// Public FIFO queue: one queue per difficulty
type QueueEntry = { socket: Socket; player: Player };
const publicQueues: Record<Difficulty, QueueEntry[]> = {
  easy: [],
  medium: [],
  hard: [],
};

// Private rooms map: roomCode → Room (server-side full state including solution)
interface ServerRoom extends Room {
  solution: number[][];
  originalClues: (number | null)[][];
  boards: {
    [playerId: string]: (number | null)[][];
  };
}

const privateRooms = new Map<string, ServerRoom>();

// ─── Helpers ───────────────────────────────────────────────────────────────────

function generateRoomCode(): string {
  // 6-character alphanumeric, collision-checked
  let code: string;
  do {
    code = Math.random().toString(36).substring(2, 8).toUpperCase();
  } while (privateRooms.has(code));
  return code;
}

function buildServerRoom(
  roomId: string,
  isPrivate: boolean,
  difficulty: Difficulty,
  firstPlayer: Player,
): ServerRoom {
  const engine = new SudokuEngine();
  const { solution, clues } = engine.generate(difficulty);

  return {
    roomId,
    status: "waiting",
    players: [firstPlayer],
    isPrivate,
    difficulty,
    createdAt: Date.now(),
    solution,
    originalClues: clues.map((row) => [...row]), // ← Store original clues separately
    boards: {
      [firstPlayer.id]: clues.map((row) => [...row]), // deep copy per player
    },
  };
}

// ─── Matchmaking Logic ─────────────────────────────────────────────────────────

export class MatchmakingService {
  constructor(
    private io: Server,
    private gameStateManager: GameStateManager,
  ) {}

  joinPublicQueue(
    socket: Socket,
    displayName: string,
    difficulty: Difficulty,
  ): void {
    const queue = publicQueues[difficulty];
    const incomingPlayer: Player = {
      id: socket.id,
      displayName,
      completedCells: 0,
      isFinished: false,
    };

    if (queue.length === 0) {
      queue.push({ socket, player: incomingPlayer });
      socket.emit("error", {
        code: "QUEUED",
        message: "Waiting for opponent...",
      });
      return;
    }

    const opponentIndex = queue.findIndex(
      (p) => p.player.displayName !== displayName,
    );

    if (opponentIndex === -1) {
      // Only the same player is in the queue — keep waiting
      queue.push({ socket, player: incomingPlayer });
      socket.emit("error", {
        code: "QUEUED",
        message: "Waiting for opponent...",
      });
      return;
    }

    const { socket: opponentSocket, player: opponentPlayer } = queue.shift()!;
    const roomId = uuidv4();
    const room = buildServerRoom(roomId, false, difficulty, opponentPlayer);

    const secondPlayer: Player = { ...incomingPlayer };
    (room.players as Player[]).push(secondPlayer);
    room.boards[secondPlayer.id] = room.originalClues.map((row) => [...row]);

    // Register with GameStateManager INSTEAD of local maps
    this.gameStateManager.registerRoom(room);
    this.gameStateManager.registerSocket(opponentSocket.id, roomId);
    this.gameStateManager.registerSocket(socket.id, roomId);

    // Still need socket.io join for communication
    opponentSocket.join(roomId);
    socket.join(roomId);

    this.startGame(room, opponentSocket, socket);
  }

  createPrivateRoom(
    socket: Socket,
    displayName: string,
    difficulty: Difficulty,
  ): string {
    const roomCode = generateRoomCode();
    const creator: Player = {
      id: socket.id,
      displayName,
      completedCells: 0,
      isFinished: false,
    };

    const room = buildServerRoom(roomCode, true, difficulty, creator);

    // Register with GameStateManager
    this.gameStateManager.registerRoom(room);
    this.gameStateManager.registerSocket(socket.id, roomCode);

    socket.join(roomCode);
    socket.emit("room_joined", {
      roomId: roomCode,
      players: room.players,
      isPrivate: true,
    });

    return roomCode;
  }

  joinPrivateRoom(socket: Socket, displayName: string, roomCode: string): void {
    const room = this.gameStateManager.getRoom(roomCode);

    if (!room) {
      socket.emit("error", {
        code: "INVALID_CODE",
        message: "Room not found.",
      });
      return;
    }
    if (room.status !== "waiting") {
      socket.emit("error", {
        code: "GAME_IN_PROGRESS",
        message: "Game has already started.",
      });
      return;
    }
    if (room.players.length >= 2) {
      socket.emit("error", {
        code: "ROOM_FULL",
        message: "This room is already full.",
      });
      return;
    }

    const joiningPlayer: Player = {
      id: socket.id,
      displayName,
      completedCells: 0,
      isFinished: false,
    };

    (room.players as Player[]).push(joiningPlayer);
    room.boards[joiningPlayer.id] = room.originalClues.map((row) => [...row]);

    // Register socket with GameStateManager
    this.gameStateManager.registerSocket(socket.id, roomCode);

    socket.join(roomCode);

    this.startGame(
      room,
      this.io.sockets.sockets.get(room.players[0].id)!,
      socket,
    );
  }

  // ── Shared: Start Game ────────────────────────────────────────────────────────
  private startGame(room: ServerRoom, ...sockets: Socket[]): void {
    room.status = "countdown";

    // Emit room_joined to all participants
    this.io.to(room.roomId).emit("room_joined", {
      roomId: room.roomId,
      players: room.players,
      isPrivate: room.isPrivate,
    });

    // 3-second countdown then game starts
    setTimeout(() => {
      room.status = "in_progress";
      // KEY: each socket gets the same clues (derived from solution + mask)
      // The full solution is NEVER emitted — only lives server-side
      const clues = room.boards[room.players[0].id]; // clue template is same for both

      this.io.to(room.roomId).emit("game_start", {
        clues,
        difficulty: room.difficulty,
        countdownMs: 0,
      });
    }, 3000);
  }

  handleDisconnect(socket: Socket): void {
    // Let GameStateManager handle cleanup
    const room = this.gameStateManager.removeSocket(socket.id);

    if (room) {
      socket.to(room.roomId).emit("opponent_left", { playerId: socket.id });
    }

    // Also remove from public queue
    for (const queue of Object.values(publicQueues)) {
      const idx = queue.findIndex((e) => e.socket.id === socket.id);
      if (idx !== -1) queue.splice(idx, 1);
    }
  }
}
