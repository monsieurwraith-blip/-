import { Chess } from "chess.js";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  Flame,
  Heart,
  Lightbulb,
  Play,
  RotateCcw,
  Sparkles,
  Timer,
  Trophy,
  XCircle,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CharacterCompanionCard } from "@/components/characters/CharacterCompanionCard";
import { BoardDrawToolbar } from "@/components/chess/BoardDrawToolbar";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { Button } from "@/components/ui/button";
import type { CoachEmotion } from "@/features/coach/coachMood";
import { useProgression } from "@/features/progression/ProgressionProvider";
import { useSettings } from "@/features/settings/SettingsProvider";
import { useBoardDrawings } from "@/hooks/useBoardDrawings";
import type { BoardCell } from "@/lib/chess/pieceIds";
import type { BoardMove, Color, Square, SquarePair } from "@/lib/chess/types";
import { parseUciMove, toUciMove } from "@/lib/chess/uci";
import { playUci } from "@/lib/coach/tactics";
import {
  ALL_LOCAL_PUZZLES,
  PUZZLE_CATEGORIES,
  PUZZLE_TIERS,
  explainWrongPuzzleMove,
  filterPuzzles,
  playerMoveCount,
  puzzleTierForRating,
  type PuzzleDifficultyTierId,
  type PuzzleGroup,
} from "@/lib/puzzles/puzzleLibrary";
import { cn } from "@/lib/utils";

type PuzzleArenaMode = "classic" | "survival" | "rush";
type RushPhase = "ready" | "running" | "finished";

const RUSH_DURATION_SEC = 180;
const RUSH_QUEUE = [...ALL_LOCAL_PUZZLES].sort((a, b) => a.rating - b.rating);

function formatTimer(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function extractState(chess: Chess) {
  const inCheck = chess.inCheck();
  const turn = chess.turn();
  const cells: BoardCell[] = [];
  let checkSquare: Square | null = null;
  for (const row of chess.board()) {
    for (const p of row) {
      if (!p) continue;
      cells.push({ square: p.square, type: p.type, color: p.color });
      if (inCheck && p.type === "k" && p.color === turn) checkSquare = p.square;
    }
  }
  const hist = chess.history({ verbose: true });
  const tail = hist[hist.length - 1];
  return {
    fen: chess.fen(),
    turn,
    cells,
    legalMoves: chess.moves({ verbose: true }),
    checkSquare,
    lastMove: tail ? ({ from: tail.from, to: tail.to } as SquarePair) : null,
  };
}

export function PuzzlesScreen() {
  const { settings, play, updateBoard } = useSettings();
  const { progression, comboBadge, completePuzzle, recordPuzzleRushScore } = useProgression();

  const [mode, setMode] = useState<PuzzleArenaMode>("classic");
  const [groupFilter, setGroupFilter] = useState<PuzzleGroup | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [tierFilter, setTierFilter] = useState<PuzzleDifficultyTierId | "all">("all");

  const [lives, setLives] = useState(3);
  const [sessionRight, setSessionRight] = useState(0);
  const [sessionWrong, setSessionWrong] = useState(0);

  // Puzzle Rush state
  const [rushPhase, setRushPhase] = useState<RushPhase>("ready");
  const [rushSecondsLeft, setRushSecondsLeft] = useState(RUSH_DURATION_SEC);
  const [rushLives, setRushLives] = useState(3);
  const [rushScore, setRushScore] = useState(0);
  const [rushWrong, setRushWrong] = useState(0);
  const [rushIndex, setRushIndex] = useState(0);
  const rushScoreRef = useRef(0);
  const rushRecordedRef = useRef(false);

  const [index, setIndex] = useState(0);
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<"playing" | "wrong" | "solved" | "failed" | "shown">(
    "playing",
  );
  const [wrongExplanation, setWrongExplanation] = useState<string>("");
  const [eloFeedback, setEloFeedback] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [version, setVersion] = useState(0);

  const isRush = mode === "rush";
  const survivalMode = mode === "survival";

  const filteredPuzzles = useMemo(() => {
    const list = filterPuzzles({
      group: groupFilter,
      category: categoryFilter,
      tier: tierFilter,
    });
    return list.length > 0 ? list : ALL_LOCAL_PUZZLES;
  }, [groupFilter, categoryFilter, tierFilter]);

  const activePool = isRush ? RUSH_QUEUE : filteredPuzzles;
  const safeIndex = (isRush ? rushIndex : index) % activePool.length;
  const puzzle = activePool[safeIndex]!;
  const tierMeta = puzzleTierForRating(puzzle.rating);
  const chessRef = useRef(new Chess(puzzle.fen));
  const solutionTimersRef = useRef<number[]>([]);
  const failedThisPuzzleRef = useRef(false);

  const clearSolutionTimers = useCallback(() => {
    for (const id of solutionTimersRef.current) {
      window.clearTimeout(id);
    }
    solutionTimersRef.current = [];
  }, []);

  const resetPuzzle = useCallback(
    (nextIndex = safeIndex) => {
      clearSolutionTimers();
      const target = activePool[nextIndex % activePool.length]!;
      chessRef.current = new Chess(target.fen);
      failedThisPuzzleRef.current = false;
      setStep(0);
      setStatus("playing");
      setWrongExplanation("");
      setEloFeedback(null);
      setShowHint(false);
      setVersion((v) => v + 1);
    },
    [activePool, clearSolutionTimers, safeIndex],
  );

  useEffect(() => {
    resetPuzzle(safeIndex);
    return () => clearSolutionTimers();
  }, [safeIndex, mode, resetPuzzle, clearSolutionTimers]);

  const finishRush = useCallback(() => {
    clearSolutionTimers();
    setRushPhase("finished");
    if (!rushRecordedRef.current) {
      rushRecordedRef.current = true;
      recordPuzzleRushScore(rushScoreRef.current);
      play("gameEnd");
    }
  }, [clearSolutionTimers, play, recordPuzzleRushScore]);

  useEffect(() => {
    if (!isRush || rushPhase !== "running") return;
    const id = window.setInterval(() => {
      setRushSecondsLeft((prev) => {
        if (prev <= 1) {
          finishRush();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [finishRush, isRush, rushPhase]);

  const startRush = useCallback(() => {
    clearSolutionTimers();
    rushScoreRef.current = 0;
    rushRecordedRef.current = false;
    setRushScore(0);
    setRushWrong(0);
    setRushLives(3);
    setRushSecondsLeft(RUSH_DURATION_SEC);
    setRushIndex(0);
    setRushPhase("running");
    resetPuzzle(0);
  }, [clearSolutionTimers, resetPuzzle]);

  const board = useMemo(() => {
    void version;
    return extractState(chessRef.current);
  }, [version]);

  const drawing = useBoardDrawings(`${puzzle.id}-${board.fen}`);
  const playerColor: Color = useMemo(() => new Chess(puzzle.fen).turn(), [puzzle.fen]);

  const handleGroupChange = (g: PuzzleGroup | "all") => {
    setGroupFilter(g);
    setCategoryFilter("all");
    setIndex(0);
  };

  const availableCategories = useMemo(() => {
    if (groupFilter === "all") {
      return [
        ...PUZZLE_CATEGORIES["Маты"],
        ...PUZZLE_CATEGORIES["Тактика"],
        ...PUZZLE_CATEGORIES["Стратегия"],
      ];
    }
    return [...PUZZLE_CATEGORIES[groupFilter]];
  }, [groupFilter]);

  const handleSolvedPuzzle = useCallback(() => {
    setStatus("solved");
    setVersion((v) => v + 1);
    play("win");

    if (isRush) {
      const nextScore = rushScoreRef.current + 1;
      rushScoreRef.current = nextScore;
      setRushScore(nextScore);
      completePuzzle({
        solved: true,
        puzzleRating: puzzle.rating,
        category: puzzle.category,
      });
      const t = window.setTimeout(() => {
        setRushIndex((i) => i + 1);
      }, 420);
      solutionTimersRef.current.push(t);
      return;
    }

    setSessionRight((r) => r + 1);
    const res = completePuzzle({
      solved: true,
      puzzleRating: puzzle.rating,
      category: puzzle.category,
    });
    setEloFeedback(res.eloDelta);
  }, [completePuzzle, isRush, play, puzzle.category, puzzle.rating]);

  const handleMove = useCallback(
    (move: BoardMove): boolean => {
      if (isRush && rushPhase !== "running") return false;
      if (status === "solved" || status === "failed" || status === "shown") return false;
      const expected = puzzle.solutionUci[step];
      if (!expected) return false;

      const fenBefore = chessRef.current.fen();
      const probe = new Chess(fenBefore);
      const played = probe.move(move);
      if (!played) return false;

      if (toUciMove(played) !== expected) {
        play("mistake");
        const reason = explainWrongPuzzleMove(fenBefore, move, expected);
        setWrongExplanation(reason);

        if (isRush) {
          const left = rushLives - 1;
          setRushLives(left);
          setRushWrong((w) => w + 1);
          setStatus(left <= 0 ? "failed" : "wrong");
          if (left <= 0) {
            finishRush();
          } else {
            const t = window.setTimeout(() => {
              setRushIndex((i) => i + 1);
            }, 520);
            solutionTimersRef.current.push(t);
          }
          return false;
        }

        if (!failedThisPuzzleRef.current) {
          failedThisPuzzleRef.current = true;
          setSessionWrong((w) => w + 1);
          const res = completePuzzle({
            solved: false,
            puzzleRating: puzzle.rating,
            category: puzzle.category,
          });
          setEloFeedback(res.eloDelta);
        }

        if (survivalMode) {
          const left = lives - 1;
          setLives(left);
          setStatus(left <= 0 ? "failed" : "wrong");
        } else {
          setStatus("wrong");
        }
        return false;
      }

      chessRef.current.move(move);
      play(played.isCapture() ? "capture" : chessRef.current.inCheck() ? "check" : "move");
      setShowHint(false);
      setWrongExplanation("");

      const nextStep = step + 1;
      if (nextStep >= puzzle.solutionUci.length) {
        setStep(nextStep);
        handleSolvedPuzzle();
        return true;
      }

      setStep(nextStep);
      setVersion((v) => v + 1);
      const reply = puzzle.solutionUci[nextStep];
      if (reply) {
        const t = window.setTimeout(
          () => {
            playUci(chessRef.current, reply);
            const afterReply = nextStep + 1;
            setStep(afterReply);
            setVersion((v) => v + 1);
            if (afterReply >= puzzle.solutionUci.length) {
              handleSolvedPuzzle();
            }
          },
          isRush ? 180 : 320,
        );
        solutionTimersRef.current.push(t);
      }
      return true;
    },
    [
      completePuzzle,
      finishRush,
      handleSolvedPuzzle,
      isRush,
      lives,
      play,
      puzzle.category,
      puzzle.rating,
      puzzle.solutionUci,
      rushLives,
      rushPhase,
      status,
      step,
      survivalMode,
    ],
  );

  const handleShowSolution = () => {
    if (isRush) return;
    clearSolutionTimers();
    chessRef.current = new Chess(puzzle.fen);
    setStep(0);
    setStatus("shown");
    setShowHint(false);
    setWrongExplanation("");
    setVersion((v) => v + 1);

    puzzle.solutionUci.forEach((uci, i) => {
      const timer = window.setTimeout(
        () => {
          playUci(chessRef.current, uci);
          setStep(i + 1);
          setVersion((v) => v + 1);
        },
        (i + 1) * 420,
      );
      solutionTimersRef.current.push(timer);
    });
  };

  const hintPair = useMemo(() => {
    if (isRush || !showHint || status === "solved" || status === "failed" || status === "shown") {
      return null;
    }
    const uci = puzzle.solutionUci[step];
    const parsed = uci ? parseUciMove(uci) : null;
    return parsed ? { from: parsed.from, to: parsed.to } : null;
  }, [isRush, puzzle.solutionUci, showHint, status, step]);

  const restartSurvival = () => {
    setLives(3);
    setIndex(0);
    resetPuzzle(0);
  };

  const companionMood: CoachEmotion =
    status === "solved"
      ? progression.comboCount >= 5
        ? "mate_triumph"
        : "joy"
      : status === "wrong" || status === "failed"
        ? "disappointment"
        : status === "shown"
          ? "serious"
          : board.checkSquare
            ? "check_alert"
            : progression.comboCount >= 3
              ? "approval"
              : "concentration";

  const companionLine = isRush
    ? rushPhase === "ready"
      ? "Тактический штурм: решите максимум задач за 3 минуты (до 3 ошибок)."
      : rushPhase === "finished"
        ? `Штурм завершён! Решено: ${rushScore} задач, рекорд клуба: ${Math.max(progression.puzzleRushBest, rushScore)}.`
        : status === "wrong"
          ? "Ошибка! Переходим к следующей позиции."
          : `Темп! Ход ${playerColor === "w" ? "белых" : "чёрных"} · Задача #${rushIndex + 1}`
    : status === "solved"
      ? comboBadge.label
        ? `${comboBadge.label}! ${puzzle.explanation}`
        : puzzle.explanation
      : status === "wrong"
        ? wrongExplanation
        : status === "shown"
          ? `Разбор: ${puzzle.explanation}`
          : showHint
            ? puzzle.hint
            : `${puzzle.category} (${puzzle.rating}). Найдите сильнейший ход за ${playerColor === "w" ? "белых" : "чёрных"}!`;

  const boardMovable = isRush
    ? rushPhase === "running" && status === "playing"
      ? board.turn
      : null
    : status === "solved" || status === "failed" || status === "shown"
      ? null
      : board.turn;

  return (
    <main className="mx-auto w-full max-w-[1460px] flex-1 px-3 pb-12 pt-4 sm:px-6 lg:pt-6">
      {/* Header & Mode Switch */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow text-primary">
            Тактическая арена PROCHESS · {ALL_LOCAL_PUZZLES.length} задач
          </p>
          <h1 className="mt-0.5 font-display text-2xl sm:text-3xl">Тактическая тренировка</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {comboBadge.label && !isRush && (
            <div
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-xs font-semibold",
                comboBadge.tier === 3
                  ? "border-amber-400/60 bg-amber-500/15 text-amber-300"
                  : comboBadge.tier === 2
                    ? "border-sky-400/60 bg-sky-500/15 text-sky-300"
                    : "border-primary/60 bg-primary/15 text-primary",
              )}
            >
              <Sparkles className="size-3.5" />
              {comboBadge.label}
            </div>
          )}

          <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-secondary p-1">
            <button
              type="button"
              onClick={() => {
                clearSolutionTimers();
                setMode("classic");
                if (status === "failed") resetPuzzle(safeIndex);
              }}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-1.5 font-medium transition-colors",
                mode === "classic"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Классическая тренировка
            </button>
            <button
              type="button"
              onClick={() => {
                clearSolutionTimers();
                setMode("survival");
                setLives(3);
                resetPuzzle(safeIndex);
              }}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-1.5 font-medium transition-colors",
                mode === "survival"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Режим выживания
            </button>
            <button
              type="button"
              onClick={() => {
                clearSolutionTimers();
                setMode("rush");
                setRushPhase("ready");
                setRushSecondsLeft(RUSH_DURATION_SEC);
                setRushLives(3);
                setRushScore(0);
                setRushWrong(0);
                setRushIndex(0);
              }}
              className={cn(
                "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 font-medium transition-colors",
                mode === "rush"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Zap className="size-3.5" />
              Тактический штурм
            </button>
          </div>
        </div>
      </div>

      {/* Category & Difficulty Filters (classic & survival) */}
      {!isRush ? (
        <section className="panel mb-5 flex flex-wrap items-center gap-3 p-3 text-xs">
          <div className="flex flex-wrap items-center gap-1">
            {(["all", "Маты", "Тактика", "Стратегия"] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => handleGroupChange(g)}
                className={cn(
                  "rounded-lg border px-2.5 py-1 font-medium transition-colors",
                  groupFilter === g
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-secondary/50 text-muted-foreground hover:text-foreground",
                )}
              >
                {g === "all" ? "Все разделы" : g}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-1.5 text-muted-foreground">
            <span>Тема:</span>
            <select
              aria-label="Фильтр по теме задачи"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setIndex(0);
              }}
              className="rounded-lg border border-border bg-secondary px-2 py-1 text-xs text-foreground"
            >
              <option value="all">Все темы ({availableCategories.length})</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-1.5 text-muted-foreground">
            <span>Сложность:</span>
            <select
              aria-label="Фильтр по рейтингу сложности"
              value={tierFilter}
              onChange={(e) => {
                setTierFilter(e.target.value as PuzzleDifficultyTierId | "all");
                setIndex(0);
              }}
              className="rounded-lg border border-border bg-secondary px-2 py-1 text-xs text-foreground"
            >
              <option value="all">Любой рейтинг</option>
              {PUZZLE_TIERS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label} ({t.range})
                </option>
              ))}
            </select>
          </label>

          <span className="ml-auto font-mono text-[11px] text-muted-foreground">
            Найдено задач: {filteredPuzzles.length}
          </span>
        </section>
      ) : (
        <section className="panel mb-5 flex flex-wrap items-center justify-between gap-4 p-3.5 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-2 font-mono text-lg font-bold tabular-nums text-primary">
              <Timer className="size-4" aria-hidden />
              {formatTimer(rushSecondsLeft)}
            </span>
            <span className="text-muted-foreground">
              Решено: <strong className="font-mono text-base text-foreground">{rushScore}</strong>
            </span>
            <span className="text-muted-foreground">
              Рекорд:{" "}
              <strong className="font-mono text-foreground">
                {Math.max(progression.puzzleRushBest, rushScore)}
              </strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Жизни:</span>
            <div className="flex items-center gap-1">
              {Array.from({ length: 3 }, (_, i) => (
                <Heart
                  key={i}
                  className={cn(
                    "size-4",
                    i < rushLives
                      ? "fill-destructive text-destructive"
                      : "text-muted-foreground/30",
                  )}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_25rem]">
        {/* Board + Draw Toolbar */}
        <section className="mx-auto w-full max-w-[min(100%,calc(100svh-10rem))] space-y-2.5">
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
              updateBoard({ showThreatOverlay: !settings.board.showThreatOverlay })
            }
            showCombos={settings.board.showComboOverlay}
            onToggleCombos={() =>
              updateBoard({ showComboOverlay: !settings.board.showComboOverlay })
            }
          />

          <ChessBoard
            cells={board.cells}
            positionKey={`${puzzle.id}-${board.fen}-${step}`}
            orientation={playerColor}
            movableColor={boardMovable}
            legalMoves={board.legalMoves}
            showLegalMoves={settings.board.showLegalMoves}
            lastMove={board.lastMove}
            checkSquare={board.checkSquare}
            hint={hintPair}
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
        </section>

        {/* Right Tactical Control & Living Character */}
        <aside className="space-y-3.5">
          <CharacterCompanionCard
            mood={companionMood}
            message={companionLine}
            reactionKey={`${puzzle.id}-${status}-${progression.comboCount}-${rushScore}`}
          />

          {isRush ? (
            <div className="panel space-y-4 p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="eyebrow text-primary">Блиц-задачи · 3 минуты</p>
                  <h2 className="mt-1 font-display text-xl">Тактический штурм</h2>
                </div>
                <Zap className="size-6 text-primary" aria-hidden />
              </div>

              {rushPhase === "ready" && (
                <div className="space-y-3">
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Решайте тактические задачи на возрастание рейтинга на скорость. Даётся 3 минуты
                    и право на 3 ошибки. По завершении ваш рекорд сохраняется в профиле.
                  </p>
                  <Button type="button" variant="ivory" className="w-full" onClick={startRush}>
                    <Play className="size-4 fill-current" />
                    Начать штурм (3:00)
                  </Button>
                </div>
              )}

              {rushPhase === "running" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg border border-border bg-secondary/50 p-2.5">
                      <p className="text-[11px] text-muted-foreground">Текущая задача</p>
                      <p className="mt-1 font-mono text-sm font-semibold text-foreground">
                        #{rushIndex + 1} · {puzzle.rating} Эло
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-secondary/50 p-2.5">
                      <p className="text-[11px] text-muted-foreground">Очередь хода</p>
                      <p className="mt-1 font-mono text-sm font-semibold text-primary">
                        {playerColor === "w" ? "Белые" : "Чёрные"}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Тема: <span className="text-foreground">{puzzle.category}</span>
                  </p>
                  <Button type="button" variant="panel" size="sm" onClick={finishRush}>
                    Завершить досрочно
                  </Button>
                </div>
              )}

              {rushPhase === "finished" && (
                <div className="space-y-3 rounded-xl border border-primary/40 bg-primary/10 p-4 text-xs">
                  <p className="eyebrow text-primary">Итоги штурма</p>
                  <p className="font-display text-2xl font-bold tabular-nums text-foreground">
                    {rushScore} задач
                  </p>
                  <p className="text-muted-foreground">
                    Ошибок: {rushWrong} · Точность:{" "}
                    {rushScore + rushWrong > 0
                      ? Math.round((rushScore / (rushScore + rushWrong)) * 100)
                      : 0}
                    % · Рекорд: {Math.max(progression.puzzleRushBest, rushScore)}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button type="button" variant="ivory" size="sm" onClick={startRush}>
                      <RotateCcw className="size-3.5" />
                      Сыграть ещё раз
                    </Button>
                    <Button
                      type="button"
                      variant="panel"
                      size="sm"
                      onClick={() => setMode("classic")}
                    >
                      К обычным задачам
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="panel space-y-4 p-4 sm:p-5">
              {/* Telemetry Grid */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-lg border border-border bg-secondary/50 p-2.5">
                  <p className="text-[11px] text-muted-foreground">Рейтинг задач</p>
                  <p className="mt-1 flex items-center gap-1 font-mono text-base font-semibold text-primary tabular-nums">
                    <Trophy className="size-3.5" /> {progression.tacticsRating}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-secondary/50 p-2.5">
                  <p className="text-[11px] text-muted-foreground">Серия комбо</p>
                  <p className="mt-1 flex items-center gap-1 font-mono text-base font-semibold text-foreground tabular-nums">
                    <Flame className="size-3.5 text-warning" /> {progression.comboCount}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-secondary/50 p-2.5">
                  <p className="text-[11px] text-muted-foreground">Верно / Ошибок</p>
                  <p className="mt-1 flex items-center gap-1.5 font-mono text-sm font-semibold tabular-nums">
                    <span className="inline-flex items-center gap-0.5 text-primary">
                      <CheckCircle2 className="size-3.5" /> {sessionRight}
                    </span>
                    <span className="text-muted-foreground">/</span>
                    <span className="inline-flex items-center gap-0.5 text-destructive">
                      <XCircle className="size-3.5" /> {sessionWrong}
                    </span>
                  </p>
                </div>
              </div>

              {survivalMode && (
                <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs">
                  <span>Попытки (Выживание):</span>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 3 }, (_, i) => (
                      <Heart
                        key={i}
                        className={cn(
                          "size-4",
                          i < lives
                            ? "fill-destructive text-destructive"
                            : "text-muted-foreground/35",
                        )}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Puzzle Meta */}
              <div>
                <p className="eyebrow text-primary">
                  {puzzle.group} · {puzzle.category} · #{safeIndex + 1}/{filteredPuzzles.length}
                </p>
                <h2 className="mt-1 font-display text-xl">{puzzle.title}</h2>
                <p className="mt-1.5 font-mono text-[11px] text-muted-foreground tabular-nums">
                  Рейтинг {puzzle.rating} ({tierMeta.label}) · Ход{" "}
                  {playerColor === "w" ? "белых" : "чёрных"} · Ходов в решении:{" "}
                  {playerMoveCount(puzzle.solutionUci)}
                </p>
              </div>

              {showHint && status === "playing" && (
                <div className="rounded-lg border border-primary/35 bg-primary/10 px-3 py-2 text-xs text-foreground">
                  <span className="font-semibold text-primary">Подсказка:</span> {puzzle.hint}
                </div>
              )}

              {status === "wrong" && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-foreground">
                  <p className="font-semibold text-destructive">
                    Неверный ход{eloFeedback !== null ? ` (${eloFeedback} Эло)` : ""}
                  </p>
                  <p className="mt-1 leading-relaxed text-muted-foreground">{wrongExplanation}</p>
                </div>
              )}

              {status === "failed" && (
                <div className="space-y-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs">
                  <p className="font-semibold text-destructive">
                    Серия в режиме выживания завершена!
                  </p>
                  <Button type="button" variant="ivory" size="sm" onClick={restartSurvival}>
                    Начать заново
                  </Button>
                </div>
              )}

              {status === "solved" && (
                <div className="rounded-lg border border-primary/45 bg-primary/10 p-3 text-xs">
                  <p className="font-semibold text-primary">
                    Задача решена! {eloFeedback !== null ? `+${eloFeedback} Эло` : ""} · +25 XP
                    {comboBadge.xpBonus > 0 ? ` (+${comboBadge.xpBonus} XP комбо)` : ""}
                  </p>
                  <p className="mt-1 leading-relaxed text-foreground/90">{puzzle.explanation}</p>
                </div>
              )}

              {status === "shown" && (
                <div className="rounded-lg border border-border bg-secondary/50 p-3 text-xs">
                  <p className="font-semibold text-foreground">Решение продемонстрировано</p>
                  <p className="mt-1 leading-relaxed text-muted-foreground">{puzzle.explanation}</p>
                </div>
              )}

              {/* Controls */}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  type="button"
                  variant="panel"
                  size="sm"
                  onClick={() => resetPuzzle(safeIndex)}
                >
                  <RotateCcw className="size-3.5" /> Повторить
                </Button>
                <Button
                  type="button"
                  variant="panel"
                  size="sm"
                  onClick={() => setShowHint(true)}
                  disabled={status === "solved" || status === "failed" || status === "shown"}
                >
                  <Lightbulb className="size-3.5 text-primary" /> Подсказка
                </Button>
                <Button
                  type="button"
                  variant="panel"
                  size="sm"
                  onClick={handleShowSolution}
                  disabled={status === "solved" || status === "shown"}
                >
                  <Eye className="size-3.5" /> Показать решение
                </Button>
                <Button
                  type="button"
                  variant="ivory"
                  size="sm"
                  className="ml-auto"
                  onClick={() => setIndex((i) => i + 1)}
                >
                  Следующая <ArrowRight className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
