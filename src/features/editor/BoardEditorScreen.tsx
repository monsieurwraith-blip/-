import { Chess } from "chess.js";
import {
  BarChart3,
  Check,
  Copy,
  Eraser,
  FlipVertical2,
  Hand,
  Play,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useMemo, useState, type CSSProperties } from "react";

import { PieceImage } from "@/components/chess/PieceImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSettings } from "@/features/settings/SettingsProvider";
import { resolveBoardColors } from "@/lib/appearance/themes";
import { ENDGAME_DRILLS } from "@/lib/chess/endgameDrills";
import type { Color, PieceSymbol, Square } from "@/lib/chess/types";
import { cn } from "@/lib/utils";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const RANKS = [8, 7, 6, 5, 4, 3, 2, 1] as const;
const PIECE_TYPES: readonly PieceSymbol[] = ["k", "q", "r", "b", "n", "p"];

type PlacedPiece = { color: Color; type: PieceSymbol };
type BoardGrid = Record<string, PlacedPiece>;
type EditorTool =
  { kind: "move" } | { kind: "erase" } | { kind: "place"; color: Color; type: PieceSymbol };
type CastlingFlags = { K: boolean; Q: boolean; k: boolean; q: boolean };

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const PRESETS: { id: string; label: string; fen: string }[] = [
  { id: "start", label: "Начальная позиция", fen: START_FEN },
  ...ENDGAME_DRILLS.slice(0, 5).map((d) => ({
    id: d.id,
    label: d.title,
    fen: d.fen,
  })),
];

function parseFenState(rawFen: string): {
  grid: BoardGrid;
  turn: Color;
  castling: CastlingFlags;
} | null {
  const parts = rawFen.trim().split(/\s+/);
  const placement = parts[0];
  if (!placement) return null;
  const rows = placement.split("/");
  if (rows.length !== 8) return null;

  const grid: BoardGrid = {};
  for (let r = 0; r < 8; r++) {
    const rankNum = 8 - r;
    const rowStr = rows[r]!;
    let fileIdx = 0;
    for (const ch of rowStr) {
      if (ch >= "1" && ch <= "8") {
        fileIdx += Number(ch);
      } else {
        const lower = ch.toLowerCase();
        if (!["k", "q", "r", "b", "n", "p"].includes(lower)) return null;
        if (fileIdx >= 8) return null;
        const sq = `${FILES[fileIdx]}${rankNum}`;
        grid[sq] = {
          color: ch === ch.toUpperCase() ? "w" : "b",
          type: lower as PieceSymbol,
        };
        fileIdx += 1;
      }
    }
    if (fileIdx !== 8) return null;
  }

  const turn: Color = parts[1] === "b" ? "b" : "w";
  const cStr = parts[2] ?? "-";
  return {
    grid,
    turn,
    castling: {
      K: cStr.includes("K"),
      Q: cStr.includes("Q"),
      k: cStr.includes("k"),
      q: cStr.includes("q"),
    },
  };
}

function buildFenFromState(grid: BoardGrid, turn: Color, castling: CastlingFlags): string {
  const rows: string[] = [];
  for (const rank of RANKS) {
    let row = "";
    let empty = 0;
    for (const file of FILES) {
      const piece = grid[`${file}${rank}`];
      if (!piece) {
        empty += 1;
      } else {
        if (empty > 0) {
          row += String(empty);
          empty = 0;
        }
        row += piece.color === "w" ? piece.type.toUpperCase() : piece.type;
      }
    }
    if (empty > 0) row += String(empty);
    rows.push(row);
  }

  let c = "";
  if (
    castling.K &&
    grid["e1"]?.color === "w" &&
    grid["e1"]?.type === "k" &&
    grid["h1"]?.type === "r"
  )
    c += "K";
  if (
    castling.Q &&
    grid["e1"]?.color === "w" &&
    grid["e1"]?.type === "k" &&
    grid["a1"]?.type === "r"
  )
    c += "Q";
  if (
    castling.k &&
    grid["e8"]?.color === "b" &&
    grid["e8"]?.type === "k" &&
    grid["h8"]?.type === "r"
  )
    c += "k";
  if (
    castling.q &&
    grid["e8"]?.color === "b" &&
    grid["e8"]?.type === "k" &&
    grid["a8"]?.type === "r"
  )
    c += "q";
  if (!c) c = "-";

  return `${rows.join("/")} ${turn} ${c} - 0 1`;
}

function validateEditorPosition(
  grid: BoardGrid,
  fen: string,
): { ok: true; fen: string } | { ok: false; error: string } {
  let wk = 0;
  let bk = 0;
  for (const [sq, p] of Object.entries(grid)) {
    if (p.type === "k") {
      if (p.color === "w") wk += 1;
      else bk += 1;
    }
    if (p.type === "p" && (sq.endsWith("1") || sq.endsWith("8"))) {
      return { ok: false, error: "Пешки не могут стоять на 1-й или 8-й горизонтали." };
    }
  }
  if (wk !== 1 || bk !== 1) {
    return {
      ok: false,
      error: "На доске должно быть ровно по одному белому и одному чёрному королю.",
    };
  }
  try {
    const chess = new Chess(fen);
    return { ok: true, fen: chess.fen() };
  } catch {
    return {
      ok: false,
      error: "Позиция нелегальна (проверьте, не находится ли король неходящей стороны под боем).",
    };
  }
}

interface BoardEditorScreenProps {
  onPlayFen: (fen: string, label: string) => void;
  onAnalyzeFen: (fen: string) => void;
}

export function BoardEditorScreen({ onPlayFen, onAnalyzeFen }: BoardEditorScreenProps) {
  const { settings, preview } = useSettings();
  const colors = resolveBoardColors(settings.boardTheme, settings.customBoard);

  const initial = useMemo(() => parseFenState(START_FEN)!, []);
  const [grid, setGrid] = useState<BoardGrid>(initial.grid);
  const [turn, setTurn] = useState<Color>(initial.turn);
  const [castling, setCastling] = useState<CastlingFlags>(initial.castling);
  const [orientation, setOrientation] = useState<Color>("w");
  const [tool, setTool] = useState<EditorTool>({ kind: "place", color: "w", type: "q" });
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [fenDraft, setFenDraft] = useState(START_FEN);
  const [fenApplyError, setFenApplyError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const currentFen = useMemo(() => buildFenFromState(grid, turn, castling), [castling, grid, turn]);
  const validation = useMemo(() => validateEditorPosition(grid, currentFen), [currentFen, grid]);

  const applyGridUpdate = (nextGrid: BoardGrid, nextTurn = turn, nextCastling = castling) => {
    setGrid(nextGrid);
    setTurn(nextTurn);
    setCastling(nextCastling);
    setFenDraft(buildFenFromState(nextGrid, nextTurn, nextCastling));
    setFenApplyError(null);
  };

  const handleLoadFen = (raw: string) => {
    const parsed = parseFenState(raw);
    if (!parsed) {
      setFenApplyError("Неверный формат FEN. Ожидается строка из 8 рядов доски.");
      return;
    }
    preview("menu");
    setSelectedSquare(null);
    applyGridUpdate(parsed.grid, parsed.turn, parsed.castling);
  };

  const handleSquareClick = (sq: Square) => {
    if (tool.kind === "erase") {
      if (!grid[sq]) return;
      preview("menu");
      const next = { ...grid };
      delete next[sq];
      applyGridUpdate(next);
      return;
    }

    if (tool.kind === "move") {
      if (!selectedSquare) {
        if (grid[sq]) setSelectedSquare(sq);
        return;
      }
      if (selectedSquare === sq) {
        setSelectedSquare(null);
        return;
      }
      const moving = grid[selectedSquare];
      if (!moving) {
        setSelectedSquare(null);
        return;
      }
      preview("move");
      const next = { ...grid };
      delete next[selectedSquare];
      next[sq] = moving;
      setSelectedSquare(null);
      applyGridUpdate(next);
      return;
    }

    preview("move");
    const existing = grid[sq];
    const next = { ...grid };
    if (existing && existing.color === tool.color && existing.type === tool.type) {
      delete next[sq];
    } else {
      next[sq] = { color: tool.color, type: tool.type };
    }
    applyGridUpdate(next);
  };

  const displayRanks =
    orientation === "w" ? RANKS : ([...RANKS].reverse() as unknown as typeof RANKS);
  const displayFiles =
    orientation === "w" ? FILES : ([...FILES].reverse() as unknown as typeof FILES);

  const boardStyle = {
    "--board-light": colors.light,
    "--board-dark": colors.dark,
  } as CSSProperties;

  return (
    <main className="mx-auto w-full max-w-[1440px] flex-1 px-3 pb-12 pt-4 sm:px-6 lg:pt-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow text-primary">Конструктор позиций PROCHESS</p>
          <h1 className="mt-0.5 font-display text-2xl sm:text-3xl">Редактор доски</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="panel"
            size="sm"
            onClick={() => setOrientation((o) => (o === "w" ? "b" : "w"))}
          >
            <FlipVertical2 className="size-3.5" /> Перевернуть
          </Button>
          <Button type="button" variant="panel" size="sm" onClick={() => handleLoadFen(START_FEN)}>
            <RotateCcw className="size-3.5" /> Начальная
          </Button>
          <Button
            type="button"
            variant="panel"
            size="sm"
            onClick={() => {
              preview("menu");
              setSelectedSquare(null);
              applyGridUpdate({}, "w", { K: false, Q: false, k: false, q: false });
            }}
          >
            <Trash2 className="size-3.5" /> Очистить доску
          </Button>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_27rem]">
        {/* Interactive 8x8 Editor Board */}
        <section className="mx-auto w-full max-w-[min(100%,calc(100svh-10rem))]">
          <div
            className="grid aspect-square w-full grid-cols-8 grid-rows-8 overflow-hidden rounded-xl border border-border shadow-2xl"
            style={boardStyle}
            role="group"
            aria-label="Редактор шахматной доски"
          >
            {displayRanks.map((rank) =>
              displayFiles.map((file) => {
                const sq = `${file}${rank}` as Square;
                const fileIdx = FILES.indexOf(file);
                const isLight = (fileIdx + rank) % 2 === 1;
                const piece = grid[sq];
                const isSelected = selectedSquare === sq;
                return (
                  <button
                    key={sq}
                    type="button"
                    onClick={() => handleSquareClick(sq)}
                    className={cn(
                      "relative flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      isLight ? "sq-light" : "sq-dark",
                      isSelected && "ring-2 ring-inset ring-primary",
                    )}
                    aria-label={`Клетка ${sq}`}
                  >
                    {piece && (
                      <PieceImage
                        color={piece.color}
                        type={piece.type}
                        className="size-[84%] select-none"
                      />
                    )}
                    {file === displayFiles[0] && (
                      <span className="pointer-events-none absolute left-1 top-0.5 font-mono text-[10px] font-semibold opacity-65">
                        {rank}
                      </span>
                    )}
                    {rank === displayRanks[displayRanks.length - 1] && (
                      <span className="pointer-events-none absolute bottom-0.5 right-1 font-mono text-[10px] font-semibold opacity-65">
                        {file}
                      </span>
                    )}
                  </button>
                );
              }),
            )}
          </div>
        </section>

        {/* Controls Panel */}
        <aside className="panel space-y-4 p-4 sm:p-5">
          {/* Palette */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="eyebrow text-primary">Палитра фигур и инструменты</p>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setTool({ kind: "move" });
                    setSelectedSquare(null);
                  }}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium",
                    tool.kind === "move"
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-secondary text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Hand className="size-3.5" /> Двигать
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTool({ kind: "erase" });
                    setSelectedSquare(null);
                  }}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium",
                    tool.kind === "erase"
                      ? "border-destructive bg-destructive/15 text-destructive"
                      : "border-border bg-secondary text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Eraser className="size-3.5" /> Ластик
                </button>
              </div>
            </div>

            {(["w", "b"] as const).map((color) => (
              <div key={color} className="grid grid-cols-6 gap-1.5">
                {PIECE_TYPES.map((type) => {
                  const active =
                    tool.kind === "place" && tool.color === color && tool.type === type;
                  return (
                    <button
                      key={`${color}-${type}`}
                      type="button"
                      onClick={() => {
                        setSelectedSquare(null);
                        setTool({ kind: "place", color, type });
                      }}
                      className={cn(
                        "grid aspect-square place-items-center rounded-lg border transition-colors",
                        active
                          ? "border-primary bg-primary/20"
                          : "border-border bg-secondary/50 hover:border-primary/45",
                      )}
                      aria-label={`${color === "w" ? "Белая" : "Чёрная"} фигура ${type}`}
                    >
                      <PieceImage color={color} type={type} className="size-8" />
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Turn & Castling */}
          <div className="grid grid-cols-2 gap-3 border-t border-border/70 pt-3 text-xs">
            <div className="space-y-1.5">
              <p className="text-muted-foreground">Очередь хода</p>
              <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-secondary p-0.5">
                {(
                  [
                    { id: "w", label: "Белые" },
                    { id: "b", label: "Чёрные" },
                  ] as const
                ).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => applyGridUpdate(grid, s.id, castling)}
                    className={cn(
                      "rounded-md px-2 py-1 font-medium transition-colors",
                      turn === s.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-muted-foreground">Рокировки</p>
              <div className="grid grid-cols-2 gap-1">
                {(["K", "Q", "k", "q"] as const).map((flag) => (
                  <label
                    key={flag}
                    className="flex cursor-pointer items-center gap-1.5 rounded border border-border bg-secondary/50 px-2 py-1 text-[11px]"
                  >
                    <input
                      type="checkbox"
                      checked={castling[flag]}
                      onChange={(e) =>
                        applyGridUpdate(grid, turn, { ...castling, [flag]: e.target.checked })
                      }
                      className="accent-primary"
                    />
                    <span className="font-mono">
                      {flag === "K"
                        ? "Б 0-0"
                        : flag === "Q"
                          ? "Б 0-0-0"
                          : flag === "k"
                            ? "Ч 0-0"
                            : "Ч 0-0-0"}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Presets */}
          <div className="space-y-1.5 border-t border-border/70 pt-3">
            <p className="text-xs text-muted-foreground">Быстрые шаблоны</p>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleLoadFen(p.fen)}
                  className="rounded-md border border-border bg-secondary/50 px-2.5 py-1 text-[11px] text-foreground hover:border-primary/50"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* FEN field */}
          <div className="space-y-1.5 border-t border-border/70 pt-3">
            <label htmlFor="editor-fen-input" className="text-xs text-muted-foreground">
              Позиция в формате FEN
            </label>
            <div className="flex gap-1.5">
              <Input
                id="editor-fen-input"
                value={fenDraft}
                onChange={(e) => setFenDraft(e.target.value)}
                className="h-8 bg-secondary/70 font-mono text-[11px]"
              />
              <Button
                type="button"
                variant="panel"
                size="sm"
                onClick={() => handleLoadFen(fenDraft)}
              >
                Применить
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                onClick={() => {
                  void navigator.clipboard?.writeText(currentFen);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1400);
                }}
                aria-label="Копировать FEN"
              >
                {copied ? (
                  <Check className="size-3.5 text-primary" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </Button>
            </div>
            {fenApplyError && <p className="text-xs text-destructive">{fenApplyError}</p>}
          </div>

          {/* Validation + Launch */}
          {!validation.ok && (
            <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {validation.error}
            </p>
          )}

          <div className="grid grid-cols-1 gap-2 border-t border-border/70 pt-3 sm:grid-cols-2">
            <Button
              type="button"
              variant="ivory"
              disabled={!validation.ok}
              onClick={() => {
                if (!validation.ok) return;
                preview("menu");
                onPlayFen(validation.fen, "Позиция из редактора");
              }}
            >
              <Play className="size-4 fill-current" />
              Играть с позиции
            </Button>
            <Button
              type="button"
              variant="panel"
              disabled={!validation.ok}
              onClick={() => {
                if (!validation.ok) return;
                preview("menu");
                onAnalyzeFen(validation.fen);
              }}
            >
              <BarChart3 className="size-4 text-primary" />
              Анализировать
            </Button>
          </div>
        </aside>
      </div>
    </main>
  );
}
