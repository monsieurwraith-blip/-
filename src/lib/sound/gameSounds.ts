/** Which sound a game event produces. Pure, so the rules are unit-tested. */
import { outcomeWinner, type GameOutcome } from "@/lib/chess/outcome";
import type { Color } from "@/lib/chess/types";
import type { SoundEvent } from "@/lib/settings/settings";

/** Concrete clips; "result" in the settings covers both win and loss. */
export type SoundClip = "move" | "capture" | "check" | "gameEnd" | "win" | "loss";

export interface MoveLike {
  san: string;
  captured?: string | undefined;
}

export function clipForMove(move: MoveLike): SoundClip {
  if (move.san.includes("+") || move.san.includes("#")) return "check";
  if (move.captured) return "capture";
  return "move";
}

/** Win/loss from the player's point of view; draws use the neutral game-end clip. */
export function clipForOutcome(outcome: GameOutcome, playerColor: Color): SoundClip {
  const winner = outcomeWinner(outcome);
  if (winner === null) return "gameEnd";
  return winner === playerColor ? "win" : "loss";
}

/** Settings toggle that controls a clip. */
export function eventForClip(clip: SoundClip): SoundEvent {
  return clip === "win" || clip === "loss" ? "result" : clip;
}
