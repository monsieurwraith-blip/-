import type { Move } from "chess.js";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";
import { useSettings } from "@/features/settings/SettingsProvider";
import { resolveBoardColors } from "@/lib/appearance/themes";
import {
  EMPTY_DRAWINGS,
  eraseAtSquare,
  toggleArrowInState,
  toggleHighlightInState,
  type BoardDrawings,
  type DrawColorId,
  type DrawToolId,
} from "@/lib/chess/drawings";
import { computeBoardTacticsOverlay } from "@/lib/chess/tacticsOverlay";
import { animationMs } from "@/lib/settings/settings";
import { isPremovePromotion, premoveTargetsForSquare } from "@/lib/chess/premove";
import { placePieces, type BoardCell, type PlacedPiece } from "@/lib/chess/pieceIds";
import { FILES, cellOf, isLightSquare, squareAt } from "@/lib/chess/squares";
import type { BoardMove, Color, PromotionPiece, Square, SquarePair } from "@/lib/chess/types";

import { PieceImage, pieceName } from "./PieceImage";
import { PromotionPicker } from "./PromotionPicker";

export type ArrowKind =
  | "hint"
  | "best"
  | "threat"
  | "played"
  | "idea"
  | "user-green"
  | "user-red"
  | "user-yellow"
  | "user-blue"
  | "user-purple";

export interface BoardArrow extends SquarePair {
  kind: ArrowKind;
  dashed?: boolean;
}

export interface ChessBoardProps {
  cells: readonly BoardCell[];
  /** Changes whenever the position changes (FEN); clears selection. */
  positionKey: string;
  orientation: Color;
  /** Color the user may move right now; null makes the board read-only. */
  movableColor: Color | null;
  /** Legal moves in the current position (from chess.js). */
  legalMoves: readonly Move[];
  showLegalMoves: boolean;
  lastMove: SquarePair | null;
  checkSquare: Square | null;
  hint: SquarePair | null;
  /** Extra arrows (coach: best move, opponent threat, idea playback). */
  arrows?: readonly BoardArrow[];
  /** Squares to highlight as dangerous (attacked piece, threatened king…). */
  dangerSquares?: readonly Square[];
  /** Hides piece art for Blindfold Chess mode. */
  hidePieces?: boolean;
  /** Controlled Chess.com-style drawings; falls back to local board state if omitted. */
  drawings?: BoardDrawings;
  drawTool?: DrawToolId;
  drawColor?: DrawColorId;
  drawingsVisible?: boolean;
  onToggleArrow?: (from: Square, to: Square) => void;
  onToggleHighlight?: (square: Square) => void;
  onEraseAtSquare?: (square: Square) => void;
  /** Shows threatened/hanging/protected pieces and attacker vectors. */
  showThreats?: boolean;
  /** Shows tactical combination candidates (forks, pins, skewers, checks). */
  showCombos?: boolean;
  /** Color allowed to queue premoves while waiting for the opponent. */
  premoveColor?: Color | null;
  /** Currently queued premove, highlighted in amber. */
  premove?: BoardMove | null;
  onPremove?: (move: BoardMove) => void;
  onCancelPremove?: () => void;
  onMove: (move: BoardMove) => boolean;
  children?: ReactNode;
}

interface DragState {
  from: Square;
  pointerId: number;
  startX: number;
  startY: number;
  wasSelected: boolean;
  active: boolean;
}

interface DrawGestureState {
  from: Square;
  to: Square;
  pointerId: number;
  mode: "arrow" | "highlight" | "eraser";
}

interface DragPoint {
  x: number;
  y: number;
  size: number;
}

const DRAG_THRESHOLD_PX = 4;

export function ChessBoard({
  cells,
  positionKey,
  orientation,
  movableColor,
  legalMoves,
  showLegalMoves,
  lastMove,
  checkSquare,
  hint,
  arrows = [],
  dangerSquares = [],
  hidePieces = false,
  drawings: controlledDrawings,
  drawTool = "move",
  drawColor = "green",
  drawingsVisible = true,
  onToggleArrow,
  onToggleHighlight,
  onEraseAtSquare,
  showThreats = false,
  showCombos = false,
  premoveColor = null,
  premove = null,
  onPremove,
  onCancelPremove,
  onMove,
  children,
}: ChessBoardProps) {
  const { settings } = useSettings();
  const display = settings.board;
  const colors = resolveBoardColors(settings.boardTheme, settings.customBoard);
  const boardRef = useRef<HTMLDivElement>(null);
  const squareRefs = useRef(new Map<Square, HTMLButtonElement>());
  const dragRef = useRef<DragState | null>(null);
  const drawDragRef = useRef<DrawGestureState | null>(null);
  const prevPieces = useRef<PlacedPiece[]>([]);
  const prevSquareCountRef = useRef<{ key: string; count: number }>({
    key: positionKey,
    count: cells.length,
  });
  const idCounter = useRef(0);

  const [selected, setSelected] = useState<Square | null>(null);
  const [dragPoint, setDragPoint] = useState<DragPoint | null>(null);
  const [dragFrom, setDragFrom] = useState<Square | null>(null);
  const [hover, setHover] = useState<Square | null>(null);
  const [promotion, setPromotion] = useState<SquarePair | null>(null);
  const [staticId, setStaticId] = useState<string | null>(null);
  const [focused, setFocused] = useState<Square>(orientation === "w" ? "e2" : "e7");
  const [localDrawings, setLocalDrawings] = useState<BoardDrawings>(EMPTY_DRAWINGS);
  const [drawPreview, setDrawPreview] = useState<{ from: Square; to: Square } | null>(null);
  const [captureFlashSq, setCaptureFlashSq] = useState<Square | null>(null);

  const activeDrawings = controlledDrawings ?? localDrawings;

  const pieces = useMemo(() => {
    const next = placePieces(cells, prevPieces.current, () => `p${idCounter.current++}`);
    prevPieces.current = next;
    return next;
  }, [cells]);

  const pieceAt = useMemo(() => {
    const map = new Map<Square, PlacedPiece>();
    for (const p of pieces) map.set(p.square, p);
    return map;
  }, [pieces]);

  const tacticsOverlay = useMemo(() => {
    if (!showThreats && !showCombos) return null;
    return computeBoardTacticsOverlay(positionKey);
  }, [positionKey, showThreats, showCombos]);

  // Capture flash pulse when piece count drops on a move
  useEffect(() => {
    const prev = prevSquareCountRef.current;
    if (prev.key !== positionKey) {
      if (cells.length < prev.count && lastMove?.to) {
        setCaptureFlashSq(lastMove.to);
        const timer = window.setTimeout(() => setCaptureFlashSq(null), 460);
        prevSquareCountRef.current = { key: positionKey, count: cells.length };
        return () => window.clearTimeout(timer);
      }
      prevSquareCountRef.current = { key: positionKey, count: cells.length };
    }
    return undefined;
  }, [cells.length, lastMove, positionKey]);

  // Auto-clear fallback local right-click drawings when autoClearDrawings is enabled
  useEffect(() => {
    if (display.autoClearDrawings && !controlledDrawings) {
      setLocalDrawings(EMPTY_DRAWINGS);
    }
  }, [positionKey, display.autoClearDrawings, controlledDrawings]);

  const clearInteraction = useCallback(() => {
    setSelected(null);
    setPromotion(null);
    setDragPoint(null);
    setDragFrom(null);
    setHover(null);
    setDrawPreview(null);
    dragRef.current = null;
    drawDragRef.current = null;
  }, []);

  useEffect(() => {
    clearInteraction();
  }, [positionKey, movableColor, clearInteraction]);

  // A dropped piece is placed without animation; re-enable transitions afterwards.
  useEffect(() => {
    if (!staticId) return;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setStaticId(null));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [positionKey, staticId]);

  const movesFrom = useCallback(
    (from: Square) => legalMoves.filter((m) => m.from === from),
    [legalMoves],
  );

  const isPremoveMode = movableColor === null && premoveColor !== null;
  const activeColor = movableColor ?? premoveColor;

  const premoveTargets = useMemo(() => {
    if (!isPremoveMode || !selected || !premoveColor) return new Set<Square>();
    const fen = positionKey.split("-ply")[0] ?? positionKey;
    try {
      return premoveTargetsForSquare(fen, selected, premoveColor);
    } catch {
      return new Set<Square>();
    }
  }, [isPremoveMode, positionKey, premoveColor, selected]);

  const targets = useMemo(() => {
    const map = new Map<Square, { capture: boolean; premove?: boolean }>();
    if (!selected) return map;
    if (isPremoveMode) {
      for (const sq of premoveTargets) {
        map.set(sq, { capture: pieceAt.has(sq), premove: true });
      }
      return map;
    }
    for (const m of movesFrom(selected)) map.set(m.to, { capture: m.isCapture() });
    return map;
  }, [isPremoveMode, movesFrom, pieceAt, premoveTargets, selected]);

  const canPick = useCallback(
    (square: Square) => activeColor !== null && pieceAt.get(square)?.color === activeColor,
    [activeColor, pieceAt],
  );

  /** Returns true if the move/premove was played or is waiting for a promotion choice. */
  const attemptMove = useCallback(
    (from: Square, to: Square, dropped: boolean): boolean => {
      if (isPremoveMode && premoveColor && onPremove) {
        if (!premoveTargets.has(to)) return false;
        const fen = positionKey.split("-ply")[0] ?? positionKey;
        const needsPromo = (() => {
          try {
            return isPremovePromotion(fen, from, to, premoveColor);
          } catch {
            return false;
          }
        })();
        onPremove({ from, to, ...(needsPromo ? { promotion: "q" } : {}) });
        setSelected(null);
        return true;
      }

      const candidates = movesFrom(from).filter((m) => m.to === to);
      if (candidates.length === 0) return false;
      if (candidates.some((m) => m.promotion)) {
        setPromotion({ from, to });
        return true;
      }
      const id = pieceAt.get(from)?.id ?? null;
      const ok = onMove({ from, to });
      if (ok && dropped && id) setStaticId(id);
      setSelected(null);
      return ok;
    },
    [
      isPremoveMode,
      movesFrom,
      onMove,
      onPremove,
      pieceAt,
      positionKey,
      premoveColor,
      premoveTargets,
    ],
  );

  const squareFromPoint = useCallback(
    (clientX: number, clientY: number): Square | null => {
      const el = boardRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) return null;
      const col = Math.min(7, Math.floor((x / rect.width) * 8));
      const row = Math.min(7, Math.floor((y / rect.height) * 8));
      return squareAt(row, col, orientation);
    },
    [orientation],
  );

  const activateSquare = useCallback(
    (square: Square) => {
      if (promotion) return;
      if (selected && square !== selected && targets.has(square)) {
        attemptMove(selected, square, false);
        return;
      }
      if (canPick(square)) setSelected(square === selected ? null : square);
      else setSelected(null);
    },
    [attemptMove, canPick, promotion, selected, targets],
  );

  const triggerToggleArrow = useCallback(
    (from: Square, to: Square) => {
      if (onToggleArrow) {
        onToggleArrow(from, to);
      } else {
        setLocalDrawings((prev) => toggleArrowInState(prev, from, to, drawColor));
      }
    },
    [drawColor, onToggleArrow],
  );

  const triggerToggleHighlight = useCallback(
    (square: Square) => {
      if (onToggleHighlight) {
        onToggleHighlight(square);
      } else {
        setLocalDrawings((prev) => toggleHighlightInState(prev, square, drawColor));
      }
    },
    [drawColor, onToggleHighlight],
  );

  const triggerEraseSquare = useCallback(
    (square: Square) => {
      if (onEraseAtSquare) {
        onEraseAtSquare(square);
      } else {
        setLocalDrawings((prev) => eraseAtSquare(prev, square));
      }
    },
    [onEraseAtSquare],
  );

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (promotion) return;
    const square = squareFromPoint(e.clientX, e.clientY);
    if (!square) return;

    // Right-click (button 2): Chess.com-style drag arrow or square highlight (works in ANY mode!)
    if (e.button === 2) {
      e.preventDefault();
      try {
        boardRef.current?.setPointerCapture(e.pointerId);
      } catch {
        // Synthetic pointer events in JSDOM may not support pointer capture
      }
      drawDragRef.current = {
        from: square,
        to: square,
        pointerId: e.pointerId,
        mode: "arrow",
      };
      setDrawPreview({ from: square, to: square });
      return;
    }

    if (e.pointerType === "mouse" && e.button !== 0) return;

    // Toolbar draw modes via left-click when tool !== "move"
    if (drawTool !== "move") {
      e.preventDefault();
      if (drawTool === "highlight") {
        triggerToggleHighlight(square);
        return;
      }
      if (drawTool === "eraser") {
        triggerEraseSquare(square);
        return;
      }
      if (drawTool === "arrow") {
        try {
          boardRef.current?.setPointerCapture(e.pointerId);
        } catch {
          // ignore
        }
        drawDragRef.current = {
          from: square,
          to: square,
          pointerId: e.pointerId,
          mode: "arrow",
        };
        setDrawPreview({ from: square, to: square });
        return;
      }
    }

    setFocused(square);
    if (selected && square !== selected && targets.has(square)) {
      e.preventDefault();
      attemptMove(selected, square, false);
      return;
    }
    if (premove && !canPick(square)) {
      onCancelPremove?.();
    }
    if (!canPick(square)) {
      setSelected(null);
      return;
    }
    e.preventDefault();
    try {
      boardRef.current?.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    dragRef.current = {
      from: square,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      wasSelected: selected === square,
      active: false,
    };
    setSelected(square);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const drawDrag = drawDragRef.current;
    if (drawDrag && drawDrag.pointerId === e.pointerId) {
      const sq = squareFromPoint(e.clientX, e.clientY);
      if (sq && sq !== drawDrag.to) {
        drawDrag.to = sq;
        setDrawPreview({ from: drawDrag.from, to: sq });
      }
      return;
    }

    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    if (!drag.active) {
      if (Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < DRAG_THRESHOLD_PX) return;
      drag.active = true;
      setDragFrom(drag.from);
    }
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDragPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top, size: rect.width / 8 });
    setHover(squareFromPoint(e.clientX, e.clientY));
  };

  const endDrag = (e: PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const drawDrag = drawDragRef.current;
    if (drawDrag && drawDrag.pointerId === e.pointerId) {
      drawDragRef.current = null;
      setDrawPreview(null);
      try {
        if (boardRef.current?.hasPointerCapture(e.pointerId)) {
          boardRef.current.releasePointerCapture(e.pointerId);
        }
      } catch {
        // ignore
      }
      if (!cancelled) {
        const endSq = squareFromPoint(e.clientX, e.clientY) ?? drawDrag.to;
        if (endSq === drawDrag.from) {
          triggerToggleHighlight(endSq);
        } else {
          triggerToggleArrow(drawDrag.from, endSq);
        }
      }
      return;
    }

    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragRef.current = null;
    try {
      if (boardRef.current?.hasPointerCapture(e.pointerId)) {
        boardRef.current.releasePointerCapture(e.pointerId);
      }
    } catch {
      // ignore
    }
    setDragPoint(null);
    setDragFrom(null);
    setHover(null);
    if (cancelled) return;
    const square = squareFromPoint(e.clientX, e.clientY);
    if (drag.active) {
      if (square && square !== drag.from) {
        if (!attemptMove(drag.from, square, true)) setSelected(null);
      }
    } else if (drag.wasSelected) {
      if (premove && drag.from === premove.from) {
        onCancelPremove?.();
      }
      setSelected(null);
    }
  };

  const onSquareKeyDown = (e: KeyboardEvent<HTMLButtonElement>, square: Square) => {
    const { row, col } = cellOf(square, orientation);
    const delta: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };
    const step = delta[e.key];
    if (step) {
      e.preventDefault();
      const next = squareAt(
        Math.max(0, Math.min(7, row + step[0])),
        Math.max(0, Math.min(7, col + step[1])),
        orientation,
      );
      setFocused(next);
      squareRefs.current.get(next)?.focus();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      activateSquare(square);
    } else if (e.key === "Escape") {
      setSelected(null);
      onCancelPremove?.();
    }
  };

  const onPromotionSelect = (piece: PromotionPiece) => {
    if (!promotion) return;
    onMove({ ...promotion, promotion: piece });
    setPromotion(null);
    setSelected(null);
  };

  const highlightBySquare = useMemo(() => {
    const map = new Map<Square, DrawColorId>();
    if (!drawingsVisible) return map;
    for (const h of activeDrawings.highlights) {
      map.set(h.square, h.color);
    }
    return map;
  }, [activeDrawings.highlights, drawingsVisible]);

  const combinedDangerSquares = useMemo(() => {
    if (!tacticsOverlay || !showThreats) return dangerSquares;
    return Array.from(new Set([...dangerSquares, ...tacticsOverlay.dangerSquares]));
  }, [dangerSquares, showThreats, tacticsOverlay]);

  const squares = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = squareAt(row, col, orientation);
      const light = isLightSquare(square);
      const piece = pieceAt.get(square);
      const target = targets.get(square);
      const drawHighlight = highlightBySquare.get(square);
      const isProtected = Boolean(showThreats && tacticsOverlay?.protectedSquares.includes(square));
      const isAttacker = Boolean(showThreats && tacticsOverlay?.attackerSquares.includes(square));
      const isLast =
        display.highlightLastMove &&
        lastMove !== null &&
        (lastMove.from === square || lastMove.to === square);
      const isHint = hint !== null && (hint.from === square || hint.to === square);
      const label = `${square}${piece ? `, ${piece.color === "w" ? "белый" : "чёрный"} ${pieceName(piece.type)}` : ""}${
        target ? (target.capture ? ", можно взять" : ", доступный ход") : ""
      }`;
      squares.push(
        <button
          key={square}
          type="button"
          ref={(el) => {
            if (el) squareRefs.current.set(square, el);
            else squareRefs.current.delete(square);
          }}
          tabIndex={square === focused ? 0 : -1}
          aria-label={label}
          aria-pressed={selected === square}
          onKeyDown={(e) => onSquareKeyDown(e, square)}
          onFocus={() => setFocused(square)}
          className={cn("sq", light ? "sq-light" : "sq-dark")}
        >
          {isLast && <span className="sq-layer sq-last" />}
          {drawHighlight && (
            <span
              className={`sq-layer sq-draw-${drawHighlight}`}
              data-testid={`drawn-highlight-${square}`}
            />
          )}
          {isProtected && !drawHighlight && <span className="sq-layer sq-protected" />}
          {isAttacker && !drawHighlight && <span className="sq-layer sq-attacker" />}
          {isHint && <span className="sq-layer sq-hint" />}
          {premove && (premove.from === square || premove.to === square) && (
            <span className="sq-layer sq-premove" data-testid={`premove-${square}`} />
          )}
          {combinedDangerSquares.includes(square) && (
            <span className="sq-layer sq-danger" data-testid="danger-square" />
          )}
          {captureFlashSq === square && <span className="sq-layer sq-capture-flash" />}
          {selected === square && <span className="sq-layer sq-selected" />}
          {display.highlightCheck && checkSquare === square && (
            <span className="sq-layer sq-check" />
          )}
          {hover === square && dragFrom !== null && <span className="sq-layer sq-hover" />}
          {target && showLegalMoves && (
            <span
              className={cn(
                "sq-layer",
                target.premove ? "sq-premove-dot" : target.capture ? "sq-capture" : "sq-dot",
              )}
            />
          )}
          {display.showCoordinates && col === 0 && (
            <span
              className="sq-coord left-[6%] top-[6%]"
              style={
                display.coordinateColor !== "auto" ? { color: display.coordinateColor } : undefined
              }
            >
              {square[1]}
            </span>
          )}
          {display.showCoordinates && row === 7 && (
            <span
              className="sq-coord bottom-[5%] right-[7%]"
              style={
                display.coordinateColor !== "auto" ? { color: display.coordinateColor } : undefined
              }
            >
              {FILES[square.charCodeAt(0) - 97]}
            </span>
          )}
        </button>,
      );
    }
  }

  const scaleFactor =
    display.boardScale === "compact" ? 0.92 : display.boardScale === "large" ? 1.06 : 1;

  return (
    <div
      className="board-shell mx-auto w-full"
      data-board-theme={settings.boardTheme}
      data-frame={display.frameStyle}
      data-animate={display.animations && display.animationLevel !== "off" ? "on" : "off"}
      style={
        {
          "--board-light": colors.light,
          "--board-dark": colors.dark,
          "--board-selected": `${display.selectedColor}8c`,
          "--board-check": display.checkColor,
          "--board-dot": `${display.legalMoveColor}99`,
          "--piece-move-ms": `${animationMs(display.animationSpeed)}ms`,
          maxWidth: scaleFactor !== 1 ? `${Math.round(scaleFactor * 100)}%` : undefined,
        } as CSSProperties
      }
    >
      <div
        ref={boardRef}
        role="group"
        aria-label="Шахматная доска"
        className={cn(
          "board-grid relative aspect-square w-full touch-none select-none",
          (movableColor !== null || premoveColor !== null) && !promotion && "cursor-pointer",
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => endDrag(e, false)}
        onPointerCancel={(e) => endDrag(e, true)}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="absolute inset-0 grid grid-cols-8 grid-rows-8">{squares}</div>

        {!hidePieces && (
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            {pieces.map((p) => {
              const { row, col } = cellOf(p.square, orientation);
              const dragging = dragFrom === p.square && dragPoint !== null;
              const style = dragging
                ? {
                    transform: `translate(${dragPoint.x - dragPoint.size / 2}px, ${dragPoint.y - dragPoint.size / 2}px) scale(1.08)`,
                  }
                : { transform: `translate(${col * 100}%, ${row * 100}%)` };
              return (
                <div
                  key={p.id}
                  className={cn(
                    "piece",
                    dragging && "piece-dragging",
                    staticId === p.id && "piece-static",
                    promotion?.from === p.square && "piece-lifted",
                  )}
                  style={style}
                >
                  <PieceImage color={p.color} type={p.type} className="animate-piece-in" />
                </div>
              );
            })}
          </div>
        )}

        {(() => {
          const allArrows: BoardArrow[] = [...arrows];
          if (hint) allArrows.push({ from: hint.from, to: hint.to, kind: "hint" });
          if (showThreats && tacticsOverlay) {
            for (const a of tacticsOverlay.threatArrows) {
              allArrows.push({ from: a.from, to: a.to, kind: `user-${a.color}`, dashed: true });
            }
          }
          if (showCombos && tacticsOverlay) {
            for (const a of tacticsOverlay.comboArrows) {
              allArrows.push({ from: a.from, to: a.to, kind: `user-${a.color}`, dashed: true });
            }
          }
          if (drawingsVisible) {
            for (const a of activeDrawings.arrows) {
              allArrows.push({ from: a.from, to: a.to, kind: `user-${a.color}` });
            }
          }
          if (drawPreview && drawPreview.from !== drawPreview.to) {
            allArrows.push({
              from: drawPreview.from,
              to: drawPreview.to,
              kind: `user-${drawColor}`,
              dashed: true,
            });
          }
          if (allArrows.length === 0) return null;
          return (
            <BoardArrows
              arrows={allArrows}
              orientation={orientation}
              arrowStyle={display.arrowStyle}
            />
          );
        })()}

        {promotion && movableColor && (
          <PromotionPicker
            color={movableColor}
            onSelect={onPromotionSelect}
            onCancel={() => {
              setPromotion(null);
              setSelected(null);
            }}
          />
        )}
        {children}
      </div>
    </div>
  );
}

const ARROW_KINDS: readonly ArrowKind[] = [
  "hint",
  "best",
  "threat",
  "played",
  "idea",
  "user-green",
  "user-red",
  "user-yellow",
  "user-blue",
  "user-purple",
];

/** Arrows from a piece to its target square, drawn above the pieces. */
function BoardArrows({
  arrows,
  orientation,
  arrowStyle,
}: {
  arrows: readonly BoardArrow[];
  orientation: Color;
  arrowStyle: "classic" | "sharp" | "glow";
}) {
  return (
    <svg
      className={cn(
        "hint-arrow pointer-events-none absolute inset-0 size-full",
        arrowStyle === "glow" && "drop-shadow-[0_0_4px_rgba(22,199,132,0.75)]",
      )}
      viewBox="0 0 8 8"
      aria-hidden
    >
      <defs>
        {ARROW_KINDS.map((kind) => (
          <marker
            key={kind}
            id={`arrow-head-${kind}`}
            markerWidth="3"
            markerHeight="3"
            refX="1.4"
            refY="1.5"
            orient="auto"
          >
            <path d="M0,0 L3,1.5 L0,3 Z" className={`arrow-head arrow-${kind}`} />
          </marker>
        ))}
      </defs>
      {arrows.map((arrow, index) => {
        const a = cellOf(arrow.from, orientation);
        const b = cellOf(arrow.to, orientation);
        const x1 = a.col + 0.5;
        const y1 = a.row + 0.5;
        const dx = b.col + 0.5 - x1;
        const dy = b.row + 0.5 - y1;
        const len = Math.hypot(dx, dy) || 1;
        // Stop short of the target center so the head sits inside the square.
        const shorten = 0.32;
        return (
          <line
            key={`${arrow.kind}-${arrow.from}-${arrow.to}-${index}`}
            data-testid={arrow.kind === "hint" ? "hint-arrow" : `arrow-${arrow.kind}`}
            x1={x1}
            y1={y1}
            x2={x1 + dx * ((len - shorten) / len)}
            y2={y1 + dy * ((len - shorten) / len)}
            className={`arrow-line arrow-${arrow.kind}`}
            strokeDasharray={arrow.dashed ? "0.24 0.14" : undefined}
            strokeWidth={arrowStyle === "sharp" ? 0.12 : arrow.kind === "played" ? 0.12 : 0.17}
            strokeLinecap={arrowStyle === "sharp" ? "butt" : "round"}
            markerEnd={`url(#arrow-head-${arrow.kind})`}
          />
        );
      })}
    </svg>
  );
}
