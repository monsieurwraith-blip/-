import { describe, expect, it } from "vitest";

import { THINK_TIME_PRESETS, clampCustomSeconds, isThinkTimeId, thinkTimeMs } from "./thinkTime";

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

  it("clamps custom seconds to 0.5–120", () => {
    expect(clampCustomSeconds(0)).toBe(0.5);
    expect(clampCustomSeconds(999)).toBe(120);
    expect(clampCustomSeconds("12,5")).toBe(12.5);
    expect(clampCustomSeconds("abc", 3)).toBe(3);
  });

  it("validates ids", () => {
    expect(isThinkTimeId("custom")).toBe(true);
    expect(isThinkTimeId("15")).toBe(true);
    expect(isThinkTimeId("4")).toBe(false);
  });
});
