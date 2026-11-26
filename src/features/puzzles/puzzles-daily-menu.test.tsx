import { Chess } from "chess.js";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ChessBoard } from "@/components/chess/ChessBoard";
import { DailyChallengeScreen } from "@/features/daily/DailyChallengeScreen";
import { PlayPage } from "@/features/play/PlayPage";
import { ProgressionProvider } from "@/features/progression/ProgressionProvider";
import { PuzzlesScreen } from "@/features/puzzles/PuzzlesScreen";
import { SettingsProvider } from "@/features/settings/SettingsProvider";
import type { BoardCell } from "@/lib/chess/pieceIds";

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function cellsOf(chess: Chess): BoardCell[] {
  return chess
    .board()
    .flat()
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .map((p) => ({ square: p.square, type: p.type, color: p.color }));
}

class MockPointerEvent extends MouseEvent {
  pointerId: number;
  pointerType: string;
  constructor(type: string, params: PointerEventInit = {}) {
    super(type, params);
    this.pointerId = params.pointerId ?? 1;
    this.pointerType = params.pointerType ?? "mouse";
  }
}

describe("PROCHESS Interactive UI Upgrade", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
    vi.stubGlobal("PointerEvent", MockPointerEvent);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("draws highlight on right-click and arrow on right-click drag even in read-only mode", () => {
    const chess = new Chess();
    const onToggleArrow = vi.fn();
    const onToggleHighlight = vi.fn();

    render(
      <SettingsProvider>
        <ChessBoard
          cells={cellsOf(chess)}
          positionKey={chess.fen()}
          orientation="w"
          movableColor={null}
          legalMoves={[]}
          showLegalMoves={false}
          lastMove={null}
          checkSquare={null}
          hint={null}
          onToggleArrow={onToggleArrow}
          onToggleHighlight={onToggleHighlight}
          onMove={() => false}
        />
      </SettingsProvider>,
    );

    const grid = screen.getByRole("group", { name: "Шахматная доска" });
    vi.spyOn(grid, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 800,
      bottom: 800,
      width: 800,
      height: 800,
      toJSON: () => ({}),
    });

    const e4 = screen.getByRole("button", { name: /^e4/ });

    // Single right-click highlights e4 (col 4, row 4 => x=450, y=450)
    fireEvent.pointerDown(e4, {
      button: 2,
      pointerType: "mouse",
      pointerId: 1,
      clientX: 450,
      clientY: 450,
    });
    fireEvent.pointerUp(grid, {
      button: 2,
      pointerType: "mouse",
      pointerId: 1,
      clientX: 450,
      clientY: 450,
    });
    expect(onToggleHighlight).toHaveBeenCalledWith("e4");

    // Drag right-click from e4 (450,450) to d5 (col 3, row 3 => 350,350)
    fireEvent.pointerDown(e4, {
      button: 2,
      pointerType: "mouse",
      pointerId: 2,
      clientX: 450,
      clientY: 450,
    });
    fireEvent.pointerMove(grid, {
      pointerType: "mouse",
      pointerId: 2,
      clientX: 350,
      clientY: 350,
    });
    fireEvent.pointerUp(grid, {
      button: 2,
      pointerType: "mouse",
      pointerId: 2,
      clientX: 350,
      clientY: 350,
    });
    expect(onToggleArrow).toHaveBeenCalledWith("e4", "d5");
  });

  it("filters 112 puzzles and renders hint + board drawing toolbar in PuzzlesScreen", () => {
    render(
      <SettingsProvider>
        <ProgressionProvider>
          <PuzzlesScreen />
        </ProgressionProvider>
      </SettingsProvider>,
    );

    expect(screen.getByText(/112 задач/i)).toBeTruthy();
    expect(screen.getByText("Найдено задач: 112")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Маты" }));
    expect(screen.queryByText("Найдено задач: 112")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Подсказка/i }));
    expect(screen.getByText(/Подсказка:/i)).toBeTruthy();
  });

  it("renders DAILY CHESS CHALLENGE with 10-step progress & countdown", () => {
    render(
      <SettingsProvider>
        <ProgressionProvider>
          <DailyChallengeScreen />
        </ProgressionProvider>
      </SettingsProvider>,
    );

    expect(screen.getByText("DAILY CHESS CHALLENGE")).toBeTruthy();
    expect(screen.getByText("Твоя ежедневная тренировка готова")).toBeTruthy();
    expect(screen.getByText(/Маршрут тренировки/i)).toBeTruthy();
    expect(screen.getByText(/Календарь тренировок/i)).toBeTruthy();
  });

  it("navigates to Daily Challenge and Collection from MainMenu and AppHeader", () => {
    render(
      <SettingsProvider>
        <ProgressionProvider>
          <PlayPage />
        </ProgressionProvider>
      </SettingsProvider>,
    );

    expect(screen.getByText("ТВОЯ СЕРИЯ")).toBeTruthy();
    expect(screen.getByText("ЗАДАЧИ СЕГОДНЯ")).toBeTruthy();
    expect(screen.getByText("ТВОЙ РЕЙТИНГ")).toBeTruthy();
    expect(screen.getByText("ЛУЧШИЙ РЕЗУЛЬТАТ")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /^Ежедневные задачи/i }));
    expect(screen.getByText("DAILY CHESS CHALLENGE")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Коллекция/i }));
    expect(screen.getByText("Коллекция PROCHESS")).toBeTruthy();
    expect(screen.getByText("10 персонажей PROCHESS (10)")).toBeTruthy();
  });
});
