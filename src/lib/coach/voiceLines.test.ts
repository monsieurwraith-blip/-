import { describe, expect, it } from "vitest";

import type { CoachVerdict } from "@/lib/coach/explain";
import { buildGameEndSpeech, buildHintSpeech, buildVerdictSpeech } from "@/lib/coach/voiceLines";
import { formatTextForSpeech, pickPreferredVoice, sortVoices } from "@/lib/sound/speech";

function makeVerdict(overrides: Partial<CoachVerdict> = {}): CoachVerdict {
  return {
    classification: "good",
    headline: "Хороший ход · Good",
    text: "Хороший ход: e4 укрепляет пешечный центр.",
    details: ["Чуть точнее было d4 — этот ход занимает центр."],
    tags: [],
    best: { uci: "d2d4", from: "d2", to: "d4", san: "d4" },
    bestLine: "1. d4",
    bestLineUci: ["d2d4"],
    threat: null,
    danger: [],
    idea: "D4: ход занимает центр.",
    materialLost: 0,
    scoreBefore: { kind: "cp", value: 25 },
    scoreAfter: { kind: "cp", value: 15 },
    winBefore: 52,
    winAfter: 51,
    winDrop: 1,
    cpLoss: 10,
    accuracy: 96,
    ...overrides,
  };
}

describe("voice commentary filtering by mode", () => {
  it("stays quiet on routine good moves in important and errors modes", () => {
    const good = makeVerdict({ classification: "good" });
    expect(buildVerdictSpeech(good, "important")).toBeNull();
    expect(buildVerdictSpeech(good, "errors")).toBeNull();
    expect(buildVerdictSpeech(good, "all")).toContain("Хороший ход");
    expect(buildVerdictSpeech(good, "full")).toContain("Чуть точнее было d4");
  });

  it("speaks on mistakes, blunders, and brilliant moves in important mode", () => {
    const mistake = makeVerdict({
      classification: "mistake",
      text: "Конь на f3 остаётся без защиты.",
      tags: ["hanging", "material-loss"],
    });
    const brilliant = makeVerdict({
      classification: "brilliant",
      text: "Блестяще! Жертва корректна.",
    });

    expect(buildVerdictSpeech(mistake, "important")).toContain("Сильнее было d4");
    expect(buildVerdictSpeech(mistake, "errors")).toContain("Конь на f3");
    expect(buildVerdictSpeech(brilliant, "important")).toContain("Блестяще");
    expect(buildVerdictSpeech(brilliant, "errors")).toBeNull();
  });

  it("formats game end and hint speech cleanly", () => {
    expect(buildGameEndSpeech({ type: "checkmate", winner: "w" }, "w", 88, "important")).toContain(
      "Поздравляю с победой",
    );
    expect(buildGameEndSpeech({ type: "checkmate", winner: "w" }, "w", 88, "errors")).toBeNull();
    expect(buildHintSpeech("Nf3", "important")).toContain("Nf3");
    expect(buildHintSpeech("Nf3", "errors")).toBeNull();
  });
});

describe("speech text formatting and voice picking", () => {
  it("normalizes chess notation for natural TTS reading", () => {
    expect(formatTextForSpeech("Лучший ход: O-O · далее Qe2+ — победа!")).toBe(
      "Лучший ход: короткая рокировка, далее Qe2, шах, победа!",
    );
    expect(formatTextForSpeech("O-O-O и Qh7#")).toBe("длинная рокировка и Qh7, мат");
  });

  it("prioritizes Russian local voices and exact URI selection", () => {
    const fakeVoices = [
      { voiceURI: "en-US", name: "Alex", lang: "en-US", localService: true },
      { voiceURI: "ru-RU-cloud", name: "Google русский", lang: "ru-RU", localService: false },
      { voiceURI: "ru-RU-local", name: "Microsoft Irina", lang: "ru-RU", localService: true },
    ] as unknown as SpeechSynthesisVoice[];

    expect(sortVoices(fakeVoices)[0]?.voiceURI).toBe("ru-RU-local");
    expect(pickPreferredVoice(fakeVoices, "")?.voiceURI).toBe("ru-RU-local");
    expect(pickPreferredVoice(fakeVoices, "en-US")?.voiceURI).toBe("en-US");
  });
});
