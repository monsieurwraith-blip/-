import { describe, expect, it } from "vitest";

import { DIFFICULTY_LEVELS, engineMovetime, getDifficulty } from "./difficulty";

describe("difficulty levels", () => {
  it("has the five named levels in order", () => {
    expect(DIFFICULTY_LEVELS.map((l) => l.label)).toEqual([
      "Новичок",
      "Лёгкий",
      "Средний",
      "Сильный",
      "Эксперт",
    ]);
  });

  it("keeps Stockfish Skill Level within 0–20 and increasing", () => {
    const skills = DIFFICULTY_LEVELS.map((l) => l.skillLevel);
    expect(skills[0]).toBe(0);
    expect(skills[skills.length - 1]).toBe(20);
    expect([...skills].sort((a, b) => a - b)).toEqual(skills);
  });

  it("uses the chosen think time and caps it by the remaining clock", () => {
    expect(engineMovetime(5000, null, 0)).toBe(5000);
    expect(engineMovetime(5000, 30_000, 0)).toBe(1000);
    expect(engineMovetime(5000, 600, 0)).toBe(50);
  });

  it("does not cap depth for the strong levels, so they think for the full time", () => {
    expect(getDifficulty("strong").depth).toBeNull();
    expect(getDifficulty("expert").depth).toBeNull();
    expect(getDifficulty("novice").depth).toBe(1);
  });
});
