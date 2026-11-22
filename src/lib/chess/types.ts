import type { Color, PieceSymbol, Square } from "chess.js";

export type { Color, PieceSymbol, Square };

/** Side the player picks in the setup screen. "random" is resolved when the game starts. */
export type SideChoice = "w" | "b" | "random";

export type PromotionPiece = "q" | "r" | "b" | "n";

/** A move as produced by the board UI or parsed from the engine (UCI). */
export interface BoardMove {
  from: Square;
  to: Square;
  promotion?: PromotionPiece;
}

export interface SquarePair {
  from: Square;
  to: Square;
}

export function opposite(color: Color): Color {
  return color === "w" ? "b" : "w";
}

export function colorName(color: Color): string {
  return color === "w" ? "белые" : "чёрные";
}
