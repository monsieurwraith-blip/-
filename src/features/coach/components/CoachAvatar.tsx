import { Crown, Flame, ShieldAlert, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import {
  COACH_EMOTION_META,
  getCoachPersonaMeta,
  getCoachPortrait,
  type CoachEmotion,
} from "@/features/coach/coachMood";
import type { CoachPersonaId } from "@/lib/settings/settings";
import { cn } from "@/lib/utils";

export type CoachMood = CoachEmotion;

interface CoachAvatarProps {
  mood: CoachEmotion;
  persona?: CoachPersonaId | string;
  speaking?: boolean;
  className?: string;
  showLabel?: boolean;
  /** Changes on every new reaction so visual pulses replay cleanly. */
  reactionKey?: string | number;
}

/**
 * Living Animated PROCHESS Character Portrait Avatar:
 * 1:1 photorealistic bust inside an obsidian/emerald/gold frame with breathing,
 * head nod/joy/alert emotion motions, eye blink, speaking equalizer waveform,
 * reaction micro-badge, and zero-broken-image SVG fallback.
 */
export function CoachAvatar({
  mood,
  persona = "grandmaster",
  speaking = false,
  className,
  showLabel = true,
  reactionKey,
}: CoachAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const [blink, setBlink] = useState(false);

  const portraitSrc = getCoachPortrait(persona);
  const personaMeta = getCoachPersonaMeta(persona);
  const emotionMeta = COACH_EMOTION_META[mood];

  useEffect(() => {
    setImgFailed(false);
  }, [portraitSrc]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setBlink(true);
      window.setTimeout(() => setBlink(false), 180);
    }, 4800);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      key={reactionKey}
      className={cn("coach-ai relative flex flex-col items-center gap-1", className)}
      data-state={speaking ? "speaking" : mood}
    >
      <div
        className={cn(
          "relative aspect-square w-full overflow-hidden rounded-2xl border bg-[#0B0D10] shadow-lg transition-all duration-300",
          speaking ? "coach-portrait-speak" : "coach-portrait-breathe",
          `char-motion-${mood}`,
        )}
        style={{
          borderColor: emotionMeta.ring,
          boxShadow: `0 0 22px -8px ${emotionMeta.glow}`,
        }}
      >
        {!imgFailed ? (
          <img
            src={portraitSrc}
            alt={`${personaMeta.name} — ${personaMeta.role}`}
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover object-top transition-transform duration-500"
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-secondary text-primary">
            <svg viewBox="0 0 64 64" className="size-10" aria-hidden>
              <path
                d="M20 52 L22 44 L44 44 L46 52 Z M23 42 L25 29 C20 25 20 18 25 12 L29 6 L33 10 L38 6 L40 12 C45 15 48 21 46 27 L38 30 L33 27 L30 30 C37 33 40 38 39 42 Z"
                fill="currentColor"
              />
            </svg>
          </div>
        )}

        {/* Ambient emotion glaze */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle at 50% 25%, transparent 45%, ${emotionMeta.glow} 100%)`,
          }}
        />

        {/* Subtle eye-blink pass */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-0 top-[24%] h-[16%] bg-black/25 backdrop-blur-[1px] transition-opacity duration-150",
            blink ? "opacity-65" : "opacity-0",
          )}
        />

        {/* Reaction micro-gesture icon badge */}
        {(mood === "mate_triumph" || mood === "joy") && (
          <span
            aria-hidden
            className="absolute top-1.5 left-1.5 grid size-5 place-items-center rounded-md border border-amber-300/40 bg-black/75 text-amber-300"
          >
            <Crown className="size-3" />
          </span>
        )}
        {mood === "check_alert" && (
          <span
            aria-hidden
            className="absolute top-1.5 left-1.5 grid size-5 place-items-center rounded-md border border-orange-400/50 bg-black/75 text-orange-400"
          >
            <ShieldAlert className="size-3" />
          </span>
        )}
        {(mood === "approval" || mood === "surprise") && (
          <span
            aria-hidden
            className="absolute top-1.5 left-1.5 grid size-5 place-items-center rounded-md border border-emerald-400/40 bg-black/75 text-emerald-300"
          >
            <Sparkles className="size-3" />
          </span>
        )}
        {mood === "tension" && (
          <span
            aria-hidden
            className="absolute top-1.5 left-1.5 grid size-5 place-items-center rounded-md border border-purple-400/40 bg-black/75 text-purple-300"
          >
            <Flame className="size-3" />
          </span>
        )}

        {/* Speaking telemetry waveform overlay */}
        {speaking && (
          <div
            aria-hidden
            className="coach-ai-wave absolute bottom-1.5 right-1.5 flex items-end gap-0.5 rounded-md border border-white/10 bg-black/70 px-1.5 py-1"
          >
            <span className="h-2.5 w-0.5 rounded-full bg-primary animate-pulse" />
            <span className="h-3.5 w-0.5 rounded-full bg-primary animate-pulse" />
            <span className="h-2 w-0.5 rounded-full bg-primary animate-pulse" />
          </div>
        )}
      </div>

      {showLabel && (
        <span
          className="w-full truncate text-center font-mono text-[10px] font-medium tracking-wide"
          style={{ color: emotionMeta.ring }}
          title={`${personaMeta.name} · ${emotionMeta.label}`}
        >
          {emotionMeta.label}
        </span>
      )}
    </div>
  );
}
