import type { Color, Square } from "./types";

export const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

/** Square at a visual grid cell (row 0 = top) for the given orientation. */
export function squareAt(row: number, col: number, orientation: Color): Square {
  const fileIndex = orientation === "w" ? col : 7 - col;
  const rank = orientation === "w" ? 8 - row : row + 1;
  return `${FILES[fileIndex]}${rank}` as Square;
}

/** Visual grid cell of a square for the given orientation. */
export function cellOf(square: Square, orientation: Color): { row: number; col: number } {
  const fileIndex = square.charCodeAt(0) - 97;
  const rank = Number(square[1]);
  return orientation === "w"
    ? { row: 8 - rank, col: fileIndex }
    : { row: rank - 1, col: 7 - fileIndex };
}

export function isLightSquare(square: Square): boolean {
  const fileIndex = square.charCodeAt(0) - 97;
  const rank = Number(square[1]);
  // a1 (0 + 1) is dark.
  return (fileIndex + rank) % 2 === 0;
}
