import type { CoachPhase } from "@/features/play/usePlayController";
import type { MoveClass } from "@/lib/coach/evaluation";

import type { CoachMood } from "./components/CoachAvatar";

export type OutcomeTone = "win" | "loss" | "draw";

const BY_CLASS: Record<MoveClass, CoachMood> = {
  brilliant: "amazed",
  best: "happy",
  excellent: "happy",
  good: "pleased",
  inaccuracy: "pensive",
  mistake: "concerned",
  blunder: "shocked",
};

/** The coach's expression for the current moment of the game. */
export function coachMood(
  phase: CoachPhase,
  latest: MoveClass | null,
  outcome: OutcomeTone | null,
): CoachMood {
  if (outcome === "win") return "celebrate";
  if (outcome === "loss") return "calm";
  if (outcome === "draw") return "neutral";
  if (phase === "analyzing") return "thinking";
  if (phase === "fixing") return "pleased";
  return latest ? BY_CLASS[latest] : "neutral";
}
