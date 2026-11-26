import { Check, Crown, Lock, Palette, Sparkles, UserCheck } from "lucide-react";
import { useState } from "react";

import { CoachAvatar } from "@/features/coach/components/CoachAvatar";
import { COACH_EMOTION_META, type CoachEmotion } from "@/features/coach/coachMood";
import { useProgression } from "@/features/progression/ProgressionProvider";
import { useSettings } from "@/features/settings/SettingsProvider";
import { BOARD_THEMES, PIECE_SETS } from "@/lib/appearance/themes";
import { PROCHESS_CHARACTERS, type ProChessCharacter } from "@/lib/characters/characters";
import { PROFILE_FRAMES } from "@/lib/progression/storage";
import { cn } from "@/lib/utils";

const PREVIEW_EMOTIONS: readonly CoachEmotion[] = [
  "calm",
  "approval",
  "surprise",
  "concentration",
  "check_alert",
  "mate_triumph",
  "disappointment",
];

export function CollectionScreen({
  onOpenBoardCustomizer,
}: {
  onOpenBoardCustomizer?: () => void;
}) {
  const { settings, update } = useSettings();
  const { progression, equipFrame } = useProgression();
  const [selectedChar, setSelectedChar] = useState<ProChessCharacter>(
    () =>
      PROCHESS_CHARACTERS.find((c) => c.id === settings.coachPersona) ?? PROCHESS_CHARACTERS[0]!,
  );
  const [previewEmotion, setPreviewEmotion] = useState<CoachEmotion>("approval");

  const highlightPieces = PIECE_SETS.filter(
    (p) =>
      p.id === "gold-mirror" ||
      p.id === "royal-gold" ||
      p.id === "liquid-gold" ||
      p.id === "crystal" ||
      p.id === "obsidian" ||
      p.id === "neon",
  );

  const highlightBoards = BOARD_THEMES.slice(0, 6);

  return (
    <main className="mx-auto w-full max-w-[1400px] flex-1 space-y-7 px-4 pb-12 pt-5 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow text-primary">Персонажи, рамки и эстетика</p>
          <h1 className="mt-0.5 font-display text-2xl sm:text-3xl">Коллекция PROCHESS</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Все награды открываются через рейтинг, серии и достижения — без доната и платных
            преимуществ.
          </p>
        </div>

        {onOpenBoardCustomizer && (
          <button
            type="button"
            onClick={onOpenBoardCustomizer}
            className="inline-flex items-center gap-2 rounded-xl border border-primary/45 bg-primary/12 px-4 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
          >
            <Palette className="size-4" />
            Все 26 коллекций фигур и 39 досок
          </button>
        )}
      </header>

      {/* Active Character Interactive Stage + 10 Character Roster */}
      <section className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="panel space-y-4 p-5">
          <div className="flex items-center justify-between">
            <span className="eyebrow text-primary">Живая модель · {selectedChar.rarity}</span>
            {settings.coachPersona === selectedChar.id && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                <UserCheck className="size-3.5" /> Активен
              </span>
            )}
          </div>

          <CoachAvatar
            mood={previewEmotion}
            persona={selectedChar.id}
            reactionKey={`${selectedChar.id}-${previewEmotion}`}
            className="mx-auto w-44"
          />

          <div className="text-center">
            <h2 className="font-display text-2xl">{selectedChar.title}</h2>
            <p className="text-xs text-muted-foreground">
              {selectedChar.name} · {selectedChar.role}
            </p>
          </div>

          <p className="rounded-xl border border-border bg-secondary/50 p-3 text-xs leading-relaxed text-foreground/95">
            «{selectedChar.reactions[previewEmotion]}»
          </p>

          <div>
            <p className="mb-1.5 text-[11px] text-muted-foreground">Проверить эмоции и анимацию:</p>
            <div className="flex flex-wrap gap-1.5">
              {PREVIEW_EMOTIONS.map((emo) => (
                <button
                  key={emo}
                  type="button"
                  onClick={() => setPreviewEmotion(emo)}
                  className={cn(
                    "rounded-md border px-2 py-1 text-[11px] transition-colors",
                    previewEmotion === emo
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-secondary/50 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {COACH_EMOTION_META[emo].label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => update({ coachPersona: selectedChar.id })}
            className={cn(
              "w-full rounded-xl py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors",
              settings.coachPersona === selectedChar.id
                ? "bg-secondary text-primary"
                : "bg-primary text-primary-foreground hover:bg-primary/90",
            )}
          >
            {settings.coachPersona === selectedChar.id
              ? "Выбран для партий и задач"
              : "Выбрать персонажа"}
          </button>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">
            10 персонажей PROCHESS ({PROCHESS_CHARACTERS.length})
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {PROCHESS_CHARACTERS.map((char) => {
              const isEquipped = settings.coachPersona === char.id;
              const isViewing = selectedChar.id === char.id;
              return (
                <button
                  key={char.id}
                  type="button"
                  onClick={() => setSelectedChar(char)}
                  className={cn(
                    "flex items-start gap-3 rounded-2xl border p-3 text-left transition-all",
                    isViewing
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-border bg-card/85 hover:border-primary/45",
                  )}
                >
                  <img
                    src={char.portrait}
                    alt={char.title}
                    className="size-16 shrink-0 rounded-xl border border-white/10 object-cover object-top"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate text-xs font-semibold text-foreground">
                        {char.title}
                      </span>
                      {isEquipped && <Check className="size-3.5 shrink-0 text-primary" />}
                    </div>
                    <p className="truncate text-[11px] text-primary">{char.name}</p>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                      {char.bio}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Profile Frames */}
      <section className="panel space-y-3 p-5">
        <div className="flex items-center justify-between">
          <p className="eyebrow flex items-center gap-1.5 text-primary">
            <Crown className="size-3.5" /> Рамки профиля (Награды за серии и опыт)
          </p>
          <span className="font-mono text-xs text-muted-foreground">
            Открыто: {progression.unlockedFrames.length}/{PROFILE_FRAMES.length}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {PROFILE_FRAMES.map((frame) => {
            const unlocked = progression.unlockedFrames.includes(frame.id);
            const equipped = progression.equippedFrame === frame.id;
            return (
              <button
                key={frame.id}
                type="button"
                disabled={!unlocked}
                onClick={() => unlocked && equipFrame(frame.id)}
                className={cn(
                  "flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-all",
                  equipped
                    ? "border-primary bg-primary/12"
                    : unlocked
                      ? "border-border bg-secondary/50 hover:border-primary/50"
                      : "border-border/60 bg-secondary/20 opacity-65",
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <span className={cn("size-8 rounded-full bg-card", frame.ringClass)} />
                  {equipped ? (
                    <Check className="size-4 text-primary" />
                  ) : !unlocked ? (
                    <Lock className="size-4 text-muted-foreground" />
                  ) : null}
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">{frame.label}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                    {unlocked ? frame.description : frame.unlockHint}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Quick Piece Sets & Board Themes */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="panel space-y-3 p-5">
          <p className="eyebrow flex items-center gap-1.5 text-primary">
            <Sparkles className="size-3.5" /> Эксклюзивные наборы фигур
          </p>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {highlightPieces.map((ps) => {
              const active = settings.pieceSet === ps.id;
              return (
                <button
                  key={ps.id}
                  type="button"
                  onClick={() => update({ pieceSet: ps.id })}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-colors",
                    active
                      ? "border-primary bg-primary/12"
                      : "border-border bg-secondary/45 hover:border-primary/45",
                  )}
                >
                  <p className="text-xs font-semibold text-foreground">{ps.label}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{ps.note}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="panel space-y-3 p-5">
          <p className="eyebrow flex items-center gap-1.5 text-primary">
            <Palette className="size-3.5" /> Быстрый выбор темы доски
          </p>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {highlightBoards.map((bt) => {
              const active = settings.boardTheme === bt.id;
              return (
                <button
                  key={bt.id}
                  type="button"
                  onClick={() => update({ boardTheme: bt.id })}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-colors",
                    active
                      ? "border-primary bg-primary/12"
                      : "border-border bg-secondary/45 hover:border-primary/45",
                  )}
                >
                  <span className="grid size-7 shrink-0 grid-cols-2 grid-rows-2 overflow-hidden rounded-md border border-white/10">
                    <span style={{ backgroundColor: bt.light }} />
                    <span style={{ backgroundColor: bt.dark }} />
                    <span style={{ backgroundColor: bt.dark }} />
                    <span style={{ backgroundColor: bt.light }} />
                  </span>
                  <span className="min-w-0 truncate text-xs font-medium text-foreground">
                    {bt.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
