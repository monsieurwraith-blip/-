/** End-of-game coach report built from the verdicts of the player's moves. */
import type { EngineScore } from "@/lib/chess/uci";

import { MOVE_CLASSES, chartPawns, isMistakeClass, type MoveClass } from "./evaluation";
import { MISSED_TAGS, TAG_LABEL, type CoachTag, type CoachVerdict } from "./explain";

export interface CoachRecord {
  /** Index of the player's move in the game history (0-based ply). */
  ply: number;
  moveNumber: number;
  san: string;
  fenBefore: string;
  uci: string;
  verdict: CoachVerdict;
  /** The player took back this move with "Исправить ход". */
  corrected: boolean;
}

export interface EvalPoint {
  ply: number;
  pawns: number;
}

export interface CoachReport {
  moves: number;
  accuracy: number;
  grade: string;
  counts: Record<MoveClass, number>;
  averageCpLoss: number;
  missedTactics: number;
  materialLost: number;
  corrected: number;
  topTags: { tag: CoachTag; label: string; count: number }[];
  bestMoves: CoachRecord[];
  criticalMistakes: CoachRecord[];
  evalGraph: EvalPoint[];
  recommendations: string[];
}

const ADVICE: Record<CoachTag, string> = {
  hanging:
    "Перед каждым ходом проверяйте: не остаётся ли фигура, которой вы ходите, под боем без защиты.",
  undefended:
    "Когда фигура уходит, смотрите, что она защищала — часто именно там соперник находит выигрыш.",
  fork: "Обращайте внимание на поля, откуда конь или ферзь соперника нападает сразу на две ваши фигуры.",
  pin: "Не ставьте ценные фигуры на одну линию с королём или ферзём, если её может занять слон или ладья соперника.",
  skewer: "Король и ферзь на одной линии — мишень для сквозного удара. Уводите их с открытых линий.",
  discovered: "Следите за фигурами соперника, стоящими за другими фигурами: их линии могут внезапно открыться.",
  "mate-threat": "Проверяйте шахи и угрозы своему королю перед каждым ходом — особенно на последней горизонтали.",
  "missed-mate": "Ищите форсированные варианты: сначала шахи, затем взятия, затем угрозы.",
  "missed-fork": "Тренируйте тактику двойного удара: ищите ходы, атакующие две незащищённые фигуры сразу.",
  "missed-material": "Не пропускайте незащищённые фигуры соперника — каждый ход проверяйте, что можно взять.",
  "king-safety": "Без необходимости не двигайте пешки перед рокированным королём.",
  "material-loss": "Перед ходом просчитайте ответные взятия соперника хотя бы на два хода вперёд.",
  positional: "Ставьте фигуры на активные поля и держите центр — небольшие неточности складываются.",
};

export function gradeFor(accuracy: number): string {
  if (accuracy >= 90) return "Превосходная игра";
  if (accuracy >= 80) return "Отличная игра";
  if (accuracy >= 70) return "Хорошая игра";
  if (accuracy >= 55) return "Неплохо, но с ошибками";
  return "Трудная партия — есть над чем поработать";
}

/** Evaluation after each ply, from the coach's analyses (White's point of view). */
export function buildEvalGraph(records: readonly CoachRecord[]): EvalPoint[] {
  const points = new Map<number, EngineScore>();
  for (const r of records) {
    points.set(r.ply, r.verdict.scoreBefore);
    points.set(r.ply + 1, r.verdict.scoreAfter);
  }
  return [...points.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([ply, score]) => ({ ply, pawns: chartPawns(score) }));
}

export function buildReport(all: readonly CoachRecord[]): CoachReport {
  const records = all.filter((r) => !r.corrected);
  const counts = Object.fromEntries(MOVE_CLASSES.map((c) => [c, 0])) as Record<MoveClass, number>;
  const tagCounts = new Map<CoachTag, number>();
  let accSum = 0;
  let cpSum = 0;
  let missed = 0;
  let materialLost = 0;
  for (const r of records) {
    const v = r.verdict;
    counts[v.classification]++;
    accSum += v.accuracy;
    cpSum += v.cpLoss;
    materialLost += v.materialLost;
    if (v.tags.some((t) => MISSED_TAGS.includes(t))) missed++;
    if (isMistakeClass(v.classification)) {
      for (const t of new Set(v.tags)) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
    }
  }
  const n = records.length;
  const accuracy = n ? accSum / n : 0;
  const topTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag, count]) => ({ tag, label: TAG_LABEL[tag], count }));

  const bestMoves = records
    .filter((r) => r.verdict.classification === "brilliant" || r.verdict.classification === "best")
    .sort((a, b) => {
      const rank = (r: CoachRecord) => (r.verdict.classification === "brilliant" ? 1 : 0);
      return rank(b) - rank(a) || b.verdict.materialLost - a.verdict.materialLost || a.ply - b.ply;
    })
    .slice(0, 3);

  const criticalMistakes = records
    .filter((r) => isMistakeClass(r.verdict.classification))
    .sort((a, b) => b.verdict.winDrop - a.verdict.winDrop)
    .slice(0, 5);

  const recommendations = topTags.map((t) => ADVICE[t.tag]);
  if (recommendations.length === 0) {
    recommendations.push(
      n === 0
        ? "Сыграйте хотя бы несколько ходов, чтобы тренер смог оценить вашу игру."
        : "Ошибок почти нет — попробуйте уровень сложнее или больше времени для Stockfish.",
    );
  }

  return {
    moves: n,
    accuracy,
    grade: n ? gradeFor(accuracy) : "Мало ходов для оценки",
    counts,
    averageCpLoss: n ? cpSum / n : 0,
    missedTactics: missed,
    materialLost,
    corrected: all.length - records.length,
    topTags,
    bestMoves,
    criticalMistakes,
    evalGraph: buildEvalGraph(records),
    recommendations,
  };
}

/** Critical moments for "Разобрать ошибки", in game order. */
export function reviewMoments(all: readonly CoachRecord[]): CoachRecord[] {
  return all
    .filter((r) => isMistakeClass(r.verdict.classification))
    .sort((a, b) => a.ply - b.ply);
}
