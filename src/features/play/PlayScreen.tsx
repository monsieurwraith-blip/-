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
import { STOCKFISH_BUILD_LABEL } from "@/lib/engine/config";

import { EngineStatusCard } from "./components/EngineStatusCard";
import { GameControls } from "./components/GameControls";
import { GameSetupPanel } from "./components/GameSetupPanel";
import { GameStatusCard } from "./components/GameStatusCard";
import { MoveList } from "./components/MoveList";
import { PlayerBar } from "./components/PlayerBar";
import { ResultOverlay } from "./components/ResultOverlay";
import { usePlayController } from "./usePlayController";

export function PlayScreen() {
  const c = usePlayController();
  const { game, engine, clock, active, coach, actions } = c;
  const [resultDismissed, setResultDismissed] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);
  const autoOpenedReportFor = useRef<number | null>(null);
  const idea = useIdeaPlayback();
  const { settings: userSettings, update: updateUserSettings } = useSettings();
  const showLegalMoves = userSettings.board.showLegalMoves;

  useEffect(() => {
    setResultDismissed(false);
    setReportOpen(false);
    setReviewOpen(false);
    idea.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset dialogs on new game
  }, [active?.id]);

  // Stop idea playback whenever the coach leaves the review state.
  useEffect(() => {
    if (coach.phase !== "review") idea.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- idea.stop is stable
  }, [coach.phase]);

  // Automatically open the end-of-game coach analysis once the final move is scored.
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
  const material = useMemo(() => summarizeMaterial(game.cells), [game.cells]);
  const engineThinking = engine.status === "thinking" && engine.purpose === "move";
  const inProgress = active !== null && !game.isOver && game.history.length > 0;
  const coachReport = useMemo(() => buildReport(coach.records), [coach.records]);
  const reviewList = useMemo(() => reviewMoments(coach.records), [coach.records]);

  useGameSounds(active?.id ?? null, game.history, game.outcome, playerColor);

  const coachArrows = useMemo<BoardArrow[]>(() => {
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
  }, [idea.active, idea.frame, idea.request, coach.enabled, coach.phase, coach.latest]);

  const dangerSquares = useMemo(() => {
    if (idea.active) return [];
    if (coach.enabled && coach.phase === "review" && coach.latest) {
      return coach.latest.verdict.danger;
    }
    return [];
  }, [idea.active, coach.enabled, coach.phase, coach.latest]);

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
    return (
      <PlayerBar
        color={color}
        name={isPlayer ? "Вы" : "Stockfish"}
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
        thinking={!isPlayer && engineThinking}
      />
    );
  };

  const previewFrame = idea.active && idea.frame ? idea.frame : null;

  return (
    <main className="mx-auto w-full max-w-[1360px] flex-1 px-3 pb-12 pt-3 sm:px-6 lg:pt-8">
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_25rem] lg:gap-8">
        <section
          aria-label="Партия"
          className="mx-auto w-full max-w-[min(100%,calc(100svh-10rem))] lg:max-w-[min(100%,calc(100svh-11rem))]"
        >
          {barFor(opposite(c.orientation))}
          <ChessBoard
            cells={previewFrame ? previewFrame.cells : game.cells}
            positionKey={previewFrame ? previewFrame.fen : game.fen}
            orientation={c.orientation}
            movableColor={previewFrame ? null : c.isPlayersTurn ? playerColor : null}
            legalMoves={previewFrame ? [] : game.legalMoves}
            showLegalMoves={previewFrame ? false : showLegalMoves}
            lastMove={previewFrame ? previewFrame.move : c.lastMove}
            checkSquare={previewFrame ? previewFrame.checkSquare : game.checkSquare}
            hint={previewFrame ? null : c.hint}
            arrows={coachArrows}
            dangerSquares={dangerSquares}
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
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={idea.stop}>
                  <EyeOff className="size-3" /> Вернуться
                </Button>
              </div>
            </div>
          )}
          {barFor(c.orientation)}
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
                canHint={c.canHint}
                hintPending={c.hintPending}
                hint={c.hint}
                canResign={c.canResign}
                inProgress={inProgress}
                showLegalMoves={showLegalMoves}
                onUndo={actions.undo}
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
                {...(coach.enabled ? { coachRecords: coach.records } : {})}
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
