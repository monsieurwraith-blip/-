import { describe, expect, it } from "vitest";

import { placePieces, type BoardCell } from "./pieceIds";

describe("placePieces", () => {
  it("keeps the id of a piece that moved so it can animate", () => {
    let n = 0;
    const id = () => `id${n++}`;
    const before: BoardCell[] = [
      { square: "e1", type: "k", color: "w" },
      { square: "h1", type: "r", color: "w" },
    ];
    const first = placePieces(before, [], id);
    const after = placePieces(
      [
        { square: "g1", type: "k", color: "w" },
        { square: "f1", type: "r", color: "w" },
      ],
      first,
      id,
    );
    expect(after.find((p) => p.type === "k")?.id).toBe(first.find((p) => p.type === "k")?.id);
    expect(after.find((p) => p.type === "r")?.id).toBe(first.find((p) => p.type === "r")?.id);
  });
});
