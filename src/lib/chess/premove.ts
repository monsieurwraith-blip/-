/**
 * Premove geometry and legality verification helpers.
 * Standard Chess.com / Lichess premove rules:
 * - While waiting for the opponent, the player can target any square their piece
 *   could geometrically move to (rays pass through blockers, diagonal pawn captures
 *   are allowed onto empty squares, and king castling destinations are included).
 * - When the opponent finally moves, `validateQueuedPremove` checks strict chess.js legality.
 */
import { Chess } from "chess.js";

import type { BoardMove, Color, PieceSymbol, PromotionPiece, Square } from "./types";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

function sqCoords(sq: Square): { file: number; rank: number } {
  return {
    file: sq.charCodeAt(0) - 97,
    rank: Number(sq[1]) - 1,
  };
}

function toSquare(file: number, rank: number): Square | null {
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
  return `${FILES[file]}${rank + 1}` as Square;
}

function addRayTargets(
  out: Set<Square>,
  fromFile: number,
  fromRank: number,
  dirs: readonly [number, number][],
): void {
  for (const [df, dr] of dirs) {
    for (let step = 1; step < 8; step++) {
      const sq = toSquare(fromFile + df * step, fromRank + dr * step);
      if (!sq) break;
      out.add(sq);
    }
  }
}

/**
 * Returns candidate premove destination squares for `from` belonging to `playerColor`.
 */
export function premoveTargetsForSquare(
  fen: string,
  from: Square,
  playerColor: Color,
): Set<Square> {
  const targets = new Set<Square>();
  const chess = new Chess(fen);
  const piece = chess.get(from);
  if (!piece || piece.color !== playerColor) return targets;

  const { file, rank } = sqCoords(from);
  const type: PieceSymbol = piece.type;

  if (type === "p") {
    const dir = playerColor === "w" ? 1 : -1;
    const startRank = playerColor === "w" ? 1 : 6;
    const one = toSquare(file, rank + dir);
    if (one) targets.add(one);
    if (rank === startRank) {
      const two = toSquare(file, rank + dir * 2);
      if (two) targets.add(two);
    }
    const capLeft = toSquare(file - 1, rank + dir);
    const capRight = toSquare(file + 1, rank + dir);
    if (capLeft) targets.add(capLeft);
    if (capRight) targets.add(capRight);
    return targets;
  }

  if (type === "n") {
    const jumps: [number, number][] = [
      [1, 2],
      [2, 1],
      [2, -1],
      [1, -2],
      [-1, -2],
      [-2, -1],
      [-2, 1],
      [-1, 2],
    ];
    for (const [df, dr] of jumps) {
      const sq = toSquare(file + df, rank + dr);
      if (sq) targets.add(sq);
    }
    return targets;
  }

  if (type === "b") {
    addRayTargets(targets, file, rank, [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ]);
    return targets;
  }

  if (type === "r") {
    addRayTargets(targets, file, rank, [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]);
    return targets;
  }

  if (type === "q") {
    addRayTargets(targets, file, rank, [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]);
    return targets;
  }

  // King: adjacent squares + castling squares if king is on home square
  for (let df = -1; df <= 1; df++) {
    for (let dr = -1; dr <= 1; dr++) {
      if (df === 0 && dr === 0) continue;
      const sq = toSquare(file + df, rank + dr);
      if (sq) targets.add(sq);
    }
  }
  const homeRank = playerColor === "w" ? 0 : 7;
  if (file === 4 && rank === homeRank) {
    const kingSide = toSquare(6, homeRank);
    const queenSide = toSquare(2, homeRank);
    if (kingSide) targets.add(kingSide);
    if (queenSide) targets.add(queenSide);
  }

  return targets;
}

/**
 * Checks whether a queued premove needs a pawn promotion piece.
 */
export function isPremovePromotion(fen: string, from: Square, to: Square, color: Color): boolean {
  const chess = new Chess(fen);
  const piece = chess.get(from);
  if (!piece || piece.type !== "p" || piece.color !== color) return false;
  return (
    (color === "w" && from[1] === "7" && to[1] === "8") ||
    (color === "b" && from[1] === "2" && to[1] === "1")
  );
}

/**
 * Validates a queued premove against strict chess.js legality once it becomes the player's turn.
 * Returns normalized BoardMove (auto-attaching promotion `"q"` if needed) or null if illegal.
 */
export function validateQueuedPremove(
  fen: string,
  premove: BoardMove,
  playerColor: Color,
): BoardMove | null {
  const chess = new Chess(fen);
  if (chess.turn() !== playerColor || chess.isGameOver()) return null;

  const legal = chess.moves({ verbose: true });
  const matches = legal.filter((m) => m.from === premove.from && m.to === premove.to);
  if (matches.length === 0) return null;

  if (matches.some((m) => m.promotion)) {
    const promo: PromotionPiece = premove.promotion ?? "q";
    return { from: premove.from, to: premove.to, promotion: promo };
  }
  return { from: premove.from, to: premove.to };
}
