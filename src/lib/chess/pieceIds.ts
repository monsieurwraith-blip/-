import type { Color, PieceSymbol, Square } from "./types";

export interface BoardCell {
  square: Square;
  type: PieceSymbol;
  color: Color;
}

export interface PlacedPiece extends BoardCell {
  id: string;
}

function distance(a: Square, b: Square): number {
  const df = a.charCodeAt(0) - b.charCodeAt(0);
  const dr = Number(a[1]) - Number(b[1]);
  return df * df + dr * dr;
}

/**
 * Gives every piece on the new board a stable id by matching it with the
 * previous placement: same square first, then the nearest unused piece of the
 * same type and color (that piece "slid" there). This lets the board animate
 * any transition — normal moves, castling, en passant, undo and reset.
 */
export function placePieces(
  cells: readonly BoardCell[],
  previous: readonly PlacedPiece[],
  createId: () => string,
): PlacedPiece[] {
  const used = new Set<string>();
  const result: (PlacedPiece | null)[] = cells.map(() => null);

  cells.forEach((cell, i) => {
    const same = previous.find(
      (p) =>
        !used.has(p.id) &&
        p.square === cell.square &&
        p.type === cell.type &&
        p.color === cell.color,
    );
    if (same) {
      used.add(same.id);
      result[i] = { ...cell, id: same.id };
    }
  });

  cells.forEach((cell, i) => {
    if (result[i]) return;
    let best: PlacedPiece | null = null;
    for (const p of previous) {
      if (used.has(p.id) || p.type !== cell.type || p.color !== cell.color) continue;
      if (!best || distance(p.square, cell.square) < distance(best.square, cell.square)) best = p;
    }
    if (best) {
      used.add(best.id);
      result[i] = { ...cell, id: best.id };
    } else {
      result[i] = { ...cell, id: createId() };
    }
  });

  return result.filter((p): p is PlacedPiece => p !== null);
}
