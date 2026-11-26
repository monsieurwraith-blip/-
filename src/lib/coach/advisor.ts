/**
 * Deep Chess Position Structural Evaluator & Coach Advisory Engine.
 * Combines real chess.js board geometry with live Stockfish 19 MultiPV lines
 * to drive all Analysis metrics and "Объясни позицию / Лучший план / Гроссмейстер" buttons.
 */
import { Chess, type Square } from "chess.js";

import { opposite, type Color } from "@/lib/chess/types";
import type { EngineInfo, EngineScore } from "@/lib/chess/uci";
import { povCp, toWhitePov } from "@/lib/coach/evaluation";
import type { EvalPoint } from "@/lib/coach/report";
import { hangingPieces, materialFor, pieceWord, playUci, pvToSan } from "@/lib/coach/tactics";

export interface PositionStructureMetrics {
  materialDelta: number; // White - Black in pawns
  centerControl: { w: number; b: number };
  spaceControl: { w: number; b: number };
  kingSafety: { w: string; b: string };
  mobility: { w: number; b: number };
  pawnStructure: { isolatedW: number; isolatedB: number; doubledW: number; doubledB: number };
  openFiles: string[];
  weakSquares: { w: Square[]; b: Square[] };
  initiativeSide: Color | "equal";
  threats: string[];
  wdl: { whiteWin: number; draw: number; blackWin: number };
}

const CENTER_SQUARES: readonly Square[] = ["d4", "e4", "d5", "e5"];

export function formatDecimalEval(score: EngineScore | null): string {
  if (!score) return "0.00";
  if (score.kind === "mate") {
    return score.value > 0 ? `+M${score.value}` : `-M${Math.abs(score.value)}`;
  }
  const pawns = score.value / 100;
  const sign = pawns > 0.005 ? "+" : pawns < -0.005 ? "-" : "";
  return `${sign}${Math.abs(pawns).toFixed(2)}`;
}

/** Realistic WDL model from White-POV centipawns. */
export function estimateWdl(whiteScore: EngineScore | null): {
  whiteWin: number;
  draw: number;
  blackWin: number;
} {
  if (!whiteScore) return { whiteWin: 34, draw: 32, blackWin: 34 };
  if (whiteScore.kind === "mate") {
    return whiteScore.value > 0
      ? { whiteWin: 99, draw: 1, blackWin: 0 }
      : { whiteWin: 0, draw: 1, blackWin: 99 };
  }
  const cp = whiteScore.value;
  const winW = 100 / (1 + Math.exp(-0.0038 * cp));
  const winB = 100 / (1 + Math.exp(0.0038 * cp));
  const absCp = Math.abs(cp);
  const drawRaw = Math.max(4, Math.min(48, 44 * Math.exp(-absCp / 260)));
  const scale = (100 - drawRaw) / Math.max(1, winW + winB);
  const whiteWin = Math.round(winW * scale);
  const blackWin = Math.round(winB * scale);
  const draw = Math.max(0, 100 - whiteWin - blackWin);
  return { whiteWin, draw, blackWin };
}

export function analyzePositionStructure(
  fen: string,
  whiteScore: EngineScore | null = null,
): PositionStructureMetrics {
  const chess = new Chess(fen);
  const board = chess.board();
  const pawnsByFileW = new Array<number>(8).fill(0);
  const pawnsByFileB = new Array<number>(8).fill(0);
  let whiteKing: Square | null = null;
  let blackKing: Square | null = null;
  let spaceW = 0;
  let spaceB = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r]?.[c];
      if (!p) continue;
      if (p.type === "k") {
        if (p.color === "w") whiteKing = p.square;
        else blackKing = p.square;
      }
      if (p.type === "p") {
        if (p.color === "w") {
          pawnsByFileW[c]!++;
          if (r <= 4) spaceW++;
        } else {
          pawnsByFileB[c]!++;
          if (r >= 3) spaceB++;
        }
      }
    }
  }

  const materialDelta = materialFor(chess, "w");

  // Center control count
  let cw = 0;
  let cb = 0;
  for (const sq of CENTER_SQUARES) {
    cw += chess.attackers(sq, "w").length;
    cb += chess.attackers(sq, "b").length;
  }

  // Open files
  const files = "abcdefgh";
  const openFiles: string[] = [];
  for (let c = 0; c < 8; c++) {
    if (pawnsByFileW[c] === 0 && pawnsByFileB[c] === 0) {
      openFiles.push(files[c]!);
    }
  }

  // Isolated / doubled pawns
  let isolatedW = 0;
  let isolatedB = 0;
  let doubledW = 0;
  let doubledB = 0;
  for (let c = 0; c < 8; c++) {
    const wc = pawnsByFileW[c]!;
    const bc = pawnsByFileB[c]!;
    if (wc > 1) doubledW += wc - 1;
    if (bc > 1) doubledB += bc - 1;
    if (
      wc > 0 &&
      (c === 0 || pawnsByFileW[c - 1] === 0) &&
      (c === 7 || pawnsByFileW[c + 1] === 0)
    ) {
      isolatedW += wc;
    }
    if (
      bc > 0 &&
      (c === 0 || pawnsByFileB[c - 1] === 0) &&
      (c === 7 || pawnsByFileB[c + 1] === 0)
    ) {
      isolatedB += bc;
    }
  }

  // King safety summary
  const safetyLabel = (k: Square | null, col: Color): string => {
    if (!k) return "Неизвестно";
    const file = k[0]!;
    const attackers = chess.attackers(k, opposite(col)).length;
    if (attackers > 0) return "Под атакой";
    if (file === "g" || file === "h" || file === "c" || file === "b") return "Надёжно (фланг)";
    return chess.history().length > 16 ? "Открыт в центре" : "В центре";
  };

  // Weak squares heuristic (key squares attacked by enemy without own pawn defense nearby)
  const weakW: Square[] = [];
  const weakB: Square[] = [];
  for (const sq of ["c3", "d3", "e3", "f3", "c4", "d4", "e4", "f4"] as Square[]) {
    if (chess.attackers(sq, "b").length > chess.attackers(sq, "w").length) weakW.push(sq);
  }
  for (const sq of ["c6", "d6", "e6", "f6", "c5", "d5", "e5", "f5"] as Square[]) {
    if (chess.attackers(sq, "w").length > chess.attackers(sq, "b").length) weakB.push(sq);
  }

  // Threats from chess.js hanging pieces & checks
  const threats: string[] = [];
  if (chess.inCheck()) {
    threats.push(`Объявлен шах королю ${chess.turn() === "w" ? "белых" : "чёрных"}.`);
  }
  const hangingW = hangingPieces(chess, "w");
  const hangingB = hangingPieces(chess, "b");
  for (const sq of hangingW.slice(0, 2)) {
    const p = chess.get(sq);
    if (p) threats.push(`Незащищённая фигура белых: ${pieceWord(p.type)} на ${sq}.`);
  }
  for (const sq of hangingB.slice(0, 2)) {
    const p = chess.get(sq);
    if (p) threats.push(`Под боем фигура чёрных: ${pieceWord(p.type)} на ${sq}.`);
  }

  // Side mobility estimate via legal moves count of current side
  const currentMoves = chess.moves().length;
  const altChess = new Chess(fen);
  // Safe mobility fallback when opponent isn't in check
  const parts = fen.split(" ");
  parts[1] = opposite(chess.turn());
  parts[3] = "-";
  let oppMoves = currentMoves;
  try {
    altChess.load(parts.join(" "));
    oppMoves = altChess.moves().length;
  } catch {
    oppMoves = currentMoves;
  }

  const mobW = chess.turn() === "w" ? currentMoves : oppMoves;
  const mobB = chess.turn() === "b" ? currentMoves : oppMoves;
  const scoreCp = whiteScore ? povCp(whiteScore, "w") : (cw - cb) * 20;
  const initiativeSide: Color | "equal" = scoreCp >= 45 ? "w" : scoreCp <= -45 ? "b" : "equal";

  return {
    materialDelta,
    centerControl: { w: cw, b: cb },
    spaceControl: { w: spaceW, b: spaceB },
    kingSafety: {
      w: safetyLabel(whiteKing, "w"),
      b: safetyLabel(blackKing, "b"),
    },
    mobility: { w: mobW, b: mobB },
    pawnStructure: { isolatedW, isolatedB, doubledW, doubledB },
    openFiles,
    weakSquares: { w: weakW.slice(0, 3), b: weakB.slice(0, 3) },
    initiativeSide,
    threats,
    wdl: estimateWdl(whiteScore),
  };
}

export function explainPositionRich(
  fen: string,
  lines: readonly EngineInfo[],
  turn: Color,
): string {
  const top = lines[0];
  const whiteScore = top?.score ? toWhitePov(top.score, turn) : null;
  const s = analyzePositionStructure(fen, whiteScore);
  const evalText = whiteScore ? formatDecimalEval(whiteScore) : "равная";

  const leader =
    s.initiativeSide === "w"
      ? "Инициатива сейчас на стороне белых."
      : s.initiativeSide === "b"
        ? "Чёрные владеют инициативой."
        : "Позиция носит равный стратегический характер.";

  const filesText =
    s.openFiles.length > 0
      ? `Открытые вертикали: ${s.openFiles.join(", ")} — отличная цель для ладей.`
      : "Вертикали пока закрыты пешечными цепями, игра строится на манёврах.";

  const threatNote = s.threats[0] ? ` Внимание: ${s.threats[0]}` : "";

  return `Оценка позиции: ${evalText}. ${leader} Контроль центра: ${s.centerControl.w}:${s.centerControl.b}, активность (ходов): ${s.mobility.w} против ${s.mobility.b}. ${filesText}${threatNote}`;
}

export function findBestStrategicPlan(
  fen: string,
  lines: readonly EngineInfo[],
  turn: Color,
): string {
  const top = lines[0];
  if (!top || top.pv.length === 0) {
    return "Оцените слабые поля соперника, завершите развитие лёгких фигур и подключите ладьи на центральные вертикали.";
  }
  const sans = pvToSan(fen, top.pv, 5);
  const chess = new Chess(fen);
  const firstMove = playUci(chess, top.pv[0]!);
  const whiteScore = top.score ? toWhitePov(top.score, turn) : null;
  const s = analyzePositionStructure(fen, whiteScore);

  const strategicReason =
    s.openFiles.length > 0
      ? `использовать открытую вертикаль ${s.openFiles[0]}`
      : s.centerControl[turn] < s.centerControl[opposite(turn)]
        ? "укрепить и перехватить контроль центра"
        : "усилить координацию фигур и создать давление на королевский фланг";

  return `Рекомендуемый план: начать с ${firstMove?.san ?? sans[0]} и далее ориентироваться на вариант ${sans.join(" ")}. Главная идея — ${strategicReason}.`;
}

export function whatWouldGrandmasterPlay(
  fen: string,
  lines: readonly EngineInfo[],
  turn: Color,
): string {
  const top = lines[0];
  const second = lines[1];
  if (!top || top.pv.length === 0) {
    return "Гроссмейстер в такой ситуации в первую очередь проверяет безопасность короля и улучшает наименее активную фигуру.";
  }
  const san1 = pvToSan(fen, top.pv, 3).join(" ");
  const san2 = second?.pv.length ? pvToSan(fen, second.pv, 2).join(" ") : null;
  const eval1 = top.score ? formatDecimalEval(toWhitePov(top.score, turn)) : "";
  return san2
    ? `Гроссмейстерский выбор — основная линия ${san1} (${eval1}). Альтернативный позиционный план через ${san2} также сохраняет напряжение без лишнего риска.`
    : `Гроссмейстер выбрал бы форсированное и точное продолжение ${san1} (${eval1}), не оставляя сопернику контригры.`;
}

export interface TurningPointResult {
  ply: number;
  moveNumber: number;
  swingPawns: number;
  summary: string;
}

export function findTurningPoint(
  evalPoints: readonly EvalPoint[],
  sans: readonly string[],
): TurningPointResult | null {
  if (evalPoints.length < 2) return null;
  let bestIdx = 1;
  let maxSwing = -1;
  for (let i = 1; i < evalPoints.length; i++) {
    const prev = evalPoints[i - 1]!;
    const curr = evalPoints[i]!;
    const swing = Math.abs(curr.pawns - prev.pawns);
    if (swing > maxSwing) {
      maxSwing = swing;
      bestIdx = i;
    }
  }
  const pt = evalPoints[bestIdx]!;
  const san = sans[Math.max(0, pt.ply - 1)] ?? `#${pt.ply}`;
  const moveNumber = Math.floor((pt.ply - 1) / 2) + 1;
  const sideLabel = pt.ply % 2 === 1 ? "белых" : "чёрных";
  return {
    ply: pt.ply,
    moveNumber,
    swingPawns: Math.round(maxSwing * 10) / 10,
    summary: `Переломный момент на ${moveNumber}-м ходу ${sideLabel} (${san}): оценка изменилась на ${maxSwing.toFixed(1)} пешки.`,
  };
}
