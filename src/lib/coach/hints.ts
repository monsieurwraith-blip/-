/**
 * Progressive 3-level Coach Hints derived from real chess.js geometry + Stockfish lines:
 *   Level 1 — Strategic sector & plan (subtle hint without spoiling piece or square)
 *   Level 2 — Concrete tactical clue + piece & origin square
 *   Level 3 — Full best move reveal with explanation & arrow
 */
import { Chess, type Move, type PieceSymbol, type Square } from "chess.js";

import { opposite } from "@/lib/chess/types";
import { describeIdea } from "@/lib/coach/explain";
import {
  forkFrom,
  hangingPieces,
  lineTactics,
  pieceWord,
  playUci,
} from "@/lib/coach/tactics";

export type HintLevel = 1 | 2 | 3;

export interface LayeredHint {
  level: HintLevel;
  from: Square;
  to: Square;
  san: string;
  piece: PieceSymbol;
  captured: PieceSymbol | null;
  promotion: PieceSymbol | null;
  level1Text: string;
  level2Text: string;
  level3Text: string;
}

function boardZone(square: Square): string {
  const file = square.charCodeAt(0) - 97;
  if (file <= 2) return "ферзевом фланге";
  if (file >= 5) return "королевском фланге";
  return "центре доски";
}

function describeStrategicFocus(chess: Chess, move: Move): string {
  if (move.san.includes("#")) {
    return "В позиции есть решающая матовая атака на короля соперника.";
  }
  if (move.isKingsideCastle() || move.isQueensideCastle()) {
    return "Сейчас важнее всего обезопасить собственного короля и подключить ладью.";
  }
  const after = new Chess(chess.fen());
  after.move(move.san);
  const hangingOwn = hangingPieces(chess, move.color);
  if (hangingOwn.length > 0 && hangingOwn.includes(move.from)) {
    return `Обратите внимание на незащищённую фигуру на ${boardZone(move.from)} — ей угрожает взятие.`;
  }
  if (move.captured) {
    return `Обратите внимание на ${boardZone(move.to)} — там есть уязвимый материал соперника.`;
  }
  const fork = forkFrom(after, move.to);
  if (fork) {
    return "Ищите активный манёвр, который создаст одновременную угрозу двум фигурам.";
  }
  if (lineTactics(after, move.to).length > 0) {
    return `Присмотритесь к открытым линиям и диагоналям на ${boardZone(move.to)}.`;
  }
  if (move.san.includes("+")) {
    return "Король соперника уязвим — рассмотрите форсирующий ход с шахом.";
  }
  return `Основной ресурс позиции сейчас связан с усилением игры на ${boardZone(move.to)}.`;
}

function describeTacticalClue(chess: Chess, move: Move): string {
  const originPiece = `${pieceWord(move.piece)} на ${move.from}`;
  const after = new Chess(chess.fen());
  after.move(move.san);
  const fork = forkFrom(after, move.to);
  const line = lineTactics(after, move.to)[0];

  if (move.isKingsideCastle() || move.isQueensideCastle()) {
    return `Тактическая идея: завершите развитие и сделайте рокировку (ладья и король с ${move.from}).`;
  }
  if (fork) {
    return `${originPiece[0]!.toUpperCase()}${originPiece.slice(1)} может создать двойной удар по фигурам соперника.`;
  }
  if (line) {
    const kindText = line.kind === "pin" ? "связку" : "сквозную атаку";
    return `Рассмотрите ход фигурой «${originPiece}» — можно создать ${kindText} по линии.`;
  }
  if (move.captured) {
    return `Обратите внимание на фигуру «${originPiece}» — возможно выгодное взятие ${pieceWord(move.captured, "gen")}.`;
  }
  const enemy = opposite(move.color);
  const enemyHanging = hangingPieces(chess, enemy);
  if (enemyHanging.length > 0) {
    return `У соперника под боем фигура; активизируйте «${originPiece}», чтобы использовать это.`;
  }
  const idea = describeIdea(chess, move);
  return `Ключевая фигура для следующего хода — ${originPiece}: этот ресурс ${idea}.`;
}

export function buildLayeredHint(
  fenBefore: string,
  bestUci: string,
  initialLevel: HintLevel = 1,
): LayeredHint | null {
  try {
    const chess = new Chess(fenBefore);
    const legal = chess.moves({ verbose: true });
    const parsedMove = playUci(new Chess(fenBefore), bestUci);
    if (!parsedMove) return null;
    const match = legal.find(
      (m) =>
        m.from === parsedMove.from &&
        m.to === parsedMove.to &&
        (m.promotion ?? null) === (parsedMove.promotion ?? null),
    );
    if (!match) return null;

    const idea = describeIdea(chess, match);
    const level1Text = describeStrategicFocus(chess, match);
    const level2Text = describeTacticalClue(chess, match);
    const level3Text = `Сильнейший ход ${match.san} (${match.from} → ${match.to}): он ${idea}.`;

    return {
      level: initialLevel,
      from: match.from,
      to: match.to,
      san: match.san,
      piece: match.piece,
      captured: match.captured ?? null,
      promotion: match.promotion ?? null,
      level1Text,
      level2Text,
      level3Text,
    };
  } catch {
    return null;
  }
}
