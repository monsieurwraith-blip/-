import { describe, expect, it } from "vitest";

import { BOARD_THEMES, PIECE_SETS, getPieceSet, resolveBoardColors } from "./themes";

describe("themes", () => {
  it("offers every requested board theme", () => {
    const labels = BOARD_THEMES.map((t) => t.label);
    for (const name of ["Classic Wood", "Walnut", "Tournament", "Green", "Blue", "Dark", "Ivory"]) {
      expect(labels).toContain(name);
    }
  });

  it("offers every requested piece theme", () => {
    const labels = PIECE_SETS.map((p) => p.label);
    for (const name of ["Classic", "Staunton", "Modern", "Neo", "Glass", "Marble"]) {
      expect(labels).toContain(name);
    }
  });

  it("renders Glass and Marble as materials over a real SVG set", () => {
    expect(getPieceSet("glass")).toMatchObject({ material: "glass", base: "cburnett" });
    expect(getPieceSet("marble")).toMatchObject({ material: "marble", base: "merida" });
  });

  it("uses the user's colors for the custom board theme", () => {
    const custom = { light: "#ffffff", dark: "#000000" };
    expect(resolveBoardColors("custom", custom)).toEqual(custom);
    expect(resolveBoardColors("classic", custom)).toEqual({ light: "#f0d9b5", dark: "#b58863" });
  });
});
