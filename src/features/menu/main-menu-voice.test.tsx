import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PlayPage } from "@/features/play/PlayPage";
import { ProgressionProvider } from "@/features/progression/ProgressionProvider";
import { SettingsProvider } from "@/features/settings/SettingsProvider";
import { VoiceSettingsPanel } from "@/features/settings/components/VoiceSettingsPanel";
import { sortVoices } from "@/lib/sound/speech";

import { MainMenu } from "./MainMenu";

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe("ProChess Command Center & Navigation", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders Russian ProChess Command Center with all club actions", () => {
    const onPlay = vi.fn();
    const onCoach = vi.fn();
    const onAnalysis = vi.fn();
    const onPuzzles = vi.fn();
    const onAcademy = vi.fn();
    const onArchive = vi.fn();
    const onProfile = vi.fn();
    const onCustomization = vi.fn();
    const onOpenSettings = vi.fn();

    render(
      <SettingsProvider>
        <ProgressionProvider>
          <MainMenu
            onPlay={onPlay}
            onCoach={onCoach}
            onAnalysis={onAnalysis}
            onPuzzles={onPuzzles}
            onAcademy={onAcademy}
            onArchive={onArchive}
            onProfile={onProfile}
            onCustomization={onCustomization}
            onOpenSettings={onOpenSettings}
          />
        </ProgressionProvider>
      </SettingsProvider>,
    );

    expect(screen.getByText("АНАЛИТИЧЕСКИЙ ШАХМАТНЫЙ КЛУБ")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /^Начать игру/i }));
    expect(onPlay).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /^Играть с тренером/i }));
    expect(onCoach).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /^Анализ/i }));
    expect(onAnalysis).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /^Тактические задачи/i }));
    expect(onPuzzles).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /^Академия/i }));
    expect(onAcademy).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /^История партий/i }));
    expect(onArchive).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /^Моя статистика/i }));
    expect(onProfile).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /^Кастомизация/i }));
    expect(onCustomization).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /^Настройки Звук, голос/i }));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it("navigates between Command Center, Arena, Analysis Lab, Academy, Puzzles, Archive, and Profile", () => {
    render(
      <SettingsProvider>
        <ProgressionProvider>
          <PlayPage />
        </ProgressionProvider>
      </SettingsProvider>,
    );

    expect(screen.getByText("АНАЛИТИЧЕСКИЙ ШАХМАТНЫЙ КЛУБ")).toBeTruthy();

    // Кастомизация opens Settings directly on Gold Mirror & Pieces tab.
    fireEvent.click(screen.getByRole("button", { name: /^Кастомизация/i }));
    expect(screen.getByText(/GOLD MIRROR EDITION/i)).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });

    // Анализ opens dedicated Analysis Lab.
    fireEvent.click(screen.getByRole("button", { name: /^Анализ/i }));
    expect(screen.getByText("Лаборатория анализа")).toBeTruthy();

    // Академия via AppHeader
    fireEvent.click(screen.getByRole("button", { name: /Академия/i }));
    expect(screen.getByText("Академия PROCHESS")).toBeTruthy();

    // Return to Command Center, then launch Играть с тренером.
    fireEvent.click(screen.getByRole("button", { name: /Главное меню/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Играть с тренером/i }));
    expect(screen.getByText("Игра с тренером")).toBeTruthy();
  });
});

describe("VoiceSettingsPanel & Russian Dmitry Voice Priority", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prioritizes Microsoft Dmitry Online Natural among Russian voices", () => {
    const fakeVoices = [
      {
        voiceURI: "irina",
        name: "Microsoft Irina - Russian (Russia)",
        lang: "ru-RU",
        localService: true,
      },
      {
        voiceURI: "dmitry",
        name: "Microsoft Dmitry Online (Natural) - Russian (Russia)",
        lang: "ru-RU",
        localService: false,
      },
      { voiceURI: "en", name: "Microsoft David", lang: "en-US", localService: true },
    ] as unknown as SpeechSynthesisVoice[];

    expect(sortVoices(fakeVoices)[0]?.voiceURI).toBe("dmitry");
  });

  it("updates voice settings and speaks on test button click", () => {
    const speak = vi.fn();
    const cancel = vi.fn();
    const fakeVoice = {
      voiceURI: "ru-dmitry",
      name: "Microsoft Dmitry Online (Natural) - Russian (Russia)",
      lang: "ru-RU",
      localService: false,
      default: true,
    } as SpeechSynthesisVoice;

    vi.stubGlobal("speechSynthesis", {
      getVoices: () => [fakeVoice],
      speak,
      cancel,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    vi.stubGlobal(
      "SpeechSynthesisUtterance",
      class MockUtterance {
        text: string;
        lang = "";
        volume = 1;
        rate = 1;
        pitch = 1;
        voice: SpeechSynthesisVoice | null = null;
        constructor(text: string) {
          this.text = text;
        }
      },
    );

    render(
      <SettingsProvider>
        <VoiceSettingsPanel />
      </SettingsProvider>,
    );

    const allPhrasesRadio = screen.getByRole("radio", { name: /озвучивать каждую фразу/i });
    fireEvent.click(allPhrasesRadio);
    expect(allPhrasesRadio.getAttribute("aria-checked")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: /прослушать голос/i }));
    expect(cancel).toHaveBeenCalled();
    expect(speak).toHaveBeenCalledTimes(1);
  });
});
