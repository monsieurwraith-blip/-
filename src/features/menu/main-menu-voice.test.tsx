import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PlayPage } from "@/features/play/PlayPage";
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

  it("renders ProChess Command Center with all 5 interactive action buttons", () => {
    const onPlay = vi.fn();
    const onCoach = vi.fn();
    const onAnalysis = vi.fn();
    const onCustomization = vi.fn();
    const onOpenSettings = vi.fn();

    render(
      <SettingsProvider>
        <MainMenu
          onPlay={onPlay}
          onCoach={onCoach}
          onAnalysis={onAnalysis}
          onCustomization={onCustomization}
          onOpenSettings={onOpenSettings}
        />
      </SettingsProvider>,
    );

    expect(screen.getByText("GRANDMASTER ANALYTICS SUITE")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /^PLAY/i }));
    expect(onPlay).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /^COACH/i }));
    expect(onCoach).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /^ANALYSIS/i }));
    expect(onAnalysis).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /^CUSTOMIZATION/i }));
    expect(onCustomization).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /^SETTINGS/i }));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it("navigates between Command Center, Arena, Analysis Lab, Customization, and Settings", () => {
    render(
      <SettingsProvider>
        <PlayPage />
      </SettingsProvider>,
    );

    expect(screen.getByText("GRANDMASTER ANALYTICS SUITE")).toBeTruthy();

    // CUSTOMIZATION opens Settings directly on the Themes & Board tab.
    fireEvent.click(screen.getByRole("button", { name: /^CUSTOMIZATION/i }));
    expect(screen.getByText("Цветовая схема интерфейса")).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });

    // ANALYSIS opens dedicated Analysis Lab.
    fireEvent.click(screen.getByRole("button", { name: /^ANALYSIS/i }));
    expect(screen.getByText("Лаборатория анализа")).toBeTruthy();

    // Return to Command Center, then launch COACH mode.
    fireEvent.click(screen.getByRole("button", { name: /главное меню/i }));
    fireEvent.click(screen.getByRole("button", { name: /^COACH/i }));
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
