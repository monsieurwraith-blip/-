/**
 * ProChess persistent player progression, rating, achievements, game archive,
 * daily missions, combo streaks, profile frames, daily challenge history,
 * and PGN file export. Stored in localStorage under `prochess:progression`.
 */
import type { DifficultyId } from "@/lib/chess/difficulty";
import type { Color } from "@/lib/chess/types";

export const PROGRESSION_STORAGE_KEY = "prochess:progression";

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  xp: number;
  frameReward?: string;
}

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  {
    id: "first-win",
    title: "Первая победа",
    description: "Одержите первую победу над Stockfish",
    xp: 60,
  },
  {
    id: "streak-5",
    title: "5 побед подряд",
    description: "Выиграйте 5 партий без единого поражения",
    xp: 140,
  },
  {
    id: "streak-10",
    title: "10 побед подряд",
    description: "Добейтесь впечатляющей серии из 10 побед",
    xp: 300,
    frameReward: "master-emerald",
  },
  {
    id: "clean-win",
    title: "Победа без ошибок",
    description: "Выиграйте партию с точностью 90%+ и без грубых зевков",
    xp: 180,
  },
  {
    id: "tactic-combo",
    title: "Тактическая комбинация",
    description: "Решите 3 тактические задачи в Арене задач",
    xp: 90,
  },
  {
    id: "combo-5",
    title: "COMBO x5 — Мастер расчёта",
    description: "Решите 5 задач подряд без единой ошибки",
    xp: 160,
    frameReward: "tactical-cyan",
  },
  {
    id: "perfect-streak-10",
    title: "PERFECT STREAK",
    description: "Выдайте идеальную серию из 10 задач подряд без промахов",
    xp: 320,
    frameReward: "gold-club",
  },
  {
    id: "daily-finish",
    title: "Ежедневная закалка",
    description: "Завершите полную ежедневную тренировку из 10 задач",
    xp: 150,
  },
  {
    id: "daily-streak-7",
    title: "Неделя дисциплины",
    description: "Выполните ежедневную тренировку 7 дней подряд",
    xp: 350,
    frameReward: "royal-crown",
  },
  {
    id: "mate-combo",
    title: "Мат красивой комбинацией",
    description: "Поставьте мат движку в активной партии",
    xp: 110,
  },
  {
    id: "giant-killer",
    title: "Победа над сильным соперником",
    description: "Обыграйте Stockfish на уровне Сильный или Эксперт",
    xp: 240,
  },
  {
    id: "games-100",
    title: "100 партий",
    description: "Сыграйте 100 партий на платформе PROCHESS",
    xp: 400,
  },
  {
    id: "games-1000",
    title: "1000 партий",
    description: "Ветеран интеллектуального клуба PROCHESS",
    xp: 1200,
  },
  {
    id: "endgame-master",
    title: "Мастер эндшпиля",
    description: "Проведите более 40 ходов и одержите победу",
    xp: 150,
  },
] as const;

export interface ProfileFrameDef {
  id: string;
  label: string;
  description: string;
  ringClass: string;
  unlockHint: string;
}

export const PROFILE_FRAMES: readonly ProfileFrameDef[] = [
  {
    id: "obsidian",
    label: "Обсидиан Классик",
    description: "Базовая строгая рамка клуба PROCHESS",
    ringClass: "ring-2 ring-white/25 border-white/20",
    unlockHint: "Доступна с самого старта",
  },
  {
    id: "master-emerald",
    label: "Изумрудный Мастер",
    description: "Свечение за серию из 10 побед или высокий тактический ранг",
    ringClass: "ring-2 ring-emerald-400 shadow-[0_0_18px_rgba(22,199,132,0.45)]",
    unlockHint: "Награда за 10 побед подряд или 600 XP",
  },
  {
    id: "tactical-cyan",
    label: "Тактический импульс",
    description: "Холодный неон аналитика комбинаций",
    ringClass: "ring-2 ring-sky-400 shadow-[0_0_18px_rgba(56,189,248,0.45)]",
    unlockHint: "Награда за COMBO x5 в задачах",
  },
  {
    id: "gold-club",
    label: "GOLD MIRROR",
    description: "Элитная золотая рамка мастера серии",
    ringClass: "ring-2 ring-amber-400 shadow-[0_0_22px_rgba(251,191,36,0.5)]",
    unlockHint: "Награда за PERFECT STREAK (10 подряд)",
  },
  {
    id: "royal-crown",
    label: "Королевская корона",
    description: "Высшая награда ежедневной дисциплины",
    ringClass: "ring-2 ring-yellow-300 shadow-[0_0_24px_rgba(253,224,71,0.55)]",
    unlockHint: "Награда за 7 дней ежедневных тренировок",
  },
] as const;

export const PLAYER_RANKS = [
  { title: "Новичок", minXp: 0 },
  { title: "Любитель", minXp: 150 },
  { title: "Тактик", minXp: 400 },
  { title: "Стратег", minXp: 800 },
  { title: "Эксперт", minXp: 1400 },
  { title: "Мастер", minXp: 2300 },
  { title: "Гроссмейстер", minXp: 3600 },
  { title: "Легенда", minXp: 5500 },
] as const;

export interface DailyQuestItem {
  id: string;
  title: string;
  target: number;
  progress: number;
  xpReward: number;
  claimed: boolean;
}

export interface ArchivedGame {
  id: string;
  playedAt: string;
  opponent: string;
  difficulty: DifficultyId;
  styleLabel: string;
  mode: string;
  playerColor: Color;
  result: "win" | "loss" | "draw";
  outcomeReason: string;
  ratingDelta: number;
  durationSec: number;
  movesCount: number;
  accuracy: number;
  bestCount: number;
  mistakesCount: number;
  blundersCount: number;
  pgn: string;
  finalFen: string;
  openingHint: string;
}

export interface PlayerProgression {
  rating: number;
  peakRating: number;
  xp: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  currentStreak: number;
  bestStreak: number;
  tacticsRating: number;
  strategyRating: number;
  endgameRating: number;
  openingsRating: number;
  puzzlesSolved: number;
  lessonsCompleted: number;
  accuracySum: number;
  accuracySamples: number;
  unlockedAchievements: string[];
  questDate: string;
  dailyQuests: DailyQuestItem[];
  archive: ArchivedGame[];
  dailyTrainingDates: string[];
  dailyStreak: number;
  bestDailyStreak: number;
  bestDailyScore: number;
  puzzleStreak: number;
  bestPuzzleStreak: number;
  comboCount: number;
  bestCombo: number;
  dailyPuzzlesSolvedToday: number;
  unlockedFrames: string[];
  equippedFrame: string;
  puzzleRushBest: number;
  coordsBestScore: number;
  endgameDrillsCompleted: number;
}

export function todayKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function yesterdayKey(date = new Date()): string {
  const y = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
  return todayKey(y);
}

const FULL_MISSION_POOL: readonly Omit<DailyQuestItem, "progress" | "claimed">[] = [
  { id: "puzzles-5", title: "Решить 5 тактических задач", target: 5, xpReward: 95 },
  { id: "mate-2", title: "Найти мат в 2 хода", target: 1, xpReward: 85 },
  { id: "beat-stockfish", title: "Победить Stockfish в партии", target: 1, xpReward: 90 },
  { id: "no-blunders", title: "Завершить партию без грубых ошибок", target: 1, xpReward: 110 },
  { id: "analyze-err", title: "Провести разбор в Лаборатории анализа", target: 1, xpReward: 70 },
  { id: "best-moves-3", title: "Найти лучший ход в 3 позициях", target: 3, xpReward: 80 },
  { id: "castle-game", title: "Сделать рокировку в активной партии", target: 1, xpReward: 55 },
  { id: "tactic-combo-run", title: "Собрать серию COMBO x3 в задачах", target: 1, xpReward: 90 },
  { id: "win-material", title: "Выиграть материал в тактической партии", target: 1, xpReward: 75 },
];

export function createDailyQuests(dateStr = todayKey()): DailyQuestItem[] {
  // Deterministic rotation so today always includes core tactical + game + analysis missions
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) >>> 0;
  }
  const rotated = [...FULL_MISSION_POOL];
  const mandatory = [rotated[0]!, rotated[2]!, rotated[4]!];
  const rest = rotated.filter(
    (m) => m.id !== "puzzles-5" && m.id !== "beat-stockfish" && m.id !== "analyze-err",
  );
  const idxA = hash % rest.length;
  const idxB = (hash + 3) % rest.length;
  const picked = [
    ...mandatory,
    rest[idxA]!,
    rest[idxB === idxA ? (idxA + 1) % rest.length : idxB]!,
  ];
  return picked.map((m) => ({ ...m, progress: 0, claimed: false }));
}

export function defaultProgression(): PlayerProgression {
  const today = todayKey();
  return {
    rating: 1200,
    peakRating: 1200,
    xp: 0,
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    currentStreak: 0,
    bestStreak: 0,
    tacticsRating: 1200,
    strategyRating: 1200,
    endgameRating: 1200,
    openingsRating: 1200,
    puzzlesSolved: 0,
    lessonsCompleted: 0,
    accuracySum: 0,
    accuracySamples: 0,
    unlockedAchievements: [],
    questDate: today,
    dailyQuests: createDailyQuests(today),
    archive: [],
    dailyTrainingDates: [],
    dailyStreak: 0,
    bestDailyStreak: 0,
    bestDailyScore: 0,
    puzzleStreak: 0,
    bestPuzzleStreak: 0,
    comboCount: 0,
    bestCombo: 0,
    dailyPuzzlesSolvedToday: 0,
    unlockedFrames: ["obsidian"],
    equippedFrame: "obsidian",
    puzzleRushBest: 0,
    coordsBestScore: 0,
    endgameDrillsCompleted: 0,
  };
}

export function comboBadgeForCount(count: number): {
  label: string;
  tier: 0 | 1 | 2 | 3;
  xpBonus: number;
} {
  if (count >= 10) return { label: "PERFECT STREAK", tier: 3, xpBonus: 40 };
  if (count >= 5) return { label: "COMBO x5", tier: 2, xpBonus: 20 };
  if (count >= 3) return { label: "COMBO x3", tier: 1, xpBonus: 10 };
  return { label: "", tier: 0, xpBonus: 0 };
}

export function rankForXp(xp: number): {
  title: string;
  level: number;
  currentMin: number;
  nextMin: number | null;
  progressPct: number;
} {
  let idx = 0;
  for (let i = 0; i < PLAYER_RANKS.length; i++) {
    if (xp >= PLAYER_RANKS[i]!.minXp) idx = i;
  }
  const curr = PLAYER_RANKS[idx]!;
  const next = PLAYER_RANKS[idx + 1] ?? null;
  const pct = next
    ? Math.min(100, Math.round(((xp - curr.minXp) / (next.minXp - curr.minXp)) * 100))
    : 100;
  return {
    title: curr.title,
    level: idx + 1,
    currentMin: curr.minXp,
    nextMin: next ? next.minXp : null,
    progressPct: pct,
  };
}

export function difficultyRating(diff: DifficultyId): number {
  switch (diff) {
    case "novice":
      return 850;
    case "easy":
      return 1100;
    case "medium":
      return 1400;
    case "strong":
      return 1750;
    case "expert":
      return 2150;
  }
}

export function computeEloDelta(
  playerRating: number,
  opponentRating: number,
  result: "win" | "loss" | "draw",
): number {
  const expected = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  const actual = result === "win" ? 1 : result === "draw" ? 0.5 : 0;
  return Math.round(28 * (actual - expected));
}

export function loadProgression(
  storage: Pick<Storage, "getItem"> = window.localStorage,
): PlayerProgression {
  try {
    const raw = storage.getItem(PROGRESSION_STORAGE_KEY);
    if (!raw) return defaultProgression();
    const parsed = JSON.parse(raw) as Partial<PlayerProgression>;
    const base = defaultProgression();
    const today = todayKey();
    const sameDay = parsed.questDate === today;
    return {
      ...base,
      ...parsed,
      questDate: today,
      dailyQuests:
        sameDay && Array.isArray(parsed.dailyQuests) && parsed.dailyQuests.length >= 4
          ? parsed.dailyQuests
          : createDailyQuests(today),
      dailyPuzzlesSolvedToday:
        sameDay && typeof parsed.dailyPuzzlesSolvedToday === "number"
          ? parsed.dailyPuzzlesSolvedToday
          : 0,
      unlockedAchievements: Array.isArray(parsed.unlockedAchievements)
        ? parsed.unlockedAchievements
        : [],
      archive: Array.isArray(parsed.archive) ? parsed.archive.slice(0, 80) : [],
      dailyTrainingDates: Array.isArray(parsed.dailyTrainingDates)
        ? parsed.dailyTrainingDates.slice(-90)
        : [],
      unlockedFrames:
        Array.isArray(parsed.unlockedFrames) && parsed.unlockedFrames.length > 0
          ? parsed.unlockedFrames
          : ["obsidian"],
      equippedFrame: typeof parsed.equippedFrame === "string" ? parsed.equippedFrame : "obsidian",
      puzzleRushBest:
        typeof parsed.puzzleRushBest === "number" && parsed.puzzleRushBest >= 0
          ? parsed.puzzleRushBest
          : 0,
      coordsBestScore:
        typeof parsed.coordsBestScore === "number" && parsed.coordsBestScore >= 0
          ? parsed.coordsBestScore
          : 0,
      endgameDrillsCompleted:
        typeof parsed.endgameDrillsCompleted === "number" && parsed.endgameDrillsCompleted >= 0
          ? parsed.endgameDrillsCompleted
          : 0,
    };
  } catch {
    return defaultProgression();
  }
}

export function saveProgression(
  next: PlayerProgression,
  storage: Pick<Storage, "setItem"> = window.localStorage,
): void {
  try {
    storage.setItem(PROGRESSION_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage quota issues.
  }
}

export function advanceQuest(
  prog: PlayerProgression,
  questId: string,
  amount = 1,
): { next: PlayerProgression; xpEarned: number } {
  let xpEarned = 0;
  const dailyQuests = prog.dailyQuests.map((q) => {
    if (q.id !== questId) return q;
    const progress = Math.min(q.target, q.progress + amount);
    const newlyCompleted = progress >= q.target && !q.claimed;
    if (newlyCompleted) xpEarned += q.xpReward;
    return { ...q, progress, claimed: q.claimed || newlyCompleted };
  });
  let unlockedFrames = prog.unlockedFrames;
  const nextXp = prog.xp + xpEarned;
  if (nextXp >= 600 && !unlockedFrames.includes("master-emerald")) {
    unlockedFrames = [...unlockedFrames, "master-emerald"];
  }
  return {
    next: { ...prog, xp: nextXp, dailyQuests, unlockedFrames },
    xpEarned,
  };
}

export function unlockAchievement(
  prog: PlayerProgression,
  id: string,
): { next: PlayerProgression; unlocked: AchievementDef | null } {
  if (prog.unlockedAchievements.includes(id)) return { next: prog, unlocked: null };
  const def = ACHIEVEMENTS.find((a) => a.id === id) ?? null;
  if (!def) return { next: prog, unlocked: null };
  const unlockedFrames =
    def.frameReward && !prog.unlockedFrames.includes(def.frameReward)
      ? [...prog.unlockedFrames, def.frameReward]
      : prog.unlockedFrames;
  return {
    next: {
      ...prog,
      xp: prog.xp + def.xp,
      unlockedAchievements: [...prog.unlockedAchievements, id],
      unlockedFrames,
    },
    unlocked: def,
  };
}

export function recordDailyTrainingCompletion(
  prog: PlayerProgression,
  dateKeyStr: string,
  solvedCount: number,
): { next: PlayerProgression; newlyUnlocked: AchievementDef[] } {
  const alreadyRecorded = prog.dailyTrainingDates.includes(dateKeyStr);
  const dates = alreadyRecorded
    ? prog.dailyTrainingDates
    : [...prog.dailyTrainingDates, dateKeyStr].slice(-90);

  let dailyStreak = prog.dailyStreak;
  if (!alreadyRecorded) {
    const prevDate = prog.dailyTrainingDates[prog.dailyTrainingDates.length - 1];
    dailyStreak = prevDate === yesterdayKey() ? prog.dailyStreak + 1 : 1;
  }
  const bestDailyStreak = Math.max(prog.bestDailyStreak, dailyStreak);
  const bestDailyScore = Math.max(prog.bestDailyScore, solvedCount);
  const bonusXp = alreadyRecorded ? 15 : 80 + solvedCount * 6;

  let next: PlayerProgression = {
    ...prog,
    xp: prog.xp + bonusXp,
    dailyTrainingDates: dates,
    dailyStreak,
    bestDailyStreak,
    bestDailyScore,
  };

  const newlyUnlocked: AchievementDef[] = [];
  const finishAch = unlockAchievement(next, "daily-finish");
  next = finishAch.next;
  if (finishAch.unlocked) newlyUnlocked.push(finishAch.unlocked);

  if (dailyStreak >= 7) {
    const weekAch = unlockAchievement(next, "daily-streak-7");
    next = weekAch.next;
    if (weekAch.unlocked) newlyUnlocked.push(weekAch.unlocked);
  }

  return { next, newlyUnlocked };
}

export function recordFinishedGame(
  prog: PlayerProgression,
  game: Omit<ArchivedGame, "ratingDelta"> & { opponentElo?: number; ranked?: boolean },
): { next: PlayerProgression; newlyUnlocked: AchievementDef[]; ratingDelta: number } {
  const ranked = game.ranked !== false;
  const oppElo = game.opponentElo ?? difficultyRating(game.difficulty);
  const ratingDelta = ranked ? computeEloDelta(prog.rating, oppElo, game.result) : 0;
  const newRating = Math.max(400, prog.rating + ratingDelta);
  const { opponentElo: _omitElo, ranked: _omitRanked, ...archiveEntry } = game;
  const currentStreak =
    game.result === "win"
      ? prog.currentStreak + 1
      : game.result === "draw"
        ? prog.currentStreak
        : 0;
  const bestStreak = Math.max(prog.bestStreak, currentStreak);
  const baseXp = game.result === "win" ? 55 : game.result === "draw" ? 30 : 18;

  let next: PlayerProgression = {
    ...prog,
    rating: newRating,
    peakRating: Math.max(prog.peakRating, newRating),
    xp: prog.xp + baseXp,
    gamesPlayed: prog.gamesPlayed + 1,
    wins: prog.wins + (game.result === "win" ? 1 : 0),
    losses: prog.losses + (game.result === "loss" ? 1 : 0),
    draws: prog.draws + (game.result === "draw" ? 1 : 0),
    currentStreak,
    bestStreak,
    strategyRating: Math.max(
      600,
      prog.strategyRating + (game.accuracy >= 80 ? 12 : game.result === "win" ? 6 : -4),
    ),
    endgameRating: Math.max(
      600,
      prog.endgameRating + (game.movesCount >= 30 && game.result === "win" ? 15 : 0),
    ),
    openingsRating: Math.max(600, prog.openingsRating + (game.blundersCount === 0 ? 10 : -4)),
    accuracySum: prog.accuracySum + game.accuracy,
    accuracySamples: prog.accuracySamples + 1,
    archive: [{ ...archiveEntry, ratingDelta }, ...prog.archive].slice(0, 80),
  };

  next = advanceQuest(next, "play-1", 1).next;
  if (game.result === "win") {
    next = advanceQuest(next, "beat-stockfish", 1).next;
  }
  if (game.blundersCount === 0) {
    next = advanceQuest(next, "no-blunders", 1).next;
  }

  const candidateIds: string[] = [];
  if (next.wins >= 1) candidateIds.push("first-win");
  if (next.currentStreak >= 5) candidateIds.push("streak-5");
  if (next.currentStreak >= 10) candidateIds.push("streak-10");
  if (game.result === "win" && game.blundersCount === 0 && game.accuracy >= 90) {
    candidateIds.push("clean-win");
  }
  if (game.result === "win" && game.outcomeReason.toLowerCase().includes("мат")) {
    candidateIds.push("mate-combo");
  }
  if (game.result === "win" && (game.difficulty === "strong" || game.difficulty === "expert")) {
    candidateIds.push("giant-killer");
  }
  if (next.gamesPlayed >= 100) candidateIds.push("games-100");
  if (next.gamesPlayed >= 1000) candidateIds.push("games-1000");
  if (game.result === "win" && game.movesCount >= 40) candidateIds.push("endgame-master");

  const newlyUnlocked: AchievementDef[] = [];
  for (const id of candidateIds) {
    const res = unlockAchievement(next, id);
    next = res.next;
    if (res.unlocked) newlyUnlocked.push(res.unlocked);
  }

  return { next, newlyUnlocked, ratingDelta };
}

export function triggerFileDownload(
  filename: string,
  content: string,
  mime = "text/plain;charset=utf-8",
): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
