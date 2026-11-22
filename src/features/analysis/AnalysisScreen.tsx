import { Chess, type Move } from "chess.js";
import { Cpu, FlipVertical2, Loader2, RotateCcw, Sparkles, Undo2, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ChessBoard, type BoardArrow } from "@/components/chess/ChessBoard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnalyticsPanel } from "@/features/play/components/AnalyticsPanel";
import { EvalBar } from "@/features/play/components/EvalBar";
import { MoveList } from "@/features/play/components/MoveList";
import { useSettings } from "@/features/settings/SettingsProvider";
import { useStockfish } from "@/hooks/useStockfish";
import type { BoardCell } from "@/lib/chess/pieceIds";
import type { BoardMove, Color, Square, SquarePair } from "@/lib/chess/types";
import { parseUciMove, type EngineInfo, type EngineScore } from "@/lib/chess/uci";
import { chartPawns, formatEval, toWhitePov } from "@/lib/coach/evaluation";
import type { EvalPoint } from "@/lib/coach/report";
import { playUci, pvToSan } from "@/lib/coach/tactics";
import { STOCKFISH_BUILD_LABEL } from "@/lib/engine/config";
import { playClip } from "@/lib/sound/synth";
import { effectiveSoundVolume, soundAllowed } from "@/lib/settings/settings";
import { cn } from "@/lib/utils";

interface BoardViewState {
  fen: string;
  turn: Color;
  inCheck: boolean;
  cells: BoardCell[];
  legalMoves: Move[];
  checkSquare: Square | null;
  history: Move[];
}

function readBoardState(
  chess: Chess,
  viewPly: number | null,
): {
  fullHistory: Move[];
  activeBoard: BoardViewState;
  lastMove: SquarePair | null;
  activePly: number;
} {
  const fullHistory = chess.history({ verbose: true });
  const targetPly =
    viewPly === null ? fullHistory.length : Math.max(0, Math.min(fullHistory.length, viewPly));
  const clone = new Chess();
  let last: Move | null = null;
  for (let i = 0; i < targetPly; i++) {
    const m = fullHistory[i];
    if (!m) break;
    last = clone.move({
      from: m.from,
      to: m.to,
      ...(m.promotion ? { promotion: m.promotion } : {}),
    });
  }
  // Support custom FEN bases when loaded directly.
  const targetChess = viewPly === null || targetPly === fullHistory.length ? chess : clone;

  const turn = targetChess.turn();
  const inCheck = targetChess.inCheck();
  const cells: BoardCell[] = [];
  let checkSquare: Square | null = null;
  for (const row of targetChess.board()) {
    for (const p of row) {
      if (!p) continue;
      cells.push({ square: p.square, type: p.type, color: p.color });
      if (inCheck && p.type === "k" && p.color === turn) checkSquare = p.square;
    }
  }
  const hist = targetChess.history({ verbose: true });
  const tail = hist[hist.length - 1] ?? last;
  return {
    fullHistory,
    activeBoard: {
      fen: targetChess.fen(),
      turn,
      inCheck,
      cells,
      legalMoves: targetChess.moves({ verbose: true }),
      checkSquare,
      history: hist,
    },
    lastMove: tail ? { from: tail.from, to: tail.to } : null,
    activePly: targetPly,
  };
}

/**
 * Dedicated ProChess Analysis Lab:
 * move both sides freely, load any FEN/PGN, navigate move history,
 * and run live MultiPV=3 Stockfish evaluation with best-move arrows.
 */
export function AnalysisScreen() {
  const chessRef = useRef(new Chess());
  const engine = useStockfish();
  const { settings } = useSettings();
  const [version, setVersion] = useState(0);
  const [viewPly, setViewPly] = useState<number | null>(null);
  const [orientation, setOrientation] = useState<Color>("w");
  const [fenDraft, setFenDraft] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<{
    fen: string;
    score: EngineScore;
    depth: number;
    lines: EngineInfo[];
    turn: Color;
  } | null>(null);
  const [evalPoints, setEvalPoints] = useState<EvalPoint[]>([]);

  const state = useMemo(() => {
    void version;
    return readBoardState(chessRef.current, viewPly);
  }, [version, viewPly]);

  const { fullHistory, activeBoard, lastMove, activePly } = state;

  const bump = useCallback(() => {
    setViewPly(null);
    setLoadError(null);
    setVersion((v) => v + 1);
  }, []);

  const handleMove = useCallback(
    (move: BoardMove): boolean => {
      // If inspecting an earlier ply, trim future moves to branch cleanly from there.
      if (viewPly !== null && viewPly < chessRef.current.history().length) {
        const trim = chessRef.current.history().length - viewPly;
        for (let i = 0; i < trim; i++) chessRef.current.undo();
      }
      try {
        const played = chessRef.current.move(move);
        if (!played) return false;
        const ev = played.isCapture() ? "capture" : chessRef.current.inCheck() ? "check" : "move";
        if (soundAllowed(settings.sound, ev)) {
          playClip(ev, effectiveSoundVolume(settings.sound));
        }
        bump();
        return true;
      } catch {
        return false;
      }
    },
    [bump, settings.sound, viewPly],
  );

  const handleUndo = useCallback(() => {
    if (chessRef.current.history().length === 0) return;
    chessRef.current.undo();
    bump();
  }, [bump]);

  const handleReset = useCallback(() => {
    chessRef.current = new Chess();
    setEvalPoints([]);
    setAnalysisResult(null);
    setFenDraft("");
    bump();
  }, [bump]);

  const handleLoadPosition = useCallback(() => {
    const raw = fenDraft.trim();
    if (!raw) return;
    const next = new Chess();
    try {
      if (raw.split(" ").length >= 4 && raw.includes("/")) {
        next.load(raw);
      } else {
        next.loadPgn(raw);
      }
      chessRef.current = next;
      setEvalPoints([]);
      setAnalysisResult(null);
      bump();
    } catch {
      setLoadError("Некорректный FEN или PGN. Проверьте формат записи.");
    }
  }, [bump, fenDraft]);

  // Run live Stockfish MultiPV=3 analysis whenever position changes.
  useEffect(() => {
    if (!engine.available) return;
    const targetFen = activeBoard.fen;
    const targetTurn = activeBoard.turn;
    const targetPly = activePly;
    let live = true;

    engine
      .search({
        purpose: "analysis",
        startFen: targetFen,
        moves: [],
        skillLevel: 20,
        depth: 16,
        movetimeMs: 1200,
        multiPv: 3,
      })
      .then((res) => {
        if (!live || res.cancelled) return;
        const primary = res.lines[0] ?? res.info;
        if (!primary?.score) return;
        const whiteScore = toWhitePov(primary.score, targetTurn);
        setAnalysisResult({
          fen: targetFen,
          score: whiteScore,
          depth: primary.depth,
          lines: res.lines.length > 0 ? res.lines : [primary],
          turn: targetTurn,
        });
        setEvalPoints((prev) => {
          const rest = prev.filter((p) => p.ply !== targetPly);
          return [...rest, { ply: targetPly, pawns: chartPawns(whiteScore) }].sort(
            (a, b) => a.ply - b.ply,
          );
        });
      })
      .catch(() => undefined);

    return () => {
      live = false;
      engine.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- search per position change
  }, [activeBoard.fen, activeBoard.turn, activePly, engine.available]);

  const bestArrows = useMemo<BoardArrow[]>(() => {
    if (!analysisResult || analysisResult.fen !== activeBoard.fen) return [];
    const topUci = analysisResult.lines[0]?.pv[0];
    const parsed = topUci ? parseUciMove(topUci) : null;
    return parsed ? [{ from: parsed.from, to: parsed.to, kind: "best" }] : [];
  }, [activeBoard.fen, analysisResult]);

  const linesDisplay = useMemo(() => {
    if (!analysisResult || analysisResult.fen !== activeBoard.fen) return [];
    return analysisResult.lines.slice(0, 3).map((line, i) => ({
      rank: i + 1,
      score: line.score ? formatEval(toWhitePov(line.score, analysisResult.turn)) : "—",
      sans: pvToSan(activeBoard.fen, line.pv, 6).join(" "),
      depth: line.depth,
    }));
  }, [activeBoard.fen, analysisResult]);

  const analyzing = engine.status === "thinking" && engine.purpose === "analysis";

  return (
    <main className="mx-auto w-full max-w-[1400px] flex-1 px-3 pb-12 pt-4 sm:px-6 lg:pt-8">
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_27rem] lg:gap-8">
        <section
          aria-label="Доска анализа"
          className="mx-auto flex w-full max-w-[min(100%,calc(100svh-8rem))] items-stretch gap-2.5 lg:max-w-[min(100%,calc(100svh-9.5rem))]"
        >
          <EvalBar
            score={analysisResult?.score ?? null}
            orientation={orientation}
            className="self-stretch"
          />
          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-2 font-mono">
                <Sparkles className="size-3.5 text-primary" aria-hidden />
                Режим анализа · Ход {activeBoard.turn === "w" ? "белых" : "чёрных"}
              </span>
              <span className="flex items-center gap-1.5 font-mono">
                {analyzing ? (
                  <>
                    <Loader2 className="size-3 animate-spin text-primary" aria-hidden />
                    <span className="text-primary">Stockfish is calculating...</span>
                  </>
                ) : (
                  <>
                    <Cpu className="size-3 text-primary" aria-hidden />
                    <span>{STOCKFISH_BUILD_LABEL}</span>
                  </>
                )}
              </span>
            </div>
            <ChessBoard
              cells={activeBoard.cells}
              positionKey={`${activeBoard.fen}-${activePly}`}
              orientation={orientation}
              movableColor={activeBoard.turn}
              legalMoves={activeBoard.legalMoves}
              showLegalMoves={settings.board.showLegalMoves}
              lastMove={lastMove}
              checkSquare={activeBoard.checkSquare}
              hint={null}
              arrows={bestArrows}
              onMove={handleMove}
            />
          </div>
        </section>

        <aside className="flex flex-col gap-4" aria-label="Панель анализа">
          <section className="panel space-y-3 p-4">
            <div className="flex items-center justify-between">
              <p className="eyebrow text-primary">Лаборатория анализа</p>
              <span className="font-mono text-xs text-muted-foreground">MultiPV 3</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant="panel"
                size="sm"
                onClick={handleUndo}
                disabled={fullHistory.length === 0}
              >
                <Undo2 className="size-3.5" /> Назад
              </Button>
              <Button
                type="button"
                variant="panel"
                size="sm"
                onClick={() => setOrientation((o) => (o === "w" ? "b" : "w"))}
              >
                <FlipVertical2 className="size-3.5" /> Перевернуть
              </Button>
              <Button type="button" variant="panel" size="sm" onClick={handleReset}>
                <RotateCcw className="size-3.5" /> Сбросить
              </Button>
            </div>

            <div className="space-y-1.5 border-t border-border/70 pt-3">
              <label htmlFor="analysis-fen-input" className="text-xs text-muted-foreground">
                Загрузить FEN или PGN
              </label>
              <div className="flex gap-2">
                <Input
                  id="analysis-fen-input"
                  value={fenDraft}
                  onChange={(e) => setFenDraft(e.target.value)}
                  placeholder="Вставьте FEN или ходы PGN…"
                  className="h-8 bg-secondary/70 font-mono text-xs"
                />
                <Button type="button" variant="ivory" size="sm" onClick={handleLoadPosition}>
                  <Upload className="size-3.5" /> Загрузить
                </Button>
              </div>
              {loadError && <p className="text-xs text-destructive">{loadError}</p>}
            </div>

            <div className="space-y-1.5 border-t border-border/70 pt-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Варианты движка</span>
                <span className="font-mono text-[11px] text-primary">
                  {analysisResult ? `Depth ${analysisResult.depth}` : "…"}
                </span>
              </div>
              {linesDisplay.length === 0 ? (
                <p className="py-2 text-xs text-muted-foreground">
                  {analyzing ? "Stockfish is calculating..." : "Оценка вариантов появится здесь."}
                </p>
              ) : (
                <ul className="space-y-1">
                  {linesDisplay.map((l) => (
                    <li
                      key={l.rank}
                      className="flex items-center gap-2 rounded-md border border-border/75 bg-secondary/45 px-2.5 py-1.5 font-mono text-xs"
                    >
                      <span
                        className={cn(
                          "w-11 shrink-0 font-semibold",
                          l.rank === 1 ? "text-primary" : "text-muted-foreground",
                        )}
                      >
                        {l.score}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-foreground/95">
                        {l.sans || "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <MoveList
            history={fullHistory}
            viewPly={viewPly}
            onInspectPly={(ply) => setViewPly(ply)}
            onStepHistory={(delta) => {
              const cur = viewPly ?? fullHistory.length;
              const next = Math.max(0, Math.min(fullHistory.length, cur + delta));
              setViewPly(next >= fullHistory.length ? null : next);
            }}
          />

          <AnalyticsPanel
            fen={activeBoard.fen}
            cells={activeBoard.cells}
            turn={activeBoard.turn}
            liveEval={analysisResult}
            evalHistory={evalPoints}
          />
        </aside>
      </div>
    </main>
  );
}
