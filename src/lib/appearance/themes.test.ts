import { describe, expect, it } from "vitest";

import { BOARD_THEMES, PIECE_SETS, getPieceSet, resolveBoardColors } from "./themes";

describe("themes", () => {
  it("offers all 39 ProChess board themes across 4 categories", () => {
    expect(BOARD_THEMES).toHaveLength(39);
    const labels = BOARD_THEMES.map((t) => t.label);
    for (const name of [
      "Классическая деревянная",
      "Орех",
      "Titanium",
      "Emerald ProChess",
      "Чёрный мрамор",
      "Золотой мрамор",
      "Royal Palace",
      "Golden Empire",
      "Holographic",
      "Neon",
      "Cyberpunk",
      "Aurora",
    ]) {
      expect(labels).toContain(name);
    }
  });

  it("offers all 26 ProChess piece collections including Gold Mirror series", () => {
    expect(PIECE_SETS).toHaveLength(26);
    const labels = PIECE_SETS.map((p) => p.label);
    for (const name of [
      "GOLD MIRROR",
      "ROYAL GOLD",
      "CHAMPAGNE GOLD",
      "BLACK GOLD",
      "LIQUID GOLD",
      "Классические Staunton",
      "Гроссмейстерские",
      "Титановые",
      "Стеклянные",
      "Мраморные",
      "Голографические",
    ]) {
      expect(labels).toContain(name);
    }
  });

  it("renders Glass, Marble, and Gold Mirror as materials over a real SVG set", () => {
    expect(getPieceSet("glass")).toMatchObject({ material: "glass", base: "cburnett" });
    expect(getPieceSet("marble")).toMatchObject({ material: "marble", base: "merida" });
    expect(getPieceSet("gold-mirror")).toMatchObject({
      material: "gold-mirror",
      base: "merida",
      category: "gold",
    });
  });

  it("uses the user's colors for the custom board theme", () => {
    const custom = { light: "#ffffff", dark: "#000000" };
    expect(resolveBoardColors("custom", custom)).toEqual(custom);
    expect(resolveBoardColors("classic", custom)).toEqual({ light: "#F0D9B5", dark: "#B58863" });
  });
});
