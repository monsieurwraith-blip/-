/**
 * Chess.com-style Board Drawing System (arrows & square highlights).
 * Supports 5 semantic colors, undo history, single-arrow removal, hide/show,
 * and per-position localStorage persistence.
 */
import type { Square } from "@/lib/chess/types";

export const DRAW_COLORS = [
  { id: "green", label: "Зелёный", meaning: "Хороший план / ход", hex: "#16C784" },
  { id: "red", label: "Красный", meaning: "Опасность / атака / угроза", hex: "#EF4444" },
  { id: "yellow", label: "Жёлтый", meaning: "Внимание / идея", hex: "#F59E0B" },
  { id: "blue", label: "Синий", meaning: "Альтернативный вариант", hex: "#38BDF8" },
  { id: "purple", label: "Фиолетовый", meaning: "Специальная комбинация", hex: "#A855F7" },
] as const;

export type DrawColorId = (typeof DRAW_COLORS)[number]["id"];
export type DrawToolId = "move" | "arrow" | "highlight" | "eraser";

export interface DrawnArrow {
  from: Square;
  to: Square;
  color: DrawColorId;
}

export interface DrawnHighlight {
  square: Square;
  color: DrawColorId;
}

export interface BoardDrawings {
  arrows: DrawnArrow[];
  highlights: DrawnHighlight[];
}

export const EMPTY_DRAWINGS: BoardDrawings = { arrows: [], highlights: [] };

const STORAGE_PREFIX = "prochess:board-drawings:v1";

export function drawColorHex(color: DrawColorId): string {
  return DRAW_COLORS.find((c) => c.id === color)?.hex ?? "#16C784";
}

export function toggleArrowInState(
  state: BoardDrawings,
  from: Square,
  to: Square,
  color: DrawColorId,
): BoardDrawings {
  if (from === to) return state;
  const idx = state.arrows.findIndex((a) => a.from === from && a.to === to);
  if (idx >= 0) {
    const existing = state.arrows[idx]!;
    if (existing.color === color) {
      return {
        ...state,
        arrows: state.arrows.filter((_, i) => i !== idx),
      };
    }
    const nextArrows = [...state.arrows];
    nextArrows[idx] = { from, to, color };
    return { ...state, arrows: nextArrows };
  }
  return { ...state, arrows: [...state.arrows, { from, to, color }] };
}

export function removeArrowAtIndex(state: BoardDrawings, index: number): BoardDrawings {
  return {
    ...state,
    arrows: state.arrows.filter((_, i) => i !== index),
  };
}

export function toggleHighlightInState(
  state: BoardDrawings,
  square: Square,
  color: DrawColorId,
): BoardDrawings {
  const idx = state.highlights.findIndex((h) => h.square === square);
  if (idx >= 0) {
    const existing = state.highlights[idx]!;
    if (existing.color === color) {
      return {
        ...state,
        highlights: state.highlights.filter((_, i) => i !== idx),
      };
    }
    const nextHighlights = [...state.highlights];
    nextHighlights[idx] = { square, color };
    return { ...state, highlights: nextHighlights };
  }
  return { ...state, highlights: [...state.highlights, { square, color }] };
}

export function eraseAtSquare(state: BoardDrawings, square: Square): BoardDrawings {
  return {
    arrows: state.arrows.filter((a) => a.from !== square && a.to !== square),
    highlights: state.highlights.filter((h) => h.square !== square),
  };
}

function normalizePositionKey(key: string): string {
  return key.split(" ").slice(0, 4).join(" ");
}

export function loadSavedDrawings(
  positionKey: string,
  storage: Pick<Storage, "getItem"> | null = typeof window !== "undefined"
    ? window.localStorage
    : null,
): BoardDrawings {
  if (!storage) return EMPTY_DRAWINGS;
  try {
    const raw = storage.getItem(STORAGE_PREFIX);
    if (!raw) return EMPTY_DRAWINGS;
    const map = JSON.parse(raw) as Record<string, BoardDrawings>;
    const saved = map[normalizePositionKey(positionKey)];
    if (!saved) return EMPTY_DRAWINGS;
    return {
      arrows: Array.isArray(saved.arrows) ? saved.arrows : [],
      highlights: Array.isArray(saved.highlights) ? saved.highlights : [],
    };
  } catch {
    return EMPTY_DRAWINGS;
  }
}

export function saveDrawingsForPosition(
  positionKey: string,
  drawings: BoardDrawings,
  storage: Pick<Storage, "getItem" | "setItem"> | null = typeof window !== "undefined"
    ? window.localStorage
    : null,
): void {
  if (!storage) return;
  try {
    const raw = storage.getItem(STORAGE_PREFIX);
    const map = raw ? (JSON.parse(raw) as Record<string, BoardDrawings>) : {};
    const k = normalizePositionKey(positionKey);
    if (drawings.arrows.length === 0 && drawings.highlights.length === 0) {
      delete map[k];
    } else {
      map[k] = drawings;
    }
    const keys = Object.keys(map);
    if (keys.length > 60) {
      for (const oldKey of keys.slice(0, keys.length - 60)) {
        delete map[oldKey];
      }
    }
    storage.setItem(STORAGE_PREFIX, JSON.stringify(map));
  } catch {
    // Ignore storage quota issues.
  }
}
