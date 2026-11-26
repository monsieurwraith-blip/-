import { Chess } from "chess.js";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  Eye,
  Flame,
  Globe,
  Lightbulb,
  RotateCcw,
  Sparkles,
  Trophy,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CharacterCompanionCard } from "@/components/characters/CharacterCompanionCard";
import { BoardDrawToolbar } from "@/components/chess/BoardDrawToolbar";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { CoachEmotion } from "@/features/coach/coachMood";
import { useProgression } from "@/features/progression/ProgressionProvider";
import { useSettings } from "@/features/settings/SettingsProvider";
import { useBoardDrawings } from "@/hooks/useBoardDrawings";
import type { BoardCell } from "@/lib/chess/pieceIds";
import type { BoardMove, Color, Square, SquarePair } from "@/lib/chess/types";
import { parseUciMove, toUciMove } from "@/lib/chess/uci";
import { playUci } from "@/lib/coach/tactics";
import {
  buildDailyPuzzleSet,
  fetchLichessDailyPuzzle,
  formatCountdownHms,
  getTodayDateKey,
  loadDailyChallengeState,
  msUntilNextMidnight,
  saveDailyChallengeState,
  type DailyChallengeState,
} from "@/lib/puzzles/dailyService";
import { explainWrongPuzzleMove, playerMoveCount, puzzleTierForRating } from "@/lib/puzzles/types";
import { cn } from "@/lib/utils";

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

function buildCalendarDays(
  completedDates: readonly string[],
): { key: string; day: number; done: boolean }[] {
  const days: { key: string; day: number; done: boolean }[] = [];
  const today = new Date();
  for (let offset = 13; offset >= 0; offset--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
    const key = getTodayDateKey(d);
    days.push({
      key,
      day: d.getDate(),
      done: completedDates.includes(key),
    });
  }
  return days;
}

export function DailyChallengeScreen({ onOpenPuzzles }: { onOpenPuzzles?: () => void }) {
  const { settings, play, updateBoard } = useSettings();
  const { progression, comboBadge, completePuzzle, completeDailyTraining } = useProgression();

  const todayStr = useMemo(() => getTodayDateKey(), []);
  const [daily, setDaily] = useState<DailyChallengeState>(() => loadDailyChallengeState(todayStr));
  const [countdown, setCountdown] = useState(() => formatCountdownHms(msUntilNextMidnight()));

  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<"playing" | "wrong" | "solved" | "shown">("playing");
  const [wrongExplanation, setWrongExplanation] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [version, setVersion] = useState(0);
  const [showSummary, setShowSummary] = useState(false);

  const puzzle = daily.puzzles[daily.currentIndex] ?? daily.puzzles[0]!;
  const chessRef = useRef(new Chess(puzzle.fen));
  const timersRef = useRef<number[]>([]);
  const attemptedFailedRef = useRef(false);

  const clearTimers = useCallback(() => {
    for (const id of timersRef.current) window.clearTimeout(id);
    timersRef.current = [];
  }, []);

  // Midnight countdown clock
  useEffect(() => {
    const id = window.setInterval(() => {
      setCountdown(formatCountdownHms(msUntilNextMidnight()));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  // Real Lichess API daily puzzle upgrade (merges into slot #10 when available, cached for today)
  useEffect(() => {
    const controller = new AbortController();
    if (daily.sourceStatus === "live" || daily.puzzles[9]?.source === "lichess") {
      return undefined;
    }
    void fetchLichessDailyPuzzle(controller.signal).then((livePuzzle) => {
      if (!livePuzzle) return;
      setDaily((prev) => {
        if (prev.solvedIds.length > 0 || prev.failedIds.length > 0) return prev;
        const upgraded = buildDailyPuzzleSet(prev.dateKey, livePuzzle);
        const next: DailyChallengeState = {
          ...prev,
          puzzles: upgraded,
          sourceStatus: "live",
        };
        saveDailyChallengeState(next);
        return next;
      });
    });
    return () => controller.abort();
  }, [daily.puzzles, daily.sourceStatus]);

  // Reset board whenever active daily puzzle changes
  useEffect(() => {
    clearTimers();
    chessRef.current = new Chess(puzzle.fen);
    attemptedFailedRef.current = false;
    setStep(0);
    setStatus("playing");
    setWrongExplanation("");
    setShowHint(false);
    setVersion((v) => v + 1);
    return () => clearTimers();
  }, [puzzle.id, puzzle.fen, clearTimers]);

  const board = useMemo(() => {
    void version;
    return extractState(chessRef.current);
  }, [version]);

  const drawing = useBoardDrawings(`daily-${puzzle.id}-${board.fen}`);
  const playerColor: Color = useMemo(() => new Chess(puzzle.fen).turn(), [puzzle.fen]);
  const tierMeta = puzzleTierForRating(puzzle.rating);

  const persistDaily = useCallback(
    (updater: (prev: DailyChallengeState) => DailyChallengeState) => {
      setDaily((prev) => {
        const next = updater(prev);
        saveDailyChallengeState(next);
        return next;
      });
    },
    [],
  );

  const markSolved = useCallback(
    (puzzleId: string, puzzleRating: number, category: string) => {
      completePuzzle({ solved: true, puzzleRating, category });
      persistDaily((prev) => {
        const solvedIds = prev.solvedIds.includes(puzzleId)
          ? prev.solvedIds
          : [...prev.solvedIds, puzzleId];
        const totalDone = new Set([...solvedIds, ...prev.failedIds]).size;
        const completedAll = totalDone >= prev.puzzles.length;
        if (completedAll && !prev.completedAt) {
          completeDailyTraining(prev.dateKey, solvedIds.length);
        }
        return {
          ...prev,
          solvedIds,
          completedAt: completedAll
            ? (prev.completedAt ?? new Date().toISOString())
            : prev.completedAt,
        };
      });
    },
    [completeDailyTraining, completePuzzle, persistDaily],
  );

  const handleMove = useCallback(
    (move: BoardMove): boolean => {
      if (status === "solved" || status === "shown") return false;
      const expected = puzzle.solutionUci[step];
      if (!expected) return false;

      const fenBefore = chessRef.current.fen();
      const probe = new Chess(fenBefore);
      const played = probe.move(move);
      if (!played) return false;

      if (toUciMove(played) !== expected) {
        play("mistake");
        setWrongExplanation(explainWrongPuzzleMove(fenBefore, move, expected));
        setStatus("wrong");
        if (!attemptedFailedRef.current) {
          attemptedFailedRef.current = true;
          completePuzzle({
            solved: false,
            puzzleRating: puzzle.rating,
            category: puzzle.category,
          });
          persistDaily((prev) => ({
            ...prev,
            failedIds: prev.failedIds.includes(puzzle.id)
              ? prev.failedIds
              : [...prev.failedIds, puzzle.id],
          }));
        }
        return false;
      }

      chessRef.current.move(move);
      play(played.isCapture() ? "capture" : chessRef.current.inCheck() ? "check" : "move");
      setWrongExplanation("");
      setShowHint(false);

      const nextStep = step + 1;
      if (nextStep >= puzzle.solutionUci.length) {
        setStep(nextStep);
        setStatus("solved");
        setVersion((v) => v + 1);
        play("win");
        markSolved(puzzle.id, puzzle.rating, puzzle.category);
        return true;
      }

      setStep(nextStep);
      setVersion((v) => v + 1);
      const reply = puzzle.solutionUci[nextStep];
      if (reply) {
        const t = window.setTimeout(() => {
          playUci(chessRef.current, reply);
          const afterReply = nextStep + 1;
          setStep(afterReply);
          setVersion((v) => v + 1);
          if (afterReply >= puzzle.solutionUci.length) {
            setStatus("solved");
            play("win");
            markSolved(puzzle.id, puzzle.rating, puzzle.category);
          }
        }, 320);
        timersRef.current.push(t);
      }
      return true;
    },
    [
      completePuzzle,
      markSolved,
      persistDaily,
      play,
      puzzle.category,
      puzzle.id,
      puzzle.rating,
      puzzle.solutionUci,
      status,
      step,
    ],
  );

  const handleShowSolution = () => {
    clearTimers();
    chessRef.current = new Chess(puzzle.fen);
    setStep(0);
    setStatus("shown");
    setShowHint(false);
    setWrongExplanation("");
    setVersion((v) => v + 1);
    puzzle.solutionUci.forEach((uci, i) => {
      const t = window.setTimeout(
        () => {
          playUci(chessRef.current, uci);
          setStep(i + 1);
          setVersion((v) => v + 1);
        },
        (i + 1) * 420,
      );
      timersRef.current.push(t);
    });
  };

  const goNextPuzzle = () => {
    if (daily.currentIndex >= daily.puzzles.length - 1) {
      if (!daily.completedAt) {
        completeDailyTraining(daily.dateKey, daily.solvedIds.length);
        persistDaily((prev) => ({ ...prev, completedAt: new Date().toISOString() }));
      }
      setShowSummary(true);
      return;
    }
    persistDaily((prev) => ({ ...prev, currentIndex: Math.min(9, prev.currentIndex + 1) }));
  };

  const hintPair = useMemo(() => {
    if (!showHint || status === "solved" || status === "shown") return null;
    const uci = puzzle.solutionUci[step];
    const parsed = uci ? parseUciMove(uci) : null;
    return parsed ? { from: parsed.from, to: parsed.to } : null;
  }, [puzzle.solutionUci, showHint, status, step]);

  const completedCount = daily.solvedIds.length;
  const attemptedCount = new Set([...daily.solvedIds, ...daily.failedIds]).size;
  const pct = Math.round((attemptedCount / daily.puzzles.length) * 100);
  const calendarDays = useMemo(
    () => buildCalendarDays(progression.dailyTrainingDates),
    [progression.dailyTrainingDates],
  );

  const companionMood: CoachEmotion =
    showSummary || status === "solved"
      ? "mate_triumph"
      : status === "wrong"
        ? "disappointment"
        : board.checkSquare
          ? "check_alert"
          : comboBadge.tier >= 2
            ? "approval"
            : "concentration";

  const companionMsg = showSummary
    ? `Отличная тренировка! Вы решили ${completedCount} из 10 ежедневных задач.`
    : status === "solved"
      ? puzzle.explanation
      : status === "wrong"
        ? wrongExplanation
        : `Задача ${daily.currentIndex + 1} из 10 · ${puzzle.category} (${puzzle.rating}).`;

  return (
    <main className="mx-auto w-full max-w-[1460px] flex-1 space-y-5 px-3 pb-12 pt-4 sm:px-6 lg:pt-6">
      {/* Banner Header */}
      <section className="panel flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-mono font-semibold uppercase tracking-[0.2em] text-primary">
              DAILY CHESS CHALLENGE
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Globe className="size-3.5 text-primary" />
              {daily.sourceStatus === "live" || puzzle.source === "lichess"
                ? "Синхронизировано с Lichess API"
                : "Ежедневная подборка дня"}
            </span>
          </div>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl">
            Твоя ежедневная тренировка готова
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="rounded-xl border border-border bg-secondary/50 px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Прогресс дня</p>
            <p className="font-mono text-base font-semibold text-primary tabular-nums">
              {completedCount}/10 решено
            </p>
          </div>
          <div className="rounded-xl border border-border bg-secondary/50 px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Серия дней</p>
            <p className="flex items-center gap-1 font-mono text-base font-semibold text-foreground tabular-nums">
              <Flame className="size-4 text-warning" /> {progression.dailyStreak}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-secondary/50 px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Новые задачи через</p>
            <p className="flex items-center gap-1 font-mono text-base font-semibold text-foreground tabular-nums">
              <Clock className="size-3.5 text-primary" /> {countdown}
            </p>
          </div>
        </div>
      </section>

      {/* Progress Dots 1..10 */}
      <section className="panel space-y-2 p-3.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-foreground">
            Маршрут тренировки ({daily.currentIndex + 1} / 10)
          </span>
          <span className="font-mono text-muted-foreground tabular-nums">{pct}%</span>
        </div>
        <Progress value={pct} className="h-2" />
        <div className="grid grid-cols-10 gap-1.5 pt-1">
          {daily.puzzles.map((p, idx) => {
            const solved = daily.solvedIds.includes(p.id);
            const failed = daily.failedIds.includes(p.id);
            const active = idx === daily.currentIndex && !showSummary;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setShowSummary(false);
                  persistDaily((prev) => ({ ...prev, currentIndex: idx }));
                }}
                className={cn(
                  "rounded-lg border py-1.5 text-center font-mono text-xs font-semibold transition-colors",
                  active
                    ? "border-primary bg-primary/20 text-primary"
                    : solved
                      ? "border-emerald-500/45 bg-emerald-500/15 text-emerald-300"
                      : failed
                        ? "border-destructive/45 bg-destructive/10 text-destructive"
                        : "border-border bg-secondary/45 text-muted-foreground hover:text-foreground",
                )}
              >
                {idx === 9 ? "★10" : idx + 1}
              </button>
            );
          })}
        </div>
      </section>

      {showSummary ? (
        <section className="panel mx-auto max-w-2xl space-y-5 p-6 text-center">
          <Trophy className="mx-auto size-12 text-primary" />
          <div>
            <p className="eyebrow text-primary">Ежедневная тренировка завершена</p>
            <h2 className="mt-1 font-display text-3xl">Результат дня: {completedCount} из 10</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Текущий тактический рейтинг:{" "}
              <span className="font-mono text-foreground">{progression.tacticsRating}</span> · Серия
              дней: <span className="font-mono text-primary">{progression.dailyStreak}</span>
            </p>
          </div>
          <CharacterCompanionCard mood="mate_triumph" message={companionMsg} allowHide={false} />
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              type="button"
              variant="panel"
              onClick={() => {
                setShowSummary(false);
                persistDaily((prev) => ({ ...prev, currentIndex: 0 }));
              }}
            >
              <RotateCcw className="size-4" /> Повторить задачи дня
            </Button>
            {onOpenPuzzles && (
              <Button type="button" variant="ivory" onClick={onOpenPuzzles}>
                Открыть Тактическую арену (112 задач) <ArrowRight className="size-4" />
              </Button>
            )}
          </div>
        </section>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_25rem]">
          {/* Board + Draw Toolbar */}
          <section className="mx-auto w-full max-w-[min(100%,calc(100svh-12rem))] space-y-2.5">
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
              positionKey={`daily-${puzzle.id}-${board.fen}-${step}`}
              orientation={playerColor}
              movableColor={status === "solved" || status === "shown" ? null : board.turn}
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

          {/* Right Info & Calendar */}
          <aside className="space-y-3.5">
            <CharacterCompanionCard
              mood={companionMood}
              message={companionMsg}
              reactionKey={`daily-${puzzle.id}-${status}`}
            />

            <div className="panel space-y-4 p-4 sm:p-5">
              <div className="flex items-center justify-between text-xs">
                <span className="eyebrow text-primary">
                  {daily.currentIndex === 9
                    ? "★ Задача дня"
                    : `Задача #${daily.currentIndex + 1} · ${puzzle.category}`}
                </span>
                {comboBadge.label && (
                  <span className="inline-flex items-center gap-1 font-mono font-semibold text-primary">
                    <Sparkles className="size-3.5" /> {comboBadge.label}
                  </span>
                )}
              </div>

              <div>
                <h2 className="font-display text-xl">{puzzle.title}</h2>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground tabular-nums">
                  Рейтинг {puzzle.rating} ({tierMeta.label}) · Ход{" "}
                  {playerColor === "w" ? "белых" : "чёрных"} · Ходов:{" "}
                  {playerMoveCount(puzzle.solutionUci)}
                </p>
              </div>

              {showHint && status === "playing" && (
                <p className="rounded-lg border border-primary/35 bg-primary/10 px-3 py-2 text-xs">
                  <span className="font-semibold text-primary">Подсказка:</span> {puzzle.hint}
                </p>
              )}

              {status === "wrong" && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs">
                  <p className="flex items-center gap-1 font-semibold text-destructive">
                    <XCircle className="size-3.5" /> Неточный ход
                  </p>
                  <p className="mt-1 text-muted-foreground">{wrongExplanation}</p>
                </div>
              )}

              {status === "solved" && (
                <div className="rounded-lg border border-primary/45 bg-primary/10 px-3 py-2.5 text-xs">
                  <p className="flex items-center gap-1 font-semibold text-primary">
                    <CheckCircle2 className="size-4" /> Верно! Задача зачтена в тренировку дня
                  </p>
                  <p className="mt-1 text-foreground/90">{puzzle.explanation}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="panel"
                  size="sm"
                  onClick={() => setShowHint(true)}
                  disabled={status === "solved" || status === "shown"}
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
                  <Eye className="size-3.5" /> Решение
                </Button>
                <Button
                  type="button"
                  variant="ivory"
                  size="sm"
                  className="ml-auto"
                  onClick={goNextPuzzle}
                >
                  {daily.currentIndex === 9 ? "Итоги дня" : "Дальше"}{" "}
                  <ArrowRight className="size-3.5" />
                </Button>
              </div>
            </div>

            {/* 14-Day Training Calendar + Daily Missions */}
            <div className="panel space-y-3 p-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="eyebrow flex items-center gap-1.5 text-primary">
                  <CalendarDays className="size-3.5" /> Календарь тренировок (14 дней)
                </span>
                <span className="font-mono text-muted-foreground">
                  Рекорд: {progression.bestDailyStreak} дн.
                </span>
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {calendarDays.map((d) => (
                  <div
                    key={d.key}
                    title={d.key}
                    className={cn(
                      "rounded-md border py-1 text-center font-mono text-[11px]",
                      d.done
                        ? "border-primary/60 bg-primary/20 font-semibold text-primary"
                        : d.key === todayStr
                          ? "border-white/30 bg-secondary text-foreground"
                          : "border-border/60 bg-secondary/30 text-muted-foreground",
                    )}
                  >
                    {d.day}
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
