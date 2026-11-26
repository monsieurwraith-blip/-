import { useCallback, useEffect, useState } from "react";

import { useSettings } from "@/features/settings/SettingsProvider";
import {
  EMPTY_DRAWINGS,
  eraseAtSquare,
  loadSavedDrawings,
  removeArrowAtIndex,
  saveDrawingsForPosition,
  toggleArrowInState,
  toggleHighlightInState,
  type BoardDrawings,
  type DrawColorId,
  type DrawToolId,
} from "@/lib/chess/drawings";
import type { Square } from "@/lib/chess/types";

export function useBoardDrawings(positionKey: string) {
  const { settings, updateBoard } = useSettings();
  const autoClear = settings.board.autoClearDrawings;

  const [drawings, setDrawings] = useState<BoardDrawings>(EMPTY_DRAWINGS);
  const [history, setHistory] = useState<BoardDrawings[]>([]);
  const [tool, setTool] = useState<DrawToolId>("move");
  const [color, setColor] = useState<DrawColorId>("green");
  const [drawingsVisible, setDrawingsVisible] = useState(true);

  useEffect(() => {
    setHistory([]);
    if (autoClear) {
      setDrawings(EMPTY_DRAWINGS);
    } else {
      setDrawings(loadSavedDrawings(positionKey));
    }
  }, [positionKey, autoClear]);

  const applyChange = useCallback(
    (updater: (prev: BoardDrawings) => BoardDrawings) => {
      setDrawings((prev) => {
        const next = updater(prev);
        if (next === prev) return prev;
        setHistory((h) => [...h.slice(-29), prev]);
        if (!autoClear) {
          saveDrawingsForPosition(positionKey, next);
        }
        return next;
      });
    },
    [autoClear, positionKey],
  );

  const toggleArrow = useCallback(
    (from: Square, to: Square) => {
      setDrawingsVisible(true);
      applyChange((prev) => toggleArrowInState(prev, from, to, color));
    },
    [applyChange, color],
  );

  const toggleHighlight = useCallback(
    (square: Square) => {
      setDrawingsVisible(true);
      applyChange((prev) => toggleHighlightInState(prev, square, color));
    },
    [applyChange, color],
  );

  const removeArrow = useCallback(
    (index: number) => {
      applyChange((prev) => removeArrowAtIndex(prev, index));
    },
    [applyChange],
  );

  const eraseSquare = useCallback(
    (square: Square) => {
      applyChange((prev) => eraseAtSquare(prev, square));
    },
    [applyChange],
  );

  const undoDrawing = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const previous = h[h.length - 1]!;
      setDrawings(previous);
      if (!autoClear) saveDrawingsForPosition(positionKey, previous);
      return h.slice(0, -1);
    });
  }, [autoClear, positionKey]);

  const clearDrawings = useCallback(() => {
    setDrawings((prev) => {
      if (prev.arrows.length === 0 && prev.highlights.length === 0) return prev;
      setHistory((h) => [...h.slice(-29), prev]);
      if (!autoClear) saveDrawingsForPosition(positionKey, EMPTY_DRAWINGS);
      return EMPTY_DRAWINGS;
    });
  }, [autoClear, positionKey]);

  const toggleVisible = useCallback(() => {
    setDrawingsVisible((v) => !v);
  }, []);

  const setAutoClear = useCallback(
    (enabled: boolean) => {
      updateBoard({ autoClearDrawings: enabled });
    },
    [updateBoard],
  );

  const hasDrawings = drawings.arrows.length > 0 || drawings.highlights.length > 0;

  return {
    drawings,
    tool,
    setTool,
    color,
    setColor,
    drawingsVisible,
    toggleVisible,
    autoClear,
    setAutoClear,
    hasDrawings,
    canUndo: history.length > 0,
    toggleArrow,
    toggleHighlight,
    removeArrow,
    eraseSquare,
    undoDrawing,
    clearDrawings,
  };
}
