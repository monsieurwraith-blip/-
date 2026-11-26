import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useSettings } from "@/features/settings/SettingsProvider";
import {
  advanceQuest,
  comboBadgeForCount,
  defaultProgression,
  loadProgression,
  rankForXp,
  recordDailyTrainingCompletion,
  recordFinishedGame,
  saveProgression,
  unlockAchievement,
  type AchievementDef,
  type ArchivedGame,
  type PlayerProgression,
} from "@/lib/progression/storage";
import { computePuzzleEloDelta } from "@/lib/puzzles/types";

export type PuzzleCompleteArg =
  | number
  | {
      solved: boolean;
      puzzleRating?: number;
      category?: string;
    };

interface ProgressionContextValue {
  progression: PlayerProgression;
  rank: ReturnType<typeof rankForXp>;
  comboBadge: ReturnType<typeof comboBadgeForCount>;
  recentUnlock: AchievementDef | null;
  dismissUnlock: () => void;
  recordGame: (
    game: Omit<ArchivedGame, "ratingDelta"> & { opponentElo?: number; ranked?: boolean },
  ) => number;
  completePuzzle: (arg?: PuzzleCompleteArg) => { eloDelta: number; comboCount: number };
  completeDailyTraining: (dateKey: string, solvedCount: number) => void;
  completeLesson: () => void;
  completeErrorAnalysis: () => void;
  recordCastleInGame: () => void;
  recordMaterialGainInGame: () => void;
  recordBestMoveFound: () => void;
  equipFrame: (frameId: string) => void;
  recordPuzzleRushScore: (score: number) => void;
  recordCoordsScore: (score: number) => void;
  recordEndgameDrillComplete: () => void;
  replaceProgression: (next: PlayerProgression) => void;
}

const ProgressionContext = createContext<ProgressionContextValue>({
  progression: defaultProgression(),
  rank: rankForXp(0),
  comboBadge: comboBadgeForCount(0),
  recentUnlock: null,
  dismissUnlock: () => undefined,
  recordGame: () => 0,
  completePuzzle: () => ({ eloDelta: 0, comboCount: 0 }),
  completeDailyTraining: () => undefined,
  completeLesson: () => undefined,
  completeErrorAnalysis: () => undefined,
  recordCastleInGame: () => undefined,
  recordMaterialGainInGame: () => undefined,
  recordBestMoveFound: () => undefined,
  equipFrame: () => undefined,
  recordPuzzleRushScore: () => undefined,
  recordCoordsScore: () => undefined,
  recordEndgameDrillComplete: () => undefined,
  replaceProgression: () => undefined,
});

export function ProgressionProvider({ children }: { children: ReactNode }) {
  const { play } = useSettings();
  const [progression, setProgression] = useState<PlayerProgression>(() => defaultProgression());
  const [recentUnlock, setRecentUnlock] = useState<AchievementDef | null>(null);

  useEffect(() => {
    setProgression(loadProgression());
  }, []);

  const commit = useCallback((next: PlayerProgression) => {
    saveProgression(next);
    return next;
  }, []);

  const triggerUnlock = useCallback(
    (ach: AchievementDef | null | undefined) => {
      if (!ach) return;
      setRecentUnlock(ach);
      play("achievement");
    },
    [play],
  );

  const recordGame = useCallback(
    (game: Omit<ArchivedGame, "ratingDelta"> & { opponentElo?: number; ranked?: boolean }) => {
      let delta = 0;
      setProgression((prev) => {
        const res = recordFinishedGame(prev, game);
        delta = res.ratingDelta;
        if (res.newlyUnlocked[0]) triggerUnlock(res.newlyUnlocked[0]);
        return commit(res.next);
      });
      return delta;
    },
    [commit, triggerUnlock],
  );

  const completePuzzle = useCallback(
    (arg: PuzzleCompleteArg = 14) => {
      let resultDelta = 0;
      let nextComboOut = 0;
      setProgression((prev) => {
        const isNum = typeof arg === "number";
        const solved = isNum ? true : arg.solved;
        const puzzleRating = isNum ? prev.tacticsRating : (arg.puzzleRating ?? prev.tacticsRating);
        const category = isNum ? "" : (arg.category ?? "");

        const eloDelta = isNum
          ? arg
          : computePuzzleEloDelta(prev.tacticsRating, puzzleRating, solved);
        resultDelta = eloDelta;

        const nextCombo = solved ? prev.comboCount + 1 : 0;
        nextComboOut = nextCombo;
        const comboMeta = comboBadgeForCount(nextCombo);
        const nextPuzzleStreak = solved ? prev.puzzleStreak + 1 : 0;

        let next: PlayerProgression = {
          ...prev,
          xp: prev.xp + (solved ? 25 + comboMeta.xpBonus : 0),
          tacticsRating: Math.max(400, prev.tacticsRating + eloDelta),
          puzzlesSolved: prev.puzzlesSolved + (solved ? 1 : 0),
          dailyPuzzlesSolvedToday: prev.dailyPuzzlesSolvedToday + (solved ? 1 : 0),
          comboCount: nextCombo,
          bestCombo: Math.max(prev.bestCombo, nextCombo),
          puzzleStreak: nextPuzzleStreak,
          bestPuzzleStreak: Math.max(prev.bestPuzzleStreak, nextPuzzleStreak),
        };

        if (solved) {
          next = advanceQuest(next, "puzzles-5", 1).next;
          next = advanceQuest(next, "best-moves-3", 1).next;
          if (category.includes("Мат в 2")) {
            next = advanceQuest(next, "mate-2", 1).next;
          }
          if (nextCombo >= 3) {
            next = advanceQuest(next, "tactic-combo-run", 1).next;
          }
          if (next.puzzlesSolved >= 3) {
            const ach = unlockAchievement(next, "tactic-combo");
            next = ach.next;
            triggerUnlock(ach.unlocked);
          }
          if (nextCombo >= 5) {
            const ach5 = unlockAchievement(next, "combo-5");
            next = ach5.next;
            triggerUnlock(ach5.unlocked);
          }
          if (nextCombo >= 10) {
            const ach10 = unlockAchievement(next, "perfect-streak-10");
            next = ach10.next;
            triggerUnlock(ach10.unlocked);
          }
        }
        return commit(next);
      });
      return { eloDelta: resultDelta, comboCount: nextComboOut };
    },
    [commit, triggerUnlock],
  );

  const completeDailyTraining = useCallback(
    (dateKey: string, solvedCount: number) => {
      setProgression((prev) => {
        const res = recordDailyTrainingCompletion(prev, dateKey, solvedCount);
        if (res.newlyUnlocked[0]) triggerUnlock(res.newlyUnlocked[0]);
        return commit(res.next);
      });
    },
    [commit, triggerUnlock],
  );

  const completeLesson = useCallback(() => {
    setProgression((prev) => {
      const next: PlayerProgression = {
        ...prev,
        xp: prev.xp + 30,
        openingsRating: prev.openingsRating + 8,
        lessonsCompleted: prev.lessonsCompleted + 1,
      };
      return commit(next);
    });
  }, [commit]);

  const completeErrorAnalysis = useCallback(() => {
    setProgression((prev) => {
      const next = advanceQuest(prev, "analyze-err", 1).next;
      return commit(next);
    });
  }, [commit]);

  const recordCastleInGame = useCallback(() => {
    setProgression((prev) => commit(advanceQuest(prev, "castle-game", 1).next));
  }, [commit]);

  const recordMaterialGainInGame = useCallback(() => {
    setProgression((prev) => commit(advanceQuest(prev, "win-material", 1).next));
  }, [commit]);

  const recordBestMoveFound = useCallback(() => {
    setProgression((prev) => commit(advanceQuest(prev, "best-moves-3", 1).next));
  }, [commit]);

  const equipFrame = useCallback(
    (frameId: string) => {
      setProgression((prev) => {
        if (!prev.unlockedFrames.includes(frameId)) return prev;
        return commit({ ...prev, equippedFrame: frameId });
      });
    },
    [commit],
  );

  const recordPuzzleRushScore = useCallback(
    (score: number) => {
      setProgression((prev) =>
        commit({
          ...prev,
          puzzleRushBest: Math.max(prev.puzzleRushBest, score),
          xp: prev.xp + score * 5,
        }),
      );
    },
    [commit],
  );

  const recordCoordsScore = useCallback(
    (score: number) => {
      setProgression((prev) =>
        commit({
          ...prev,
          coordsBestScore: Math.max(prev.coordsBestScore, score),
          xp: prev.xp + Math.min(40, score),
        }),
      );
    },
    [commit],
  );

  const recordEndgameDrillComplete = useCallback(() => {
    setProgression((prev) =>
      commit({
        ...prev,
        endgameDrillsCompleted: prev.endgameDrillsCompleted + 1,
        endgameRating: prev.endgameRating + 12,
        xp: prev.xp + 35,
      }),
    );
  }, [commit]);

  const replaceProgression = useCallback(
    (next: PlayerProgression) => {
      setProgression(commit(next));
    },
    [commit],
  );

  const rank = useMemo(() => rankForXp(progression.xp), [progression.xp]);
  const comboBadge = useMemo(
    () => comboBadgeForCount(progression.comboCount),
    [progression.comboCount],
  );

  const value = useMemo<ProgressionContextValue>(
    () => ({
      progression,
      rank,
      comboBadge,
      recentUnlock,
      dismissUnlock: () => setRecentUnlock(null),
      recordGame,
      completePuzzle,
      completeDailyTraining,
      completeLesson,
      completeErrorAnalysis,
      recordCastleInGame,
      recordMaterialGainInGame,
      recordBestMoveFound,
      equipFrame,
      recordPuzzleRushScore,
      recordCoordsScore,
      recordEndgameDrillComplete,
      replaceProgression,
    }),
    [
      progression,
      rank,
      comboBadge,
      recentUnlock,
      recordGame,
      completePuzzle,
      completeDailyTraining,
      completeLesson,
      completeErrorAnalysis,
      recordCastleInGame,
      recordMaterialGainInGame,
      recordBestMoveFound,
      equipFrame,
      recordPuzzleRushScore,
      recordCoordsScore,
      recordEndgameDrillComplete,
      replaceProgression,
    ],
  );

  return <ProgressionContext.Provider value={value}>{children}</ProgressionContext.Provider>;
}

export function useProgression(): ProgressionContextValue {
  return useContext(ProgressionContext);
}
