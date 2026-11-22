/**
 * Browser / Chromium Web Speech API wrapper for the ProChess Voice Intelligence.
 * Prefers Microsoft Dmitry Online (Natural) - Russian by default, supports queued
 * non-overlapping speech, live speaking status subscription, and repeat-last-phrase.
 */
import type { VoiceCoachSettings } from "@/lib/settings/settings";

export const DEFAULT_VOICE_DISPLAY = "Microsoft Dmitry Online (Natural)";
export const VOICE_TEST_PHRASE =
  "Здравствуйте! Я голосовой тренер ProChess. Анализирую позицию и помогу найти сильнейший план игры.";

let lastSpokenText = "";
let speakingState = false;
const listeners = new Set<(speaking: boolean) => void>();

function notifySpeaking(active: boolean) {
  if (speakingState === active) return;
  speakingState = active;
  for (const fn of listeners) fn(active);
}

export function subscribeSpeaking(fn: (speaking: boolean) => void): () => void {
  listeners.add(fn);
  fn(speakingState);
  return () => {
    listeners.delete(fn);
  };
}

export function getLastSpokenPhrase(): string {
  return lastSpokenText;
}

export function isSpeechSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof SpeechSynthesisUtterance !== "undefined"
  );
}

function voiceScore(v: SpeechSynthesisVoice): number {
  const name = v.name.toLowerCase();
  const lang = v.lang.toLowerCase();
  let score = 0;
  if (lang.startsWith("ru")) score += 1000;
  if (name.includes("dmitry") || name.includes("дмитрий")) score += 500;
  if (name.includes("online") && name.includes("natural")) score += 200;
  else if (name.includes("natural")) score += 150;
  else if (name.includes("microsoft")) score += 80;
  if (v.localService) score += 20;
  return score;
}

/** Sorts system voices prioritizing Microsoft Dmitry Online Natural & Russian voices. */
export function sortVoices(voices: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return [...voices].sort((a, b) => {
    const diff = voiceScore(b) - voiceScore(a);
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name);
  });
}

export function listSpeechVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSupported()) return [];
  try {
    return sortVoices(window.speechSynthesis.getVoices());
  } catch {
    return [];
  }
}

export function pickPreferredVoice(
  voices: readonly SpeechSynthesisVoice[],
  preferredURI: string,
): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;
  if (preferredURI) {
    const exact = voices.find((v) => v.voiceURI === preferredURI);
    if (exact) return exact;
  }
  const sorted = sortVoices(voices);
  return sorted[0] ?? null;
}

/** Normalizes chess symbols so TTS reads castling, checks, and dashes cleanly. */
export function formatTextForSpeech(text: string): string {
  return text
    .replace(/\bO-O-O\b/g, "длинная рокировка")
    .replace(/\bO-O\b/g, "короткая рокировка")
    .replace(/([KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?)\+/g, "$1, шах")
    .replace(/([KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?)#/g, "$1, мат")
    .replace(/\s*·\s*/g, ", ")
    .replace(/\s*—\s*/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
}

export function stopSpeaking(): void {
  notifySpeaking(false);
  if (!isSpeechSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // Ignore shutdown errors in embedded webviews.
  }
}

function dispatchUtterance(
  text: string,
  voiceSettings: VoiceCoachSettings,
  masterVolume: number,
  ignoreEnabled: boolean,
): boolean {
  if (!isSpeechSupported()) return false;
  if (!ignoreEnabled && (!voiceSettings.enabled || masterVolume <= 0 || voiceSettings.volume <= 0)) {
    return false;
  }

  const formatted = formatTextForSpeech(text);
  if (!formatted) return false;
  lastSpokenText = formatted;

  try {
    const synth = window.speechSynthesis;
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(formatted);
    const voices = synth.getVoices();
    const chosen = pickPreferredVoice(voices, voiceSettings.voiceURI);
    if (chosen) {
      utterance.voice = chosen;
      utterance.lang = chosen.lang;
    } else {
      utterance.lang = "ru-RU";
    }
    const vol = Math.max(0, Math.min(1, (voiceSettings.volume / 100) * (masterVolume / 100)));
    utterance.volume = ignoreEnabled && vol === 0 ? 0.85 : vol;
    utterance.rate = Math.max(0.6, Math.min(1.6, voiceSettings.rate));
    utterance.pitch = 1.0;

    utterance.onstart = () => notifySpeaking(true);
    utterance.onend = () => notifySpeaking(false);
    utterance.onerror = () => notifySpeaking(false);

    notifySpeaking(true);
    synth.speak(utterance);
    return true;
  } catch {
    notifySpeaking(false);
    return false;
  }
}

export function speakCoachText(
  text: string,
  voiceSettings: VoiceCoachSettings,
  masterVolume = 100,
): boolean {
  return dispatchUtterance(text, voiceSettings, masterVolume, false);
}

export function repeatLastCoachPhrase(
  voiceSettings: VoiceCoachSettings,
  masterVolume = 100,
): boolean {
  if (!lastSpokenText) return false;
  return dispatchUtterance(lastSpokenText, voiceSettings, masterVolume, true);
}

export function previewCoachVoice(
  voiceSettings: VoiceCoachSettings,
  masterVolume = 100,
): boolean {
  return dispatchUtterance(VOICE_TEST_PHRASE, voiceSettings, masterVolume, true);
}
