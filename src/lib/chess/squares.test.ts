import { describe, expect, it } from "vitest";

import { cellOf, isLightSquare, squareAt } from "./squares";

describe("board geometry", () => {
  it("colors a1 dark and h1 light", () => {
    expect(isLightSquare("a1")).toBe(false);
    expect(isLightSquare("h1")).toBe(true);
    expect(isLightSquare("a8")).toBe(true);
  });

  it("puts a1 bottom-left for white and top-right for black", () => {
    expect(squareAt(7, 0, "w")).toBe("a1");
    expect(squareAt(0, 7, "b")).toBe("a1");
    expect(cellOf("e4", "w")).toEqual({ row: 4, col: 4 });
    expect(cellOf("e4", "b")).toEqual({ row: 3, col: 3 });
  });
});
