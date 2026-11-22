import type { BoardCell } from "./pieceIds";
import type { Color, PieceSymbol } from "./types";

const VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const START_COUNT: Record<Exclude<PieceSymbol, "k">, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };
const ORDER: Exclude<PieceSymbol, "k">[] = ["q", "r", "b", "n", "p"];

export interface MaterialSummary {
  /** Opponent pieces captured by each color, strongest first. */
  captured: Record<Color, PieceSymbol[]>;
  /** Material advantage in pawns from each color's point of view (0 when behind/equal). */
  advantage: Record<Color, number>;
}

export function summarizeMaterial(cells: readonly BoardCell[]): MaterialSummary {
  const count: Record<Color, Record<PieceSymbol, number>> = {
    w: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
    b: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
  };
  let score = 0;
  for (const c of cells) {
    count[c.color][c.type] += 1;
    score += (c.color === "w" ? 1 : -1) * VALUE[c.type];
  }
  const capturedBy = (capturer: Color): PieceSymbol[] => {
    const victim: Color = capturer === "w" ? "b" : "w";
    const list: PieceSymbol[] = [];
    for (const type of ORDER) {
      const missing = Math.max(0, START_COUNT[type] - count[victim][type]);
      for (let i = 0; i < missing; i++) list.push(type);
    }
    return list;
  };
  return {
    captured: { w: capturedBy("w"), b: capturedBy("b") },
    advantage: { w: Math.max(0, score), b: Math.max(0, -score) },
  };
}
