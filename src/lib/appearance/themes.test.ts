import { describe, expect, it } from "vitest";

import { BOARD_THEMES, PIECE_SETS, getPieceSet, resolveBoardColors } from "./themes";

describe("themes", () => {
  it("offers all 28 requested ProChess board themes across categories", () => {
    expect(BOARD_THEMES).toHaveLength(28);
    const labels = BOARD_THEMES.map((t) => t.label);
    for (const name of [
      "Classic Wood",
      "Classic Walnut",
      "Titanium",
      "Emerald",
      "Black Marble",
      "Holographic",
      "Neon",
      "Cyberpunk",
      "Aurora",
    ]) {
      expect(labels).toContain(name);
    }
  });

  it("offers all 16 requested ProChess piece collections", () => {
    expect(PIECE_SETS).toHaveLength(16);
    const labels = PIECE_SETS.map((p) => p.label);
    for (const name of [
      "Classic Staunton",
      "Tournament",
      "Modern",
      "Luxury",
      "Titanium",
      "Glass",
      "Marble",
      "Holographic",
    ]) {
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
    expect(resolveBoardColors("classic", custom)).toEqual({ light: "#F0D9B5", dark: "#B58863" });
  });
});
