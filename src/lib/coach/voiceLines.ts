import type { HintMove } from "@/features/play/types";
import { outcomeReason, outcomeWinner, type GameOutcome } from "@/lib/chess/outcome";
import type { Color } from "@/lib/chess/types";
import { isMistakeClass } from "@/lib/coach/evaluation";
import type { CoachTag, CoachVerdict } from "@/lib/coach/explain";
import type { VoiceMode } from "@/lib/settings/settings";

const CRITICAL_THREAT_TAGS: readonly CoachTag[] = [
  "mate-threat",
  "hanging",
  "undefended",
  "fork",
  "pin",
  "skewer",
  "discovered",
];

function hasTag(tags: readonly CoachTag[], target: readonly CoachTag[]): boolean {
  return tags.some((t) => target.includes(t));
}

/**
 * Formats natural Russian spoken commentary from a CoachVerdict according to the
 * selected VoiceMode. Returns null when the move does not warrant speech in that mode.
 */
export function buildVerdictSpeech(verdict: CoachVerdict, mode: VoiceMode): string | null {
  const mistake = isMistakeClass(verdict.classification);
  const criticalThreat = hasTag(verdict.tags, CRITICAL_THREAT_TAGS);

  if (mode === "errors") {
    if (!mistake && !criticalThreat) return null;
    const parts = [verdict.text];
    if (verdict.best && mistake) {
      parts.push(`Сильнее было ${verdict.best.san}.`);
    }
    return parts.join(" ");
  }

  if (mode === "important") {
    const brilliant = verdict.classification === "brilliant";
    if (!mistake && !criticalThreat && !brilliant) return null;
    const parts = [verdict.text];
    if (verdict.best && mistake) {
      parts.push(`Сильнее было ${verdict.best.san}.`);
    }
    return parts.join(" ");
  }

  if (mode === "all") {
    const parts = [verdict.text];
    if (verdict.best && mistake) {
      parts.push(`Лучший ход: ${verdict.best.san}.`);
    }
    return parts.join(" ");
  }

  // "full"
  return [verdict.text, ...verdict.details].filter(Boolean).join(" ");
}

export function buildOpponentCheckSpeech(mode: VoiceMode): string | null {
  if (mode === "important" || mode === "errors" || mode === "all" || mode === "full") {
    return "Внимание, шах вашему королю.";
  }
  return null;
}

export function buildHintSpeech(san: string, mode: VoiceMode): string | null {
  if (mode === "errors") return null;
  return `Подсказка тренера: рассмотрите ход ${san}.`;
}

export function buildLayeredHintSpeech(hint: HintMove, mode: VoiceMode): string | null {
  if (mode === "errors") return null;
  if (hint.level === 1) return `Лёгкая подсказка: ${hint.level1Text}`;
  if (hint.level === 2) return `Тактическая подсказка: ${hint.level2Text}`;
  return `Лучший ход по оценке тренера: ${hint.level3Text}`;
}

export function buildGameEndSpeech(
  outcome: GameOutcome,
  playerColor: Color,
  accuracy: number | null,
  mode: VoiceMode,
): string | null {
  const winner = outcomeWinner(outcome);
  const reason = outcomeReason(outcome);
  let summary: string;

  if (winner !== null) {
    const won = winner === playerColor;
    if (mode === "errors" && won) return null;
    summary = won ? `Поздравляю с победой! ${reason}.` : `Партия окончена. ${reason}.`;
  } else {
    if (mode === "errors") return null;
    summary = `Партия завершилась вничью: ${reason.toLowerCase()}.`;
  }

  if (accuracy !== null && (mode === "all" || mode === "full" || mode === "important")) {
    return `${summary} Точность ваших ходов: ${accuracy} процентов.`;
  }
  return summary;
}
