import { Chess, type Move } from "chess.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useChessClock } from "@/hooks/useChessClock";
import { useChessGame } from "@/hooks/useChessGame";
import { useStockfish } from "@/hooks/useStockfish";
import { useSettings } from "@/features/settings/SettingsProvider";
import { analyzePlayerMove, type PendingAnalysis } from "@/features/coach/analysis";
import type { ClockTimes } from "@/lib/chess/clock";
import { engineMovetime, getDifficulty } from "@/lib/chess/difficulty";
import { resolveTimeout } from "@/lib/chess/outcome";
import type { BoardCell } from "@/lib/chess/pieceIds";
import { getTimeControl } from "@/lib/chess/timeControls";
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
import { playUci } from "@/lib/coach/tactics";
import type { PlayStyleId } from "@/lib/settings/settings";
import { thinkTimeMs } from "@/lib/engine/thinkTime";
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

function chooseStyledCandidate(
  fen: string,
  bestMove: string,
  lines: readonly EngineInfo[],
  playStyle: PlayStyleId,
  engineColor: Color,
): string {
  if (playStyle === "balanced" || lines.length < 2) return bestMove;
  const pv1 = lines[0];
  const pv2 = lines[1];
  const uci2 = pv2?.pv[0];
  if (!pv1?.score || !pv2?.score || !uci2) return bestMove;
  const cp1 = povCp(toWhitePov(pv1.score, engineColor), engineColor);
  const cp2 = povCp(toWhitePov(pv2.score, engineColor), engineColor);
  // Only switch away from PV1 if PV2 is practically equal (within 15 cp) and matches style.
  if (cp1 - cp2 > 15) return bestMove;

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

  if (playStyle === "aggressive" && aggrScore(m2) > aggrScore(m1)) return uci2;
  if (playStyle === "solid" && solidScore(m2) > solidScore(m1)) return uci2;
  return bestMove;
}

function buildSnapshotAtPly(history: readonly Move[], targetPly: number): InspectedPosition {
  const chess = new Chess();
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

/**
 * Orchestrates one game against Stockfish: rules (chess.js), clocks, the
 * engine worker, redo stack, history inspection, multi-level hints, and Coach mode.
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
  const [liveEval, setLiveEval] = useState<{
    score: EngineScore;
    depth: number;
    lines: EngineInfo[];
    turn: Color;
  } | null>(null);
  const [evalHistory, setEvalHistory] = useState<EvalPoint[]>([]);

  const clockHistory = useRef<ClockTimes[]>([]);
  const gameCounter = useRef(0);
  const hintPendingRef = useRef(false);

  const playerColor = active?.playerColor ?? null;
  const engineColor = playerColor ? opposite(playerColor) : null;
  const coachOn = active?.settings.mode === "coach";
  const coachBlocking = coachOn && (coachPhase === "analyzing" || coachPhase === "review");
  const uciMoves = useMemo(() => game.history.map((m) => toUciMove(m)), [game.history]);

  useEffect(() => {
    if (!active) setOrientation(settings.side === "b" ? "b" : "w");
  }, [active, settings.side]);

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
    (next: GameSettings) => {
      const color: Color = next.side === "random" ? (Math.random() < 0.5 ? "w" : "b") : next.side;
      const started: GameSettings =
        next.mode === "coach" ? { ...next, timeControl: "untimed" } : next;
      const tc = getTimeControl(started.timeControl);
      stopSpeaking();
      engine.stop();
      game.reset();
      clock.reset(tc.initialMs, tc.incrementMs);
      clockHistory.current = [clock.read()];
      setHint(null);
      setEngineMoveError(null);
      setRedoStack([]);
      setViewPly(null);
      setLiveEval(null);
      setEvalHistory([]);
      resetCoach();
      setOrientation(color);
      gameCounter.current += 1;
      setActive({ id: gameCounter.current, settings: started, playerColor: color });
      void engine.newGame();
    },
    [clock, engine, game, resetCoach],
  );

  const restart = useCallback(() => {
    if (active) startGame(active.settings);
  }, [active, startGame]);

  const backToSetup = useCallback(() => {
    stopSpeaking();
    engine.stop();
    clock.pause();
    game.reset();
    setActive(null);
    setHint(null);
    setEngineMoveError(null);
    setRedoStack([]);
    setViewPly(null);
    setLiveEval(null);
    setEvalHistory([]);
    resetCoach();
    setOrientation(settings.side === "b" ? "b" : "w");
  }, [clock, engine, game, resetCoach, settings.side]);

  const updateSettings = useCallback(
    (patch: Partial<GameSettings>) => updateUserSettings({ game: patch }),
    [updateUserSettings],
  );

  const playerMove = useCallback(
    (move: BoardMove): boolean => {
      if (viewPly !== null && viewPly < gameRef.current.history.length) return false;
      const g = gameRef.current;
      const chess = g.chess();
      if (
        !active ||
        g.isOver ||
        chess.isGameOver() ||
        g.turn !== active.playerColor ||
        chess.turn() !== active.playerColor ||
        coachBlocking
      ) {
        return false;
      }
      if (hintPendingRef.current) engine.stop();
      const fenBefore = g.fen;
      const movesBefore = g.history.map((m) => toUciMove(m));
      const ply = g.history.length;
      const played = g.move(move);
      if (!played) return false;
      setRedoStack([]);
      recordMove(played.color);
      if (active.settings.mode === "coach") {
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
        setCoachPhase("analyzing");
      }
      return true;
    },
    [active, coachBlocking, engine, recordMove, viewPly],
  );

  // Engine's turn: request one search per position with user depthLimit and playStyle.
  useEffect(() => {
    if (!active || !engineColor || game.isOver || !engine.available || coachBlocking) return;
    if (game.turn !== engineColor) return;
    let live = true;
    const level = getDifficulty(active.settings.difficulty);
    const tc = getTimeControl(active.settings.timeControl);
    const remaining = clock.enabled ? clock.read()[engineColor] : null;
    const es = engineSettingsRef.current;
    const baseThinkMs = thinkTimeMs(es.thinkTime, es.customSeconds, game.fen);
    const movetimeMs = engineMovetime(baseThinkMs, remaining, tc.incrementMs);
    const depth =
      es.depthLimit !== null
        ? level.depth !== null
          ? Math.min(level.depth, es.depthLimit)
          : es.depthLimit
        : level.depth;
    const multiPv = es.playStyle !== "balanced" && level.skillLevel >= 12 ? 2 : 1;

    engine
      .search({
        purpose: "move",
        moves: uciMoves,
        skillLevel: level.skillLevel,
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
          engineSettingsRef.current.playStyle,
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
      })
      .catch(() => {
        // Fatal errors surface via engine.error.
      });
    return () => {
      live = false;
      engine.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one search per (game, position)
  }, [active, engineColor, game.fen, game.isOver, game.turn, engine.available, coachBlocking]);

  useEffect(() => {
    if (!game.isOver) return;
    clock.pause();
    engine.stop();
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
        setCoachPhase(isMistakeClass(verdict.classification) && !over ? "review" : "idle");
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
  const undoPlies = playerColor
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
    outcomeType !== "resign";

  const takeBack = useCallback(
    (plies: number, saveForRedo = false) => {
      if (!playerColor || plies <= 0) return;
      engine.stop();
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
      if (snapshot) clock.restore(snapshot, newLength > 0 ? playerColor : null);
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
    if (latestSnap) clock.restore(latestSnap, playerColor);
    setRedoStack((prev) => prev.slice(0, -1));
    setHint(null);
    setViewPly(null);
    setEngineMoveError(null);
  }, [canRedo, clock, engine, playerColor, redoStack]);

  const latestRecord = records[records.length - 1] ?? null;

  /** "Исправить ход": take back the mistake and show Level 3 best move on the board. */
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
    () => (isViewingHistory ? buildSnapshotAtPly(game.history, viewPly) : null),
    [game.history, isViewingHistory, viewPly],
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
    game.turn === playerColor &&
    !coachBlocking;
  const canHint = isPlayersTurn && engine.status === "ready" && !hintPending;

  const requestHint = useCallback(
    (requestedLevel?: HintLevel) => {
      if (!canHint) return;
      // Escalate existing layered hint cleanly without triggering another search.
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
        .search({ purpose: "hint", moves: uciMoves, ...HINT_SEARCH })
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
    [canHint, engine, game.fen, hint, playerColor, uciMoves],
  );

  const resign = useCallback(() => {
    if (!active || game.isOver || !engineColor) return;
    setPending(null);
    setCoachPhase("idle");
    game.declareOutcome({ type: "resign", winner: engineColor });
  }, [active, engineColor, game]);

  const flip = useCallback(() => setOrientation((o) => opposite(o)), []);

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
    canUndo,
    canRedo,
    canHint,
    canResign: active !== null && !game.isOver,
    hasMoves: game.history.length > 0,
    viewPly,
    inspected,
    liveEval,
    evalHistory,
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
      undo,
      redo,
      requestHint,
      resign,
      flip,
      fixMove,
      continueGame,
      inspectPly,
      stepHistory,
    },
  };
}

export type PlayController = ReturnType<typeof usePlayController>;
