import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

export type CoachMood =
  | "neutral"
  | "thinking"
  | "happy"
  | "amazed"
  | "pleased"
  | "pensive"
  | "concerned"
  | "shocked"
  | "celebrate"
  | "calm";

interface Face {
  mouth: string;
  /** Left / right eyebrow paths. */
  browL: string;
  browR: string;
  /** Eye vertical scale (1 = open, small = squint/smile). */
  eye: number;
  /** Pupils offset (look direction). */
  look: [number, number];
  blush: boolean;
  openMouth: boolean;
}

const FACES: Record<CoachMood, Face> = {
  neutral: {
    mouth: "M50 63 Q60 67 70 63",
    browL: "M43 37 Q49 35 55 37",
    browR: "M65 37 Q71 35 77 37",
    eye: 1,
    look: [0, 0],
    blush: false,
    openMouth: false,
  },
  thinking: {
    mouth: "M52 65 Q60 63 68 62",
    browL: "M43 38 Q49 37 55 38",
    browR: "M65 34 Q71 31 77 34",
    eye: 0.9,
    look: [2.5, -2.5],
    blush: false,
    openMouth: false,
  },
  happy: {
    mouth: "M47 60 Q60 74 73 60",
    browL: "M43 35 Q49 32 55 35",
    browR: "M65 35 Q71 32 77 35",
    eye: 0.55,
    look: [0, 0],
    blush: true,
    openMouth: false,
  },
  amazed: {
    mouth: "M48 60 Q60 76 72 60",
    browL: "M43 33 Q49 29 55 33",
    browR: "M65 33 Q71 29 77 33",
    eye: 1.15,
    look: [0, 0],
    blush: true,
    openMouth: true,
  },
  pleased: {
    mouth: "M50 62 Q60 69 70 62",
    browL: "M43 36 Q49 34 55 36",
    browR: "M65 36 Q71 34 77 36",
    eye: 0.8,
    look: [0, 0],
    blush: false,
    openMouth: false,
  },
  pensive: {
    mouth: "M52 65 Q60 63 68 65",
    browL: "M43 36 Q49 37 55 38",
    browR: "M65 38 Q71 37 77 36",
    eye: 0.85,
    look: [-2, 1],
    blush: false,
    openMouth: false,
  },
  concerned: {
    mouth: "M50 67 Q60 60 70 67",
    browL: "M43 38 Q49 35 55 33",
    browR: "M65 33 Q71 35 77 38",
    eye: 0.95,
    look: [0, 1],
    blush: false,
    openMouth: false,
  },
  shocked: {
    mouth: "M54 66 Q60 58 66 66 Q60 74 54 66",
    browL: "M43 32 Q49 28 55 31",
    browR: "M65 31 Q71 28 77 32",
    eye: 1.25,
    look: [0, 0],
    blush: false,
    openMouth: true,
  },
  celebrate: {
    mouth: "M46 59 Q60 78 74 59",
    browL: "M43 33 Q49 29 55 33",
    browR: "M65 33 Q71 29 77 33",
    eye: 0.5,
    look: [0, 0],
    blush: true,
    openMouth: true,
  },
  calm: {
    mouth: "M52 63 Q60 67 68 63",
    browL: "M43 37 Q49 36 55 37",
    browR: "M65 37 Q71 36 77 37",
    eye: 0.35,
    look: [0, 1],
    blush: false,
    openMouth: false,
  },
};

const CONFETTI = [
  { x: 14, y: 30, r: -20, d: "0s" },
  { x: 100, y: 24, r: 25, d: "0.15s" },
  { x: 22, y: 12, r: 40, d: "0.3s" },
  { x: 92, y: 8, r: -35, d: "0.1s" },
  { x: 8, y: 56, r: 10, d: "0.4s" },
  { x: 108, y: 52, r: -10, d: "0.25s" },
];

interface CoachAvatarProps {
  mood: CoachMood;
  className?: string;
  /** Changes on every new reaction so the reaction animation replays. */
  reactionKey?: string | number;
}

/** The Chess Coach character: an ivory pawn with a face whose expression follows the game. */
export function CoachAvatar({ mood, className, reactionKey }: CoachAvatarProps) {
  const face = FACES[mood];
  const d = (path: string) => ({ d: `path("${path}")` }) as CSSProperties;
  return (
    <div className={cn("coach-avatar relative", className)} data-mood={mood} aria-hidden>
      <svg viewBox="0 0 120 120" className="size-full overflow-visible">
        <ellipse cx="60" cy="114" rx="30" ry="4" className="coach-shadow" />
        <g key={reactionKey} className="coach-body">
          <path
            d="M34 112 C34 100 42 94 50 90 C46 86 45 82 47 79 L73 79 C75 82 74 86 70 90 C78 94 86 100 86 112 Z"
            className="coach-robe"
          />
          <rect x="42" y="76" width="36" height="7" rx="3.5" className="coach-collar" />
          <g className="coach-head">
            <circle cx="60" cy="48" r="30" className="coach-skin" />
            <path d="M33 40 Q36 18 60 17 Q84 18 87 40 Q74 28 60 28 Q46 28 33 40 Z" className="coach-cap" />
            <circle cx="60" cy="15" r="4" className="coach-collar" />
            {face.blush && (
              <>
                <ellipse cx="42" cy="58" rx="5" ry="3" className="coach-blush" />
                <ellipse cx="78" cy="58" rx="5" ry="3" className="coach-blush" />
              </>
            )}
            <path d={face.browL} style={d(face.browL)} className="coach-brow" />
            <path d={face.browR} style={d(face.browR)} className="coach-brow" />
            <g className="coach-eyes">
              {[49, 71].map((cx) => (
                <g key={cx} style={{ transform: `scaleY(${face.eye})`, transformOrigin: `${cx}px 47px` }} className="coach-eye">
                  <ellipse cx={cx} cy="47" rx="5" ry="6" className="coach-ink" />
                  <circle cx={cx + 1.5 + face.look[0]} cy={45 + face.look[1]} r="1.7" className="coach-glint" />
                </g>
              ))}
            </g>
            <path d={face.mouth} style={d(face.mouth)} className={cn("coach-mouth", face.openMouth && "coach-mouth-open")} />
          </g>
        </g>
        {mood === "thinking" && (
          <g className="coach-dots">
            <circle cx="94" cy="20" r="3" />
            <circle cx="102" cy="12" r="2.2" />
            <circle cx="108" cy="5" r="1.6" />
          </g>
        )}
        {(mood === "celebrate" || mood === "amazed") && (
          <g key={`c-${reactionKey}`}>
            {CONFETTI.map((c, i) => (
              <rect
                key={i}
                x={c.x}
                y={c.y}
                width="5"
                height="2.4"
                rx="1"
                className={cn("coach-confetti", i % 2 ? "coach-confetti-a" : "coach-confetti-b")}
                style={{ transform: `rotate(${c.r}deg)`, transformOrigin: `${c.x}px ${c.y}px`, animationDelay: c.d }}
              />
            ))}
          </g>
        )}
      </svg>
    </div>
  );
}
