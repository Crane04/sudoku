// src/types/game.ts
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for all client-side TypeScript types.
// These mirror the shared/ package on the server but are kept local so the
// client build has zero dependency on the server codebase.
// ─────────────────────────────────────────────────────────────────────────────

// ── Difficulty ────────────────────────────────────────────────────────────────

export type Difficulty = "easy" | "medium" | "hard";

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Novice",
  medium: "Medium",
  hard: "Master",
};

export const DIFFICULTY_CLUES: Record<Difficulty, string> = {
  easy: "46 clues",
  medium: "32 clues",
  hard: "26 clues",
};

// ── Board / Cell ──────────────────────────────────────────────────────────────

/**
 * A single cell as stored in the client Zustand store.
 * Richer than the server shape — includes optimistic and UI state.
 */
export interface Cell {
  /** Confirmed value (accepted by server, or a clue).  null = empty. */
  value: number | null;

  /** True if this cell was part of the server-provided starting clues.
   *  Clue cells are immutable — user can never type into them. */
  isClue: boolean;

  /** True once the server has accepted this value (move_made ACK'd).
   *  Used for the subtle "locked in" visual. */
  isConfirmed: boolean;

  /** Optimistic value typed by the user but not yet ACK'd by server.
   *  Shown immediately in amber; rolled back on move_rejected. */
  optimistic: number | null;

  /** True for one animation cycle when the server rejects a move.
   *  Triggers the shake + crimson flash, then auto-cleared. */
  isRejected: boolean;
}

/** 9×9 board — row-major order */
export type Board = Cell[][];

/** Raw clue grid as received from the server on game_start */
export type ClueGrid = (number | null)[][];

// ── Player ────────────────────────────────────────────────────────────────────

export interface Player {
  id: string; // socket.id
  displayName: string;
  completedCells: number; // 0–81
  isFinished: boolean;
  finishTimeMs?: number; // set when isFinished = true
}

// ── Room ──────────────────────────────────────────────────────────────────────

export type RoomStatus = "waiting" | "countdown" | "in_progress" | "finished";

export interface Room {
  roomId: string;
  status: RoomStatus;
  players: [Player, Player?];
  isPrivate: boolean;
  difficulty: Difficulty;
}

// ── Game phase ────────────────────────────────────────────────────────────────
/**
 * The phase field in Zustand drives all top-level UI routing.
 *
 * idle         → Lobby home screen
 * queued       → Lobby: public queue waiting screen
 * waiting      → Lobby: private room created, showing 6-digit code
 * countdown    → Game board (locked) + countdown overlay
 * in_progress  → Game board (interactive)
 * victory      → Game board + victory overlay
 * disconnected → Lobby + disconnection banner
 */
export type GamePhase =
  | "idle"
  | "queued"
  | "waiting"
  | "countdown"
  | "in_progress"
  | "victory"
  | "disconnected";

// ── Victory ───────────────────────────────────────────────────────────────────

export interface VictoryPayload {
  winnerId: string;
  losingPlayerId: string;
  finishTimeMs: number;
}

// ── Error ─────────────────────────────────────────────────────────────────────

export interface GameError {
  code: string;
  message: string;
}

// ── Socket event maps ─────────────────────────────────────────────────────────
// Typed 1:1 with the server's event definitions.

export interface ServerToClientEvents {
  room_joined: (payload: {
    roomId: string;
    players: Player[];
    isPrivate: boolean;
  }) => void;

  game_start: (payload: {
    clues: ClueGrid;
    difficulty: Difficulty;
    countdownMs: number;
  }) => void;

  progress_update: (payload: {
    playerId: string;
    completedCells: number;
  }) => void;

  move_rejected: (payload: {
    cell: [row: number, col: number];
    reason: string;
  }) => void;

  victory_declared: (payload: VictoryPayload) => void;

  opponent_left: (payload: { playerId: string }) => void;

  error: (payload: GameError) => void;

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
    value: number | null;
  }) => void;

  leave_room: () => void;

  rejoin_room: (payload: { roomCode: string; displayName: string }) => void;
}

// ── Utility types ─────────────────────────────────────────────────────────────

/** Coordinate pair */
export type CellPos = [row: number, col: number];

/** Which 3×3 box a cell belongs to (0-indexed) */
export type BoxIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | -1;

export function getBoxIndex(row: number, col: number): BoxIndex {
  return (Math.floor(row / 3) * 3 + Math.floor(col / 3)) as BoxIndex;
}

/** Build an empty 9×9 board of blank cells */
export function createEmptyBoard(): Board {
  return Array.from({ length: 9 }, () =>
    Array.from(
      { length: 9 },
      (): Cell => ({
        value: null,
        isClue: false,
        isConfirmed: false,
        optimistic: null,
        isRejected: false,
      }),
    ),
  );
}

/** Build a board from server clues */
export function buildBoardFromClues(clues: ClueGrid): Board {
  return clues.map((row) =>
    row.map(
      (v): Cell => ({
        value: v,
        isClue: v !== null,
        isConfirmed: v !== null, // clues are pre-confirmed
        optimistic: null,
        isRejected: false,
      }),
    ),
  );
}

/** Count non-null cells on a board */
export function countCompleted(board: Board): number {
  return board.flat().filter((c) => c.value !== null || c.optimistic !== null)
    .length;
}

/** Deep-clone a board (used by Zustand immer-like updates) */
export function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((cell) => ({ ...cell })));
}
