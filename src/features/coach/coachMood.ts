import type { CoachPhase } from "@/features/play/usePlayController";
import type { MoveClass } from "@/lib/coach/evaluation";

import type { CoachMood } from "./components/CoachAvatar";

export type OutcomeTone = "win" | "loss" | "draw";

const BY_CLASS: Record<MoveClass, CoachMood> = {
  brilliant: "success",
  best: "success",
  excellent: "success",
  good: "idle",
  inaccuracy: "warning",
  mistake: "warning",
  blunder: "critical",
};

/** Maps game flow, latest evaluation, and active TTS voice into the AI Knight Coach state. */
export function coachMood(
  phase: CoachPhase,
  latest: MoveClass | null,
  outcome: OutcomeTone | null,
  speaking = false,
): CoachMood {
  if (outcome === "win") return "success";
  if (outcome === "loss") return "critical";
  if (outcome === "draw") return "idle";
  if (phase === "analyzing") return "thinking";
  if (speaking) return "speaking";
  if (phase === "fixing") return "idle";
  return latest ? BY_CLASS[latest] : "idle";
}
