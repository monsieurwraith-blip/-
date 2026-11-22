/** How long Stockfish analyses before each of its moves. Chosen by the user, saved in settings. */
export const THINK_TIME_PRESETS = [
  { id: "1", seconds: 1, label: "1 с", description: "Мгновенная игра" },
  { id: "2", seconds: 2, label: "2 с", description: "Быстрый режим" },
  { id: "3", seconds: 3, label: "3 с", description: "Стандартный режим" },
  { id: "5", seconds: 5, label: "5 с", description: "Вдумчивый режим" },
  { id: "10", seconds: 10, label: "10 с", description: "Глубокий анализ" },
  { id: "15", seconds: 15, label: "15 с", description: "Экспертный режим" },
  { id: "30", seconds: 30, label: "30 с", description: "Максимальное обдумывание" },
] as const;

export type ThinkTimePresetId = (typeof THINK_TIME_PRESETS)[number]["id"];
export type ThinkTimeId = ThinkTimePresetId | "custom";

export const DEFAULT_THINK_TIME: ThinkTimeId = "2";
export const CUSTOM_THINK_MIN_S = 0.5;
export const CUSTOM_THINK_MAX_S = 120;
export const DEFAULT_CUSTOM_THINK_S = 7;

export function isThinkTimeId(value: unknown): value is ThinkTimeId {
  return value === "custom" || THINK_TIME_PRESETS.some((p) => p.id === value);
}

/** Clamps a user-entered number of seconds to the allowed range (rounded to 0.5 s). */
export function clampCustomSeconds(value: unknown, fallback = DEFAULT_CUSTOM_THINK_S): number {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value.replace(",", ".")) : NaN;
  if (!Number.isFinite(n)) return fallback;
  const rounded = Math.round(n * 2) / 2;
  return Math.max(CUSTOM_THINK_MIN_S, Math.min(CUSTOM_THINK_MAX_S, rounded));
}

/** Think time in milliseconds for the chosen option. */
export function thinkTimeMs(id: ThinkTimeId, customSeconds: number): number {
  if (id === "custom") return Math.round(clampCustomSeconds(customSeconds) * 1000);
  const preset = THINK_TIME_PRESETS.find((p) => p.id === id);
  return (preset?.seconds ?? 2) * 1000;
}

export function formatSeconds(ms: number): string {
  const s = ms / 1000;
  return `${s.toLocaleString("ru-RU", { maximumFractionDigits: 1 })} с`;
}
