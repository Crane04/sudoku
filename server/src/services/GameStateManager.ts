import type { Difficulty, Player } from "../types/Board";
import { SudokuEngine } from "../engine/SudokuEngine";

// ── Server-side Room shape (never serialized and sent to clients whole) ───────
export interface ServerRoom {
  roomId: string;
  status: "waiting" | "countdown" | "in_progress" | "finished";
  players: [Player, Player?];
  isPrivate: boolean;
  difficulty: Difficulty;
  createdAt: number;
  solution: number[][]; // ← THE SECRET. Never leaves this file.
  originalClues: (number | null)[][];
  boards: {
    // Isolated per-player mutable state
    [playerId: string]: (number | null)[][];
  };
}

export interface MoveResult {
  valid: boolean;
  completedCells: number;
  isVictory: boolean;
  reason?: string;
}

export interface MoveResult {
  valid: boolean;
  completedCells: number;
  isVictory: boolean;
  reason?: string;
}

export class GameStateManager {
  public rooms = new Map<string, ServerRoom>();
  private socketToRoom = new Map<string, string>();
  private engine = new SudokuEngine();

  private disconnectedPlayers = new Map<
    string,
    {
      roomId: string;
      oldSocketId: string;
      displayName: string;
      boardSnapshot: (number | null)[][];
    }
  >();

  registerRoom(room: ServerRoom): void {
    this.rooms.set(room.roomId, room);
    room.players.forEach((p) => {
      if (p) this.socketToRoom.set(p.id, room.roomId);
    });
  }

  registerSocket(socketId: string, roomId: string): void {
    this.socketToRoom.set(socketId, roomId);
  }

  getRoomIdBySocket(socketId: string): string | undefined {
    return this.socketToRoom.get(socketId);
  }

  getRoom(roomId: string): ServerRoom | undefined {
    return this.rooms.get(roomId);
  }

  setRoomStatus(roomId: string, status: ServerRoom["status"]): void {
    const room = this.rooms.get(roomId);
    if (room) room.status = status;
  }

  applyMove(
    roomId: string,
    playerId: string,
    row: number,
    col: number,
    value: number | null,
  ): MoveResult {
    const room = this.rooms.get(roomId);
    const rooms = this.rooms;
    console.log(rooms);

    if (!room) {
      return {
        valid: false,
        completedCells: 0,
        isVictory: false,
        reason: "ROOM_NOT_FOUND",
      };
    }

    const currentBoard = room.boards[playerId];
    if (!currentBoard) {
      return {
        valid: false,
        completedCells: 0,
        isVictory: false,
        reason: "PLAYER_NOT_FOUND",
      };
    }

    for (let r = 0; r < 9; r++) {
      let rowStr = "   │";
      for (let c = 0; c < 9; c++) {
        const cellValue = currentBoard[r]?.[c];
        if (cellValue === null) {
          rowStr += " . ";
        } else {
          rowStr += ` ${cellValue} `;
        }
        if (c === 2 || c === 5) rowStr += "│";
      }
      rowStr += "│";
    }

    for (let r = 0; r < 9; r++) {
      const clueRow = room.originalClues[r]
        ?.map((cell) => (cell !== null ? "🔒" : "⬜"))
        .join(" ");
    }

    // Handle deletion
    if (value === null) {
      const oldValue = currentBoard[row]![col];
      currentBoard[row]![col] = null;
      const completedCells = this.countFilledCells(currentBoard);

      const player = room.players.find((p) => p?.id === playerId);
      if (player) player.completedCells = completedCells;

      return {
        valid: true,
        completedCells,
        isVictory: false,
      };
    }

    // Bounds check
    if (row < 0 || row > 8 || col < 0 || col > 8 || value < 1 || value > 9) {
      return {
        valid: false,
        completedCells: this.countFilledCells(currentBoard),
        isVictory: false,
        reason: "OUT_OF_BOUNDS",
      };
    }

    // Check if it's a clue cell (using originalClues, not player board!)
    if (room.originalClues[row]![col] !== null) {
      return {
        valid: false,
        completedCells: this.countFilledCells(currentBoard),
        isVictory: false,
        reason: "CELL_IS_CLUE",
      };
    }

    for (let c = 0; c < 9; c++) {
      if (c === col) {
        continue;
      }

      const playerCell = currentBoard[row]?.[c];
      const clueCell = room.originalClues[row]?.[c];
      const existingValue = playerCell ?? clueCell;
      const source = clueCell !== null ? "🔒 CLUE" : "player";

      if (existingValue != null && existingValue === value) {
        return {
          valid: false,
          completedCells: this.countFilledCells(currentBoard),
          isVictory: false,
          reason: "RULE_VIOLATION",
        };
      }
    }

    for (let r = 0; r < 9; r++) {
      if (r === row) {
        continue;
      }

      const playerCell = currentBoard[r]?.[col];
      const clueCell = room.originalClues[r]?.[col];
      const existingValue = playerCell ?? clueCell;
      const source = clueCell !== null ? "🔒 CLUE" : "player";

      if (existingValue != null && existingValue === value) {
        return {
          valid: false,
          completedCells: this.countFilledCells(currentBoard),
          isVictory: false,
          reason: "RULE_VIOLATION",
        };
      }
    }

    // Check 3x3 box for duplicates (including clues!)
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;

    for (let r = boxRow; r < boxRow + 3; r++) {
      for (let c = boxCol; c < boxCol + 3; c++) {
        if (r === row && c === col) {
          continue;
        }

        const playerCell = currentBoard[r]?.[c];
        const clueCell = room.originalClues[r]?.[c];
        const existingValue = playerCell ?? clueCell;
        const source = clueCell !== null ? "🔒 CLUE" : "player";

        if (existingValue != null && existingValue === value) {
          return {
            valid: false,
            completedCells: this.countFilledCells(currentBoard),
            isVictory: false,
            reason: "RULE_VIOLATION",
          };
        }
      }
    }

    // Apply the move
    currentBoard[row]![col] = value;

    for (let r = 0; r < 9; r++) {
      let rowStr = "   │";
      for (let c = 0; c < 9; c++) {
        const cellValue = currentBoard[r]?.[c];
        if (cellValue === null) {
          rowStr += " . ";
        } else {
          if (r === row && c === col) {
            rowStr += `[${cellValue}]`;
          } else {
            rowStr += ` ${cellValue} `;
          }
        }
        if (c === 2 || c === 5) rowStr += "│";
      }
      rowStr += "│";
    }

    // Check for victory
    const isFullySolved = this.checkAgainstSolution(
      currentBoard,
      room.solution,
    );
    const completedCells = this.countFilledCells(currentBoard);

    const player = room.players.find((p) => p?.id === playerId);
    if (player) {
      player.completedCells = completedCells;

      if (isFullySolved && !player.isFinished) {
        player.isFinished = true;
        player.finishTimeMs = Date.now() - room.createdAt;
      }
    }

    const allFinished = room.players.every((p) => !p || p.isFinished);
    if (allFinished) {
      room.status = "finished";
    }

    return {
      valid: true,
      completedCells,
      isVictory: isFullySolved,
    };
  }

  private countFilledCells(board: (number | null)[][]): number {
    let count = 0;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r]?.[c] != null) count++;
      }
    }
    return count;
  }

  private checkAgainstSolution(
    playerBoard: (number | null)[][],
    solution: number[][],
  ): boolean {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (playerBoard[r]?.[c] !== solution[r]?.[c]) {
          return false;
        }
      }
    }
    return true;
  }

  removeSocket(socketId: string): ServerRoom | undefined {
    const roomId = this.socketToRoom.get(socketId);
    this.socketToRoom.delete(socketId);
    if (!roomId) return undefined;

    const room = this.rooms.get(roomId);
    if (!room) return undefined;

    const player = room.players.find((p) => p?.id === socketId);
    if (player) {
      this.disconnectedPlayers.set(player.id, {
        roomId,
        oldSocketId: socketId,
        displayName: player.displayName,
        boardSnapshot: room.boards[socketId]
          ? room.boards[socketId].map((row) => [...row])
          : [],
      });
    }

    return room;
  }

  removeRoomFromSocketMap(roomId: string): void {
    for (const [socketId, rId] of this.socketToRoom.entries()) {
      if (rId === roomId) this.socketToRoom.delete(socketId);
    }
  }

  getBothPlayers(roomId: string): [Player?, Player?] {
    const room = this.rooms.get(roomId);
    if (!room) return [];

    const players: [Player?, Player?] = [];
    if (room.players[0]) players[0] = room.players[0];
    if (room.players[1]) players[1] = room.players[1];

    return players;
  }

  rejoinRoom(
    roomCode: string,
    newSocketId: string,
    displayName: string,
  ): {
    success: boolean;
    room?: ServerRoom;
    boardSnapshot?: (number | null)[][];
    reason?: string;
  } {
    // Find room by code
    const room = this.rooms.get(roomCode);
    if (!room || room.status === "finished") {
      return { success: false, reason: "ROOM_NOT_FOUND" };
    }

    // Find this player in disconnectedPlayers by displayName + roomId
    let disconnectedEntry: typeof this.disconnectedPlayers extends Map<
      string,
      infer V
    >
      ? V
      : never;
    let originalPlayerId: string | undefined;

    for (const [pid, entry] of this.disconnectedPlayers.entries()) {
      if (entry.roomId === roomCode && entry.displayName === displayName) {
        disconnectedEntry = entry;
        originalPlayerId = pid;
        break;
      }
    }

    if (!originalPlayerId || !disconnectedEntry!) {
      return { success: false, reason: "PLAYER_NOT_FOUND" };
    }

    // Swap old socket → new socket everywhere
    const oldSocketId = disconnectedEntry.oldSocketId;

    // Update player id in room.players array
    const player = room.players.find((p) => p?.id === oldSocketId);
    if (player) player.id = newSocketId;

    // Move the board to the new socketId key
    room.boards[newSocketId] = room.boards[oldSocketId] ?? [];
    delete room.boards[oldSocketId];

    // Update socketToRoom mapping
    this.socketToRoom.delete(oldSocketId);
    this.socketToRoom.set(newSocketId, roomCode);

    // Clean up disconnectedPlayers
    this.disconnectedPlayers.delete(originalPlayerId);

    return {
      success: true,
      room,
      boardSnapshot: room.boards[newSocketId],
    };
  }

  getPlayerGames(displayName: string): Array<{
    roomId: string;
    opponent: Player;
    status: ServerRoom["status"];
    difficulty: Difficulty;
    myProgress: number;
    opponentProgress: number;
  }> {
    const games: Array<{
      roomId: string;
      opponent: Player;
      status: ServerRoom["status"];
      difficulty: Difficulty;
      myProgress: number;
      opponentProgress: number;
    }> = [];

    console.log(`🔍 Looking for games for player: ${displayName}`);
    console.log(`📊 Total active rooms: ${this.rooms.size}`);

    for (const [roomId, room] of this.rooms.entries()) {
      console.log(`Room ${roomId}:`, {
        status: room.status,
        players: room.players.map((p) =>
          p ? { id: p.id, name: p.displayName } : null,
        ),
      });

      // Search by displayName (since that's what you're passing)
      const playerIndex = room.players.findIndex(
        (p) => p?.displayName === displayName,
      );

      if (playerIndex === -1) {
        console.log(`  → Player ${displayName} not in this room`);
        continue;
      }

      if (room.status === "finished") {
        console.log(`  → Room is finished, skipping`);
        continue;
      }

      const opponent = room.players.find(
        (p, idx) => idx !== playerIndex && p !== undefined,
      );

      if (!opponent) {
        console.log(`  → No opponent found`);
        continue;
      }

      const myProgress = room.players[playerIndex]?.completedCells || 0;
      const opponentProgress = opponent?.completedCells || 0;

      games.push({
        roomId,
        opponent,
        status: room.status,
        difficulty: room.difficulty,
        myProgress,
        opponentProgress,
      });

      console.log(
        `  ✅ Found active game: ${roomId} vs ${opponent.displayName}`,
      );
    }

    console.log(`📱 Returning ${games.length} games for player ${displayName}`);
    return games;
  }
}
