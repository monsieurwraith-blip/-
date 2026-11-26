import { Chess, type Move } from "chess.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { analyzePlayerMove, type PendingAnalysis } from "@/features/coach/analysis";
import { useSettings } from "@/features/settings/SettingsProvider";
import { useChessClock } from "@/hooks/useChessClock";
import { useChessGame } from "@/hooks/useChessGame";
import { useStockfish } from "@/hooks/useStockfish";
import { getBotById, pickBotBookMove } from "@/lib/chess/bots";
import type { ClockTimes } from "@/lib/chess/clock";
import { engineMovetime, getDifficulty } from "@/lib/chess/difficulty";
import { resolveTimeout } from "@/lib/chess/outcome";
import type { BoardCell } from "@/lib/chess/pieceIds";
import { validateQueuedPremove } from "@/lib/chess/premove";
import { getTimeControl, type TimeControlId } from "@/lib/chess/timeControls";
import {
  opposite,
  type BoardMove,
  type Color,
  type PromotionPiece,
  type Square,
  type SquarePair,
} from "@/lib/chess/types";
import { parseUciMove, toUciMove, type EngineInfo, type EngineScore } from "@/lib/chess/uci";
import { pliesToUndo } from "@/lib/chess/undo";
import { chartPawns, isMistakeClass, povCp, toWhitePov } from "@/lib/coach/evaluation";
import { buildLayeredHint, type HintLevel } from "@/lib/coach/hints";
import type { CoachRecord, EvalPoint } from "@/lib/coach/report";
import { hangingPieces, playUci } from "@/lib/coach/tactics";
import { thinkTimeMs } from "@/lib/engine/thinkTime";
import {
  HISTORICAL_STYLES,
  type GameMode,
  type HistoricalStyleId,
  type PlayStyleId,
} from "@/lib/settings/settings";
import { stopSpeaking } from "@/lib/sound/speech";

import type { ActiveGame, GameSettings, HintMove } from "./types";

const HINT_SEARCH = { skillLevel: 20, depth: 16, movetimeMs: 1000, multiPv: 2 } as const;

export type CoachPhase = "idle" | "analyzing" | "review" | "fixing";

interface RedoMoveEntry {
  from: Square;
  to: Square;
  promotion?: PromotionPiece;
  clockSnapshot?: ClockTimes;
}

export interface InspectedPosition {
  ply: number;
  fen: string;
  cells: BoardCell[];
  lastMove: SquarePair | null;
  checkSquare: Square | null;
}

function resolveEffectiveStyle(
  playStyle: PlayStyleId,
  historical: HistoricalStyleId,
): {
  style: PlayStyleId;
  bonusSkill: number;
} {
  const hist = HISTORICAL_STYLES.find((h) => h.id === historical);
  if (playStyle === "balanced" && hist && hist.id !== "modern") {
    return { style: hist.style, bonusSkill: hist.bonusSkill };
  }
  return { style: playStyle, bonusSkill: hist?.bonusSkill ?? 0 };
}

function chooseStyledCandidate(
  fen: string,
  bestMove: string,
  lines: readonly EngineInfo[],
  playStyle: PlayStyleId,
  engineColor: Color,
): string {
  if (playStyle === "balanced" || lines.length < 2) return bestMove;
  if (playStyle === "random" && lines.length >= 2) {
    const pick = lines[Math.floor(Math.random() * Math.min(3, lines.length))];
    const uci = pick?.pv[0];
    if (uci && pick?.score) {
      const cp1 = povCp(toWhitePov(lines[0]!.score!, engineColor), engineColor);
      const cpPick = povCp(toWhitePov(pick.score, engineColor), engineColor);
      if (cp1 - cpPick <= 35) return uci;
    }
    return bestMove;
  }

  const pv1 = lines[0];
  const pv2 = lines[1];
  const uci2 = pv2?.pv[0];
  if (!pv1?.score || !pv2?.score || !uci2) return bestMove;
  const cp1 = povCp(toWhitePov(pv1.score, engineColor), engineColor);
  const cp2 = povCp(toWhitePov(pv2.score, engineColor), engineColor);
  if (cp1 - cp2 > 18) return bestMove;

  const board1 = new Chess(fen);
  const m1 = playUci(board1, bestMove);
  const board2 = new Chess(fen);
  const m2 = playUci(board2, uci2);
  if (!m1 || !m2) return bestMove;

  const aggrScore = (m: Move) =>
    (m.captured ? 3 : 0) +
    (m.san.includes("+") ? 2 : 0) +
    (m.piece === "q" || m.piece === "n" ? 1 : 0);
  const solidScore = (m: Move) =>
    (m.isKingsideCastle() || m.isQueensideCastle() ? 3 : 0) +
    (!m.captured && (m.piece === "p" || m.piece === "b" || m.piece === "n") ? 1 : 0);
  const tacticalScore = (m: Move) =>
    (m.san.includes("+") ? 3 : 0) + (m.captured ? 2 : 0) + (m.promotion ? 3 : 0);

  if ((playStyle === "aggressive" || playStyle === "counter") && aggrScore(m2) > aggrScore(m1)) {
    return uci2;
  }
  if (playStyle === "tactician" && tacticalScore(m2) > tacticalScore(m1)) {
    return uci2;
  }
  if (
    (playStyle === "solid" ||
      playStyle === "defender" ||
      playStyle === "cautious" ||
      playStyle === "grandmaster") &&
    solidScore(m2) > solidScore(m1)
  ) {
    return uci2;
  }
  return bestMove;
}

function buildSnapshotAtPly(
  history: readonly Move[],
  targetPly: number,
  startFen?: string | null,
): InspectedPosition {
  const chess = startFen ? new Chess(startFen) : new Chess();
  let last: Move | null = null;
  const count = Math.max(0, Math.min(history.length, targetPly));
  for (let i = 0; i < count; i++) {
    const m = history[i];
    if (!m) break;
    last = chess.move({
      from: m.from,
      to: m.to,
      ...(m.promotion ? { promotion: m.promotion } : {}),
    });
  }
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
  return {
    ply: count,
    fen: chess.fen(),
    cells,
    lastMove: last ? { from: last.from, to: last.to } : null,
    checkSquare,
  };
}

function defaultTimeForMode(mode: GameMode, current: TimeControlId): TimeControlId {
  if (mode === "coach") return "untimed";
  if (mode === "bullet") return "1+0";
  if (mode === "blitz") return current === "3+2" || current === "5+0" ? current : "3+2";
  if (mode === "rapid") return current === "10+0" || current === "15+10" ? current : "10+0";
  return current;
}

/**
 * Orchestrates one game against Stockfish: rules (chess.js), clocks, the
 * engine worker, redo stack, history inspection, multi-level hints, threat radar,
 * draw offers, and Coach mode.
 */
export function usePlayController() {
  const game = useChessGame();
  const engine = useStockfish();
  const { settings: userSettings, update: updateUserSettings } = useSettings();
  const gameRef = useRef(game);
  gameRef.current = game;
  const engineSettingsRef = useRef(userSettings.engine);
  engineSettingsRef.current = userSettings.engine;

  const clock = useChessClock((flagged) => {
    const g = gameRef.current;
    g.declareOutcome(resolveTimeout(g.chess(), flagged));
  });

  const settings: GameSettings = userSettings.game;
  const [active, setActive] = useState<ActiveGame | null>(null);
  const [orientation, setOrientation] = useState<Color>("w");
  const [hint, setHint] = useState<HintMove | null>(null);
  const [hintPending, setHintPending] = useState(false);
  const [engineMoveError, setEngineMoveError] = useState<string | null>(null);
  const [coachPhase, setCoachPhase] = useState<CoachPhase>("idle");
  const [pending, setPending] = useState<PendingAnalysis | null>(null);
  const [records, setRecords] = useState<CoachRecord[]>([]);
  const [coachError, setCoachError] = useState<string | null>(null);
  const [redoStack, setRedoStack] = useState<RedoMoveEntry[][]>([]);
  const [viewPly, setViewPly] = useState<number | null>(null);
  const [showThreats, setShowThreats] = useState(false);
  const [drawNotice, setDrawNotice] = useState<string | null>(null);
  const [liveEval, setLiveEval] = useState<{
    score: EngineScore;
    depth: number;
    lines: EngineInfo[];
    turn: Color;
  } | null>(null);
  const [evalHistory, setEvalHistory] = useState<EvalPoint[]>([]);
  const [premove, setPremove] = useState<BoardMove | null>(null);

  const clockHistory = useRef<ClockTimes[]>([]);
  const gameCounter = useRef(0);
  const gameStartedAt = useRef<number>(Date.now());
  const hintPendingRef = useRef(false);
  const premoveRef = useRef<BoardMove | null>(null);
  const passFlipTimerRef = useRef<number | null>(null);

  const isPassAndPlay = active?.settings.mode === "pass-and-play";
  const playerColor = active?.playerColor ?? null;
  const engineColor = playerColor && !isPassAndPlay ? opposite(playerColor) : null;
  const coachOn = active?.settings.mode === "coach" || active?.settings.mode === "arena";
  const coachBlocking =
    active?.settings.mode === "coach" && (coachPhase === "analyzing" || coachPhase === "review");
  const uciMoves = useMemo(() => game.history.map((m) => toUciMove(m)), [game.history]);

  useEffect(() => {
    if (!active) setOrientation(settings.side === "b" ? "b" : "w");
  }, [active, settings.side]);

  const queuePremove = useCallback((move: BoardMove) => {
    premoveRef.current = move;
    setPremove(move);
  }, []);

  const cancelPremove = useCallback(() => {
    premoveRef.current = null;
    setPremove(null);
  }, []);

  const recordEvalPoint = useCallback((ply: number, whiteScore: EngineScore) => {
    setEvalHistory((prev) => {
      const filtered = prev.filter((pt) => pt.ply < ply);
      return [...filtered, { ply, pawns: chartPawns(whiteScore) }];
    });
  }, []);

  const recordMove = useCallback(
    (color: Color) => {
      clockHistory.current.push(clock.press(color));
      setHint(null);
      setViewPly(null);
      setDrawNotice(null);
    },
    [clock],
  );

  const resetCoach = useCallback(() => {
    setCoachPhase("idle");
    setPending(null);
    setRecords([]);
    setCoachError(null);
  }, []);

  const startGame = useCallback(
    (
      next: GameSettings,
      options?: { startFen?: string | null | undefined; drillLabel?: string | null | undefined },
    ) => {
      if (passFlipTimerRef.current !== null) {
        window.clearTimeout(passFlipTimerRef.current);
        passFlipTimerRef.current = null;
      }
      const startFen = options?.startFen?.trim() || null;
      const drillLabel = options?.drillLabel ?? null;
      let startTurn: Color = "w";
      if (startFen) {
        try {
          startTurn = new Chess(startFen).turn();
        } catch {
          startTurn = "w";
        }
      }
      const color: Color =
        next.mode === "pass-and-play"
          ? startTurn
          : startFen
            ? startTurn
            : next.side === "random"
              ? Math.random() < 0.5
                ? "w"
                : "b"
              : next.side;
      const resolvedTime = defaultTimeForMode(next.mode, next.timeControl);
      const started: GameSettings = { ...next, timeControl: resolvedTime };
      const tc = getTimeControl(started.timeControl);
      stopSpeaking();
      engine.stop();
      game.reset(startFen ?? undefined);
      clock.reset(tc.initialMs, tc.incrementMs);
      clockHistory.current = [clock.read()];
      premoveRef.current = null;
      setPremove(null);
      setHint(null);
      setEngineMoveError(null);
      setDrawNotice(null);
      setRedoStack([]);
      setViewPly(null);
      setLiveEval(null);
      setEvalHistory([]);
      resetCoach();
      setOrientation(color);
      gameCounter.current += 1;
      gameStartedAt.current = Date.now();
      setActive({
        id: gameCounter.current,
        settings: started,
        playerColor: color,
        startFen,
        drillLabel,
      });
      void engine.newGame();
    },
    [clock, engine, game, resetCoach],
  );

  const restart = useCallback(() => {
    if (active) {
      startGame(active.settings, { startFen: active.startFen, drillLabel: active.drillLabel });
    }
  }, [active, startGame]);

  const backToSetup = useCallback(() => {
    if (passFlipTimerRef.current !== null) {
      window.clearTimeout(passFlipTimerRef.current);
      passFlipTimerRef.current = null;
    }
    stopSpeaking();
    engine.stop();
    clock.pause();
    game.reset();
    premoveRef.current = null;
    setPremove(null);
    setActive(null);
    setHint(null);
    setEngineMoveError(null);
    setDrawNotice(null);
    setRedoStack([]);
    setViewPly(null);
    setLiveEval(null);
    setEvalHistory([]);
    resetCoach();
    setOrientation(settings.side === "b" ? "b" : "w");
  }, [clock, engine, game, resetCoach, settings.side]);

  const updateSettings = useCallback(
    (patch: Partial<GameSettings>) => {
      if (patch.mode && !patch.timeControl) {
        const nextTc = defaultTimeForMode(patch.mode, settings.timeControl);
        updateUserSettings({ game: { ...patch, timeControl: nextTc } });
      } else {
        updateUserSettings({ game: patch });
      }
    },
    [settings.timeControl, updateUserSettings],
  );

  const playerMove = useCallback(
    (move: BoardMove): boolean => {
      if (viewPly !== null && viewPly < gameRef.current.history.length) return false;
      const g = gameRef.current;
      const chess = g.chess();
      const localTwoPlayer = active?.settings.mode === "pass-and-play";
      const expectedTurn = localTwoPlayer ? g.turn : active?.playerColor;
      if (
        !active ||
        !expectedTurn ||
        g.isOver ||
        chess.isGameOver() ||
        g.turn !== expectedTurn ||
        chess.turn() !== expectedTurn ||
        coachBlocking
      ) {
        return false;
      }
      if (hintPendingRef.current) engine.stop();
      premoveRef.current = null;
      setPremove(null);
      const fenBefore = g.fen;
      const movesBefore = g.history.map((m) => toUciMove(m));
      const ply = g.history.length;
      const played = g.move(move);
      if (!played) return false;
      setRedoStack([]);
      recordMove(played.color);
      if (localTwoPlayer && userSettings.board.autoFlipPassAndPlay && !g.chess().isGameOver()) {
        const nextSide = opposite(played.color);
        if (passFlipTimerRef.current !== null) window.clearTimeout(passFlipTimerRef.current);
        passFlipTimerRef.current = window.setTimeout(() => {
          setOrientation(nextSide);
          passFlipTimerRef.current = null;
        }, 320);
      }
      if (active.settings.mode === "coach" || active.settings.mode === "arena") {
        const afterChess = g.chess();
        setCoachError(null);
        setPending({
          ply,
          fenBefore,
          movesBefore,
          move: played,
          playerColor: active.playerColor,
          gameOverAfter: afterChess.isGameOver(),
        });
        if (active.settings.mode === "coach") setCoachPhase("analyzing");
      }
      return true;
    },
    [active, coachBlocking, engine, recordMove, userSettings.board.autoFlipPassAndPlay, viewPly],
  );

  // Engine's turn: request one search per position with bot profile, depthLimit, and playStyle.
  useEffect(() => {
    if (
      !active ||
      isPassAndPlay ||
      !engineColor ||
      game.isOver ||
      !engine.available ||
      coachBlocking
    )
      return;
    if (game.turn !== engineColor) return;
    let live = true;
    const namedBot = getBotById(active.settings.botId);

    // Thematic opening book move for named bots during opening
    if (namedBot && !active.startFen && game.history.length < 8) {
      const bookUci = pickBotBookMove(namedBot, game.fen);
      if (bookUci) {
        const timer = window.setTimeout(() => {
          if (!live) return;
          const parsed = parseUciMove(bookUci);
          const played = parsed ? gameRef.current.move(parsed) : null;
          if (played) {
            setEngineMoveError(null);
            recordMove(played.color);
            const queued = premoveRef.current;
            if (queued && !gameRef.current.isOver) {
              premoveRef.current = null;
              setPremove(null);
              const validated = validateQueuedPremove(
                gameRef.current.fen,
                queued,
                active.playerColor,
              );
              if (validated) {
                window.setTimeout(() => {
                  playerMove(validated);
                }, 40);
              }
            }
          }
        }, 280);
        return () => {
          live = false;
          window.clearTimeout(timer);
        };
      }
    }

    const level = getDifficulty(active.settings.difficulty);
    const tc = getTimeControl(active.settings.timeControl);
    const remaining = clock.enabled ? clock.read()[engineColor] : null;
    const es = engineSettingsRef.current;
    const { style: resolvedStyle, bonusSkill } = resolveEffectiveStyle(
      namedBot ? namedBot.playStyle : es.playStyle,
      es.historicalStyle,
    );
    const baseSkill = namedBot ? namedBot.skillLevel : level.skillLevel;
    const skillLevel = Math.min(20, baseSkill + (namedBot ? 0 : bonusSkill));
    const baseThinkMs = thinkTimeMs(es.thinkTime, es.customSeconds, game.fen);
    const movetimeMs = engineMovetime(baseThinkMs, remaining, tc.incrementMs);
    const botOrLevelDepth = namedBot ? namedBot.depth : level.depth;
    const depth =
      es.depthLimit !== null
        ? botOrLevelDepth !== null
          ? Math.min(botOrLevelDepth, es.depthLimit)
          : es.depthLimit
        : botOrLevelDepth;
    const multiPv = resolvedStyle !== "balanced" && skillLevel >= 10 ? 3 : 1;

    engine
      .search({
        purpose: "move",
        ...(active.startFen ? { startFen: active.startFen } : {}),
        moves: uciMoves,
        skillLevel,
        depth,
        movetimeMs,
        multiPv,
        minDurationMs: movetimeMs,
      })
      .then((result) => {
        if (!live || result.cancelled) return;
        if (!result.bestMove) {
          setEngineMoveError("Движок не вернул ход для текущей позиции.");
          return;
        }
        if (result.info?.score) {
          const whiteScore = toWhitePov(result.info.score, engineColor);
          setLiveEval({
            score: whiteScore,
            depth: result.info.depth,
            lines: result.lines,
            turn: engineColor,
          });
          recordEvalPoint(gameRef.current.history.length, whiteScore);
        }
        const chosenUci = chooseStyledCandidate(
          gameRef.current.fen,
          result.bestMove,
          result.lines,
          resolvedStyle,
          engineColor,
        );
        const parsed = parseUciMove(chosenUci);
        const played = parsed ? gameRef.current.move(parsed) : null;
        if (!played) {
          setEngineMoveError(
            `Движок вернул ход «${chosenUci}», который нелегален в текущей позиции. Ход не применён.`,
          );
          return;
        }
        setEngineMoveError(null);
        recordMove(played.color);

        const queued = premoveRef.current;
        if (queued && !gameRef.current.isOver) {
          premoveRef.current = null;
          setPremove(null);
          const validated = validateQueuedPremove(gameRef.current.fen, queued, active.playerColor);
          if (validated) {
            window.setTimeout(() => {
              playerMove(validated);
            }, 40);
          }
        }
      })
      .catch(() => {
        // Fatal errors surface via engine.error.
      });
    return () => {
      live = false;
      engine.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one search per (game, position)
  }, [
    active,
    isPassAndPlay,
    engineColor,
    game.fen,
    game.isOver,
    game.turn,
    engine.available,
    coachBlocking,
  ]);

  useEffect(() => {
    if (!game.isOver) return;
    clock.pause();
    engine.stop();
    premoveRef.current = null;
    setPremove(null);
    setHint(null);
  }, [game.isOver, clock, engine]);

  useEffect(() => {
    if (!pending || !engine.available || !active) return;
    let live = true;
    const gameId = active.id;
    analyzePlayerMove(engine.search, pending)
      .then((verdict) => {
        if (!live || !verdict) return;
        const record: CoachRecord = {
          ply: pending.ply,
          moveNumber: Math.floor(pending.ply / 2) + 1,
          san: pending.move.san,
          fenBefore: pending.fenBefore,
          uci: toUciMove(pending.move),
          verdict,
          corrected: false,
        };
        setLiveEval({
          score: verdict.scoreAfter,
          depth: 14,
          lines: [],
          turn: pending.playerColor === "w" ? "b" : "w",
        });
        recordEvalPoint(pending.ply, verdict.scoreAfter);
        setRecords((rs) => [...rs.filter((r) => r.corrected || r.ply < pending.ply), record]);
        setPending(null);
        const over = gameRef.current.isOver;
        if (active.settings.mode === "coach") {
          setCoachPhase(isMistakeClass(verdict.classification) && !over ? "review" : "idle");
        } else {
          setCoachPhase("idle");
        }
      })
      .catch(() => {
        if (!live || gameCounter.current !== gameId) return;
        setPending(null);
        setCoachPhase("idle");
        setCoachError("Тренер не смог проанализировать ход — партия продолжается без оценки.");
      });
    return () => {
      live = false;
      engine.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one analysis per pending move
  }, [pending, engine.available]);

  const outcomeType = game.outcome?.type ?? null;
  const undoPlies = isPassAndPlay
    ? game.history.length > 0
      ? 1
      : 0
    : playerColor
      ? pliesToUndo(
          game.history.map((m) => m.color),
          playerColor,
        )
      : 0;
  const canUndo =
    active !== null &&
    undoPlies > 0 &&
    !hintPending &&
    !coachBlocking &&
    outcomeType !== "timeout" &&
    outcomeType !== "timeout-draw" &&
    outcomeType !== "resign" &&
    outcomeType !== "agreement";

  const takeBack = useCallback(
    (plies: number, saveForRedo = false) => {
      if (!playerColor || plies <= 0) return;
      engine.stop();
      premoveRef.current = null;
      setPremove(null);
      const historySlice = gameRef.current.history.slice(-plies);
      const clockStartIdx = Math.max(0, clockHistory.current.length - plies);
      if (saveForRedo && historySlice.length > 0) {
        const batch: RedoMoveEntry[] = historySlice.map((m, i) => ({
          from: m.from,
          to: m.to,
          ...(m.promotion ? { promotion: m.promotion as PromotionPiece } : {}),
          ...(clockHistory.current[clockStartIdx + i]
            ? { clockSnapshot: clockHistory.current[clockStartIdx + i] }
            : {}),
        }));
        setRedoStack((prev) => [...prev, batch]);
      }
      const newLength = game.history.length - plies;
      game.undo(plies);
      clockHistory.current = clockHistory.current.slice(0, clockHistory.current.length - plies);
      const snapshot = clockHistory.current[clockHistory.current.length - 1];
      if (snapshot) clock.restore(snapshot, newLength > 0 ? game.chess().turn() : null);
      setHint(null);
      setViewPly(null);
      setEngineMoveError(null);
      setPending(null);
      setRecords((rs) => rs.filter((r) => r.corrected || r.ply < newLength));
      setEvalHistory((pts) => pts.filter((p) => p.ply < newLength));
    },
    [clock, engine, game, playerColor],
  );

  const undo = useCallback(() => {
    if (!canUndo) return;
    takeBack(undoPlies, true);
    setCoachPhase("idle");
  }, [canUndo, takeBack, undoPlies]);

  const canRedo =
    active !== null && redoStack.length > 0 && !hintPending && !coachBlocking && !game.isOver;

  const redo = useCallback(() => {
    if (!canRedo || !playerColor) return;
    const batch = redoStack[redoStack.length - 1];
    if (!batch || batch.length === 0) return;
    engine.stop();
    for (const entry of batch) {
      const played = gameRef.current.move({
        from: entry.from,
        to: entry.to,
        ...(entry.promotion ? { promotion: entry.promotion } : {}),
      });
      if (!played) break;
      const snap = entry.clockSnapshot ?? clock.press(played.color);
      clockHistory.current.push(snap);
    }
    const latestSnap = clockHistory.current[clockHistory.current.length - 1];
    if (latestSnap) clock.restore(latestSnap, gameRef.current.chess().turn());
    setRedoStack((prev) => prev.slice(0, -1));
    setHint(null);
    setViewPly(null);
    setEngineMoveError(null);
  }, [canRedo, clock, engine, playerColor, redoStack]);

  const latestRecord = records[records.length - 1] ?? null;

  const fixMove = useCallback(() => {
    if (coachPhase !== "review" || !latestRecord || !playerColor) return;
    const record = latestRecord;
    setRecords((rs) => rs.map((r) => (r === record ? { ...r, corrected: true } : r)));
    takeBack(1, false);
    if (record.verdict.best) {
      const layered = buildLayeredHint(gameRef.current.fen, record.verdict.best.uci, 3);
      if (layered) setHint(layered);
    }
    setCoachPhase("fixing");
  }, [coachPhase, latestRecord, playerColor, takeBack]);

  const continueGame = useCallback(() => {
    if (coachPhase === "review") setCoachPhase("idle");
  }, [coachPhase]);

  const isViewingHistory = viewPly !== null && viewPly < game.history.length;
  const inspected = useMemo(
    () => (isViewingHistory ? buildSnapshotAtPly(game.history, viewPly, active?.startFen) : null),
    [active?.startFen, game.history, isViewingHistory, viewPly],
  );

  const inspectPly = useCallback(
    (ply: number | null) => {
      if (ply === null || ply >= game.history.length) {
        setViewPly(null);
      } else {
        setViewPly(Math.max(0, ply));
      }
    },
    [game.history.length],
  );

  const stepHistory = useCallback(
    (delta: number) => {
      const current = viewPly ?? game.history.length;
      const next = Math.max(0, Math.min(game.history.length, current + delta));
      setViewPly(next >= game.history.length ? null : next);
    },
    [game.history.length, viewPly],
  );

  const isPlayersTurn =
    active !== null &&
    !game.isOver &&
    !isViewingHistory &&
    (isPassAndPlay || game.turn === playerColor) &&
    !coachBlocking;
  const canPremove =
    active !== null &&
    !isPassAndPlay &&
    !game.isOver &&
    !isViewingHistory &&
    !coachBlocking &&
    userSettings.board.premovesEnabled &&
    game.turn === engineColor;
  const canHint = isPlayersTurn && engine.status === "ready" && !hintPending;

  const requestHint = useCallback(
    (requestedLevel?: HintLevel) => {
      if (!canHint) return;
      if (hint) {
        const nextLevel: HintLevel =
          requestedLevel ?? (hint.level < 3 ? ((hint.level + 1) as HintLevel) : 3);
        if (nextLevel !== hint.level) setHint({ ...hint, level: nextLevel });
        return;
      }

      const fen = game.fen;
      hintPendingRef.current = true;
      setHintPending(true);
      engine
        .search({
          purpose: "hint",
          ...(active?.startFen ? { startFen: active.startFen } : {}),
          moves: uciMoves,
          ...HINT_SEARCH,
        })
        .then((result) => {
          if (result.cancelled || !result.bestMove || gameRef.current.fen !== fen) return;
          if (result.info?.score && playerColor) {
            setLiveEval({
              score: toWhitePov(result.info.score, playerColor),
              depth: result.info.depth,
              lines: result.lines,
              turn: playerColor,
            });
          }
          const level = requestedLevel ?? 1;
          const layered = buildLayeredHint(fen, result.bestMove, level);
          if (layered) setHint(layered);
        })
        .catch(() => undefined)
        .finally(() => {
          hintPendingRef.current = false;
          setHintPending(false);
        });
    },
    [active?.startFen, canHint, engine, game.fen, hint, playerColor, uciMoves],
  );

  const offerDraw = useCallback(() => {
    if (!active || game.isOver) return;
    if (isPassAndPlay) {
      setDrawNotice(null);
      game.declareOutcome({ type: "agreement" });
      return;
    }
    if (!engineColor) return;
    if (game.history.length < 16) {
      setDrawNotice(
        "Бот отклонил ничью: в дебюте борьба только начинается (минимум 8 полных ходов).",
      );
      return;
    }
    const engineCp = liveEval?.score ? povCp(liveEval.score, engineColor) : 0;
    if (engineCp <= 35) {
      setPending(null);
      setCoachPhase("idle");
      setDrawNotice(null);
      game.declareOutcome({ type: "agreement" });
    } else {
      setDrawNotice("Stockfish оценивает позицию в свою пользу и отклоняет ничью.");
    }
  }, [active, engineColor, game, isPassAndPlay, liveEval?.score]);

  const resign = useCallback(() => {
    if (!active || game.isOver) return;
    setPending(null);
    setCoachPhase("idle");
    if (isPassAndPlay) {
      game.declareOutcome({ type: "resign", winner: opposite(game.turn) });
      return;
    }
    if (!engineColor) return;
    game.declareOutcome({ type: "resign", winner: engineColor });
  }, [active, engineColor, game, isPassAndPlay]);

  const flip = useCallback(() => setOrientation((o) => opposite(o)), []);

  const threatSquares = useMemo(() => {
    if (!showThreats || !playerColor) return [];
    return hangingPieces(game.chess(), isPassAndPlay ? game.turn : playerColor);
  }, [game, isPassAndPlay, playerColor, showThreats]);

  const lastMoveObj = game.history[game.history.length - 1];
  const lastMove = lastMoveObj ? { from: lastMoveObj.from, to: lastMoveObj.to } : null;

  return {
    game,
    engine,
    clock,
    settings,
    active,
    playerColor,
    engineColor,
    orientation,
    hint,
    hintPending,
    engineMoveError,
    lastMove,
    isPlayersTurn,
    canPremove,
    premove,
    isPassAndPlay,
    canUndo,
    canRedo,
    canHint,
    canResign: active !== null && !game.isOver,
    hasMoves: game.history.length > 0,
    viewPly,
    inspected,
    liveEval,
    evalHistory,
    showThreats,
    threatSquares,
    drawNotice,
    elapsedSeconds: () => Math.max(1, Math.round((Date.now() - gameStartedAt.current) / 1000)),
    thinkMs: thinkTimeMs(
      userSettings.engine.thinkTime,
      userSettings.engine.customSeconds,
      game.fen,
    ),
    coach: {
      enabled: coachOn,
      phase: coachPhase,
      records,
      latest: latestRecord,
      error: coachError,
    },
    actions: {
      startGame,
      restart,
      backToSetup,
      updateSettings,
      playerMove,
      queuePremove,
      cancelPremove,
      undo,
      redo,
      requestHint,
      offerDraw,
      resign,
      flip,
      fixMove,
      continueGame,
      inspectPly,
      stepHistory,
      toggleThreats: () => setShowThreats((v) => !v),
    },
  };
}

export type PlayController = ReturnType<typeof usePlayController>;
