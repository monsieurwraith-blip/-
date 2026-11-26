/**
 * Expandable ProChess Tactical & Strategic Puzzle Library (112+ verified positions).
 */
import { MATE_PUZZLES } from "./dataMates";
import { STRATEGY_PUZZLES } from "./dataStrategy";
import { TACTIC_PUZZLES } from "./dataTactics";
import type { ChessPuzzle, PuzzleDifficultyTierId, PuzzleGroup } from "./types";
import { PUZZLE_TIERS } from "./types";

export * from "./types";

export const ALL_LOCAL_PUZZLES: readonly ChessPuzzle[] = [
  ...MATE_PUZZLES,
  ...TACTIC_PUZZLES,
  ...STRATEGY_PUZZLES,
];

export function filterPuzzles(options: {
  puzzles?: readonly ChessPuzzle[];
  group?: PuzzleGroup | "all";
  category?: string | "all";
  tier?: PuzzleDifficultyTierId | "all";
}): ChessPuzzle[] {
  const source = options.puzzles ?? ALL_LOCAL_PUZZLES;
  const tierDef =
    options.tier && options.tier !== "all"
      ? (PUZZLE_TIERS.find((t) => t.id === options.tier) ?? null)
      : null;

  return source.filter((p) => {
    if (options.group && options.group !== "all" && p.group !== options.group) return false;
    if (options.category && options.category !== "all" && p.category !== options.category) {
      return false;
    }
    if (tierDef) {
      if (p.rating < tierDef.min || p.rating >= tierDef.max) return false;
    }
    return true;
  });
}
