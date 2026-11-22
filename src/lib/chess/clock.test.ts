import { describe, expect, it } from "vitest";

import { ChessClock } from "./clock";

function fakeTime() {
  let t = 0;
  return { now: () => t, advance: (ms: number) => (t += ms) };
}

describe("ChessClock", () => {
  it("does not run before the first move and starts black after white's first move", () => {
    const time = fakeTime();
    const clock = new ChessClock(60_000, 2_000, time.now);
    time.advance(5_000);
    clock.tick();
    expect(clock.getState().remaining).toEqual({ w: 60_000, b: 60_000 });
    clock.press("w");
    expect(clock.getState().active).toBe("b");
    // No increment for the move that started the clock.
    expect(clock.getState().remaining.w).toBe(60_000);
  });

  it("charges elapsed time to the side to move and adds the increment after its move", () => {
    const time = fakeTime();
    const clock = new ChessClock(180_000, 2_000, time.now);
    clock.press("w");
    time.advance(10_000);
    const after = clock.press("b");
    expect(after.b).toBe(180_000 - 10_000 + 2_000);
    expect(clock.getState().active).toBe("w");
  });

  it("flags the side whose time runs out and stops", () => {
    const time = fakeTime();
    const clock = new ChessClock(1_000, 0, time.now);
    clock.press("w");
    time.advance(1_500);
    expect(clock.tick()).toBe("b");
    expect(clock.getState()).toMatchObject({ flagged: "b", active: null, remaining: { b: 0 } });
  });

  it("restores a snapshot for undo", () => {
    const time = fakeTime();
    const clock = new ChessClock(60_000, 0, time.now);
    clock.press("w");
    time.advance(3_000);
    clock.restore({ w: 50_000, b: 40_000 }, "w");
    time.advance(1_000);
    clock.tick();
    expect(clock.getState().remaining).toEqual({ w: 49_000, b: 40_000 });
  });
});
