/**
 * Tactical facts about a position, computed with chess.js. Used by the coach to
 * explain *why* a move is good or bad (hanging pieces, forks, pins, mates…).
 */
import { Chess, type Move, type PieceSymbol, type Square } from "chess.js";

import type { Color } from "@/lib/chess/types";
import { opposite } from "@/lib/chess/types";
import { parseUciMove } from "@/lib/chess/uci";

export const PIECE_VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };

type Case = "nom" | "acc" | "gen" | "ins";
const NAMES: Record<PieceSymbol, Record<Case, string>> = {
  p: { nom: "пешка", acc: "пешку", gen: "пешки", ins: "пешкой" },
  n: { nom: "конь", acc: "коня", gen: "коня", ins: "конём" },
  b: { nom: "слон", acc: "слона", gen: "слона", ins: "слоном" },
  r: { nom: "ладья", acc: "ладью", gen: "ладьи", ins: "ладьёй" },
  q: { nom: "ферзь", acc: "ферзя", gen: "ферзя", ins: "ферзём" },
  k: { nom: "король", acc: "короля", gen: "короля", ins: "королём" },
};

export function pieceWord(type: PieceSymbol, c: Case = "nom"): string {
  return NAMES[type][c];
}

/** "коня и пешку", "ладью, слона и пешку" (accusative by default). */
export function pieceList(types: readonly PieceSymbol[], c: Case = "acc"): string {
  const sorted = [...types].sort((a, b) => PIECE_VALUE[b] - PIECE_VALUE[a]);
  const words = sorted.map((t) => pieceWord(t, c));
  if (words.length <= 1) return words[0] ?? "";
  return `${words.slice(0, -1).join(", ")} и ${words[words.length - 1]}`;
}

export function chessFrom(fen: string): Chess {
  return new Chess(fen);
}

/** Plays a UCI move; returns the chess.js move or null when illegal. */
export function playUci(chess: Chess, uci: string): Move | null {
  const m = parseUciMove(uci);
  if (!m) return null;
  try {
    return chess.move(m);
  } catch {
    return null;
  }
}

/** Converts a UCI line to SAN, stopping at the first illegal move. */
export function pvToSan(fen: string, pv: readonly string[], max = 6): string[] {
  const chess = chessFrom(fen);
  const out: string[] = [];
  for (const uci of pv.slice(0, max)) {
    const m = playUci(chess, uci);
    if (!m) break;
    out.push(m.san);
  }
  return out;
}

/** Formats a SAN line with move numbers: "12. Nf3 Nc6 13. Bb5". */
export function formatLine(fen: string, sans: readonly string[]): string {
  const parts = fen.split(" ");
  let moveNo = Number(parts[5] ?? "1");
  let white = parts[1] !== "b";
  const out: string[] = [];
  sans.forEach((san, i) => {
    if (white) out.push(`${moveNo}. ${san}`);
    else out.push(i === 0 ? `${moveNo}… ${san}` : san);
    if (!white) moveNo++;
    white = !white;
  });
  return out.join(" ");
}

export function materialFor(chess: Chess, color: Color): number {
  let sum = 0;
  for (const row of chess.board()) {
    for (const p of row) {
      if (!p || p.type === "k") continue;
      sum += p.color === color ? PIECE_VALUE[p.type] : -PIECE_VALUE[p.type];
    }
  }
  return sum;
}

export interface MaterialSwing {
  /** Material change for `color` along the line (in pawns). */
  delta: number;
  lost: PieceSymbol[];
  gained: PieceSymbol[];
  plies: number;
}

/** Plays an engine line and measures how material changes for `color`. */
export function materialSwing(
  fen: string,
  pv: readonly string[],
  color: Color,
  maxPlies = 8,
): MaterialSwing {
  const chess = chessFrom(fen);
  const start = materialFor(chess, color);
  const lost: PieceSymbol[] = [];
  const gained: PieceSymbol[] = [];
  let plies = 0;
  for (const uci of pv.slice(0, maxPlies)) {
    const m = playUci(chess, uci);
    if (!m) break;
    plies++;
    if (m.captured) (m.color === color ? gained : lost).push(m.captured);
  }
  // Cancel equal trades so "you lose a knight for a knight" is not reported.
  for (let i = lost.length - 1; i >= 0; i--) {
    const j = gained.indexOf(lost[i]!);
    if (j >= 0) {
      lost.splice(i, 1);
      gained.splice(j, 1);
    }
  }
  return { delta: materialFor(chess, color) - start, lost, gained, plies };
}

/** A piece that the opponent can win: attacked and undefended, or attacked by a cheaper piece. */
export function isHanging(chess: Chess, square: Square): boolean {
  const piece = chess.get(square);
  if (!piece || piece.type === "k") return false;
  const enemy = opposite(piece.color);
  const attackers = chess.attackers(square, enemy);
  if (attackers.length === 0) return false;
  const defenders = chess.attackers(square, piece.color);
  if (defenders.length === 0) return true;
  const cheapest = Math.min(...attackers.map((s) => PIECE_VALUE[chess.get(s)!.type]));
  return cheapest < PIECE_VALUE[piece.type];
}

export function hangingPieces(chess: Chess, color: Color): Square[] {
  const out: Square[] = [];
  for (const row of chess.board()) {
    for (const p of row) {
      if (p && p.color === color && isHanging(chess, p.square)) out.push(p.square);
    }
  }
  return out;
}

export interface ForkInfo {
  attacker: Square;
  targets: Square[];
}

/** The piece on `square` attacks two or more valuable enemy pieces (king, more valuable, or undefended). */
export function forkFrom(chess: Chess, square: Square): ForkInfo | null {
  const piece = chess.get(square);
  if (!piece) return null;
  const enemy = opposite(piece.color);
  // A piece that can simply be taken for free is not a real fork.
  if (isHanging(chess, square) && piece.type !== "p") {
    const defenders = chess.attackers(square, piece.color);
    if (defenders.length === 0) return null;
  }
  const targets: Square[] = [];
  for (const row of chess.board()) {
    for (const p of row) {
      if (!p || p.color !== enemy) continue;
      if (!chess.attackers(p.square, piece.color).includes(square)) continue;
      const valuable =
        p.type === "k" ||
        PIECE_VALUE[p.type] > PIECE_VALUE[piece.type] ||
        (p.type !== "p" && chess.attackers(p.square, enemy).length === 0);
      if (valuable) targets.push(p.square);
    }
  }
  return targets.length >= 2 ? { attacker: square, targets } : null;
}

const DIRS: Record<"r" | "b", [number, number][]> = {
  r: [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ],
  b: [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ],
};

function sq(file: number, rank: number): Square | null {
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
  return `${String.fromCharCode(97 + file)}${rank + 1}` as Square;
}

export interface LineTactic {
  kind: "pin" | "skewer";
  attacker: Square;
  front: Square;
  back: Square;
}

/** Pins and skewers created by the slider on `square`. */
export function lineTactics(chess: Chess, square: Square): LineTactic[] {
  const piece = chess.get(square);
  if (!piece || !["b", "r", "q"].includes(piece.type)) return [];
  const enemy = opposite(piece.color);
  const dirs = piece.type === "q" ? [...DIRS.r, ...DIRS.b] : piece.type === "r" ? DIRS.r : DIRS.b;
  const f0 = square.charCodeAt(0) - 97;
  const r0 = Number(square[1]) - 1;
  const out: LineTactic[] = [];
  for (const [df, dr] of dirs) {
    let front: Square | null = null;
    for (let k = 1; k < 8; k++) {
      const s = sq(f0 + df * k, r0 + dr * k);
      if (!s) break;
      const p = chess.get(s);
      if (!p) continue;
      if (p.color !== enemy) break;
      if (!front) {
        front = s;
        continue;
      }
      const frontPiece = chess.get(front)!;
      const fv = PIECE_VALUE[frontPiece.type];
      const bv = PIECE_VALUE[p.type];
      if (bv > fv) out.push({ kind: "pin", attacker: square, front, back: s });
      else if (fv > bv && bv >= 3 && ["k", "q", "r"].includes(frontPiece.type))
        out.push({ kind: "skewer", attacker: square, front, back: s });
      break;
    }
  }
  return out;
}

/** Enemy pieces newly attacked by a friendly piece other than the one that moved (discovered attack). */
export function discoveredTargets(before: Chess, after: Chess, move: Move): Square[] {
  const enemy = opposite(move.color);
  const out: Square[] = [];
  for (const row of after.board()) {
    for (const p of row) {
      if (!p || p.color !== enemy || (p.type !== "k" && PIECE_VALUE[p.type] < 3)) continue;
      const now = after.attackers(p.square, move.color).filter((s) => s !== move.to);
      const was = new Set(before.attackers(p.square, move.color));
      if (now.some((s) => !was.has(s))) out.push(p.square);
    }
  }
  return out;
}

export function kingSquare(chess: Chess, color: Color): Square | null {
  for (const row of chess.board()) {
    for (const p of row) if (p && p.type === "k" && p.color === color) return p.square;
  }
  return null;
}

/** A pawn in front of the castled king moved (f/g/h or a/b/c shield). */
export function weakensKingShelter(before: Chess, move: Move): boolean {
  if (move.piece !== "p") return false;
  const king = kingSquare(before, move.color);
  if (!king) return false;
  const homeRank = move.color === "w" ? "1" : "8";
  if (king[1] !== homeRank) return false;
  const kf = king.charCodeAt(0) - 97;
  const pf = move.from.charCodeAt(0) - 97;
  const castledSide = kf >= 5 || kf <= 2;
  const shieldRank = move.color === "w" ? "2" : "7";
  return castledSide && Math.abs(kf - pf) <= 1 && move.from[1] === shieldRank;
}
