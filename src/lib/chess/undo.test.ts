import { describe, expect, it } from "vitest";

import { pliesToUndo } from "./undo";

describe("pliesToUndo (game vs computer)", () => {
  it("takes back the engine reply and the player's move as a pair", () => {
    expect(pliesToUndo(["w", "b", "w", "b"], "w")).toBe(2);
  });

  it("takes back only the player's move while the engine is still to reply", () => {
    expect(pliesToUndo(["w", "b", "w"], "w")).toBe(1);
  });

  it("is disabled (0) when the player has not moved yet — engine opened as white", () => {
    expect(pliesToUndo(["w"], "b")).toBe(0);
    expect(pliesToUndo([], "w")).toBe(0);
  });

  it("keeps the engine's opening move when the player is black", () => {
    expect(pliesToUndo(["w", "b", "w"], "b")).toBe(2);
  });
});
