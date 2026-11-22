export type DifficultyId = "novice" | "easy" | "medium" | "strong" | "expert";

/**
 * Engine strength presets. Every value maps to a real UCI control:
 * `setoption name Skill Level` (0–20) plus an optional `depth` cap.
 * Think time per move is chosen separately by the user (see engine/thinkTime).
 * No ELO is promised — Stockfish's Skill Level is not calibrated to a rating.
 */
export interface DifficultyLevel {
  id: DifficultyId;
  label: string;
  description: string;
  skillLevel: number;
  /** Search depth cap that keeps weak levels weak; null = limited only by think time. */
  depth: number | null;
}

export const DIFFICULTY_LEVELS: readonly DifficultyLevel[] = [
  {
    id: "novice",
    label: "Новичок",
    description: "Часто ошибается, видит на ход вперёд",
    skillLevel: 0,
    depth: 1,
  },
  {
    id: "easy",
    label: "Лёгкий",
    description: "Неглубокий расчёт, допускает неточности",
    skillLevel: 3,
    depth: 3,
  },
  {
    id: "medium",
    label: "Средний",
    description: "Уверенная игра с редкими ошибками",
    skillLevel: 8,
    depth: 7,
  },
  {
    id: "strong",
    label: "Сильный",
    description: "Глубокий расчёт, мало ошибок",
    skillLevel: 14,
    depth: null,
  },
  {
    id: "expert",
    label: "Эксперт",
    description: "Полная сила движка в лимите времени",
    skillLevel: 20,
    depth: null,
  },
];

export const DEFAULT_DIFFICULTY: DifficultyId = "medium";

export function getDifficulty(id: DifficultyId): DifficultyLevel {
  const found = DIFFICULTY_LEVELS.find((d) => d.id === id);
  if (!found) throw new Error(`Unknown difficulty: ${id}`);
  return found;
}

/**
 * Think time for one engine move: the user's chosen time, capped so the engine
 * never burns more than ~1/30 of its remaining clock (plus half the increment).
 */
export function engineMovetime(
  thinkMs: number,
  remainingMs: number | null,
  incrementMs: number,
): number {
  if (remainingMs === null) return thinkMs;
  const budget = Math.floor(remainingMs / 30 + incrementMs / 2);
  return Math.max(50, Math.min(thinkMs, budget));
}
