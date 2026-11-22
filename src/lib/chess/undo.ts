import type { Color } from "./types";

/**
 * How many half-moves to take back so it is the player's turn again with their
 * last move removed. Pops plies from the end until one played by `playerColor`
 * has been removed. Returns 0 when the player has not moved yet.
 */
export function pliesToUndo(moveColors: readonly Color[], playerColor: Color): number {
  for (let i = moveColors.length - 1; i >= 0; i--) {
    if (moveColors[i] === playerColor) return moveColors.length - i;
  }
  return 0;
}
