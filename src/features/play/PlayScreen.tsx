import { EyeOff, RotateCcw, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { CharacterCompanionCard } from "@/components/characters/CharacterCompanionCard";
import { BoardDrawToolbar } from "@/components/chess/BoardDrawToolbar";
import { ChessBoard, type BoardArrow } from "@/components/chess/ChessBoard";
import { Button } from "@/components/ui/button";
import type { CoachEmotion } from "@/features/coach/coachMood";
import { CoachPanel } from "@/features/coach/components/CoachPanel";
import { CoachReportDialog } from "@/features/coach/components/CoachReportDialog";
import { MistakeReviewDialog } from "@/features/coach/components/MistakeReviewDialog";
import { useIdeaPlayback } from "@/features/coach/useIdeaPlayback";
import { useProgression } from "@/features/progression/ProgressionProvider";
import { useSettings } from "@/features/settings/SettingsProvider";
import { useGameSounds } from "@/features/settings/useGameSounds";
import { useBoardDrawings } from "@/hooks/useBoardDrawings";
import { getBotById } from "@/lib/chess/bots";
import { getDifficulty } from "@/lib/chess/difficulty";
import { summarizeMaterial } from "@/lib/chess/material";
import { detectOpening } from "@/lib/chess/openings";
import { outcomeReason, outcomeTone } from "@/lib/chess/outcome";
import { getTimeControl } from "@/lib/chess/timeControls";
import { opposite, type Color } from "@/lib/chess/types";
import { parseUciMove } from "@/lib/chess/uci";
import { buildReport, reviewMoments } from "@/lib/coach/report";
import {
  buildGameEndSpeech,
  buildLayeredHintSpeech,
  buildOpponentCheckSpeech,
  buildVerdictSpeech,
} from "@/lib/coach/voiceLines";
import { STOCKFISH_BUILD_LABEL } from "@/lib/engine/config";
import { triggerFileDownload } from "@/lib/progression/storage";
import { PLAY_STYLES } from "@/lib/settings/settings";
import { speakCoachText, stopSpeaking } from "@/lib/sound/speech";
import { cn } from "@/lib/utils";

import { AnalyticsPanel } from "./components/AnalyticsPanel";
import { EngineStatusCard } from "./components/EngineStatusCard";
import { EvalBar } from "./components/EvalBar";
import { GameControls } from "./components/GameControls";
import { GameSetupPanel } from "./components/GameSetupPanel";
import { GameStatusCard } from "./components/GameStatusCard";
import { MoveList } from "./components/MoveList";
import { PlayerBar } from "./components/PlayerBar";
import { ResultOverlay } from "./components/ResultOverlay";
import { usePlayController } from "./usePlayController";

interface PlayScreenProps {
  onInProgressChange?: (inProgress: boolean) => void;
  onOpenAnalysisWithPgn?: (pgn: string) => void;
  launchPosition?: { id: number; fen: string; label?: string } | null;
  onLaunchConsumed?: () => void;
}

export function PlayScreen({
  onInProgressChange,
  onOpenAnalysisWithPgn,
  launchPosition = null,
  onLaunchConsumed,
}: PlayScreenProps = {}) {
  const c = usePlayController();
  const { game, engine, clock, active, coach, actions } = c;
  const {
    recordGame,
    completeErrorAnalysis,
    recordCastleInGame,
    recordMaterialGainInGame,
    recordEndgameDrillComplete,
  } = useProgression();
  const [resultDismissed, setResultDismissed] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [coachVisible, setCoachVisible] = useState(true);
  const handledLaunchRef = useRef<number | null>(null);
  const autoOpenedReportFor = useRef<number | null>(null);
  const archivedGameFor = useRef<number | null>(null);
  const castleRecordedFor = useRef<number | null>(null);
  const materialRecordedFor = useRef<number | null>(null);
  const lastSpokenVerdictKey = useRef<string | null>(null);
  const lastSpokenCheckPly = useRef<number | null>(null);
  const lastSpokenHintKey = useRef<string | null>(null);
  const lastSpokenOutcomeGame = useRef<number | null>(null);
  const idea = useIdeaPlayback();
  const { settings: userSettings, update: updateUserSettings, updateBoard } = useSettings();
  const drawing = useBoardDrawings(game.fen);
  const showLegalMoves = userSettings.board.showLegalMoves;
  const voiceSettings = userSettings.voice;
  const masterVolume = userSettings.sound.masterVolume;

  useEffect(() => {
    setResultDismissed(false);
    setReportOpen(false);
    setReviewOpen(false);
    setCoachVisible(true);
    archivedGameFor.current = null;
    castleRecordedFor.current = null;
    materialRecordedFor.current = null;
    lastSpokenVerdictKey.current = null;
    lastSpokenCheckPly.current = null;
    lastSpokenHintKey.current = null;
    lastSpokenOutcomeGame.current = null;
    idea.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset dialogs on new game
  }, [active?.id]);

  useEffect(() => () => stopSpeaking(), []);

  useEffect(() => {
    if (coach.phase !== "review") idea.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- idea.stop is stable
  }, [coach.phase]);

  useEffect(() => {
    if (!launchPosition || handledLaunchRef.current === launchPosition.id) return;
    handledLaunchRef.current = launchPosition.id;
    actions.startGame(c.settings, {
      startFen: launchPosition.fen,
      drillLabel: launchPosition.label ?? null,
    });
    onLaunchConsumed?.();
  }, [actions, c.settings, launchPosition, onLaunchConsumed]);

  const opening = useMemo(
    () => detectOpening(game.history, active?.startFen),
    [active?.startFen, game.history],
  );

  // Persist completed games once per active game into ProgressionProvider (rating, XP, quests, archive).
  useEffect(() => {
    if (!active || !game.outcome || archivedGameFor.current === active.id) return;
    archivedGameFor.current = active.id;
    const tone = outcomeTone(game.outcome, active.playerColor);
    const report = buildReport(coach.records);
    const pgn = game.chess().pgn();
    const styleLabel =
      PLAY_STYLES.find((s) => s.id === userSettings.engine.playStyle)?.label ?? "Сбалансированный";
    const bot = getBotById(active.settings.botId);

    if (active.drillLabel && tone === "win") {
      recordEndgameDrillComplete();
    }

    recordGame({
      id: `game-${Date.now()}-${active.id}`,
      playedAt: new Date().toISOString(),
      opponent: c.isPassAndPlay
        ? "Локальная партия (2 игрока)"
        : bot
          ? `${bot.name} (${bot.elo} Эло)`
          : `Stockfish 19 (${getDifficulty(active.settings.difficulty).label})`,
      difficulty: active.settings.difficulty,
      styleLabel: c.isPassAndPlay ? "Вдвоём" : bot ? bot.styleTag : styleLabel,
      mode: active.settings.mode,
      playerColor: active.playerColor,
      result: tone,
      outcomeReason: outcomeReason(game.outcome),
      durationSec: c.elapsedSeconds(),
      movesCount: Math.ceil(game.history.length / 2),
      accuracy: coach.records.length > 0 ? Math.round(report.accuracy) : tone === "win" ? 84 : 72,
      bestCount: report.counts.brilliant + report.counts.best,
      mistakesCount: report.counts.mistake,
      blundersCount: report.counts.blunder,
      pgn,
      finalFen: game.fen,
      openingHint:
        active.drillLabel ??
        opening?.label ??
        (game.history
          .slice(0, 4)
          .map((m) => m.san)
          .join(" ") ||
          "Начальная позиция"),
      ...(bot ? { opponentElo: bot.elo } : {}),
      ranked: !c.isPassAndPlay,
    });
  }, [
    active,
    c,
    coach.records,
    game,
    opening?.label,
    recordEndgameDrillComplete,
    recordGame,
    userSettings.engine.playStyle,
  ]);

  useEffect(() => {
    if (
      active &&
      game.outcome &&
      coach.enabled &&
      coach.phase === "idle" &&
      coach.records.length > 0 &&
      autoOpenedReportFor.current !== active.id
    ) {
      autoOpenedReportFor.current = active.id;
      setReportOpen(true);
    }
  }, [active, game.outcome, coach.enabled, coach.phase, coach.records.length]);

  // Global Arena Hotkeys (disabled while typing inside inputs).
  useEffect(() => {
    if (!userSettings.hotkeysEnabled) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key === "z") {
        actions.undo();
      } else if (key === "y") {
        actions.redo();
      } else if (key === "f" && e.shiftKey) {
        if (typeof document !== "undefined" && document.fullscreenElement) {
          void document.exitFullscreen?.();
        } else {
          void document.documentElement.requestFullscreen?.();
        }
      } else if (key === "f") {
        actions.flip();
      } else if (key === "h") {
        actions.requestHint();
      } else if (key === "c" && coach.enabled) {
        setCoachVisible((v) => !v);
      } else if (key === "m") {
        const next = !userSettings.voice.enabled;
        if (!next) stopSpeaking();
        updateUserSettings({ voice: { enabled: next } });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    actions,
    coach.enabled,
    updateUserSettings,
    userSettings.hotkeysEnabled,
    userSettings.voice.enabled,
  ]);

  const settings = active?.settings ?? c.settings;
  const activeBot = getBotById(settings.botId);
  const level = getDifficulty(settings.difficulty);
  const tc = getTimeControl(settings.timeControl);
  const playerColor: Color = c.playerColor ?? (settings.side === "b" ? "b" : "w");
  const displayCells = c.inspected ? c.inspected.cells : game.cells;
  const material = useMemo(() => summarizeMaterial(displayCells), [displayCells]);
  const engineThinking =
    !c.isPassAndPlay && engine.status === "thinking" && engine.purpose === "move";
  const inProgress = active !== null && !game.isOver && game.history.length > 0;
  const coachReport = useMemo(() => buildReport(coach.records), [coach.records]);
  const reviewList = useMemo(() => reviewMoments(coach.records), [coach.records]);

  useEffect(() => {
    onInProgressChange?.(inProgress);
  }, [inProgress, onInProgressChange]);

  // Daily missions: detect player castling or >= +3 material advantage during active play
  useEffect(() => {
    if (!active) return;
    if (castleRecordedFor.current !== active.id) {
      const playerCastled = game.history.some(
        (m) => m.color === playerColor && (m.san === "O-O" || m.san === "O-O-O"),
      );
      if (playerCastled) {
        castleRecordedFor.current = active.id;
        recordCastleInGame();
      }
    }
    if (materialRecordedFor.current !== active.id && material.advantage[playerColor] >= 3) {
      materialRecordedFor.current = active.id;
      recordMaterialGainInGame();
    }
  }, [
    active,
    game.history,
    material.advantage,
    playerColor,
    recordCastleInGame,
    recordMaterialGainInGame,
  ]);

  useGameSounds(active?.id ?? null, game.history, game.outcome, playerColor);

  // Voice Coach: speak move verdicts.
  useEffect(() => {
    if (!active || !coach.enabled || !coach.latest) return;
    if (game.outcome?.type === "checkmate") return;
    const key = `${active.id}:${coach.latest.ply}:${coach.latest.uci}`;
    if (lastSpokenVerdictKey.current === key) return;
    lastSpokenVerdictKey.current = key;
    const line = buildVerdictSpeech(coach.latest.verdict, voiceSettings.mode);
    if (line) speakCoachText(line, voiceSettings, masterVolume);
  }, [active, coach.enabled, coach.latest, game.outcome?.type, masterVolume, voiceSettings]);

  // Voice Coach: warn when opponent puts the player in check.
  useEffect(() => {
    if (!active || !coach.enabled || game.isOver || !game.inCheck) return;
    if (game.turn !== playerColor) return;
    const ply = game.history.length;
    if (ply === 0 || lastSpokenCheckPly.current === ply) return;
    lastSpokenCheckPly.current = ply;
    const line = buildOpponentCheckSpeech(voiceSettings.mode);
    if (line) speakCoachText(line, voiceSettings, masterVolume);
  }, [
    active,
    coach.enabled,
    game.history.length,
    game.inCheck,
    game.isOver,
    game.turn,
    masterVolume,
    playerColor,
    voiceSettings,
  ]);

  // Voice Coach: speak requested 3-level hints whenever requested in active game.
  useEffect(() => {
    if (!active || !c.hint) return;
    const key = `${active.id}:${game.fen}:${c.hint.from}${c.hint.to}:lv${c.hint.level}`;
    if (lastSpokenHintKey.current === key) return;
    lastSpokenHintKey.current = key;
    const line = buildLayeredHintSpeech(c.hint, voiceSettings.mode);
    if (line) speakCoachText(line, voiceSettings, masterVolume);
  }, [active, c.hint, game.fen, masterVolume, voiceSettings]);

  // Voice Coach: speak game outcome summary once final move analysis completes.
  useEffect(() => {
    if (!active || !coach.enabled || !game.outcome) return;
    if (coach.phase !== "idle") return;
    if (lastSpokenOutcomeGame.current === active.id) return;
    lastSpokenOutcomeGame.current = active.id;
    const accuracy = coach.records.length > 0 ? coachReport.accuracy : null;
    const line = buildGameEndSpeech(game.outcome, playerColor, accuracy, voiceSettings.mode);
    if (line) speakCoachText(line, voiceSettings, masterVolume);
  }, [
    active,
    coach.enabled,
    coach.phase,
    coach.records.length,
    coachReport.accuracy,
    game.outcome,
    masterVolume,
    playerColor,
    voiceSettings,
  ]);

  const coachArrows = useMemo<BoardArrow[]>(() => {
    if (c.inspected) return [];
    if (idea.active) {
      if (idea.frame?.move) {
        return [{ from: idea.frame.move.from, to: idea.frame.move.to, kind: "idea" }];
      }
      const first = idea.request?.pv[0] ? parseUciMove(idea.request.pv[0]) : null;
      return first ? [{ from: first.from, to: first.to, kind: "idea" }] : [];
    }
    if (!coach.enabled || coach.phase !== "review" || !coach.latest) return [];
    const list: BoardArrow[] = [];
    const v = coach.latest.verdict;
    if (v.best) list.push({ from: v.best.from, to: v.best.to, kind: "best" });
    if (v.threat) list.push({ from: v.threat.from, to: v.threat.to, kind: "threat" });
    return list;
  }, [
    c.inspected,
    idea.active,
    idea.frame,
    idea.request,
    coach.enabled,
    coach.phase,
    coach.latest,
  ]);

  const dangerSquares = useMemo(() => {
    if (idea.active || c.inspected) return c.threatSquares;
    const base =
      coach.enabled && coach.phase === "review" && coach.latest ? coach.latest.verdict.danger : [];
    return [...new Set([...base, ...c.threatSquares])];
  }, [c.inspected, c.threatSquares, idea.active, coach.enabled, coach.phase, coach.latest]);

  const showIdea = () => {
    if (!coach.latest) return;
    const v = coach.latest.verdict;
    if (v.bestLineUci.length === 0) return;
    idea.start({
      fen: coach.latest.fenBefore,
      pv: v.bestLineUci,
      text: v.idea,
    });
  };

  const openReviewAt = (idx = 0) => {
    setReportOpen(false);
    setReviewIndex(idx);
    setReviewOpen(true);
    completeErrorAnalysis();
  };

  const handleToggleFullscreen = () => {
    if (typeof document === "undefined") return;
    if (document.fullscreenElement) void document.exitFullscreen?.();
    else void document.documentElement.requestFullscreen?.();
  };

  const handleDownloadPgn = () => {
    const pgn = game.chess().pgn() || `[FEN "${game.fen}"]\n`;
    const stamp = new Date().toISOString().slice(0, 10);
    triggerFileDownload(`prochess-party-${stamp}.pgn`, pgn);
  };

  const handleCopyFen = () => {
    void navigator.clipboard?.writeText(c.inspected?.fen ?? game.fen);
  };

  const barFor = (color: Color) => {
    const isPlayer = c.isPassAndPlay ? true : color === playerColor;
    const clockRunning = active !== null && clock.active === color;
    const isBotThinking = !isPlayer && engineThinking;
    const labelName = c.isPassAndPlay
      ? color === "w"
        ? "Игрок 1 (Белые)"
        : "Игрок 2 (Чёрные)"
      : isPlayer
        ? userSettings.playerName
        : activeBot
          ? `${activeBot.name} (${activeBot.elo})`
          : "Stockfish 19";
    const labelDetail = c.isPassAndPlay
      ? color === "w"
        ? "Локальная игра · Белые"
        : "Локальная игра · Чёрные"
      : isPlayer
        ? color === "w"
          ? "Белые"
          : "Чёрные"
        : activeBot
          ? `${activeBot.title} · ${activeBot.styleTag}`
          : `${level.label} · ${STOCKFISH_BUILD_LABEL.split(" · ")[0]}`;
    return (
      <PlayerBar
        color={color}
        name={labelName}
        detail={labelDetail}
        captured={material.captured[color]}
        advantage={material.advantage[color]}
        clock={{
          enabled: tc.initialMs !== null,
          ms: active ? clock.times[color] : (tc.initialMs ?? 0),
          running: clockRunning,
        }}
        isTurn={active !== null && !game.isOver && game.turn === color}
        thinking={isBotThinking}
        thinkingStartedAt={isBotThinking ? (engine.timing?.startedAt ?? null) : null}
      />
    );
  };

  const previewFrame = idea.active && idea.frame ? idea.frame : null;
  const boardHint =
    previewFrame || c.inspected
      ? null
      : c.hint
        ? c.hint.level === 3
          ? c.hint
          : c.hint.level === 2
            ? { from: c.hint.from, to: c.hint.from }
            : null
        : null;

  const isLeftDock = active !== null && userSettings.coachDockSide === "left";
  const sideWidthClass =
    userSettings.layoutDensity === "pro"
      ? "lg:grid-cols-[minmax(0,1fr)_28rem]"
      : userSettings.layoutDensity === "compact"
        ? "lg:grid-cols-[minmax(0,1fr)_23.5rem]"
        : "lg:grid-cols-[minmax(0,1fr)_26rem]";

  const sideLeftClass =
    userSettings.layoutDensity === "pro"
      ? "lg:grid-cols-[28rem_minmax(0,1fr)]"
      : userSettings.layoutDensity === "compact"
        ? "lg:grid-cols-[23.5rem_minmax(0,1fr)]"
        : "lg:grid-cols-[26rem_minmax(0,1fr)]";

  return (
    <main className="mx-auto w-full max-w-[1460px] flex-1 px-3 pb-12 pt-3 sm:px-6 lg:pt-6">
      <div
        className={cn(
          "grid items-start gap-5 lg:gap-7",
          isLeftDock ? sideLeftClass : sideWidthClass,
        )}
      >
        <section
          aria-label="Партия"
          className={cn(
            "mx-auto flex w-full max-w-[min(100%,calc(100svh-9rem))] items-stretch gap-2.5 lg:max-w-[min(100%,calc(100svh-9.5rem))]",
            isLeftDock && "lg:order-2",
          )}
        >
          {active && (
            <EvalBar
              score={c.liveEval?.score ?? null}
              orientation={c.orientation}
              className="my-12 hidden sm:flex"
            />
          )}

          <div className="min-w-0 flex-1 space-y-2">
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
              showThreats={c.showThreats || userSettings.board.showThreatOverlay}
              onToggleThreats={() => {
                actions.toggleThreats();
                updateBoard({ showThreatOverlay: !userSettings.board.showThreatOverlay });
              }}
              showCombos={userSettings.board.showComboOverlay}
              onToggleCombos={() =>
                updateBoard({ showComboOverlay: !userSettings.board.showComboOverlay })
              }
            />
            {barFor(opposite(c.orientation))}
            <ChessBoard
              cells={
                previewFrame ? previewFrame.cells : c.inspected ? c.inspected.cells : game.cells
              }
              positionKey={
                previewFrame
                  ? previewFrame.fen
                  : c.inspected
                    ? `${c.inspected.fen}-ply${c.inspected.ply}`
                    : game.fen
              }
              orientation={c.orientation}
              movableColor={
                previewFrame || c.inspected
                  ? null
                  : c.isPlayersTurn
                    ? c.isPassAndPlay
                      ? game.turn
                      : playerColor
                    : null
              }
              premoveColor={previewFrame || c.inspected || !c.canPremove ? null : playerColor}
              premove={c.premove}
              onPremove={actions.queuePremove}
              onCancelPremove={actions.cancelPremove}
              legalMoves={previewFrame || c.inspected ? [] : game.legalMoves}
              showLegalMoves={previewFrame || c.inspected ? false : showLegalMoves}
              lastMove={
                previewFrame ? previewFrame.move : c.inspected ? c.inspected.lastMove : c.lastMove
              }
              checkSquare={
                previewFrame
                  ? previewFrame.checkSquare
                  : c.inspected
                    ? c.inspected.checkSquare
                    : game.checkSquare
              }
              hint={boardHint && boardHint.from !== boardHint.to ? boardHint : null}
              arrows={coachArrows}
              dangerSquares={
                c.hint && c.hint.level === 2 && !previewFrame && !c.inspected
                  ? [...dangerSquares, c.hint.from]
                  : dangerSquares
              }
              hidePieces={active?.settings.mode === "blindfold"}
              drawings={drawing.drawings}
              drawTool={drawing.tool}
              drawColor={drawing.color}
              drawingsVisible={drawing.drawingsVisible}
              onToggleArrow={drawing.toggleArrow}
              onToggleHighlight={drawing.toggleHighlight}
              onEraseAtSquare={drawing.eraseSquare}
              showThreats={c.showThreats || userSettings.board.showThreatOverlay}
              showCombos={userSettings.board.showComboOverlay}
              onMove={actions.playerMove}
            >
              {active && game.outcome && !resultDismissed && !reportOpen && !reviewOpen && (
                <ResultOverlay
                  outcome={game.outcome}
                  playerColor={playerColor}
                  coach={
                    coach.enabled && coach.records.length > 0
                      ? {
                          accuracy: coachReport.accuracy,
                          grade: coachReport.grade,
                          mistakesCount: reviewList.length,
                          onOpenReport: () => setReportOpen(true),
                          onOpenReview: () => openReviewAt(0),
                        }
                      : undefined
                  }
                  onRematch={actions.restart}
                  onNewGame={actions.backToSetup}
                  onDismiss={() => setResultDismissed(true)}
                />
              )}
            </ChessBoard>

            {c.inspected && (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/35 bg-primary/10 px-3 py-2 text-xs">
                <span className="font-medium text-primary">
                  Просмотр истории: полуход {c.inspected.ply} из {game.history.length}
                </span>
                <Button
                  variant="ivory"
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => actions.inspectPly(null)}
                >
                  Вернуться к партии
                </Button>
              </div>
            )}

            {previewFrame && (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/35 bg-primary/10 px-3 py-2 text-xs">
                <span className="font-medium text-primary">
                  Просмотр идеи на доске · реальная позиция не изменена
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="panel"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={idea.replay}
                  >
                    <RotateCcw className="size-3" /> Повторить
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={idea.stop}
                  >
                    <EyeOff className="size-3" /> Вернуться
                  </Button>
                </div>
              </div>
            )}

            {barFor(c.orientation)}
          </div>
        </section>

        <aside
          className={cn("flex flex-col gap-3.5", isLeftDock && "lg:order-1")}
          aria-label="Панель партии"
        >
          {active ? (
            <>
              {active.drillLabel && (
                <div className="rounded-xl border border-primary/40 bg-primary/10 px-3.5 py-2.5 text-xs">
                  <p className="eyebrow text-primary">Тренировка с позиции</p>
                  <p className="mt-0.5 font-semibold text-foreground">{active.drillLabel}</p>
                </div>
              )}
              {c.premove && (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-400/50 bg-amber-500/12 px-3 py-2 text-xs">
                  <span className="font-mono text-amber-200">
                    Премув готов: {c.premove.from} → {c.premove.to}
                  </span>
                  <button
                    type="button"
                    onClick={actions.cancelPremove}
                    className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-amber-200 hover:bg-amber-400/20"
                  >
                    <X className="size-3" /> Отменить
                  </button>
                </div>
              )}
              {activeBot && !c.isPassAndPlay && (
                <div className="panel flex items-start gap-3 p-3.5 text-xs">
                  <img
                    src={activeBot.portrait}
                    alt={activeBot.name}
                    className="size-12 shrink-0 rounded-xl object-cover object-top ring-1 ring-primary/40"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-foreground">
                        {activeBot.name} · {activeBot.title}
                      </p>
                      <span className="font-mono text-[11px] font-semibold text-primary">
                        {activeBot.elo} Эло
                      </span>
                    </div>
                    <p className="mt-1 leading-relaxed text-muted-foreground">
                      {(() => {
                        const tone = game.outcome ? outcomeTone(game.outcome, playerColor) : null;
                        if (tone === "win") return activeBot.quotes.loss;
                        if (tone === "loss") return activeBot.quotes.win;
                        if (game.inCheck) return activeBot.quotes.check;
                        const last = game.history[game.history.length - 1];
                        if (last?.captured && last.color !== playerColor) {
                          return activeBot.quotes.capture;
                        }
                        return activeBot.quotes.start;
                      })()}
                    </p>
                  </div>
                </div>
              )}
              {!coach.enabled && !activeBot && !c.isPassAndPlay && (
                <CharacterCompanionCard
                  compact
                  mood={(() => {
                    const tone = game.outcome ? outcomeTone(game.outcome, playerColor) : null;
                    const mood: CoachEmotion =
                      tone === "win"
                        ? "mate_triumph"
                        : tone === "loss"
                          ? "disappointment"
                          : game.inCheck
                            ? "check_alert"
                            : engineThinking
                              ? "concentration"
                              : material.advantage[playerColor] >= 3
                                ? "approval"
                                : "calm";
                    return mood;
                  })()}
                  reactionKey={`${active.id}-${game.history.length}-${game.inCheck}-${Boolean(game.outcome)}`}
                />
              )}
              {coach.enabled && coachVisible && (
                <CoachPanel
                  phase={coach.phase}
                  records={coach.records}
                  latest={coach.latest}
                  error={coach.error}
                  outcome={game.outcome}
                  playerColor={playerColor}
                  fen={c.inspected?.fen ?? game.fen}
                  turn={game.turn}
                  liveEval={c.liveEval}
                  idea={idea}
                  onFixMove={actions.fixMove}
                  onContinue={actions.continueGame}
                  onShowIdea={showIdea}
                  onStopIdea={idea.stop}
                  onRequestHintMove={() => actions.requestHint(3)}
                  onOpenReport={() => setReportOpen(true)}
                  onOpenReview={() => openReviewAt(0)}
                  onCloseCoach={() => setCoachVisible(false)}
                />
              )}
              <GameStatusCard
                turn={game.turn}
                moveNumber={game.moveNumber}
                inCheck={game.inCheck}
                outcome={game.outcome}
                playerColor={playerColor}
                engineThinking={engineThinking}
                clockWaiting={clock.enabled && game.history.length === 0 && !game.isOver}
                isPassAndPlay={c.isPassAndPlay}
                opponentLabel={activeBot ? activeBot.name : "Stockfish"}
              />
              <GameControls
                canUndo={c.canUndo}
                canRedo={c.canRedo}
                canHint={c.canHint}
                hintPending={c.hintPending}
                hint={c.hint}
                canResign={c.canResign}
                inProgress={inProgress}
                showLegalMoves={showLegalMoves}
                showThreats={c.showThreats}
                drawNotice={c.drawNotice}
                coachAvailable={coach.enabled}
                coachVisible={coachVisible}
                onUndo={actions.undo}
                onRedo={actions.redo}
                onHint={actions.requestHint}
                onBestMove={() => actions.requestHint(3)}
                onFlip={actions.flip}
                onRestart={actions.restart}
                onNewGame={actions.backToSetup}
                onResign={actions.resign}
                onOfferDraw={actions.offerDraw}
                onToggleThreats={actions.toggleThreats}
                onToggleCoach={() => setCoachVisible((v) => !v)}
                onCopyFen={handleCopyFen}
                onDownloadPgn={handleDownloadPgn}
                onToggleFullscreen={handleToggleFullscreen}
                onShowLegalMovesChange={(value) =>
                  updateUserSettings({ board: { showLegalMoves: value } })
                }
              />
              {game.outcome && onOpenAnalysisWithPgn && (
                <Button
                  type="button"
                  variant="panel"
                  size="sm"
                  onClick={() => onOpenAnalysisWithPgn(game.chess().pgn() || game.fen)}
                >
                  Разобрать партию в Лаборатории анализа
                </Button>
              )}
              <MoveList
                history={game.history}
                openingLabel={opening?.label ?? null}
                viewPly={c.viewPly}
                onInspectPly={actions.inspectPly}
                onStepHistory={actions.stepHistory}
                {...(coach.enabled ? { coachRecords: coach.records } : {})}
              />
              {userSettings.layoutDensity !== "compact" && (
                <AnalyticsPanel
                  fen={c.inspected?.fen ?? game.fen}
                  cells={displayCells}
                  turn={game.turn}
                  liveEval={c.liveEval}
                  evalHistory={
                    coach.enabled && coachReport.evalGraph.length >= 2
                      ? coachReport.evalGraph
                      : c.evalHistory
                  }
                />
              )}
            </>
          ) : (
            <GameSetupPanel
              settings={c.settings}
              engineSettings={userSettings.engine}
              engineLoading={engine.status === "loading"}
              engineFailed={engine.status === "error"}
              onChange={actions.updateSettings}
              onEngineChange={(patch) => updateUserSettings({ engine: patch })}
              onStart={() => actions.startGame(c.settings)}
            />
          )}
          <EngineStatusCard
            status={engine.status}
            purpose={engine.purpose}
            timing={engine.timing}
            engineName={engine.engineName}
            error={engine.error}
            moveError={c.engineMoveError}
            info={engine.info}
            level={level}
            fen={game.fen}
            turn={game.turn}
            thinkTime={userSettings.engine.thinkTime}
            customSeconds={userSettings.engine.customSeconds}
            depthLimit={userSettings.engine.depthLimit}
            playStyle={userSettings.engine.playStyle}
            onThinkTimeChange={(patch) => updateUserSettings({ engine: patch })}
            onRestart={engine.restart}
          />
        </aside>
      </div>

      {coach.enabled && (
        <>
          <CoachReportDialog
            open={reportOpen}
            onOpenChange={setReportOpen}
            records={coach.records}
            outcome={game.outcome}
            playerColor={playerColor}
            onReviewMistakes={openReviewAt}
            onRematch={() => {
              setReportOpen(false);
              actions.restart();
            }}
            onNewGame={() => {
              setReportOpen(false);
              actions.backToSetup();
            }}
          />
          <MistakeReviewDialog
            open={reviewOpen}
            onOpenChange={setReviewOpen}
            moments={reviewList}
            initialIndex={reviewIndex}
            orientation={c.orientation}
            onBackToReport={() => {
              setReviewOpen(false);
              setReportOpen(true);
            }}
          />
        </>
      )}
    </main>
  );
}
