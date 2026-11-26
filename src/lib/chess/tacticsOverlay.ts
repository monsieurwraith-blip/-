/**
 * Real-time chess.js board overlay computation for:
 * - "Показать угрозы": hanging pieces, attacker squares, danger directions
 * - "Визуализация комбинаций": tactical ideas (forks, pins, skewers, checks, high-value captures)
 */
import { Chess, type Square } from "chess.js";

import type { DrawnArrow } from "@/lib/chess/drawings";
import { opposite } from "@/lib/chess/types";
import { PIECE_VALUE, forkFrom, hangingPieces, lineTactics } from "@/lib/coach/tactics";

export interface BoardTacticsOverlay {
  attackerSquares: Square[];
  protectedSquares: Square[];
  dangerSquares: Square[];
  threatArrows: DrawnArrow[];
  comboArrows: DrawnArrow[];
}

export function computeBoardTacticsOverlay(fen: string): BoardTacticsOverlay {
  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    return {
      attackerSquares: [],
      protectedSquares: [],
      dangerSquares: [],
      threatArrows: [],
      comboArrows: [],
    };
  }

  const turn = chess.turn();
  const enemy = opposite(turn);

  const attackerSet = new Set<Square>();
  const protectedSet = new Set<Square>();
  const dangerSet = new Set<Square>();
  const threatArrows: DrawnArrow[] = [];
  const comboArrows: DrawnArrow[] = [];

  // Hanging pieces on both sides
  for (const sq of hangingPieces(chess, turn)) {
    dangerSet.add(sq);
    const attackers = chess.attackers(sq, enemy);
    for (const att of attackers.slice(0, 2)) {
      attackerSet.add(att);
      threatArrows.push({ from: att, to: sq, color: "red" });
    }
  }
  for (const sq of hangingPieces(chess, enemy)) {
    const attackers = chess.attackers(sq, turn);
    for (const att of attackers.slice(0, 2)) {
      attackerSet.add(att);
      comboArrows.push({ from: att, to: sq, color: "green" });
    }
  }

  // Protected pieces & active tactical motifs (pins, skewers, forks)
  for (const row of chess.board()) {
    for (const piece of row) {
      if (!piece) continue;
      if (piece.type !== "k") {
        const defenders = chess.attackers(piece.square, piece.color);
        if (
          defenders.length > 0 &&
          chess.attackers(piece.square, opposite(piece.color)).length > 0
        ) {
          protectedSet.add(piece.square);
        }
      }

      if (piece.color === turn) {
        const fork = forkFrom(chess, piece.square);
        if (fork) {
          attackerSet.add(fork.attacker);
          for (const target of fork.targets.slice(0, 2)) {
            comboArrows.push({ from: fork.attacker, to: target, color: "purple" });
          }
        }
        for (const tactic of lineTactics(chess, piece.square).slice(0, 2)) {
          attackerSet.add(tactic.attacker);
          comboArrows.push({ from: tactic.attacker, to: tactic.front, color: "yellow" });
        }
      }
    }
  }

  // Top forcing tactical candidate moves (checks & winning captures) for Combo Visualization
  if (comboArrows.length < 3) {
    const legal = chess.moves({ verbose: true });
    const forcing = legal
      .map((m) => {
        const probe = new Chess(fen);
        const moved = probe.move({
          from: m.from,
          to: m.to,
          ...(m.promotion ? { promotion: m.promotion } : {}),
        });
        let score = 0;
        if (probe.isCheckmate()) score += 100;
        else if (probe.inCheck()) score += 20;
        if (moved.captured) score += PIECE_VALUE[moved.captured] * 4 - PIECE_VALUE[moved.piece];
        return { move: m, score };
      })
      .filter((x) => x.score >= 8)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    for (const f of forcing) {
      if (!comboArrows.some((a) => a.from === f.move.from && a.to === f.move.to)) {
        comboArrows.push({
          from: f.move.from,
          to: f.move.to,
          color: f.score >= 25 ? "purple" : "blue",
        });
      }
    }
  }

  // Deduplicate arrows
  const dedupe = (arr: DrawnArrow[]) => {
    const seen = new Set<string>();
    return arr.filter((a) => {
      const k = `${a.from}-${a.to}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };

  return {
    attackerSquares: [...attackerSet],
    protectedSquares: [...protectedSet],
    dangerSquares: [...dangerSet],
    threatArrows: dedupe(threatArrows).slice(0, 5),
    comboArrows: dedupe(comboArrows).slice(0, 5),
  };
}
