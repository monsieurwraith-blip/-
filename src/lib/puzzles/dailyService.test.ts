import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildDailyPuzzleSet,
  fetchLichessDailyPuzzle,
  formatCountdownHms,
  loadDailyChallengeState,
  msUntilNextMidnight,
  saveDailyChallengeState,
} from "./dailyService";

describe("Daily Chess Challenge Service", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("generates deterministic 10-puzzle daily set across all difficulty tiers", () => {
    const setA = buildDailyPuzzleSet("2026-11-23");
    const setB = buildDailyPuzzleSet("2026-11-23");
    const setOtherDay = buildDailyPuzzleSet("2026-11-24");

    expect(setA).toHaveLength(10);
    expect(setA.map((p) => p.id)).toEqual(setB.map((p) => p.id));
    expect(setA.map((p) => p.id)).not.toEqual(setOtherDay.map((p) => p.id));

    // Verify 3 easy (<1200), 3 medium (1200-1599), 2 hard (1600-1999), 1 expert (>=2000), 1 special
    expect(setA.slice(0, 3).every((p) => p.rating < 1200)).toBe(true);
    expect(setA.slice(3, 6).every((p) => p.rating >= 1200 && p.rating < 1600)).toBe(true);
    expect(setA.slice(6, 8).every((p) => p.rating >= 1600 && p.rating < 2000)).toBe(true);
    expect(setA[8]!.rating).toBeGreaterThanOrEqual(2000);
  });

  it("persists and restores daily progress per dateKey", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
    };
    const initial = loadDailyChallengeState("2026-11-23", storage);
    expect(initial.puzzles).toHaveLength(10);
    expect(initial.solvedIds).toEqual([]);

    const updated = {
      ...initial,
      currentIndex: 3,
      solvedIds: [initial.puzzles[0]!.id, initial.puzzles[1]!.id],
    };
    saveDailyChallengeState(updated, storage);

    const reloaded = loadDailyChallengeState("2026-11-23", storage);
    expect(reloaded.currentIndex).toBe(3);
    expect(reloaded.solvedIds).toEqual(updated.solvedIds);

    // New day resets progress cleanly
    const nextDay = loadDailyChallengeState("2026-11-24", storage);
    expect(nextDay.solvedIds).toEqual([]);
    expect(nextDay.currentIndex).toBe(0);
  });

  it("formats midnight countdown cleanly", () => {
    const ms = msUntilNextMidnight(new Date(2026, 10, 23, 23, 58, 55));
    expect(ms).toBe(65_000);
    expect(formatCountdownHms(ms)).toBe("00:01:05");
  });

  it("parses and validates real Lichess Daily API payload via chess.js", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          game: { pgn: "1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6" },
          puzzle: {
            id: "testLichess1",
            rating: 1450,
            initialPly: 5,
            solution: ["h5f7"],
            themes: ["mateIn1"],
          },
        }),
      })),
    );

    const puzzle = await fetchLichessDailyPuzzle();
    expect(puzzle).not.toBeNull();
    expect(puzzle?.source).toBe("lichess");
    expect(puzzle?.category).toBe("Мат в 1 ход");
    expect(puzzle?.solutionUci).toEqual(["h5f7"]);
  });
});
