import { describe, expect, it } from "vitest";

import {
  DRAW_COLORS,
  EMPTY_DRAWINGS,
  eraseAtSquare,
  loadSavedDrawings,
  removeArrowAtIndex,
  saveDrawingsForPosition,
  toggleArrowInState,
  toggleHighlightInState,
} from "./drawings";
import { computeBoardTacticsOverlay } from "./tacticsOverlay";

describe("Board Drawings System", () => {
  it("supports all 5 semantic drawing colors", () => {
    expect(DRAW_COLORS.map((c) => c.id)).toEqual(["green", "red", "yellow", "blue", "purple"]);
  });

  it("toggles arrows, replaces color, and removes duplicates", () => {
    let state = EMPTY_DRAWINGS;
    state = toggleArrowInState(state, "e2", "e4", "green");
    expect(state.arrows).toEqual([{ from: "e2", to: "e4", color: "green" }]);

    // Re-drawing same arrow with different color updates color
    state = toggleArrowInState(state, "e2", "e4", "red");
    expect(state.arrows).toEqual([{ from: "e2", to: "e4", color: "red" }]);

    // Re-drawing same arrow with same color removes it
    state = toggleArrowInState(state, "e2", "e4", "red");
    expect(state.arrows).toEqual([]);
  });

  it("toggles square highlights and erases arrows + highlights at a square", () => {
    let state = toggleHighlightInState(EMPTY_DRAWINGS, "d5", "yellow");
    state = toggleArrowInState(state, "c4", "f7", "purple");
    state = toggleArrowInState(state, "d5", "e7", "blue");
    expect(state.highlights).toHaveLength(1);
    expect(state.arrows).toHaveLength(2);

    const afterErase = eraseAtSquare(state, "d5");
    expect(afterErase.highlights).toEqual([]);
    expect(afterErase.arrows).toEqual([{ from: "c4", to: "f7", color: "purple" }]);

    const afterSingleRemove = removeArrowAtIndex(afterErase, 0);
    expect(afterSingleRemove.arrows).toEqual([]);
  });

  it("persists and reloads drawings per normalized FEN position", () => {
    const map = new Map<string, string>();
    const storage = {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => {
        map.set(k, v);
      },
    };
    const state = toggleArrowInState(
      toggleHighlightInState(EMPTY_DRAWINGS, "e4", "green"),
      "g1",
      "f3",
      "blue",
    );
    saveDrawingsForPosition(
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
      state,
      storage,
    );
    const loaded = loadSavedDrawings(
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 3 12",
      storage,
    );
    expect(loaded).toEqual(state);
  });

  it("computes real threat & combo overlays via chess.js", () => {
    // Black knight on f6 is undefended and attacked by white queen on f3; white knight on c7 threatens fork
    const overlay = computeBoardTacticsOverlay(
      "r3k2r/ppN2ppp/5n2/8/8/5Q2/PPP2PPP/R3K2R b KQkq - 0 1",
    );
    expect(overlay.dangerSquares.length + overlay.threatArrows.length).toBeGreaterThan(0);
  });
});
