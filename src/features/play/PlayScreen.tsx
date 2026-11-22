import { EyeOff, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { ChessBoard, type BoardArrow } from "@/components/chess/ChessBoard";
import { Button } from "@/components/ui/button";
import { CoachPanel } from "@/features/coach/components/CoachPanel";
import { CoachReportDialog } from "@/features/coach/components/CoachReportDialog";
import { MistakeReviewDialog } from "@/features/coach/components/MistakeReviewDialog";
import { useIdeaPlayback } from "@/features/coach/useIdeaPlayback";
import { useSettings } from "@/features/settings/SettingsProvider";
import { useGameSounds } from "@/features/settings/useGameSounds";
import { getDifficulty } from "@/lib/chess/difficulty";
import { summarizeMaterial } from "@/lib/chess/material";
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
import { speakCoachText, stopSpeaking } from "@/lib/sound/speech";

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
}

export function PlayScreen({ onInProgressChange }: PlayScreenProps = {}) {
  const c = usePlayController();
  const { game, engine, clock, active, coach, actions } = c;
  const [resultDismissed, setResultDismissed] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);
  const autoOpenedReportFor = useRef<number | null>(null);
  const lastSpokenVerdictKey = useRef<string | null>(null);
  const lastSpokenCheckPly = useRef<number | null>(null);
  const lastSpokenHintKey = useRef<string | null>(null);
  const lastSpokenOutcomeGame = useRef<number | null>(null);
  const idea = useIdeaPlayback();
  const { settings: userSettings, update: updateUserSettings } = useSettings();
  const showLegalMoves = userSettings.board.showLegalMoves;
  const voiceSettings = userSettings.voice;
  const masterVolume = userSettings.sound.masterVolume;

  useEffect(() => {
    setResultDismissed(false);
    setReportOpen(false);
    setReviewOpen(false);
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

  const settings = active?.settings ?? c.settings;
  const level = getDifficulty(settings.difficulty);
  const tc = getTimeControl(settings.timeControl);
  const playerColor: Color = c.playerColor ?? (settings.side === "b" ? "b" : "w");
  const displayCells = c.inspected ? c.inspected.cells : game.cells;
  const material = useMemo(() => summarizeMaterial(displayCells), [displayCells]);
  const engineThinking = engine.status === "thinking" && engine.purpose === "move";
  const inProgress = active !== null && !game.isOver && game.history.length > 0;
  const coachReport = useMemo(() => buildReport(coach.records), [coach.records]);
  const reviewList = useMemo(() => reviewMoments(coach.records), [coach.records]);

  useEffect(() => {
    onInProgressChange?.(inProgress);
  }, [inProgress, onInProgressChange]);

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
    if (idea.active || c.inspected) return [];
    if (coach.enabled && coach.phase === "review" && coach.latest) {
      return coach.latest.verdict.danger;
    }
    return [];
  }, [c.inspected, idea.active, coach.enabled, coach.phase, coach.latest]);

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
  };

  const barFor = (color: Color) => {
    const isPlayer = color === playerColor;
    const clockRunning = active !== null && clock.active === color;
    const isBotThinking = !isPlayer && engineThinking;
    return (
      <PlayerBar
        color={color}
        name={isPlayer ? userSettings.playerName : "Stockfish 19"}
        detail={
          isPlayer
            ? color === "w"
              ? "Белые"
              : "Чёрные"
            : `${level.label} · ${STOCKFISH_BUILD_LABEL.split(" · ")[0]}`
        }
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

  return (
    <main className="mx-auto w-full max-w-[1400px] flex-1 px-3 pb-12 pt-3 sm:px-6 lg:pt-8">
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-8">
        <section
          aria-label="Партия"
          className="mx-auto flex w-full max-w-[min(100%,calc(100svh-9rem))] items-stretch gap-2.5 lg:max-w-[min(100%,calc(100svh-10rem))]"
        >
          {active && (
            <EvalBar
              score={c.liveEval?.score ?? null}
              orientation={c.orientation}
              className="my-12 hidden sm:flex"
            />
          )}

          <div className="min-w-0 flex-1">
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
                previewFrame || c.inspected ? null : c.isPlayersTurn ? playerColor : null
              }
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
              arrows={
                c.hint && c.hint.level === 2 && !previewFrame && !c.inspected
                  ? coachArrows
                  : coachArrows
              }
              dangerSquares={
                c.hint && c.hint.level === 2 && !previewFrame && !c.inspected
                  ? [...dangerSquares, c.hint.from]
                  : dangerSquares
              }
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

        <aside className="flex flex-col gap-4" aria-label="Панель партии">
          {active ? (
            <>
              {coach.enabled && (
                <CoachPanel
                  phase={coach.phase}
                  records={coach.records}
                  latest={coach.latest}
                  error={coach.error}
                  outcome={game.outcome}
                  playerColor={playerColor}
                  idea={idea}
                  onFixMove={actions.fixMove}
                  onContinue={actions.continueGame}
                  onShowIdea={showIdea}
                  onStopIdea={idea.stop}
                  onOpenReport={() => setReportOpen(true)}
                  onOpenReview={() => openReviewAt(0)}
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
                onUndo={actions.undo}
                onRedo={actions.redo}
                onHint={actions.requestHint}
                onFlip={actions.flip}
                onRestart={actions.restart}
                onNewGame={actions.backToSetup}
                onResign={actions.resign}
                onShowLegalMovesChange={(value) =>
                  updateUserSettings({ board: { showLegalMoves: value } })
                }
              />
              <MoveList
                history={game.history}
                viewPly={c.viewPly}
                onInspectPly={actions.inspectPly}
                onStepHistory={actions.stepHistory}
                {...(coach.enabled ? { coachRecords: coach.records } : {})}
              />
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
