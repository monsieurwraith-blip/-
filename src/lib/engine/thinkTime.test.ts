import { describe, expect, it } from "vitest";

import {
  AUTO_THINK_MAX_MS,
  AUTO_THINK_MIN_MS,
  THINK_TIME_PRESETS,
  clampCustomSeconds,
  estimatePositionComplexityThinkMs,
  isThinkTimeId,
  thinkTimeMs,
} from "./thinkTime";

describe("bot think time", () => {
  it("offers 1, 2, 3, 5, 10, 15 and 30 seconds", () => {
    expect(THINK_TIME_PRESETS.map((p) => p.seconds)).toEqual([1, 2, 3, 5, 10, 15, 30]);
  });

  it("converts presets to milliseconds", () => {
    expect(thinkTimeMs("1", 7)).toBe(1000);
    expect(thinkTimeMs("30", 7)).toBe(30_000);
  });

  it("uses the custom number of seconds", () => {
    expect(thinkTimeMs("custom", 7)).toBe(7000);
    expect(thinkTimeMs("custom", 4.5)).toBe(4500);
  });

  it("estimates adaptive 3-7s think time scaled by position complexity", () => {
    const simpleEndgame = "4k3/8/8/8/8/8/4P3/4K3 w - - 0 1";
    const sharpMiddlegame = "r1bq1rk1/pp2bppp/2n1pn2/2pp4/3P1B2/2PBPN2/PP1N1PPP/R2Q1RK1 w - - 0 9";

    const simpleMs = estimatePositionComplexityThinkMs(simpleEndgame);
    const sharpMs = estimatePositionComplexityThinkMs(sharpMiddlegame);

    expect(simpleMs).toBeGreaterThanOrEqual(AUTO_THINK_MIN_MS);
    expect(simpleMs).toBeLessThanOrEqual(AUTO_THINK_MAX_MS);
    expect(sharpMs).toBeGreaterThanOrEqual(AUTO_THINK_MIN_MS);
    expect(sharpMs).toBeLessThanOrEqual(AUTO_THINK_MAX_MS);
    expect(sharpMs).toBeGreaterThan(simpleMs);
    expect(thinkTimeMs("auto", 7, sharpMiddlegame)).toBe(sharpMs);
  });

  it("clamps custom seconds to 0.5–120", () => {
    expect(clampCustomSeconds(0)).toBe(0.5);
    expect(clampCustomSeconds(999)).toBe(120);
    expect(clampCustomSeconds("12,5")).toBe(12.5);
    expect(clampCustomSeconds("abc", 3)).toBe(3);
  });

  it("validates ids", () => {
    expect(isThinkTimeId("auto")).toBe(true);
    expect(isThinkTimeId("custom")).toBe(true);
    expect(isThinkTimeId("15")).toBe(true);
    expect(isThinkTimeId("4")).toBe(false);
  });
});
