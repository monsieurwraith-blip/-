import { useId } from "react";

import { cn } from "@/lib/utils";

export type CoachMood = "idle" | "thinking" | "speaking" | "warning" | "success" | "critical";

interface CoachAvatarProps {
  mood: CoachMood;
  className?: string;
  /** Changes on every new reaction so visual pulses replay cleanly. */
  reactionKey?: string | number;
}

const STATE_ACCENT: Record<CoachMood, { ring: string; core: string; glow: string }> = {
  idle: { ring: "#16C784", core: "#16C784", glow: "rgba(22, 199, 132, 0.22)" },
  thinking: { ring: "#38BDF8", core: "#38BDF8", glow: "rgba(56, 189, 248, 0.28)" },
  speaking: { ring: "#16C784", core: "#34D399", glow: "rgba(22, 199, 132, 0.42)" },
  warning: { ring: "#F59E0B", core: "#F59E0B", glow: "rgba(245, 158, 11, 0.34)" },
  success: { ring: "#16C784", core: "#22D3EE", glow: "rgba(22, 199, 132, 0.42)" },
  critical: { ring: "#EF4444", core: "#EF4444", glow: "rgba(239, 68, 68, 0.38)" },
};

/**
 * Animated ProChess AI Coach Avatar: abstract silver chess knight with
 * geometric armor facets, emerald telemetry ring, and reactive voice waveform.
 */
export function CoachAvatar({ mood, className, reactionKey }: CoachAvatarProps) {
  const uid = useId().replace(/:/g, "");
  const palette = STATE_ACCENT[mood];

  return (
    <div
      key={reactionKey}
      className={cn("coach-ai relative grid place-items-center", className)}
      data-state={mood}
      aria-hidden
    >
      <svg viewBox="0 0 120 120" className="size-full overflow-visible">
        <defs>
          <radialGradient id={`${uid}-aura`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={palette.glow} />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <linearGradient id={`${uid}-knight`} x1="15%" y1="10%" x2="85%" y2="90%">
            <stop offset="0%" stopColor="#F4F6F8" />
            <stop offset="50%" stopColor="#C6CDD6" />
            <stop offset="100%" stopColor="#4B5563" />
          </linearGradient>
          <linearGradient id={`${uid}-facet`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#94A3B8" />
            <stop offset="100%" stopColor="#1E293B" />
          </linearGradient>
        </defs>

        {/* Ambient AI halo */}
        <circle cx="60" cy="60" r="56" fill={`url(#${uid}-aura)`} />

        {/* Obsidian core housing */}
        <circle cx="60" cy="60" r="46" fill="#0B0D10" stroke="#282E38" strokeWidth="1.5" />

        {/* Rotating Telemetry Ring */}
        <circle
          cx="60"
          cy="60"
          r="50"
          fill="none"
          stroke={palette.ring}
          strokeWidth="1.75"
          strokeDasharray="18 8 6 8"
          strokeOpacity={mood === "idle" ? 0.45 : 0.92}
          className="coach-ai-ring"
        />

        {/* Abstract Silver Knight Profile */}
        <g className="coach-ai-core" style={{ transformOrigin: "60px 60px" }}>
          <path d="M39 91 L42 84 L78 84 L81 91 Z" fill={`url(#${uid}-knight)`} />
          <path
            d="M44 82 L47 59 C40 53 40 41 47 30 L52 19 L59 25 L66 18 L68 28 C76 33 81 42 79 52 L67 57 L59 52 L55 57 C66 62 71 72 69 82 Z"
            fill={`url(#${uid}-knight)`}
          />
          {/* Geometric Armor Facet */}
          <polygon
            points="52,27 65,33 58,47 47,43"
            fill={`url(#${uid}-facet)`}
            fillOpacity="0.65"
          />
          {/* Glowing Telemetry Crest & Eye */}
          <path
            d="M48 80 C50 67 47 55 45 43 C45 36 48 30 53 24"
            fill="none"
            stroke={palette.core}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <polygon points="62,38 69,36 66,41" fill={palette.core} />
        </g>

        {/* Live Voice Equalizer Waveform when Speaking */}
        {mood === "speaking" && (
          <g className="coach-ai-wave" transform="translate(82, 74)">
            <rect x="0" y="6" width="3" height="10" rx="1.5" fill={palette.core} />
            <rect x="6" y="2" width="3" height="18" rx="1.5" fill={palette.core} />
            <rect x="12" y="5" width="3" height="12" rx="1.5" fill={palette.core} />
          </g>
        )}
      </svg>
    </div>
  );
}
