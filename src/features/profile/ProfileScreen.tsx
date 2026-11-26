import { Award, Check, CheckCircle2, Crown, Flame, Lock, Target, Trophy } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useProgression } from "@/features/progression/ProgressionProvider";
import { useSettings } from "@/features/settings/SettingsProvider";
import { ProfileBackupCard } from "@/features/settings/components/ProfileBackupCard";
import { getCharacter } from "@/lib/characters/characters";
import { ACHIEVEMENTS, PROFILE_FRAMES } from "@/lib/progression/storage";
import { cn } from "@/lib/utils";

export function ProfileScreen() {
  const { settings, update } = useSettings();
  const { progression, rank, equipFrame } = useProgression();

  const activeChar = getCharacter(settings.coachPersona);
  const equippedFrame =
    PROFILE_FRAMES.find((f) => f.id === progression.equippedFrame) ?? PROFILE_FRAMES[0]!;

  const winRate =
    progression.gamesPlayed > 0
      ? Math.round((progression.wins / progression.gamesPlayed) * 100)
      : 0;
  const avgAccuracy =
    progression.accuracySamples > 0
      ? Math.round(progression.accuracySum / progression.accuracySamples)
      : 0;

  return (
    <main className="mx-auto w-full max-w-[1320px] flex-1 space-y-6 px-4 pb-12 pt-6 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "relative size-16 overflow-hidden rounded-2xl bg-card",
              equippedFrame.ringClass,
            )}
          >
            <img
              src={activeChar.portrait}
              alt={activeChar.title}
              className="size-full object-cover object-top"
            />
          </div>
          <div>
            <p className="eyebrow text-primary">
              Ранг {rank.level}: {rank.title} · {activeChar.title}
            </p>
            <Input
              value={settings.playerName}
              maxLength={28}
              aria-label="Имя игрока"
              onChange={(e) => update({ playerName: e.target.value })}
              className="mt-1 h-9 max-w-[16rem] border-border bg-secondary/70 font-display text-lg font-medium"
            />
          </div>
        </div>

        <div className="panel min-w-[16rem] space-y-1.5 px-4 py-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Прогресс ранга ({rank.title})</span>
            <span className="font-mono text-primary">{progression.xp} XP</span>
          </div>
          <Progress value={rank.progressPct} className="h-2" />
          <p className="text-[11px] text-muted-foreground">
            {rank.nextMin !== null
              ? `До следующего звания: ${rank.nextMin - progression.xp} XP`
              : "Достигнут высший ранг клуба PROCHESS"}
          </p>
        </div>
      </div>

      {/* Main Stats */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile label="Рейтинг ProChess" value={`${progression.rating}`} accent />
        <StatTile label="Рейтинг задач" value={`${progression.tacticsRating}`} />
        <StatTile
          label="Ежедневная серия"
          value={`${progression.dailyStreak} дн. (рек. ${progression.bestDailyStreak})`}
        />
        <StatTile
          label="Решено задач"
          value={`${progression.puzzlesSolved} (комбо ${progression.bestCombo})`}
        />
        <StatTile label="Побед / Игр" value={`${winRate}% (${progression.gamesPlayed})`} />
        <StatTile label="Средняя точность" value={`${avgAccuracy}%`} />
      </section>

      {/* Profile Frames */}
      <section className="panel space-y-3 p-5">
        <div className="flex items-center justify-between">
          <p className="eyebrow flex items-center gap-1.5 text-primary">
            <Crown className="size-3.5" aria-hidden />
            Рамки профиля PROCHESS
          </p>
          <span className="font-mono text-xs text-muted-foreground">
            Открыто {progression.unlockedFrames.length}/{PROFILE_FRAMES.length}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
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
                  "flex items-center gap-2.5 rounded-xl border p-2.5 text-left text-xs transition-colors",
                  equipped
                    ? "border-primary bg-primary/12"
                    : unlocked
                      ? "border-border bg-secondary/45 hover:border-primary/45"
                      : "border-border/60 bg-secondary/20 opacity-60",
                )}
              >
                <span className={cn("size-7 shrink-0 rounded-full bg-card", frame.ringClass)} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-foreground">
                    {frame.label}
                  </span>
                  <span className="block truncate text-[10px] text-muted-foreground">
                    {unlocked ? (equipped ? "Надета" : "Доступна") : frame.unlockHint}
                  </span>
                </span>
                {equipped ? (
                  <Check className="size-3.5 shrink-0 text-primary" />
                ) : !unlocked ? (
                  <Lock className="size-3.5 shrink-0 text-muted-foreground" />
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      {/* Category Ratings & Trainer Records */}
      <section className="panel space-y-4 p-5">
        <div>
          <p className="eyebrow mb-3 text-primary">Профиль навыков</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SkillBox label="Тактика" value={progression.tacticsRating} />
            <SkillBox label="Стратегия" value={progression.strategyRating} />
            <SkillBox label="Эндшпиль" value={progression.endgameRating} />
            <SkillBox label="Дебюты" value={progression.openingsRating} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 border-t border-border/70 pt-4 sm:grid-cols-3">
          <SkillBox label="Рекорд Тактического штурма" value={progression.puzzleRushBest} />
          <SkillBox label="Рекорд тренажёра координат" value={progression.coordsBestScore} />
          <SkillBox label="Эндшпилей пройдено" value={progression.endgameDrillsCompleted} />
        </div>
      </section>

      <ProfileBackupCard />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Daily Quests */}
        <section className="panel space-y-3 p-5">
          <div className="flex items-center justify-between">
            <p className="eyebrow flex items-center gap-1.5 text-primary">
              <Target className="size-3.5" aria-hidden />
              Ежедневные задания
            </p>
            <span className="font-mono text-xs text-muted-foreground">
              {progression.dailyQuests.filter((q) => q.claimed).length}/
              {progression.dailyQuests.length}
            </span>
          </div>
          <div className="space-y-2.5">
            {progression.dailyQuests.map((q) => {
              const pct = Math.min(100, Math.round((q.progress / q.target) * 100));
              return (
                <div
                  key={q.id}
                  className={cn(
                    "rounded-lg border p-3 text-xs",
                    q.claimed ? "border-primary/45 bg-primary/10" : "border-border bg-secondary/45",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 font-medium text-foreground">
                      {q.claimed ? (
                        <CheckCircle2 className="size-4 text-primary" />
                      ) : (
                        <Flame className="size-4 text-warning" />
                      )}
                      {q.title}
                    </span>
                    <span className="font-mono text-primary">+{q.xpReward} XP</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Progress value={pct} className="h-1.5 flex-1" />
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {q.progress}/{q.target}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Achievements */}
        <section className="panel space-y-3 p-5">
          <div className="flex items-center justify-between">
            <p className="eyebrow flex items-center gap-1.5 text-primary">
              <Trophy className="size-3.5" aria-hidden />
              Достижения клуба
            </p>
            <span className="font-mono text-xs text-muted-foreground">
              {progression.unlockedAchievements.length}/{ACHIEVEMENTS.length}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {ACHIEVEMENTS.map((ach) => {
              const unlocked = progression.unlockedAchievements.includes(ach.id);
              return (
                <div
                  key={ach.id}
                  className={cn(
                    "flex items-start gap-2.5 rounded-lg border p-2.5 text-xs",
                    unlocked
                      ? "border-primary/50 bg-primary/10 text-foreground"
                      : "border-border/70 bg-secondary/35 text-muted-foreground opacity-75",
                  )}
                >
                  {unlocked ? (
                    <Crown className="mt-0.5 size-4 shrink-0 text-primary" />
                  ) : (
                    <Award className="mt-0.5 size-4 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{ach.title}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                      {ach.description}
                    </p>
                    <p className="mt-1 font-mono text-[10px] text-primary">+{ach.xp} XP</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

function StatTile({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="panel px-3.5 py-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 font-mono text-xl font-semibold",
          accent ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function SkillBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/45 px-3.5 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-mono text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}
