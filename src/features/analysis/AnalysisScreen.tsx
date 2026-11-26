import { Chess, type Move } from "chess.js";
import {
  Activity,
  Check,
  Compass,
  Copy,
  Cpu,
  Download,
  FlipVertical2,
  Loader2,
  RotateCcw,
  Sparkles,
  Undo2,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { BoardDrawToolbar } from "@/components/chess/BoardDrawToolbar";
import { ChessBoard, type BoardArrow } from "@/components/chess/ChessBoard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnalyticsPanel } from "@/features/play/components/AnalyticsPanel";
import { EvalBar } from "@/features/play/components/EvalBar";
import { MoveList } from "@/features/play/components/MoveList";
import { useProgression } from "@/features/progression/ProgressionProvider";
import { useSettings } from "@/features/settings/SettingsProvider";
import { useBoardDrawings } from "@/hooks/useBoardDrawings";
import { useStockfish } from "@/hooks/useStockfish";
import { detectOpening } from "@/lib/chess/openings";
import type { BoardCell } from "@/lib/chess/pieceIds";
import type { BoardMove, Color, Square, SquarePair } from "@/lib/chess/types";
import { parseUciMove, type EngineInfo, type EngineScore } from "@/lib/chess/uci";
import {
  analyzePositionStructure,
  findTurningPoint,
  formatDecimalEval,
  type TurningPointResult,
} from "@/lib/coach/advisor";
import { chartPawns, formatEval, toWhitePov } from "@/lib/coach/evaluation";
import type { EvalPoint } from "@/lib/coach/report";
import { pvToSan } from "@/lib/coach/tactics";
import { STOCKFISH_BUILD_LABEL } from "@/lib/engine/config";
import { triggerFileDownload } from "@/lib/progression/storage";
import {
  ANALYSIS_DEPTHS,
  effectiveSoundVolume,
  soundAllowed,
  type AnalysisDepth,
} from "@/lib/settings/settings";
import { playClip } from "@/lib/sound/synth";
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

interface AnalysisScreenProps {
  initialInput?: string | null;
}

/**
 * Dedicated ProChess Analysis Lab:
 * move both sides freely, load any FEN/PGN, step through history,
 * view WDL probabilities, structural positional telemetry, MultiPV=3 lines,
 * turning point detector, and PGN export.
 */
export function AnalysisScreen({ initialInput = null }: AnalysisScreenProps) {
  const chessRef = useRef(new Chess());
  const engine = useStockfish();
  const { settings, update } = useSettings();
  const { completeErrorAnalysis } = useProgression();
  const [version, setVersion] = useState(0);
  const [viewPly, setViewPly] = useState<number | null>(null);
  const [orientation, setOrientation] = useState<Color>("w");
  const [fenDraft, setFenDraft] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<"fen" | "pgn" | null>(null);
  const [turningPoint, setTurningPoint] = useState<TurningPointResult | null>(null);
  const [analysisResult, setAnalysisResult] = useState<{
    fen: string;
    score: EngineScore;
    depth: number;
    lines: EngineInfo[];
    turn: Color;
  } | null>(null);
  const [evalPoints, setEvalPoints] = useState<EvalPoint[]>([]);
  const [loadedStartFen, setLoadedStartFen] = useState<string | null>(null);

  const loadRawIntoBoard = useCallback((rawText: string) => {
    const raw = rawText.trim();
    if (!raw) return false;
    const next = new Chess();
    try {
      const isFen = raw.split(" ").length >= 4 && raw.includes("/") && !raw.includes("\n1.");
      if (isFen) {
        next.load(raw);
        setLoadedStartFen(raw);
      } else {
        next.loadPgn(raw);
        setLoadedStartFen(null);
      }
      chessRef.current = next;
      setEvalPoints([]);
      setAnalysisResult(null);
      setTurningPoint(null);
      setViewPly(null);
      setLoadError(null);
      setVersion((v) => v + 1);
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (initialInput) {
      loadRawIntoBoard(initialInput);
    }
  }, [initialInput, loadRawIntoBoard]);

  const state = useMemo(() => {
    void version;
    return readBoardState(chessRef.current, viewPly);
  }, [version, viewPly]);

  const { fullHistory, activeBoard, lastMove, activePly } = state;
  const drawing = useBoardDrawings(`${activeBoard.fen}-${activePly}`);

  const bump = useCallback(() => {
    setViewPly(null);
    setLoadError(null);
    setTurningPoint(null);
    setVersion((v) => v + 1);
  }, []);

  const handleMove = useCallback(
    (move: BoardMove): boolean => {
      if (viewPly !== null && viewPly < chessRef.current.history().length) {
        const trim = chessRef.current.history().length - viewPly;
        for (let i = 0; i < trim; i++) chessRef.current.undo();
      }
      try {
        const played = chessRef.current.move(move);
        if (!played) return false;
        const ev = played.isCapture() ? "capture" : chessRef.current.inCheck() ? "check" : "move";
        if (soundAllowed(settings.sound, ev)) {
          playClip(ev, effectiveSoundVolume(settings.sound), settings.sound.soundPack);
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
    setLoadedStartFen(null);
    setEvalPoints([]);
    setAnalysisResult(null);
    setTurningPoint(null);
    setFenDraft("");
    bump();
  }, [bump]);

  const handleLoadPosition = useCallback(() => {
    const raw = fenDraft.trim();
    if (!raw) return;
    if (!loadRawIntoBoard(raw)) {
      setLoadError("Некорректный FEN или PGN. Проверьте формат записи.");
    }
  }, [fenDraft, loadRawIntoBoard]);

  // Live Stockfish MultiPV=3 analysis whenever position or target depth changes.
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
        depth: settings.engine.analysisDepth,
        movetimeMs: settings.engine.analysisDepth >= 20 ? 2200 : 1200,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- search per position or analysisDepth
  }, [
    activeBoard.fen,
    activeBoard.turn,
    activePly,
    engine.available,
    settings.engine.analysisDepth,
  ]);

  const opening = useMemo(
    () => detectOpening(fullHistory, loadedStartFen),
    [fullHistory, loadedStartFen],
  );

  const structure = useMemo(
    () => analyzePositionStructure(activeBoard.fen, analysisResult?.score ?? null),
    [activeBoard.fen, analysisResult?.score],
  );

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

  const handleFindTurningPoint = () => {
    const tp = findTurningPoint(
      evalPoints,
      fullHistory.map((m) => m.san),
    );
    if (!tp) {
      setTurningPoint({
        ply: activePly,
        moveNumber: Math.max(1, Math.ceil(activePly / 2)),
        swingPawns: 0,
        summary:
          "Просмотрите несколько ходов по списку истории, чтобы график оценок зафиксировал резкие перепады.",
      });
      return;
    }
    setTurningPoint(tp);
    setViewPly(tp.ply);
    completeErrorAnalysis();
  };

  const handleCopy = (kind: "fen" | "pgn") => {
    const val = kind === "fen" ? activeBoard.fen : chessRef.current.pgn() || activeBoard.fen;
    void navigator.clipboard?.writeText(val);
    setCopiedKey(kind);
    window.setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleDownloadPgn = () => {
    const pgn = chessRef.current.pgn() || `[FEN "${activeBoard.fen}"]\n`;
    triggerFileDownload(`prochess-analysis-${new Date().toISOString().slice(0, 10)}.pgn`, pgn);
  };

  const analyzing = engine.status === "thinking" && engine.purpose === "analysis";

  return (
    <main className="mx-auto w-full max-w-[1440px] flex-1 px-3 pb-12 pt-4 sm:px-6 lg:pt-6">
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_28rem] lg:gap-7">
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
                <strong className="rounded bg-secondary px-1.5 py-0.5 text-foreground">
                  {formatDecimalEval(analysisResult?.score ?? null)}
                </strong>
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

            <BoardDrawToolbar
              tool={drawing.tool}
              onToolChange={drawing.setTool}
              color={drawing.color}
              onColorChange={drawing.setColor}
              drawingsVisible={drawing.drawingsVisible}
              onToggleVisible={drawing.toggleVisible}
              autoClear={drawing.autoClear}
              onAutoClearChange={drawing.setAutoClear}
              hasDrawings={drawing.hasDrawings}
              canUndo={drawing.canUndo}
              onUndo={drawing.undoDrawing}
              onClear={drawing.clearDrawings}
              showThreats={settings.board.showThreatOverlay}
              onToggleThreats={() =>
                update({ board: { showThreatOverlay: !settings.board.showThreatOverlay } })
              }
              showCombos={settings.board.showComboOverlay}
              onToggleCombos={() =>
                update({ board: { showComboOverlay: !settings.board.showComboOverlay } })
              }
            />

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
              drawings={drawing.drawings}
              drawTool={drawing.tool}
              drawColor={drawing.color}
              drawingsVisible={drawing.drawingsVisible}
              onToggleArrow={drawing.toggleArrow}
              onToggleHighlight={drawing.toggleHighlight}
              onEraseAtSquare={drawing.eraseSquare}
              showThreats={settings.board.showThreatOverlay}
              showCombos={settings.board.showComboOverlay}
              onMove={handleMove}
            />

            {/* WDL Probability Bar */}
            <div className="panel space-y-1.5 p-3 text-xs">
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-foreground">Белые {structure.wdl.whiteWin}%</span>
                <span className="text-muted-foreground">Ничья {structure.wdl.draw}%</span>
                <span className="text-foreground">Чёрные {structure.wdl.blackWin}%</span>
              </div>
              <div className="flex h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="bg-ivory transition-all duration-300"
                  style={{ width: `${structure.wdl.whiteWin}%` }}
                />
                <div
                  className="bg-muted-foreground/45 transition-all duration-300"
                  style={{ width: `${structure.wdl.draw}%` }}
                />
                <div
                  className="bg-slate-800 transition-all duration-300"
                  style={{ width: `${structure.wdl.blackWin}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        <aside className="flex flex-col gap-3.5" aria-label="Панель анализа">
          <section className="panel space-y-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="eyebrow text-primary">Лаборатория анализа</p>
              <div className="flex items-center gap-1">
                {ANALYSIS_DEPTHS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => update({ engine: { analysisDepth: d as AnalysisDepth } })}
                    className={cn(
                      "rounded px-1.5 py-0.5 font-mono text-[11px] transition-colors",
                      settings.engine.analysisDepth === d
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:text-foreground",
                    )}
                    title={`Глубина анализа ${d}`}
                  >
                    D{d}
                  </button>
                ))}
              </div>
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
                <FlipVertical2 className="size-3.5" /> Доска
              </Button>
              <Button type="button" variant="panel" size="sm" onClick={handleReset}>
                <RotateCcw className="size-3.5" /> Сбросить
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => handleCopy("fen")}
              >
                {copiedKey === "fen" ? (
                  <Check className="size-3 text-primary" />
                ) : (
                  <Copy className="size-3" />
                )}
                FEN
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => handleCopy("pgn")}
              >
                {copiedKey === "pgn" ? (
                  <Check className="size-3 text-primary" />
                ) : (
                  <Copy className="size-3" />
                )}
                PGN
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={handleDownloadPgn}
              >
                <Download className="size-3 text-primary" /> Файл .pgn
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
                <span className="text-muted-foreground">Варианты движка (MultiPV 3)</span>
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

            {/* Deep Positional Metrics */}
            <div className="space-y-2 border-t border-border/70 pt-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                  <Activity className="size-3.5 text-primary" aria-hidden />
                  Структурный анализ позиции
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-[11px] text-primary"
                  onClick={handleFindTurningPoint}
                >
                  <Compass className="size-3" /> Переломный момент
                </Button>
              </div>

              {turningPoint && (
                <p className="rounded-md border border-primary/35 bg-primary/10 px-2.5 py-1.5 text-xs text-foreground">
                  {turningPoint.summary}
                </p>
              )}

              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <MetricBox
                  label="Материал"
                  value={`${structure.materialDelta > 0 ? "+" : ""}${structure.materialDelta}`}
                />
                <MetricBox
                  label="Контроль центра"
                  value={`Б ${structure.centerControl.w} : Ч ${structure.centerControl.b}`}
                />
                <MetricBox
                  label="Пространство"
                  value={`Б ${structure.spaceControl.w} : Ч ${structure.spaceControl.b}`}
                />
                <MetricBox
                  label="Активность (ходы)"
                  value={`Б ${structure.mobility.w} : Ч ${structure.mobility.b}`}
                />
                <MetricBox label="Король белых" value={structure.kingSafety.w} />
                <MetricBox label="Король чёрных" value={structure.kingSafety.b} />
                <MetricBox
                  label="Открытые линии"
                  value={
                    structure.openFiles.length > 0 ? structure.openFiles.join(", ") : "Закрыто"
                  }
                />
                <MetricBox
                  label="Слабые поля"
                  value={
                    structure.weakSquares.b[0] || structure.weakSquares.w[0]
                      ? `Б:${structure.weakSquares.w.join(",") || "—"} / Ч:${structure.weakSquares.b.join(",") || "—"}`
                      : "Сбалансировано"
                  }
                />
              </div>
            </div>
          </section>

          <MoveList
            history={fullHistory}
            viewPly={viewPly}
            openingLabel={opening?.label ?? null}
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

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/75 bg-secondary/40 px-2.5 py-1.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate font-mono text-xs font-medium text-foreground">{value}</p>
    </div>
  );
}
