import { ChevronDown, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import { CoachAvatar } from "@/features/coach/components/CoachAvatar";
import type { CoachEmotion } from "@/features/coach/coachMood";
import { useSettings } from "@/features/settings/SettingsProvider";
import { PROCHESS_CHARACTERS, getCharacter } from "@/lib/characters/characters";
import { cn } from "@/lib/utils";

interface CharacterCompanionCardProps {
  mood?: CoachEmotion;
  message?: string;
  speaking?: boolean;
  reactionKey?: string | number;
  compact?: boolean;
  allowHide?: boolean;
  className?: string;
}

/**
 * Interactive Living Character Companion displayed next to the chessboard
 * in Active Play, Puzzles, Daily Challenge, or as a hero companion in Main Menu.
 */
export function CharacterCompanionCard({
  mood = "calm",
  message,
  speaking = false,
  reactionKey,
  compact = false,
  allowHide = true,
  className,
}: CharacterCompanionCardProps) {
  const { settings, update, updateBoard } = useSettings();
  const [pickerOpen, setPickerOpen] = useState(false);

  const active = getCharacter(settings.coachPersona);
  const hidden = allowHide && !settings.board.showCharacterInGame;

  if (hidden) {
    return (
      <div
        className={cn(
          "flex items-center justify-between rounded-xl border border-border bg-card/70 px-3 py-2",
          className,
        )}
      >
        <span className="text-xs text-muted-foreground">Персонаж скрыт ({active.title})</span>
        <button
          type="button"
          onClick={() => updateBoard({ showCharacterInGame: true })}
          className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-accent"
        >
          <Eye className="size-3.5 text-primary" />
          Показать
        </button>
      </div>
    );
  }

  const displayText = message ?? active.reactions[mood];

  return (
    <section
      className={cn(
        "relative rounded-2xl border border-border bg-card/90 p-3 shadow-sm",
        className,
      )}
      aria-label="Персонаж PROCHESS"
    >
      <div className="flex items-start gap-3">
        <CoachAvatar
          mood={mood}
          persona={active.id}
          speaking={speaking}
          reactionKey={reactionKey ?? `${active.id}-${mood}`}
          className={compact ? "w-14 shrink-0" : "w-16 shrink-0"}
        />

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold text-foreground">{active.title}</div>
              <div className="truncate text-[11px] text-muted-foreground">
                {active.name} · {active.rarity}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => setPickerOpen((o) => !o)}
                title="Сменить персонажа PROCHESS"
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-secondary px-2 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-accent"
              >
                <span>Сменить</span>
                <ChevronDown
                  className={cn("size-3 transition-transform", pickerOpen && "rotate-180")}
                />
              </button>
              {allowHide && (
                <button
                  type="button"
                  onClick={() => updateBoard({ showCharacterInGame: false })}
                  title="Скрыть персонажа во время игры"
                  aria-label="Скрыть персонажа"
                  className="inline-flex items-center rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <EyeOff className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          <p className="rounded-lg border border-border/70 bg-background/55 px-2.5 py-1.5 text-xs leading-relaxed text-foreground/95">
            {displayText}
          </p>
        </div>
      </div>

      {pickerOpen && (
        <div className="mt-2.5 grid grid-cols-2 gap-1.5 border-t border-border pt-2.5 sm:grid-cols-2">
          {PROCHESS_CHARACTERS.map((char) => {
            const selected = char.id === active.id;
            return (
              <button
                key={char.id}
                type="button"
                onClick={() => {
                  update({ coachPersona: char.id });
                  setPickerOpen(false);
                }}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors",
                  selected
                    ? "border-primary bg-primary/12 text-foreground"
                    : "border-border bg-secondary/55 text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <img
                  src={char.portrait}
                  alt={char.title}
                  className="size-7 shrink-0 rounded-md object-cover object-top"
                />
                <div className="min-w-0">
                  <div className="truncate text-[11px] font-semibold text-foreground">
                    {char.title}
                  </div>
                  <div className="truncate text-[10px] text-muted-foreground">{char.name}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
