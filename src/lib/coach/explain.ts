/**
 * The coach's verdict for one player move: quality class from real engine
 * scores, plus explanations built from concrete tactics on the board.
 */
import { Chess, type Move, type PieceSymbol, type Square } from "chess.js";

import { opposite, type Color } from "@/lib/chess/types";
import type { EngineScore } from "@/lib/chess/uci";
import { toUciMove } from "@/lib/chess/uci";

import {
  MOVE_CLASS_INFO,
  centipawnLoss,
  classifyMove,
  formatEval,
  isMistakeClass,
  moveAccuracy,
  povCp,
  winPercent,
  type MoveClass,
} from "./evaluation";
import {
  PIECE_VALUE,
  discoveredTargets,
  forkFrom,
  formatLine,
  hangingPieces,
  isHanging,
  kingSquare,
  lineTactics,
  materialSwing,
  pieceList,
  pieceWord,
  playUci,
  pvToSan,
  weakensKingShelter,
} from "./tactics";

export type CoachTag =
  | "hanging"
  | "undefended"
  | "fork"
  | "pin"
  | "skewer"
  | "discovered"
  | "mate-threat"
  | "missed-mate"
  | "missed-fork"
  | "missed-material"
  | "king-safety"
  | "material-loss"
  | "positional";

export const TAG_LABEL: Record<CoachTag, string> = {
  hanging: "Фигура под боем",
  undefended: "Снята защита",
  fork: "Пропущенная вилка соперника",
  pin: "Связка",
  skewer: "Сквозное нападение",
  discovered: "Вскрытое нападение",
  "mate-threat": "Матовая угроза",
  "missed-mate": "Упущенный мат",
  "missed-fork": "Упущенное двойное нападение",
  "missed-material": "Упущенный выигрыш материала",
  "king-safety": "Ослабление короля",
  "material-loss": "Потеря материала",
  positional: "Позиционная неточность",
};

export const MISSED_TAGS: readonly CoachTag[] = ["missed-mate", "missed-fork", "missed-material"];

/** One engine line; score from White's point of view. */
export interface AnalysisLine {
  pv: string[];
  score: EngineScore;
}

export interface CoachInput {
  fenBefore: string;
  played: Move;
  playerColor: Color;
  /** MultiPV lines of the position before the move, best first. */
  linesBefore: AnalysisLine[];
  /** Best line after the move (opponent to move); null when the game ended. */
  lineAfter: AnalysisLine | null;
}

export interface MoveArrow {
  from: Square;
  to: Square;
  san: string;
}

export interface CoachVerdict {
  classification: MoveClass;
  headline: string;
  text: string;
  details: string[];
  tags: CoachTag[];
  best: (MoveArrow & { uci: string }) | null;
  bestLine: string;
  bestLineUci: string[];
  threat: MoveArrow | null;
  danger: Square[];
  idea: string;
  materialLost: number;
  scoreBefore: EngineScore;
  scoreAfter: EngineScore;
  winBefore: number;
  winAfter: number;
  winDrop: number;
  cpLoss: number;
  accuracy: number;
}

const cap = (s: string) => (s ? s[0]!.toUpperCase() + s.slice(1) : s);

function movesWord(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "ход";
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return "хода";
  return "ходов";
}

function clone(chess: Chess): Chess {
  return new Chess(chess.fen());
}

function typeAt(chess: Chess, square: Square): PieceSymbol {
  return chess.get(square)?.type ?? "p";
}

function targetsText(chess: Chess, squares: readonly Square[]): string {
  const words = squares.map((s) => `${pieceWord(typeAt(chess, s), "acc")} на ${s}`);
  if (words.length <= 1) return words[0] ?? "";
  return `${words.slice(0, -1).join(", ")} и ${words[words.length - 1]}`;
}

/** What a move achieves, as a short Russian phrase ("забирает коня на f6 и объявляет шах"). */
export function describeIdea(before: Chess, move: Move): string {
  if (move.san.includes("#")) return "ставит мат";
  const after = clone(before);
  try {
    after.move(move.san);
  } catch {
    return "улучшает позицию";
  }
  const parts: string[] = [];
  if (move.isKingsideCastle() || move.isQueensideCastle()) {
    parts.push("уводит короля в безопасность и подключает ладью");
  }
  if (move.promotion) parts.push(`превращает пешку в ${pieceWord(move.promotion, "acc")}`);
  if (move.captured) parts.push(`забирает ${pieceWord(move.captured, "acc")} на ${move.to}`);
  if (move.san.includes("+")) parts.push("объявляет шах");
  const fork = forkFrom(after, move.to);
  if (fork) parts.push(`создаёт двойное нападение на ${targetsText(after, fork.targets)}`);
  const line = lineTactics(after, move.to)[0];
  if (line && parts.length < 2) {
    parts.push(
      line.kind === "pin"
        ? `связывает ${pieceWord(typeAt(after, line.front), "acc")} на ${line.front}`
        : `атакует ${pieceWord(typeAt(after, line.front), "acc")} насквозь`,
    );
  }
  if (parts.length < 2) {
    const hangingBefore = new Set(hangingPieces(before, move.color));
    const hangingAfter = new Set(hangingPieces(after, move.color));
    if (hangingBefore.has(move.from) && !hangingAfter.has(move.to)) {
      parts.push(`уводит ${pieceWord(move.piece, "acc")} из-под удара`);
    } else {
      const saved = [...hangingBefore].find((s) => s !== move.from && !hangingAfter.has(s));
      if (saved) parts.push(`защищает ${pieceWord(typeAt(before, saved), "acc")} на ${saved}`);
    }
  }
  if (parts.length === 0) {
    const enemy = opposite(move.color);
    for (const row of after.board()) {
      for (const p of row) {
        if (!p || p.color !== enemy || p.type === "k") continue;
        if (!after.attackers(p.square, move.color).includes(move.to)) continue;
        if (PIECE_VALUE[p.type] > PIECE_VALUE[move.piece] || isHanging(after, p.square)) {
          parts.push(`нападает на ${pieceWord(p.type, "acc")} на ${p.square}`);
          break;
        }
      }
      if (parts.length) break;
    }
  }
  if (parts.length === 0) {
    const fullMove = Number(before.fen().split(" ")[5] ?? "1");
    const home = move.color === "w" ? "1" : "8";
    if ((move.piece === "n" || move.piece === "b") && move.from[1] === home && fullMove <= 12) {
      parts.push(`развивает ${pieceWord(move.piece, "acc")} и усиливает контроль центра`);
    } else if (move.piece === "p" && ["d4", "e4", "d5", "e5", "c4", "c5"].includes(move.to)) {
      parts.push("укрепляет пешечный центр");
    } else if (move.piece === "p") {
      parts.push("улучшает пешечную структуру и отнимает поля у соперника");
    } else {
      parts.push(`улучшает расположение ${pieceWord(move.piece, "gen")}`);
    }
  }
  return parts.slice(0, 2).join(" и ");
}

interface Consequence {
  text: string;
  tags: CoachTag[];
  danger: Square[];
  materialLost: number;
}

function explainConsequence(
  before: Chess,
  after: Chess,
  played: Move,
  lineAfter: AnalysisLine,
  color: Color,
): Consequence | null {
  const fenAfter = after.fen();
  const replyBoard = clone(after);
  const reply = playUci(replyBoard, lineAfter.pv[0] ?? "");
  if (!reply) return null;
  const opp = opposite(color);

  if (lineAfter.score.kind === "mate" && povCp(lineAfter.score, opp) > 0) {
    const n = Math.abs(lineAfter.score.value);
    const sans = pvToSan(fenAfter, lineAfter.pv, n * 2 - 1);
    const king = kingSquare(after, color);
    return {
      text:
        n === 1
          ? `Этот ход допускает мат в один ход: ${reply.san}. Королю не хватает защитников.`
          : `После этого хода у соперника форсированный мат в ${n} ${movesWord(n)}: ${formatLine(fenAfter, sans)}.`,
      tags: ["mate-threat"],
      danger: king ? [king] : [],
      materialLost: 0,
    };
  }

  const swing = materialSwing(fenAfter, lineAfter.pv, color);
  if (swing.delta > -1) return null;

  const tags: CoachTag[] = ["material-loss"];
  const danger: Square[] = [];
  let first: string;
  if (reply.captured) {
    danger.push(reply.to);
    const wasDefendedByMover = before.attackers(reply.to, color).includes(played.from);
    if (reply.to === played.to) {
      tags.unshift("hanging");
      first = `${cap(pieceWord(played.piece))} на ${played.to} остаётся без достаточной защиты — соперник отвечает ${reply.san}.`;
    } else if (
      wasDefendedByMover &&
      after.attackers(reply.to, color).length < before.attackers(reply.to, color).length
    ) {
      tags.unshift("undefended");
      first = `Уйдя с ${played.from}, ${pieceWord(played.piece)} перестаёт защищать ${pieceWord(reply.captured, "acc")} на ${reply.to} — соперник отвечает ${reply.san}.`;
    } else {
      tags.unshift("hanging");
      first = `${cap(pieceWord(reply.captured))} на ${reply.to} остаётся под боем — соперник отвечает ${reply.san}.`;
    }
  } else {
    const fork = forkFrom(replyBoard, reply.to);
    const line = lineTactics(replyBoard, reply.to)[0];
    const disc = discoveredTargets(after, replyBoard, reply);
    if (fork) {
      tags.unshift("fork");
      danger.push(...fork.targets);
      first = `Соперник отвечает ${reply.san} — вилка: ${pieceWord(reply.piece)} нападает сразу на ${targetsText(replyBoard, fork.targets)}.`;
    } else if (line) {
      tags.unshift(line.kind);
      danger.push(line.front, line.back);
      const front = `${pieceWord(typeAt(replyBoard, line.front), "acc")} на ${line.front}`;
      const back = `${pieceWord(typeAt(replyBoard, line.back), "acc")} на ${line.back}`;
      first =
        line.kind === "pin"
          ? `Ход ${reply.san} связывает ${front}: если эта фигура уйдёт с линии, под ударом окажется ${back}.`
          : `Ход ${reply.san} — сквозное нападение: после отхода с ${line.front} соперник забирает ${back}.`;
    } else if (disc.length > 0) {
      tags.unshift("discovered");
      danger.push(...disc);
      first = `Ход ${reply.san} открывает линию — вскрытое нападение на ${targetsText(replyBoard, disc)}.`;
    } else if (reply.san.includes("+")) {
      first = `Соперник объявляет шах ${reply.san}, а следом выигрывает материал.`;
    } else {
      first = `Соперник отвечает ${reply.san} и создаёт угрозу, от которой уже не защититься без потерь.`;
    }
  }
  const sans = pvToSan(fenAfter, lineAfter.pv, Math.min(5, Math.max(2, swing.plies)));
  const loss =
    swing.lost.length === 0
      ? "вы теряете материал"
      : swing.gained.length > 0
        ? `вы отдаёте ${pieceList(swing.lost)} за ${pieceList(swing.gained)}`
        : `вы теряете ${pieceList(swing.lost)}`;
  return {
    text: `${first} По линии ${formatLine(fenAfter, sans)} ${loss}.`,
    tags,
    danger,
    materialLost: Math.max(0, -swing.delta),
  };
}

interface Missed {
  text: string;
  tags: CoachTag[];
}

function explainMissed(
  before: Chess,
  best: AnalysisLine,
  color: Color,
  playedUci: string,
): Missed | null {
  const bestUci = best.pv[0];
  if (!bestUci || bestUci === playedUci) return null;
  const fen = before.fen();
  if (best.score.kind === "mate" && povCp(best.score, color) > 0) {
    const n = Math.abs(best.score.value);
    const sans = pvToSan(fen, best.pv, n * 2 - 1);
    return {
      text: `Здесь был форсированный мат в ${n} ${movesWord(n)}: ${formatLine(fen, sans)}.`,
      tags: ["missed-mate"],
    };
  }
  const afterBest = clone(before);
  const bestMove = playUci(afterBest, bestUci);
  if (!bestMove) return null;
  const swing = materialSwing(fen, best.pv, color);
  const fork = forkFrom(afterBest, bestMove.to);
  if (fork && swing.delta >= 1) {
    return {
      text: `Была возможность двойного нападения: ${bestMove.san} — ${pieceWord(bestMove.piece)} атакует ${targetsText(afterBest, fork.targets)}.`,
      tags: ["missed-fork"],
    };
  }
  if (bestMove.captured && swing.delta >= 1) {
    return {
      text: `Можно было выиграть материал: ${bestMove.san} забирает ${pieceWord(bestMove.captured, "acc")} на ${bestMove.to}.`,
      tags: ["missed-material"],
    };
  }
  if (swing.delta >= 2 && swing.gained.length > 0) {
    const sans = pvToSan(fen, best.pv, Math.min(5, swing.plies));
    return {
      text: `Вы упустили выигрыш материала: по линии ${formatLine(fen, sans)} вы получаете ${pieceList(swing.gained)}.`,
      tags: ["missed-material"],
    };
  }
  return null;
}

/** Scores the move and explains it. Pure: same input, same verdict. */
export function analyzeMove({
  fenBefore,
  played,
  playerColor: color,
  linesBefore,
  lineAfter,
}: CoachInput): CoachVerdict {
  const before = new Chess(fenBefore);
  const after = new Chess(fenBefore);
  after.move(played.san);
  const playedUci = toUciMove(played);
  const top = linesBefore[0];
  const scoreBefore: EngineScore = top?.score ?? { kind: "cp", value: 0 };

  let scoreAfter: EngineScore;
  if (after.isCheckmate()) scoreAfter = { kind: "mate", value: color === "w" ? 1 : -1 };
  else if (after.isDraw() || after.isStalemate()) scoreAfter = { kind: "cp", value: 0 };
  else {
    const sameLine = linesBefore.find((l) => l.pv[0] === playedUci);
    scoreAfter = sameLine?.score ?? lineAfter?.score ?? scoreBefore;
  }

  const isTopMove = top?.pv[0] === playedUci || after.isCheckmate();
  const winBefore = winPercent(scoreBefore, color);
  const winAfter = winPercent(scoreAfter, color);
  const winDrop = Math.max(0, winBefore - winAfter);
  const sacrifice =
    played.piece !== "p" &&
    !after.isCheckmate() &&
    isHanging(after, played.to) &&
    PIECE_VALUE[played.piece] >= PIECE_VALUE[played.captured ?? "p"] + 2;
  const classification = classifyMove({ winBefore, winAfter, isTopMove, sacrifice });

  const bestUci = top?.pv[0] ?? null;
  const bestBoard = new Chess(fenBefore);
  const bestMove = bestUci ? playUci(bestBoard, bestUci) : null;
  const best =
    bestMove && bestUci
      ? { uci: bestUci, from: bestMove.from, to: bestMove.to, san: bestMove.san }
      : null;
  const bestLine = top ? formatLine(fenBefore, pvToSan(fenBefore, top.pv, 5)) : "";
  const bestIdea = bestMove ? describeIdea(new Chess(fenBefore), bestMove) : "";
  const playedIdea = describeIdea(new Chess(fenBefore), played);

  const replyBoard = new Chess(after.fen());
  const reply = lineAfter?.pv[0] ? playUci(replyBoard, lineAfter.pv[0]) : null;
  const threat = reply ? { from: reply.from, to: reply.to, san: reply.san } : null;

  let text: string;
  const details: string[] = [];
  let tags: CoachTag[] = [];
  let danger: Square[] = [];
  let materialLost = 0;

  if (after.isCheckmate()) {
    text = `${played.san} — мат! ${cap(pieceWord(played.piece))} завершает атаку, партия выиграна.`;
  } else if (!isMistakeClass(classification)) {
    const altSan = best && best.uci !== playedUci ? best.san : null;
    switch (classification) {
      case "brilliant":
        text = `Блестяще! ${played.san} отдаёт ${pieceWord(played.piece, "acc")} на ${played.to}, и Stockfish подтверждает — жертва корректна: ход ${playedIdea}.`;
        break;
      case "best":
        text = `${played.san} — лучший ход в позиции: он ${playedIdea}.`;
        break;
      case "excellent":
        text = `Отличный ход: ${played.san} ${playedIdea}.${altSan ? ` Stockfish ставит его почти вровень с ${altSan}.` : ""}`;
        break;
      default:
        text = `Хороший ход: ${played.san} ${playedIdea}.`;
        if (altSan) details.push(`Чуть точнее было ${altSan} — этот ход ${bestIdea}.`);
    }
  } else {
    const consequence = lineAfter
      ? explainConsequence(before, after, played, lineAfter, color)
      : null;
    const missed = top ? explainMissed(before, top, color, playedUci) : null;
    if (consequence) {
      text = consequence.text;
      tags = consequence.tags;
      danger = consequence.danger;
      materialLost = consequence.materialLost;
      if (missed) {
        details.push(missed.text);
        tags.push(...missed.tags);
      }
    } else if (missed) {
      text = missed.text;
      tags = missed.tags;
    } else if (weakensKingShelter(before, played)) {
      const king = kingSquare(before, color);
      text = `Ход ${played.san} ослабляет пешечное прикрытие короля${king ? ` на ${king}` : ""}: поля вокруг него становятся доступны фигурам соперника.`;
      tags = ["king-safety"];
      if (king) danger = [king];
    } else {
      text = `Сразу ход ничего не теряет, но позиция ухудшается: оценка меняется с ${formatEval(scoreBefore)} до ${formatEval(scoreAfter)}.`;
      tags = ["positional"];
    }
    if (best) details.push(`Сильнее было ${best.san} — этот ход ${bestIdea}.`);
    if (threat && !tags.includes("mate-threat") && !text.includes(threat.san)) {
      details.push(`Главная идея соперника теперь — ${threat.san}.`);
    }
  }

  const info = MOVE_CLASS_INFO[classification];
  return {
    classification,
    headline: `${info.ru} · ${info.en}`,
    text,
    details,
    tags,
    best,
    bestLine,
    bestLineUci: top?.pv.slice(0, 6) ?? [],
    threat,
    danger,
    idea: best ? `${cap(best.san)}: ход ${bestIdea}.` : "",
    materialLost,
    scoreBefore,
    scoreAfter,
    winBefore,
    winAfter,
    winDrop,
    cpLoss: centipawnLoss(scoreBefore, scoreAfter, color),
    accuracy: moveAccuracy(winDrop),
  };
}
