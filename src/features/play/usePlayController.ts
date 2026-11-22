import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useChessClock } from "@/hooks/useChessClock";
import { useChessGame } from "@/hooks/useChessGame";
import { useStockfish } from "@/hooks/useStockfish";
import { useSettings } from "@/features/settings/SettingsProvider";
import { analyzePlayerMove, type PendingAnalysis } from "@/features/coach/analysis";
import type { ClockTimes } from "@/lib/chess/clock";
import { engineMovetime, getDifficulty } from "@/lib/chess/difficulty";
import { resolveTimeout } from "@/lib/chess/outcome";
import { getTimeControl } from "@/lib/chess/timeControls";
import { opposite, type BoardMove, type Color } from "@/lib/chess/types";
import { parseUciMove, toUciMove } from "@/lib/chess/uci";
import { pliesToUndo } from "@/lib/chess/undo";
import { isMistakeClass } from "@/lib/coach/evaluation";
import type { CoachRecord } from "@/lib/coach/report";
import { thinkTimeMs } from "@/lib/engine/thinkTime";

import type { ActiveGame, GameSettings, HintMove } from "./types";

const HINT_SEARCH = { skillLevel: 20, depth: 16, movetimeMs: 1000 } as const;

/**
 * Coach flow for one player move:
 * idle → analyzing (engine reply waits) → idle, or → review (a mistake: the player
 * decides) → idle ("Продолжить") / fixing ("Исправить ход": move taken back).
 */
export type CoachPhase = "idle" | "analyzing" | "review" | "fixing";

/**
 * Orchestrates one game against Stockfish: rules (chess.js), clocks, the
 * engine worker and (in Chess Coach mode) the coach's analysis of every
 * player move. UI components only read state from here and call actions.
 */
export function usePlayController() {
  const game = useChessGame();
  const engine = useStockfish();
  const { settings: userSettings, update: updateUserSettings } = useSettings();
  const gameRef = useRef(game);
  gameRef.current = game;
  const thinkMsRef = useRef(0);
  thinkMsRef.current = thinkTimeMs(userSettings.engine.thinkTime, userSettings.engine.customSeconds);

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
  const clockHistory = useRef<ClockTimes[]>([]);
  const gameCounter = useRef(0);
  const hintPendingRef = useRef(false);

  const playerColor = active?.playerColor ?? null;
  const engineColor = playerColor ? opposite(playerColor) : null;
  const coachOn = active?.settings.mode === "coach";
  const coachBlocking = coachOn && (coachPhase === "analyzing" || coachPhase === "review");
  const uciMoves = useMemo(() => game.history.map((m) => toUciMove(m)), [game.history]);

  // Keep the board facing the side chosen in the setup screen.
  useEffect(() => {
    if (!active) setOrientation(settings.side === "b" ? "b" : "w");
  }, [active, settings.side]);

  const recordMove = useCallback(
    (color: Color) => {
      clockHistory.current.push(clock.press(color));
      setHint(null);
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
      // Coach games are untimed: analysis and decisions must not eat anyone's clock.
      const started: GameSettings = next.mode === "coach" ? { ...next, timeControl: "untimed" } : next;
      const tc = getTimeControl(started.timeControl);
      engine.stop();
      game.reset();
      clock.reset(tc.initialMs, tc.incrementMs);
      clockHistory.current = [clock.read()];
      setHint(null);
      setEngineMoveError(null);
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
    engine.stop();
    clock.pause();
    game.reset();
    setActive(null);
    setHint(null);
    setEngineMoveError(null);
    resetCoach();
    setOrientation(settings.side === "b" ? "b" : "w");
  }, [clock, engine, game, resetCoach, settings.side]);

  const updateSettings = useCallback(
    (patch: Partial<GameSettings>) => updateUserSettings({ game: patch }),
    [updateUserSettings],
  );

  const playerMove = useCallback(
    (move: BoardMove): boolean => {
      const g = gameRef.current;
      if (!active || g.isOver || g.turn !== active.playerColor || coachBlocking) return false;
      if (hintPendingRef.current) engine.stop();
      const fenBefore = g.fen;
      const movesBefore = g.history.map((m) => toUciMove(m));
      const ply = g.history.length;
      const played = g.move(move);
      if (!played) return false;
      recordMove(played.color);
      if (active.settings.mode === "coach") {
        const chess = g.chess();
        setCoachError(null);
        setPending({
          ply,
          fenBefore,
          movesBefore,
          move: played,
          playerColor: active.playerColor,
          gameOverAfter: chess.isGameOver(),
        });
        setCoachPhase("analyzing");
      }
      return true;
    },
    [active, coachBlocking, engine, recordMove],
  );

  // Engine's turn: request exactly one search per position. Cleanup cancels it.
  useEffect(() => {
    if (!active || !engineColor || game.isOver || !engine.available || coachBlocking) return;
    if (game.turn !== engineColor) return;
    let live = true;
    const level = getDifficulty(active.settings.difficulty);
    const tc = getTimeControl(active.settings.timeControl);
    const remaining = clock.enabled ? clock.read()[engineColor] : null;
    const movetimeMs = engineMovetime(thinkMsRef.current, remaining, tc.incrementMs);
    engine
      .search({
        purpose: "move",
        moves: uciMoves,
        skillLevel: level.skillLevel,
        depth: level.depth,
        movetimeMs,
        // Depth-capped levels finish early; still move only after the chosen time.
        minDurationMs: movetimeMs,
      })
      .then((result) => {
        if (!live || result.cancelled) return;
        if (!result.bestMove) {
          setEngineMoveError("Движок не вернул ход для текущей позиции.");
          return;
        }
        const parsed = parseUciMove(result.bestMove);
        const played = parsed ? gameRef.current.move(parsed) : null;
        if (!played) {
          setEngineMoveError(
            `Движок вернул ход «${result.bestMove}», который нелегален в текущей позиции. Ход не применён.`,
          );
          return;
        }
        setEngineMoveError(null);
        recordMove(played.color);
      })
      .catch(() => {
        // Fatal engine errors are reported through engine.error.
      });
    return () => {
      live = false;
      engine.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one search per (game, position)
  }, [active, engineColor, game.fen, game.isOver, game.turn, engine.available, coachBlocking]);

  // Game over: freeze clocks, stop any calculation (the coach's last analysis restarts below).
  useEffect(() => {
    if (!game.isOver) return;
    clock.pause();
    engine.stop();
    setHint(null);
  }, [game.isOver, clock, engine]);

  // Coach: analyse the player's move, then let the engine reply or ask the player.
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
    (plies: number) => {
      if (!playerColor) return;
      engine.stop();
      const newLength = game.history.length - plies;
      game.undo(plies);
      clockHistory.current = clockHistory.current.slice(0, clockHistory.current.length - plies);
      const snapshot = clockHistory.current[clockHistory.current.length - 1];
      if (snapshot) clock.restore(snapshot, newLength > 0 ? playerColor : null);
      setHint(null);
      setEngineMoveError(null);
      setPending(null);
      setRecords((rs) => rs.filter((r) => r.corrected || r.ply < newLength));
    },
    [clock, engine, game, playerColor],
  );

  const undo = useCallback(() => {
    if (!canUndo) return;
    takeBack(undoPlies);
    setCoachPhase("idle");
  }, [canUndo, takeBack, undoPlies]);

  const latestRecord = records[records.length - 1] ?? null;

  /** "Исправить ход": take back the mistake and show the coach's recommended move. */
  const fixMove = useCallback(() => {
    if (coachPhase !== "review" || !latestRecord || !playerColor) return;
    const record = latestRecord;
    // Mark first: takeBack() drops uncorrected records of the removed ply.
    setRecords((rs) => rs.map((r) => (r === record ? { ...r, corrected: true } : r)));
    takeBack(1);
    const best = record.verdict.best;
    const legal = best
      ? gameRef.current
          .chess()
          .moves({ verbose: true })
          .find((m) => toUciMove(m) === best.uci)
      : undefined;
    if (legal) {
      setHint({
        from: legal.from,
        to: legal.to,
        san: legal.san,
        piece: legal.piece,
        captured: legal.captured ?? null,
        promotion: legal.promotion ?? null,
      });
    }
    setCoachPhase("fixing");
  }, [coachPhase, latestRecord, playerColor, takeBack]);

  /** "Продолжить игру": keep the move; the coach remembers the mistake. */
  const continueGame = useCallback(() => {
    if (coachPhase === "review") setCoachPhase("idle");
  }, [coachPhase]);

  const isPlayersTurn =
    active !== null && !game.isOver && game.turn === playerColor && !coachBlocking;
  const canHint = isPlayersTurn && engine.status === "ready" && !hintPending;

  const requestHint = useCallback(() => {
    if (!canHint) return;
    const fen = game.fen;
    hintPendingRef.current = true;
    setHintPending(true);
    engine
      .search({ purpose: "hint", moves: uciMoves, ...HINT_SEARCH })
      .then((result) => {
        if (result.cancelled || !result.bestMove || gameRef.current.fen !== fen) return;
        const parsed = parseUciMove(result.bestMove);
        if (!parsed) return;
        const legal = gameRef.current.legalMoves.find(
          (m) =>
            m.from === parsed.from &&
            m.to === parsed.to &&
            (m.promotion ?? null) === (parsed.promotion ?? null),
        );
        if (!legal) return;
        setHint({
          from: legal.from,
          to: legal.to,
          san: legal.san,
          piece: legal.piece,
          captured: legal.captured ?? null,
          promotion: legal.promotion ?? null,
        });
      })
      .catch(() => undefined)
      .finally(() => {
        hintPendingRef.current = false;
        setHintPending(false);
      });
  }, [canHint, engine, game.fen, uciMoves]);

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
    canHint,
    canResign: active !== null && !game.isOver,
    hasMoves: game.history.length > 0,
    thinkMs: thinkMsRef.current,
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
      requestHint,
      resign,
      flip,
      fixMove,
      continueGame,
    },
  };
}

export type PlayController = ReturnType<typeof usePlayController>;
