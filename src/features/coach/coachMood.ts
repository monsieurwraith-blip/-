import type { CoachPhase } from "@/features/play/usePlayController";
import { getCharacter, type CharacterEmotion, type CharacterId } from "@/lib/characters/characters";
import type { MoveClass } from "@/lib/coach/evaluation";
import type { CoachPersonaId } from "@/lib/settings/settings";

export type OutcomeTone = "win" | "loss" | "draw";

export type CoachEmotion = CharacterEmotion;

export const COACH_EMOTION_META: Record<
  CoachEmotion,
  { label: string; ring: string; glow: string }
> = {
  calm: { label: "Спокойствие", ring: "#16C784", glow: "rgba(22, 199, 132, 0.25)" },
  approval: { label: "Одобрение", ring: "#10B981", glow: "rgba(16, 185, 129, 0.35)" },
  surprise: { label: "Удивление", ring: "#38BDF8", glow: "rgba(56, 189, 248, 0.38)" },
  serious: { label: "Серьёзность", ring: "#F59E0B", glow: "rgba(245, 158, 11, 0.32)" },
  disappointment: { label: "Разочарование", ring: "#EF4444", glow: "rgba(239, 68, 68, 0.36)" },
  joy: { label: "Радость", ring: "#EAB308", glow: "rgba(234, 179, 8, 0.4)" },
  interest: { label: "Интерес", ring: "#2DD4BF", glow: "rgba(45, 212, 191, 0.34)" },
  concentration: { label: "Концентрация", ring: "#38BDF8", glow: "rgba(56, 189, 248, 0.32)" },
  check_alert: { label: "Внимание: Шах!", ring: "#F97316", glow: "rgba(249, 115, 22, 0.42)" },
  mate_triumph: { label: "Триумф: Мат!", ring: "#FDE047", glow: "rgba(253, 224, 71, 0.48)" },
  tension: { label: "Напряжение", ring: "#A855F7", glow: "rgba(168, 85, 247, 0.36)" },
};

const BY_CLASS: Record<MoveClass, CoachEmotion> = {
  brilliant: "surprise",
  best: "approval",
  excellent: "approval",
  good: "interest",
  inaccuracy: "serious",
  mistake: "disappointment",
  blunder: "disappointment",
};

/** Maps game flow, latest evaluation, and active TTS voice into the Character emotion state. */
export function coachMood(
  phase: CoachPhase,
  latest: MoveClass | null,
  outcome: OutcomeTone | null,
  speaking = false,
  inCheck = false,
): CoachEmotion {
  if (outcome === "win") return "mate_triumph";
  if (outcome === "loss") return "disappointment";
  if (outcome === "draw") return "calm";
  if (inCheck) return "check_alert";
  if (phase === "analyzing") return "concentration";
  if (phase === "fixing") return "serious";
  if (latest) return BY_CLASS[latest];
  return speaking ? "interest" : "calm";
}

export function getCoachPortrait(id: CoachPersonaId | CharacterId | string): string {
  return getCharacter(id).portrait;
}

export function getCoachPersonaMeta(id: CoachPersonaId | CharacterId | string) {
  const ch = getCharacter(id);
  return {
    id: ch.id,
    name: ch.name,
    role: ch.title,
    subtitle: ch.subtitle,
  };
}
