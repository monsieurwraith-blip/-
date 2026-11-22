export type TimeControlId = "1+0" | "3+2" | "5+0" | "10+0" | "15+10" | "untimed";

export interface TimeControl {
  id: TimeControlId;
  label: string;
  /** Category shown under the label. */
  category: string;
  /** Starting time per side in ms; null = no clock. */
  initialMs: number | null;
  incrementMs: number;
}

const MIN = 60_000;

export const TIME_CONTROLS: readonly TimeControl[] = [
  { id: "1+0", label: "1 + 0", category: "Пуля", initialMs: 1 * MIN, incrementMs: 0 },
  { id: "3+2", label: "3 + 2", category: "Блиц", initialMs: 3 * MIN, incrementMs: 2_000 },
  { id: "5+0", label: "5 + 0", category: "Блиц", initialMs: 5 * MIN, incrementMs: 0 },
  { id: "10+0", label: "10 + 0", category: "Рапид", initialMs: 10 * MIN, incrementMs: 0 },
  { id: "15+10", label: "15 + 10", category: "Рапид", initialMs: 15 * MIN, incrementMs: 10_000 },
  { id: "untimed", label: "∞", category: "Без часов", initialMs: null, incrementMs: 0 },
];

export const DEFAULT_TIME_CONTROL: TimeControlId = "10+0";

export function getTimeControl(id: TimeControlId): TimeControl {
  const found = TIME_CONTROLS.find((tc) => tc.id === id);
  if (!found) throw new Error(`Unknown time control: ${id}`);
  return found;
}

/** Formats remaining clock time; shows tenths under 20 seconds. */
export function formatClock(ms: number): string {
  const safe = Math.max(0, ms);
  if (safe < 20_000) {
    const seconds = Math.floor(safe / 1000);
    const tenths = Math.floor((safe % 1000) / 100);
    return `0:${String(seconds).padStart(2, "0")}.${tenths}`;
  }
  const totalSeconds = Math.ceil(safe / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = hours > 0 ? String(minutes).padStart(2, "0") : String(minutes);
  return `${hours > 0 ? `${hours}:` : ""}${mm}:${String(seconds).padStart(2, "0")}`;
}
