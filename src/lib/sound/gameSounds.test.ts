import { describe, expect, it } from "vitest";

import { clipForMove, clipForOutcome, eventForClip } from "./gameSounds";

describe("game sounds", () => {
  it("picks checkmate over check, check over capture, capture over a plain move", () => {
    expect(clipForMove({ san: "Bxf7+", captured: "p" })).toBe("check");
    expect(clipForMove({ san: "Qxf7#", captured: "p" })).toBe("checkmate");
    expect(clipForMove({ san: "exd5", captured: "p" })).toBe("capture");
    expect(clipForMove({ san: "e4" })).toBe("move");
  });

  it("plays win or loss from the player's side and neutral end for draws", () => {
    expect(clipForOutcome({ type: "checkmate", winner: "w" }, "w")).toBe("win");
    expect(clipForOutcome({ type: "resign", winner: "b" }, "w")).toBe("loss");
    expect(clipForOutcome({ type: "stalemate" }, "w")).toBe("gameEnd");
  });

  it("maps win and loss to the single result toggle", () => {
    expect(eventForClip("win")).toBe("result");
    expect(eventForClip("loss")).toBe("result");
    expect(eventForClip("capture")).toBe("capture");
  });
});
