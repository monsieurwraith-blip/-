/**
 * ProChess Expandable Tactical & Strategic Puzzle Schema, Tiers & Wrong-Move Analyzer.
 */
import { Chess } from "chess.js";

import { opposite, type BoardMove, type Color } from "@/lib/chess/types";
import { parseUciMove } from "@/lib/chess/uci";
import { PIECE_VALUE, isHanging, pieceWord } from "@/lib/coach/tactics";

export type PuzzleGroup = "Маты" | "Тактика" | "Стратегия";

export type PuzzleDifficultyTierId =
  "simple" | "basic" | "intermediate" | "hard" | "expert" | "master";

export const PUZZLE_TIERS: readonly {
  id: PuzzleDifficultyTierId;
  label: string;
  range: string;
  min: number;
  max: number;
}[] = [
  { id: "simple", label: "Простые", range: "400–800", min: 400, max: 800 },
  { id: "basic", label: "Базовые", range: "800–1200", min: 800, max: 1200 },
  { id: "intermediate", label: "Средние", range: "1200–1600", min: 1200, max: 1600 },
  { id: "hard", label: "Сложные", range: "1600–2000", min: 1600, max: 2000 },
  { id: "expert", label: "Экспертные", range: "2000–2400", min: 2000, max: 2400 },
  { id: "master", label: "Мастерские", range: "2400+", min: 2400, max: 3500 },
] as const;

export const PUZZLE_CATEGORIES: Record<PuzzleGroup, readonly string[]> = {
  Маты: ["Мат в 1 ход", "Мат в 2 хода", "Мат в 3 хода", "Мат в 4 хода", "Матовая атака"],
  Тактика: [
    "Вилка",
    "Связка",
    "Двойной удар",
    "Открытое нападение",
    "Открытый шах",
    "Двойной шах",
    "Завлечение",
    "Отвлечение",
    "Уничтожение защитника",
    "Перегрузка",
    "Промежуточный ход",
    "Жертва фигуры",
    "Жертва качества",
    "Жертва ферзя",
    "Ловушка",
    "Линейный удар",
    "Просвет",
    "Вскрытая атака",
  ],
  Стратегия: [
    "Выигрыш материала",
    "Улучшение позиции",
    "Защита короля",
    "Использование слабых полей",
    "Пешечный прорыв",
    "Контратака",
    "Переход в выигранный эндшпиль",
  ],
} as const;

export interface ChessPuzzle {
  id: string;
  group: PuzzleGroup;
  category: string;
  rating: number;
  title: string;
  fen: string;
  solutionUci: readonly string[];
  hint: string;
  explanation: string;
  source?: "local" | "lichess";
}

export function puzzleTierForRating(rating: number): (typeof PUZZLE_TIERS)[number] {
  for (const tier of PUZZLE_TIERS) {
    if (rating < tier.max) return tier;
  }
  return PUZZLE_TIERS[PUZZLE_TIERS.length - 1]!;
}

export function computePuzzleEloDelta(
  playerRating: number,
  puzzleRating: number,
  solved: boolean,
): number {
  const expected = 1 / (1 + Math.pow(10, (puzzleRating - playerRating) / 400));
  const actual = solved ? 1 : 0;
  const raw = Math.round(28 * (actual - expected));
  if (solved) return Math.max(6, raw);
  return Math.min(-5, raw);
}

/** Counts only player moves (replies are skipped automatically). */
export function playerMoveCount(solutionUci: readonly string[]): number {
  return Math.ceil(solutionUci.length / 2);
}

/**
 * Generates an insightful chess.js explanation when the user plays an incorrect move
 * in Tactical or Daily Puzzles instead of merely showing a red cross.
 */
export function explainWrongPuzzleMove(
  fenBefore: string,
  movePlayed: BoardMove,
  expectedUci: string,
): string {
  try {
    const probe = new Chess(fenBefore);
    const moverColor = probe.turn();
    const played = probe.move(movePlayed);
    if (!played) return "Этот ход нарушает правила. Проверьте легальность и попробуйте снова.";

    if (isHanging(probe, played.to)) {
      const att = probe.attackers(played.to, opposite(moverColor));
      const pName = pieceWord(played.piece, "nom");
      if (att.length > 0) {
        return `Ход ${played.san} не проходит: ${pName} на ${played.to} попадает под бой (${att[0]}) без достаточной компенсации. Попробуйте ещё раз!`;
      }
    }

    // Check if opponent now has checkmate or dangerous check
    const oppMoves = probe.moves({ verbose: true });
    for (const m of oppMoves.slice(0, 24)) {
      const afterOpp = new Chess(probe.fen());
      afterOpp.move(m);
      if (afterOpp.isCheckmate()) {
        return `После ${played.san} соперник сам ставит мат (${m.san})! Ищите более форсированный ресурс.`;
      }
      if (m.captured && PIECE_VALUE[m.captured] >= 3) {
        return `После ${played.san} соперник забирает ${pieceWord(m.captured, "acc")} ходом ${m.san} и перехватывает инициативу. Попробуйте найти точный удар!`;
      }
    }

    const exp = parseUciMove(expectedUci);
    const expChess = new Chess(fenBefore);
    let givesCheckHint = false;
    if (exp) {
      try {
        expChess.move(exp);
        givesCheckHint = expChess.inCheck();
      } catch {
        // ignore
      }
    }

    if (givesCheckHint && !probe.inCheck()) {
      return `Ход ${played.san} слишком медленный и даёт сопернику время на защиту. Проверьте форсированный шах!`;
    }

    return `Ход ${played.san} упускает сильнейшее продолжение — у соперника находится точная защита. Посмотрите на связки, вилки или взятия и попробуйте снова.`;
  } catch {
    return "Этот ход не достигает цели. Проверьте форсированные продолжения и попробуйте ещё раз.";
  }
}

export function puzzleTurnColor(fen: string): Color {
  try {
    return new Chess(fen).turn();
  } catch {
    return "w";
  }
}
