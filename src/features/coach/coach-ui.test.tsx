import { fireEvent, render, screen } from "@testing-library/react";
import { Chess } from "chess.js";
import { describe, expect, it, vi } from "vitest";

import { EngineStatusCard } from "@/features/play/components/EngineStatusCard";
import { GameSetupPanel } from "@/features/play/components/GameSetupPanel";
import { SettingsProvider } from "@/features/settings/SettingsProvider";
import { getDifficulty } from "@/lib/chess/difficulty";
import { analyzeMove } from "@/lib/coach/explain";
import type { CoachRecord } from "@/lib/coach/report";
import { DEFAULT_SETTINGS } from "@/lib/settings/settings";

import { CoachPanel } from "./components/CoachPanel";
import { CoachReportDialog } from "./components/CoachReportDialog";
import { MistakeReviewDialog } from "./components/MistakeReviewDialog";
import type { IdeaPlayback } from "./useIdeaPlayback";

const AFTER_E4_E5 = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2";

function makeBlunderRecord(): CoachRecord {
  const move = new Chess(AFTER_E4_E5).move("Ba6");
  const verdict = analyzeMove({
    fenBefore: AFTER_E4_E5,
    played: move,
    playerColor: "w",
    linesBefore: [{ pv: ["g1f3", "b8c6"], score: { kind: "cp", value: 40 } }],
    lineAfter: { pv: ["b7a6", "g1f3"], score: { kind: "cp", value: -290 } },
  });
  return {
    ply: 2,
    moveNumber: 2,
    san: move.san,
    fenBefore: AFTER_E4_E5,
    uci: "f1a6",
    verdict,
    corrected: false,
  };
}

const idleIdea: IdeaPlayback = {
  active: false,
  request: null,
  frame: null,
  step: 0,
  frames: [],
  playing: false,
  start: vi.fn(),
  stop: vi.fn(),
  replay: vi.fn(),
};

describe("Think time & Coach UI", () => {
  it("GameSetupPanel lets the user switch mode and bot think time", () => {
    const onChange = vi.fn();
    const onEngineChange = vi.fn();
    render(
      <SettingsProvider>
        <GameSetupPanel
          settings={DEFAULT_SETTINGS.game}
          engineSettings={DEFAULT_SETTINGS.engine}
          engineLoading={false}
          engineFailed={false}
          onChange={onChange}
          onEngineChange={onEngineChange}
          onStart={vi.fn()}
        />
      </SettingsProvider>,
    );

    fireEvent.click(screen.getByRole("radio", { name: /Chess Coach/i }));
    expect(onChange).toHaveBeenCalledWith({ mode: "coach" });

    fireEvent.click(screen.getByRole("radio", { name: /15 с/i }));
    expect(onEngineChange).toHaveBeenCalledWith({ thinkTime: "15" });

    fireEvent.click(screen.getByRole("radio", { name: /Своё/i }));
    expect(onEngineChange).toHaveBeenCalledWith({ thinkTime: "custom" });
  });

  it("EngineStatusCard displays depth, evaluation, and best move while thinking", () => {
    render(
      <EngineStatusCard
        status="thinking"
        purpose="move"
        timing={{ startedAt: Date.now() - 500, budgetMs: 5000 }}
        engineName="Stockfish 19"
        error={null}
        moveError={null}
        info={{
          depth: 12,
          seldepth: 16,
          nodes: 42000,
          score: { kind: "cp", value: 45 },
          pv: ["g1f3"],
        }}
        level={getDifficulty("medium")}
        fen={AFTER_E4_E5}
        turn="w"
        thinkTime="5"
        customSeconds={7}
        onThinkTimeChange={vi.fn()}
        onRestart={vi.fn()}
      />,
    );

    expect(screen.getByText(/Depth 12\/16/i)).toBeInTheDocument();
    expect(screen.getByText("+0,5")).toBeInTheDocument();
    expect(screen.getByText("Nf3")).toBeInTheDocument();
  });

  it("CoachPanel shows interactive mistake buttons and fires callbacks", () => {
    const rec = makeBlunderRecord();
    const onFix = vi.fn();
    const onContinue = vi.fn();
    const onShowIdea = vi.fn();

    render(
      <CoachPanel
        phase="review"
        records={[rec]}
        latest={rec}
        error={null}
        outcome={null}
        playerColor="w"
        idea={idleIdea}
        onFixMove={onFix}
        onContinue={onContinue}
        onShowIdea={onShowIdea}
        onStopIdea={vi.fn()}
        onOpenReport={vi.fn()}
        onOpenReview={vi.fn()}
      />,
    );

    expect(screen.getByText(/Слон на a6/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Исправить ход/i }));
    expect(onFix).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: /Продолжить игру/i }));
    expect(onContinue).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: /Показать идею/i }));
    expect(onShowIdea).toHaveBeenCalledOnce();
  });

  it("CoachReportDialog and MistakeReviewDialog render full report and step through mistakes", () => {
    const rec = makeBlunderRecord();
    const onReviewMistakes = vi.fn();

    render(
      <CoachReportDialog
        open
        onOpenChange={vi.fn()}
        records={[rec]}
        outcome={{ type: "checkmate", winner: "b" }}
        playerColor="w"
        onReviewMistakes={onReviewMistakes}
        onRematch={vi.fn()}
        onNewGame={vi.fn()}
      />,
    );

    expect(screen.getByText("Итоговый разбор партии")).toBeInTheDocument();
    expect(screen.getByText("Accuracy")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Разобрать ошибки/i }));
    expect(onReviewMistakes).toHaveBeenCalledWith(0);

    render(
      <SettingsProvider>
        <MistakeReviewDialog
          open
          onOpenChange={vi.fn()}
          moments={[rec]}
          initialIndex={0}
          orientation="w"
          onBackToReport={vi.fn()}
        />
      </SettingsProvider>,
    );

    expect(screen.getByText(/Критический момент 1 из 1/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Показать идею на доске/i })).toBeInTheDocument();
  });
});
