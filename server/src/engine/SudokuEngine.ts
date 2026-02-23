// server/src/engine/SudokuEngine.ts
import type { Difficulty, BoardSeed } from "../types/Board";

const DIFFICULTY_CLUE_COUNTS: Record<Difficulty, number> = {
  easy: 46, // 81 - 35 removed
  medium: 32, // 81 - 49 removed
  hard: 26, // 81 - 55 removed
};

export class SudokuEngine {
  private grid: number[][];

  constructor() {
    this.grid = this.createEmptyGrid();
  }

  // ── Public API ──────────────────────────────────────────────────────────────
  generate(difficulty: Difficulty): BoardSeed {
    this.grid = this.createEmptyGrid();
    this.fillGrid(0, 0); // backtracking fill → guaranteed valid solution

    const solution = this.grid.map((row) => [...row]);
    const clues = this.createClues(
      solution,
      DIFFICULTY_CLUE_COUNTS[difficulty],
    );

    return { solution, clues, difficulty };
  }

  // Server-side move validation: check against stored solution
  validateMove(
    solution: number[][],
    row: number,
    col: number,
    value: number,
  ): boolean {
    return solution[row]?.[col] === value;
  }

  // ── Grid Generation ─────────────────────────────────────────────────────────
  private createEmptyGrid(): number[][] {
    return Array.from({ length: 9 }, () => Array(9).fill(0));
  }

  private fillGrid(row: number, col: number): boolean {
    // Advance position
    if (col === 9) {
      row++;
      col = 0;
    }
    if (row === 9) return true; // All cells filled — solution complete

    if (this.grid[row]?.[col] !== 0 && this.grid[row]?.[col] !== undefined) {
      return this.fillGrid(row, col + 1); // Skip pre-filled cells
    }

    const nums = this.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);

    for (const num of nums) {
      if (this.isPlacementValid(row, col, num)) {
        this.grid[row]![col] = num;

        if (this.fillGrid(row, col + 1)) return true;

        this.grid[row]![col] = 0; // Backtrack
      }
    }

    return false; // Trigger backtrack in caller
  }

  // ── Constraint Check ────────────────────────────────────────────────────────
  private isPlacementValid(row: number, col: number, num: number): boolean {
    // Row check
    if (this.grid[row]?.includes(num)) return false;

    // Column check
    if (this.grid.some((r) => r[col] === num)) return false;

    // 3×3 box check
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let r = boxRow; r < boxRow + 3; r++) {
      for (let c = boxCol; c < boxCol + 3; c++) {
        if (this.grid[r]?.[c] === num) return false;
      }
    }

    return true;
  }

  // ── Clue Mask ───────────────────────────────────────────────────────────────
  private createClues(
    solution: number[][],
    clueCount: number,
  ): (number | null)[][] {
    // Start with full board, then remove cells to reach target clue count
    const clues: (number | null)[][] = solution.map((row) => [...row]);
    const allPositions = this.shuffle(
      Array.from(
        { length: 81 },
        (_, i) => [Math.floor(i / 9), i % 9] as [number, number],
      ),
    );

    let removed = 0;
    const target = 81 - clueCount;
    for (const [r, c] of allPositions) {
      if (removed >= target) break;

      const backup: number | null | undefined = clues[r]?.[c];
      clues[r]![c] = null;

      // Verify puzzle still has a unique solution after removal
      if (this.hasUniqueSolution(clues)) {
        removed++;
      } else {
        // We know backup exists and is a number because we only remove from cells that had values
        clues[r]![c] = backup as number;
      }
    }

    return clues;
  }

  // ── Uniqueness Check (lightweight solver) ───────────────────────────────────
  private hasUniqueSolution(clues: (number | null)[][]): boolean {
    const workGrid = clues.map((row) => row.map((v) => v ?? 0));
    let solutions = 0;

    const solve = (pos: number): void => {
      if (solutions > 1) return; // Early exit — we only need to know if > 1
      if (pos === 81) {
        solutions++;
        return;
      }

      const row = Math.floor(pos / 9);
      const col = pos % 9;

      if (workGrid[row]?.[col] !== 0) {
        solve(pos + 1);
        return;
      }

      for (let num = 1; num <= 9; num++) {
        if (this.isValidInWorkGrid(workGrid, row, col, num)) {
          workGrid[row][col] = num;
          solve(pos + 1);
          workGrid[row][col] = 0;
        }
      }
    };

    solve(0);
    return solutions === 1;
  }

  private isValidInWorkGrid(
    grid: number[][],
    row: number,
    col: number,
    num: number,
  ): boolean {
    if (grid[row]?.includes(num)) return false;
    if (grid.some((r) => r[col] === num)) return false;

    const br = Math.floor(row / 3) * 3;
    const bc = Math.floor(col / 3) * 3;
    for (let r = br; r < br + 3; r++) {
      for (let c = bc; c < bc + 3; c++) {
        if (grid[r]?.[c] === num) return false;
      }
    }

    return true;
  }

  private shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      // Use non-null assertion since we know these indices exist
      [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    }
    return arr;
  }
}
