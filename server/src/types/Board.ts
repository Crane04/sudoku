// Board.ts
export interface Cell {
  value: number | null; // 1-9 or null if empty
  isClue: boolean; // Server-provided clue, immutable on client
  isValid: boolean; // Client-side optimistic highlight only
}

export type Board = Cell[][]; // 9x9 grid

export type Difficulty = "easy" | "medium" | "hard";

export interface BoardSeed {
  solution: number[][]; // Full solution — NEVER sent to client
  clues: (number | null)[][]; // What the client receives
  difficulty: Difficulty;
}

// Player.ts
export interface Player {
  id: string; // socket.id
  displayName: string;
  completedCells: number; // 0–81
  isFinished: boolean;
  finishTimeMs?: number;
}

// GameState.ts
export type RoomStatus = "waiting" | "countdown" | "in_progress" | "finished";

export interface Room {
  roomId: string;
  status: RoomStatus;
  players: [Player, Player?];
  isPrivate: boolean;
  difficulty: Difficulty;
  createdAt: number;
}

// Events.ts — the full socket event contract
export interface ServerToClientEvents {
  room_joined: (room: Pick<Room, "roomId" | "players" | "isPrivate">) => void;
  game_start: (payload: {
    clues: (number | null)[][];
    difficulty: Difficulty;
    countdownMs: number;
  }) => void;
  progress_update: (payload: {
    playerId: string;
    completedCells: number;
  }) => void;
  move_rejected: (payload: { cell: [number, number]; reason: string }) => void;
  victory_declared: (payload: {
    winnerId: string;
    losingPlayerId: string;
    finishTimeMs: number;
  }) => void;
  opponent_left: (payload: { playerId: string }) => void;
  error: (payload: { code: string; message: string }) => void;
  game_rejoined: (payload: {
    clues: (number | null)[][];
    boardSnapshot: (number | null)[][];
    difficulty: Difficulty;
    opponentProgress: number;
    opponentName: string;
    myProgress: number;
  }) => void;
}

export interface ClientToServerEvents {
  join_public_queue: (payload: {
    displayName: string;
    difficulty: Difficulty;
  }) => void;
  create_private_room: (payload: {
    displayName: string;
    difficulty: Difficulty;
  }) => void;
  join_private_room: (payload: {
    displayName: string;
    roomCode: string;
  }) => void;
  move_made: (payload: {
    cell: [row: number, col: number];
    value: number;
  }) => void;
  leave_room: () => void;
  rejoin_room: (payload: { roomCode: string; displayName: string }) => void;
}
