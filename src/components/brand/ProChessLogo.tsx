import { useId } from "react";

import { cn } from "@/lib/utils";

export type ProChessLogoVariant = "emblem" | "icon" | "splash" | "menu";

interface ProChessLogoProps {
  variant?: ProChessLogoVariant;
  className?: string;
  withWordmark?: boolean;
  subtitle?: string;
}

/**
 * ProChess Brand Mark: heraldic geometric chess knight flanked by sharp symmetric wings
 * in brushed silver/titanium metallic finish with crisp #16C784 emerald accent lines
 * on #0B0D10 obsidian ground.
 */
export function ProChessLogo({
  variant = "icon",
  className,
  withWordmark = false,
  subtitle,
}: ProChessLogoProps) {
  const uid = useId().replace(/:/g, "");
  const isLarge = variant === "splash" || variant === "emblem";

  const emblemSvg = (
    <svg
      viewBox="0 0 120 120"
      className={cn(
        "shrink-0 select-none",
        variant === "icon" && "size-8",
        variant === "menu" && "size-11",
        variant === "emblem" && "size-20",
        variant === "splash" && "size-24 sm:size-28",
      )}
      role="img"
      aria-label="ProChess Winged Knight Emblem"
    >
      <defs>
        <linearGradient id={`${uid}-obs`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#171B22" />
          <stop offset="100%" stopColor="#0B0D10" />
        </linearGradient>
        <linearGradient id={`${uid}-silver`} x1="15%" y1="5%" x2="85%" y2="95%">
          <stop offset="0%" stopColor="#F4F6F8" />
          <stop offset="45%" stopColor="#C6CDD6" />
          <stop offset="100%" stopColor="#6D7785" />
        </linearGradient>
        <linearGradient id={`${uid}-titanium`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C6CDD6" />
          <stop offset="55%" stopColor="#5D6775" />
          <stop offset="100%" stopColor="#282E38" />
        </linearGradient>
        <linearGradient id={`${uid}-emerald`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="50%" stopColor="#16C784" />
          <stop offset="100%" stopColor="#087A50" />
        </linearGradient>
      </defs>

      {/* Obsidian Shield Frame */}
      <rect
        x="4"
        y="4"
        width="112"
        height="112"
        rx={isLarge ? 24 : 26}
        fill={`url(#${uid}-obs)`}
        stroke="#282E38"
        strokeWidth="2"
      />
      <rect
        x="9"
        y="9"
        width="102"
        height="102"
        rx={isLarge ? 20 : 21}
        fill="none"
        stroke={`url(#${uid}-emerald)`}
        strokeOpacity="0.45"
        strokeWidth="1"
      />

      {/* Left Wing — sharp heraldic geometric blades */}
      <g fill={`url(#${uid}-titanium)`}>
        <polygon points="15,30 46,42 44,48 21,39" />
        <polygon points="18,43 44,51 42,56 24,50" />
        <polygon points="22,55 43,60 41,65 28,61" />
        <polygon points="28,66 43,69 42,73 34,71" />
      </g>
      <path
        d="M17 31 L46 43"
        stroke={`url(#${uid}-emerald)`}
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      {/* Right Wing — symmetric mirror */}
      <g fill={`url(#${uid}-titanium)`}>
        <polygon points="105,30 74,42 76,48 99,39" />
        <polygon points="102,43 76,51 78,56 96,50" />
        <polygon points="98,55 77,60 79,65 92,61" />
        <polygon points="92,66 77,69 78,73 86,71" />
      </g>
      <path
        d="M103 31 L74 43"
        stroke={`url(#${uid}-emerald)`}
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      {/* Central Geometric Knight */}
      <path d="M44 96 L46 88 L74 88 L76 96 Z" fill={`url(#${uid}-silver)`} />
      <path
        d="M49 85 L52 63 C46 57 46 46 51 36 L55 24 L61 29 L66 23 L68 32 C74 36 78 44 77 52 L67 56 L61 52 L57 56 C66 61 70 72 68 85 Z"
        fill={`url(#${uid}-silver)`}
      />
      {/* Knight Crest & Neck Emerald Telemetry Line */}
      <path
        d="M52 84 C54 71 51 60 49 48 C48 41 51 35 55 28"
        fill="none"
        stroke={`url(#${uid}-emerald)`}
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Sharp Visor Eye */}
      <polygon points="62,41 67,39 65,43" fill="#16C784" />
      {/* Base Emerald Accent Line */}
      <line
        x1="40"
        y1="99"
        x2="80"
        y2="99"
        stroke={`url(#${uid}-emerald)`}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );

  if (!withWordmark) {
    return <span className={cn("inline-flex items-center", className)}>{emblemSvg}</span>;
  }

  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      {emblemSvg}
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-display font-bold uppercase tracking-[0.16em] text-foreground",
            variant === "splash" ? "text-2xl sm:text-3xl" : "text-[15px]",
          )}
        >
          PRO<span className="text-primary">CHESS</span>
        </span>
        {subtitle && (
          <span className="mt-1 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            {subtitle}
          </span>
        )}
      </span>
    </span>
  );
}
