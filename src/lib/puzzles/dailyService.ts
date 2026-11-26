/**
 * PROCHESS Daily Chess Challenge Service:
 * - Real network fetch from Lichess Daily Puzzle API (https://lichess.org/api/puzzle/daily)
 *   replaying the PGN through chess.js to guarantee 100% legal FEN & solution UCI.
 * - Deterministic local 10-puzzle/day generator seeded by YYYY-MM-DD:
 *   3 Easy (400–1200) + 3 Medium (1200–1600) + 2 Hard (1600–2000) + 1 Expert/Master (2000+)
 *   + 1 Puzzle of the Day (Lichess live when reachable, or curated daily special).
 * - Date-keyed caching in localStorage so progress resumes seamlessly all day.
 */
import { Chess } from "chess.js";

import { playUci } from "@/lib/coach/tactics";

import { ALL_LOCAL_PUZZLES } from "./puzzleLibrary";
import type { ChessPuzzle } from "./types";

export const DAILY_STORAGE_KEY = "prochess:daily_challenge";

export interface DailyChallengeState {
  dateKey: string;
  puzzles: ChessPuzzle[];
  currentIndex: number;
  solvedIds: string[];
  failedIds: string[];
  sourceStatus: "live" | "cache" | "local";
  completedAt: string | null;
}

export function getTodayDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function msUntilNextMidnight(now = new Date()): number {
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return Math.max(0, tomorrow.getTime() - now.getTime());
}

export function formatCountdownHms(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Deterministic PRNG seeded by date string YYYY-MM-DD. */
function seededRandom(seedStr: string): () => number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickSeeded<T>(
  pool: readonly T[],
  count: number,
  rng: () => number,
  used: Set<string>,
  idOf: (item: T) => string,
): T[] {
  const arr = [...pool];
  // Fisher-Yates shuffle with seeded rng
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  const picked: T[] = [];
  for (const item of arr) {
    const id = idOf(item);
    if (!used.has(id)) {
      used.add(id);
      picked.push(item);
      if (picked.length === count) break;
    }
  }
  return picked;
}

const LICHESS_THEME_RU: Record<string, string> = {
  mateIn1: "Мат в 1 ход",
  mateIn2: "Мат в 2 хода",
  mateIn3: "Мат в 3 хода",
  mateIn4: "Мат в 4 хода",
  mate: "Матовая атака",
  fork: "Вилка",
  pin: "Связка",
  skewer: "Линейный удар",
  discoveredAttack: "Вскрытая атака",
  doubleCheck: "Двойной шах",
  attraction: "Завлечение",
  deflection: "Отвлечение",
  removingDefender: "Уничтожение защитника",
  overloading: "Перегрузка",
  intermezzo: "Промежуточный ход",
  sacrifice: "Жертва фигуры",
  xRayAttack: "Просвет",
  endgame: "Переход в выигранный эндшпиль",
  advantage: "Выигрыш материала",
  crushing: "Тактическая комбинация",
};

interface LichessDailyResponse {
  game?: { pgn?: string };
  puzzle?: {
    id?: string;
    rating?: number;
    initialPly?: number;
    solution?: string[];
    themes?: string[];
  };
}

/**
 * Fetches today's real puzzle from Lichess Daily API and verifies every move with chess.js.
 * Returns null gracefully when offline, blocked, or response fails validation.
 */
export async function fetchLichessDailyPuzzle(signal?: AbortSignal): Promise<ChessPuzzle | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);
    if (signal) {
      signal.addEventListener("abort", () => controller.abort(), { once: true });
    }

    const res = await fetch("https://lichess.org/api/puzzle/daily", {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeoutId);
    if (!res.ok) return null;

    const json = (await res.json()) as LichessDailyResponse;
    const pgn = json.game?.pgn;
    const solution = json.puzzle?.solution;
    const initialPly = json.puzzle?.initialPly;
    const id = json.puzzle?.id;
    if (
      !pgn ||
      !Array.isArray(solution) ||
      solution.length === 0 ||
      typeof initialPly !== "number"
    ) {
      return null;
    }

    const chess = new Chess();
    chess.loadPgn(pgn);
    const history = chess.history({ verbose: true });
    if (history.length === 0) return null;

    // Replay up to initialPly + 1 (Lichess initialPly is 0-indexed before opponent's setup move,
    // so after history[0..initialPly] the board is ready for the player's first solution move).
    const setupChess = new Chess();
    const setupLimit = Math.min(history.length, initialPly + 1);
    for (let i = 0; i < setupLimit; i++) {
      const m = history[i];
      if (!m) return null;
      setupChess.move({
        from: m.from,
        to: m.to,
        ...(m.promotion ? { promotion: m.promotion } : {}),
      });
    }

    const startFen = setupChess.fen();
    const verifyChess = new Chess(startFen);
    for (const uci of solution) {
      if (!playUci(verifyChess, uci)) {
        return null;
      }
    }

    const rawThemes = json.puzzle?.themes ?? [];
    const mappedTheme =
      rawThemes.map((t) => LICHESS_THEME_RU[t]).find((t): t is string => Boolean(t)) ??
      "Задача дня";
    const isMate = rawThemes.some((t) => t.startsWith("mate"));
    const group = isMate ? "Маты" : "Тактика";

    return {
      id: `lichess-${id ?? getTodayDateKey()}`,
      group,
      category: mappedTheme,
      rating: typeof json.puzzle?.rating === "number" ? Math.round(json.puzzle.rating) : 1650,
      title: `Задача дня #${id ?? "Live"}`,
      fen: startFen,
      solutionUci: solution,
      hint: `Обратите внимание на тему «${mappedTheme}» и форсированные шахи/взятия.`,
      explanation: `Точное решение (${solution.slice(0, 3).join(" → ")}) приносит решающее преимущество.`,
      source: "lichess",
    };
  } catch {
    return null;
  }
}

/**
 * Generates the exact 10-puzzle set for the requested dateKey:
 * - 3 Easy/Basic (< 1200)
 * - 3 Medium (1200–1600)
 * - 2 Hard (1600–2000)
 * - 1 Expert/Master (>= 2000)
 * - 1 Puzzle of the Day (special / Lichess live)
 */
export function buildDailyPuzzleSet(
  dateKey: string,
  livePuzzle: ChessPuzzle | null = null,
): ChessPuzzle[] {
  const rng = seededRandom(`prochess-daily:${dateKey}`);
  const used = new Set<string>();
  if (livePuzzle) used.add(livePuzzle.id);

  const easyPool = ALL_LOCAL_PUZZLES.filter((p) => p.rating < 1200);
  const mediumPool = ALL_LOCAL_PUZZLES.filter((p) => p.rating >= 1200 && p.rating < 1600);
  const hardPool = ALL_LOCAL_PUZZLES.filter((p) => p.rating >= 1600 && p.rating < 2000);
  const expertPool = ALL_LOCAL_PUZZLES.filter((p) => p.rating >= 2000);

  const easy = pickSeeded(easyPool, 3, rng, used, (p) => p.id);
  const medium = pickSeeded(mediumPool, 3, rng, used, (p) => p.id);
  const hard = pickSeeded(hardPool, 2, rng, used, (p) => p.id);
  const expert = pickSeeded(expertPool, 1, rng, used, (p) => p.id);

  let special: ChessPuzzle | null = livePuzzle;
  if (!special) {
    const specialPool = ALL_LOCAL_PUZZLES.filter((p) => p.rating >= 1700);
    special = pickSeeded(specialPool, 1, rng, used, (p) => p.id)[0] ?? ALL_LOCAL_PUZZLES[0]!;
  }

  const combined = [...easy, ...medium, ...hard, ...expert, special].filter((p): p is ChessPuzzle =>
    Boolean(p),
  );

  // Pad safely to 10 if needed
  for (const p of ALL_LOCAL_PUZZLES) {
    if (combined.length >= 10) break;
    if (!used.has(p.id)) {
      used.add(p.id);
      combined.push(p);
    }
  }
  return combined.slice(0, 10);
}

export function loadDailyChallengeState(
  dateKey = getTodayDateKey(),
  storage: Pick<Storage, "getItem"> | null = typeof window !== "undefined"
    ? window.localStorage
    : null,
): DailyChallengeState {
  try {
    const raw = storage?.getItem(DAILY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DailyChallengeState>;
      if (
        parsed.dateKey === dateKey &&
        Array.isArray(parsed.puzzles) &&
        parsed.puzzles.length === 10
      ) {
        return {
          dateKey,
          puzzles: parsed.puzzles,
          currentIndex:
            typeof parsed.currentIndex === "number"
              ? Math.max(0, Math.min(9, parsed.currentIndex))
              : 0,
          solvedIds: Array.isArray(parsed.solvedIds) ? parsed.solvedIds : [],
          failedIds: Array.isArray(parsed.failedIds) ? parsed.failedIds : [],
          sourceStatus:
            parsed.sourceStatus === "live" || parsed.sourceStatus === "cache" ? "cache" : "local",
          completedAt: typeof parsed.completedAt === "string" ? parsed.completedAt : null,
        };
      }
    }
  } catch {
    // Fallback below
  }

  return {
    dateKey,
    puzzles: buildDailyPuzzleSet(dateKey, null),
    currentIndex: 0,
    solvedIds: [],
    failedIds: [],
    sourceStatus: "local",
    completedAt: null,
  };
}

export function saveDailyChallengeState(
  state: DailyChallengeState,
  storage: Pick<Storage, "setItem"> | null = typeof window !== "undefined"
    ? window.localStorage
    : null,
): void {
  try {
    storage?.setItem(DAILY_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage quota errors
  }
}
