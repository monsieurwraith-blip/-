import type { Move } from "chess.js";
import { useEffect, useRef } from "react";

import type { GameOutcome } from "@/lib/chess/outcome";
import type { Color } from "@/lib/chess/types";
import { clipForMove, clipForOutcome } from "@/lib/sound/gameSounds";

import { useSettings } from "./SettingsProvider";

/**
 * Plays move/capture/check sounds when a move is added and a result sound when the
 * game ends. Undo, restarts and new games are silent.
 */
export function useGameSounds(
  gameId: number | null,
  history: readonly Move[],
  outcome: GameOutcome | null,
  playerColor: Color,
) {
  const { play } = useSettings();
  const playRef = useRef(play);
  playRef.current = play;
  const seen = useRef({ gameId, length: history.length, outcome });

  useEffect(() => {
    const prev = seen.current;
    seen.current = { gameId, length: history.length, outcome };
    if (gameId === null || prev.gameId !== gameId) return;

    const moved = history.length === prev.length + 1;
    const last = history[history.length - 1];
    if (moved && last) playRef.current(clipForMove(last));

    if (outcome && !prev.outcome) {
      const clip = clipForOutcome(outcome, playerColor);
      // Let the final move's click land first.
      const timer = setTimeout(() => playRef.current(clip), moved ? 220 : 0);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [gameId, history, outcome, playerColor]);
}
