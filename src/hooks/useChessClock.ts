import { useCallback, useEffect, useRef, useState } from "react";

import { ChessClock, type ClockTimes } from "@/lib/chess/clock";
import type { Color } from "@/lib/chess/types";

export interface ChessClockHandle {
  enabled: boolean;
  times: ClockTimes;
  active: Color | null;
  /** Remaining time right now (more precise than the rendered `times`). */
  read: () => ClockTimes;
  press: (moved: Color) => ClockTimes;
  pause: () => void;
  restore: (times: ClockTimes, active: Color | null) => void;
  reset: (initialMs: number | null, incrementMs: number) => void;
}

const TICK_MS = 100;
const UNTIMED = Number.POSITIVE_INFINITY;

export function useChessClock(onFlag: (color: Color) => void): ChessClockHandle {
  const clockRef = useRef<ChessClock | null>(null);
  if (clockRef.current === null) clockRef.current = new ChessClock(10 * 60_000, 0);
  const clock = clockRef.current;
  const [enabled, setEnabled] = useState(true);
  const [state, setState] = useState(() => clock.getState());
  const onFlagRef = useRef(onFlag);
  onFlagRef.current = onFlag;

  const sync = useCallback(() => setState(clock.getState()), [clock]);

  useEffect(() => {
    if (!enabled || state.active === null) return;
    const id = setInterval(() => {
      const flagged = clock.tick();
      setState(clock.getState());
      if (flagged) onFlagRef.current(flagged);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [clock, enabled, state.active]);

  const read = useCallback(() => {
    clock.tick();
    return clock.getState().remaining;
  }, [clock]);

  const press = useCallback(
    (moved: Color) => {
      const times = clock.press(moved);
      sync();
      return times;
    },
    [clock, sync],
  );

  const pause = useCallback(() => {
    clock.pause();
    sync();
  }, [clock, sync]);

  const restore = useCallback(
    (times: ClockTimes, active: Color | null) => {
      clock.restore(times, active);
      sync();
    },
    [clock, sync],
  );

  const reset = useCallback(
    (initialMs: number | null, incrementMs: number) => {
      setEnabled(initialMs !== null);
      clock.reset(initialMs ?? UNTIMED, incrementMs);
      sync();
    },
    [clock, sync],
  );

  return {
    enabled,
    times: state.remaining,
    active: state.active,
    read,
    press,
    pause,
    restore,
    reset,
  };
}
