// src/store/gameStore.ts
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for the entire Sudo-Race client.
//
// Architecture rules:
//   1. Components READ from selectors — never from raw state slices.
//   2. Socket events call store ACTIONS — never setState from event handlers.
//   3. Optimistic moves are applied instantly; rolled back on move_rejected.
//   4. The board is NEVER mutated in place — always cloneBoard() first.
// ─────────────────────────────────────────────────────────────────────────────

import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import {
  type Board,
  type CellPos,
  type ClueGrid,
  type Difficulty,
  type GameError,
  type GamePhase,
  type Player,
  type VictoryPayload,
  buildBoardFromClues,
  cloneBoard,
  createEmptyBoard,
} from "../types/game";

// ─── State shape ──────────────────────────────────────────────────────────────

export interface GameState {
  // ── Connection ──────────────────────────────────────────────────────────────
  connectionStatus: "connecting" | "connected" | "disconnected";

  // ── Room ────────────────────────────────────────────────────────────────────
  roomId: string | null;
  phase: GamePhase;
  difficulty: Difficulty | null;

  // ── Players ─────────────────────────────────────────────────────────────────
  myPlayerId: string | null; // socket.id stamped on connect
  myProgress: Player | null;
  opponentProgress: Player | null;

  // ── Board ───────────────────────────────────────────────────────────────────
  board: Board; // 9×9 local board (my copy only)
  selectedCell: CellPos | null; // currently focused cell

  // ── Feedback ─────────────────────────────────────────────────────────────────
  rejectedCell: CellPos | null; // cleared after shake animation (600 ms)
  error: GameError | null;

  // ── Victory ──────────────────────────────────────────────────────────────────
  victoryPayload: VictoryPayload | null;

  // ── Actions: connection ──────────────────────────────────────────────────────
  setConnectionStatus: (s: GameState["connectionStatus"]) => void;
  setMyPlayerId: (id: string) => void;

  // ── Actions: navigation ──────────────────────────────────────────────────────
  setPhase: (p: GamePhase) => void;

  setError: (e: GameError | null) => void;
  resetGame: () => void;

  // ── Actions: board interaction ────────────────────────────────────────────────
  selectCell: (pos: CellPos | null) => void;
  applyOptimisticMove: (row: number, col: number, value: number) => void;
  clearRejected: () => void;

  // ── Actions: socket-driven (called ONLY from socketEvents.ts) ─────────────────
  onRoomJoined: (payload: {
    roomId: string;
    players: Player[];
    isPrivate: boolean;
  }) => void;
  onGameStart: (clues: ClueGrid, difficulty: Difficulty) => void;
  onProgressUpdate: (playerId: string, completedCells: number) => void;
  onMoveRejected: (cell: CellPos, reason: string) => void;
  onVictoryDeclared: (payload: VictoryPayload) => void;
  onOpponentLeft: (playerId: string) => void;

  onGameRejoined: (payload: {
    clues: (number | null)[][];
    boardSnapshot: (number | null)[][];
    difficulty: Difficulty;
    opponentProgress: number;
    opponentName: string;
    myProgress: number;
  }) => void;
}

// ─── Initial state values (extracted so resetGame() can reuse them) ───────────

const INITIAL_STATE = {
  connectionStatus: "connecting" as const,
  roomId: null,
  phase: "idle" as GamePhase,
  difficulty: null,
  myPlayerId: null,
  myProgress: null,
  opponentProgress: null,
  board: createEmptyBoard(),
  selectedCell: null,
  rejectedCell: null,
  error: null,
  victoryPayload: null,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useGameStore = create<GameState>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // ── Initial state ────────────────────────────────────────────────────────
      ...INITIAL_STATE,

      // ── Connection ────────────────────────────────────────────────────────────

      setConnectionStatus: (connectionStatus) =>
        set({ connectionStatus }, false, "setConnectionStatus"),

      setMyPlayerId: (id) => set({ myPlayerId: id }, false, "setMyPlayerId"),

      // ── Navigation ────────────────────────────────────────────────────────────

      setPhase: (phase) => set({ phase }, false, "setPhase"),

      setError: (error) => set({ error }, false, "setError"),

      resetGame: () =>
        set(
          {
            ...INITIAL_STATE,
            // Keep connectionStatus and myPlayerId — socket stays alive
            connectionStatus: get().connectionStatus,
            myPlayerId: get().myPlayerId,
            // Reset board to empty (not the stale old game)
            board: createEmptyBoard(),
          },
          false,
          "resetGame",
        ),

      // ── Board interaction ─────────────────────────────────────────────────────

      selectCell: (selectedCell) => set({ selectedCell }, false, "selectCell"),

      applyOptimisticMove: (row, col, value) =>
        set(
          (state) => {
            const cell = state.board[row]?.[col];
            // Guard: never mutate clues, never overwrite confirmed cells optimistically
            if (!cell || cell.isClue) return state;

            const board = cloneBoard(state.board);
            board[row][col] = {
              ...board[row][col],
              optimistic: value,
              isRejected: false, // clear any previous rejection flash
            };
            return { board };
          },
          false,
          "applyOptimisticMove",
        ),

      clearRejected: () =>
        set(
          (state) => {
            const pos = state.rejectedCell;
            if (!pos) return state;

            const [r, c] = pos;
            const board = cloneBoard(state.board);
            board[r][c] = {
              ...board[r][c],
              isRejected: false,
              optimistic: null, // wipe the bad value from display
              value: null, // the confirmed value stays null (server rejected it)
            };
            return { board, rejectedCell: null };
          },
          false,
          "clearRejected",
        ),

      // ── Socket-driven actions ─────────────────────────────────────────────────
      // These are the ONLY place where server events mutate state.
      // socketEvents.ts calls these; no component ever calls them directly.

      // ── room_joined ───────────────────────────────────────────────────────────
      onRoomJoined: ({ roomId, players, isPrivate }) => {
        const myId = get().myPlayerId;
        const me = players.find((p) => p.id === myId) ?? players[0];
        const opp = players.find((p) => p.id !== myId) ?? null;

        set(
          {
            roomId,
            phase: isPrivate && players.length < 2 ? "waiting" : "countdown",
            myProgress: me
              ? { ...me, completedCells: 0, isFinished: false }
              : null,
            opponentProgress: opp
              ? { ...opp, completedCells: 0, isFinished: false }
              : null,
            error: null,
          },
          false,
          "onRoomJoined",
        );
      },

      // ── game_start ────────────────────────────────────────────────────────────
      onGameStart: (clues, difficulty) =>
        set(
          {
            board: buildBoardFromClues(clues),
            difficulty,
            phase: "countdown", // CountdownOverlay fires → sets 'in_progress'
            error: null,
            selectedCell: null,
          },
          false,
          "onGameStart",
        ),

      // ── progress_update ───────────────────────────────────────────────────────
      // Server sends playerId + count ONLY — never cell positions or values.
      // We update the right progress bar without learning anything about the
      // opponent's specific moves.
      onProgressUpdate: (playerId, completedCells) =>
        set(
          (state) => {
            const isMe = playerId === state.myPlayerId;

            if (isMe && state.myProgress) {
              return {
                myProgress: { ...state.myProgress, completedCells },
              };
            }

            if (!isMe && state.opponentProgress) {
              return {
                opponentProgress: { ...state.opponentProgress, completedCells },
              };
            }

            return state;
          },
          false,
          "onProgressUpdate",
        ),

      // ── move_rejected ─────────────────────────────────────────────────────────
      // 1. Mark cell rejected (triggers shake + red CSS).
      // 2. Schedule clearRejected() after the animation duration.
      onMoveRejected: ([row, col], _reason) => {
        set(
          (state) => {
            const board = cloneBoard(state.board);
            board[row][col] = {
              ...board[row][col],
              isRejected: true,
              // Keep optimistic value visible DURING the shake so user sees what failed
            };
            return { board, rejectedCell: [row, col] as CellPos };
          },
          false,
          "onMoveRejected",
        );

        // Auto-clear after shake animation (600 ms matches CSS animation duration)
        setTimeout(() => get().clearRejected(), 620);
      },

      // ── victory_declared ──────────────────────────────────────────────────────
      onVictoryDeclared: (payload) => {
        const { myPlayerId, myProgress, opponentProgress } = get();

        // Mark the winner as finished in the progress state too
        const isIWinner = payload.winnerId === myPlayerId;

        set(
          {
            phase: "victory",
            victoryPayload: payload,
            myProgress: myProgress
              ? {
                  ...myProgress,
                  isFinished: isIWinner,
                  finishTimeMs: isIWinner
                    ? payload.finishTimeMs
                    : myProgress.finishTimeMs,
                }
              : null,
            opponentProgress: opponentProgress
              ? {
                  ...opponentProgress,
                  isFinished: !isIWinner,
                  finishTimeMs: !isIWinner
                    ? payload.finishTimeMs
                    : opponentProgress.finishTimeMs,
                }
              : null,
          },
          false,
          "onVictoryDeclared",
        );
      },

      // ── opponent_left ─────────────────────────────────────────────────────────
      onOpponentLeft: (playerId) => {
        const { myPlayerId } = get();

        set(
          (state) => ({
            phase: "victory",
            victoryPayload: {
              winnerId: myPlayerId ?? "",
              losingPlayerId: playerId,
              finishTimeMs: 0, // 0 = opponent forfeited (no time recorded)
            },
            opponentProgress:
              state.opponentProgress?.id === playerId
                ? { ...state.opponentProgress, isFinished: true }
                : state.opponentProgress,
          }),
          false,
          "onOpponentLeft",
        );
      },

      setRoomId: (roomId: string) => set({ roomId }, false, "setRoomId"),

      setDifficulty: (difficulty: any) =>
        set({ difficulty }, false, "setDifficulty"),

      setBoard: (clues: any) =>
        set(
          {
            board: buildBoardFromClues(clues as ClueGrid),
          },
          false,
          "setBoard",
        ),
      onGameRejoined: ({
        clues,
        boardSnapshot,
        difficulty,
        opponentProgress,
        opponentName,
        myProgress,
      }) => {
        // Rebuild the board from clues, then overlay the player's progress snapshot
        const board = buildBoardFromClues(clues);

        // Mark every cell the player had already filled
        for (let r = 0; r < 9; r++) {
          for (let c = 0; c < 9; c++) {
            const snap = boardSnapshot[r]?.[c];
            if (snap !== null && snap !== undefined && !board[r][c].isClue) {
              board[r][c] = {
                ...board[r][c],
                value: snap,
                isConfirmed: true,
                optimistic: null,
              };
            }
          }
        }

        set(
          {
            board,
            difficulty,
            phase: "in_progress",
            selectedCell: null,
            error: null,
            myProgress: {
              ...get().myProgress!,
              completedCells: myProgress, // ← use server value, not derived
            },
            opponentProgress: {
              id: "",
              displayName: opponentName,
              completedCells: opponentProgress,
              isFinished: false,
            },
          },
          false,
          "onGameRejoined",
        );
      },

      setMyProgress: (myProgress: any) =>
        set({ myProgress }, false, "setMyProgress"),

      setOpponentProgress: (opponentProgress: any) =>
        set({ opponentProgress }, false, "setOpponentProgress"),
    })),

    { name: "SudoRaceStore", enabled: import.meta.env.DEV },
  ),
);

// ─── Selectors ────────────────────────────────────────────────────────────────
// Components subscribe to selectors, NOT raw state, so re-renders are surgical.

export const selectPhase = (s: GameState) => s.phase;
export const selectBoard = (s: GameState) => s.board;
export const selectSelectedCell = (s: GameState) => s.selectedCell;
export const selectMyProgress = (s: GameState) => s.myProgress;
export const selectOpponentProgress = (s: GameState) => s.opponentProgress;
export const selectVictoryPayload = (s: GameState) => s.victoryPayload;
export const selectMyPlayerId = (s: GameState) => s.myPlayerId;
export const selectDifficulty = (s: GameState) => s.difficulty;
export const selectError = (s: GameState) => s.error;
export const selectConnectionStatus = (s: GameState) => s.connectionStatus;
export const selectRoomId = (s: GameState) => s.roomId;

// Derived selector — true if the local player has won
export const selectIAmWinner = (s: GameState) =>
  s.victoryPayload !== null && s.victoryPayload.winnerId === s.myPlayerId;

// Derived selector — is the board interactive right now?
export const selectBoardActive = (s: GameState) => s.phase === "in_progress";
