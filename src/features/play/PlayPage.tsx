import { Trophy, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { AppHeader, type AppRouteView } from "@/components/layout/AppHeader";
import { AcademyScreen } from "@/features/academy/AcademyScreen";
import { AnalysisScreen } from "@/features/analysis/AnalysisScreen";
import { ArchiveScreen } from "@/features/archive/ArchiveScreen";
import { CollectionScreen } from "@/features/collection/CollectionScreen";
import { DailyChallengeScreen } from "@/features/daily/DailyChallengeScreen";
import { BoardEditorScreen } from "@/features/editor/BoardEditorScreen";
import { MainMenu } from "@/features/menu/MainMenu";
import { ProfileScreen } from "@/features/profile/ProfileScreen";
import { useProgression } from "@/features/progression/ProgressionProvider";
import { PuzzlesScreen } from "@/features/puzzles/PuzzlesScreen";
import { useSettings } from "@/features/settings/SettingsProvider";
import { SettingsSheet, type SettingsTabId } from "@/features/settings/SettingsSheet";
import { TrainersScreen } from "@/features/trainers/TrainersScreen";

import { PlayScreen } from "./PlayScreen";

/** Top-level entry shared by the web route and desktop Electron app. */
export function PlayPage() {
  const { update } = useSettings();
  const { recentUnlock, dismissUnlock } = useProgression();
  const [view, setView] = useState<AppRouteView>("menu");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTabId>("sound");
  const [inProgress, setInProgress] = useState(false);
  const [analysisInput, setAnalysisInput] = useState<string | null>(null);
  const [launchPosition, setLaunchPosition] = useState<{
    id: number;
    fen: string;
    label?: string;
  } | null>(null);
  const launchSeqRef = useRef(0);

  // Ctrl/Cmd + , opens Settings from any screen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === ",") {
        e.preventDefault();
        setSettingsOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openSettingsAt = (tab: SettingsTabId) => {
    setSettingsTab(tab);
    setSettingsOpen(true);
  };

  const openAnalysis = useCallback((pgnOrFen?: string) => {
    setAnalysisInput(pgnOrFen && pgnOrFen.trim().length > 0 ? pgnOrFen : null);
    setInProgress(false);
    setView("analysis");
  }, []);

  const launchCustomGame = useCallback(
    (fen: string, label?: string) => {
      launchSeqRef.current += 1;
      update({ game: { mode: "normal" } });
      setLaunchPosition({
        id: launchSeqRef.current,
        fen,
        ...(label ? { label } : {}),
      });
      setInProgress(false);
      setView("game");
    },
    [update],
  );

  return (
    <div className="flex min-h-screen flex-col">
      {view === "menu" ? (
        <MainMenu
          onPlay={() => {
            update({ game: { mode: "normal" } });
            setView("game");
          }}
          onCoach={() => {
            update({ game: { mode: "coach" } });
            setView("game");
          }}
          onDaily={() => setView("daily")}
          onAnalysis={() => openAnalysis()}
          onPuzzles={() => setView("puzzles")}
          onAcademy={() => setView("academy")}
          onTrainers={() => setView("trainers")}
          onEditor={() => setView("editor")}
          onArchive={() => setView("archive")}
          onProfile={() => setView("profile")}
          onCollection={() => setView("collection")}
          onCustomization={() => openSettingsAt("pieces")}
          onOpenSettings={() => openSettingsAt("sound")}
          onInspectLastGame={(pgn) => openAnalysis(pgn)}
        />
      ) : (
        <div className="flex min-h-screen flex-col animate-rise">
          <AppHeader
            activeView={view}
            onNavigate={(next) => {
              setInProgress(false);
              setView(next);
            }}
            onMainMenu={() => {
              setInProgress(false);
              setView("menu");
            }}
            onOpenCustomization={() => openSettingsAt("pieces")}
            onOpenSettings={() => openSettingsAt("sound")}
            confirmLeave={view === "game" && inProgress}
          />
          {view === "daily" ? (
            <DailyChallengeScreen onOpenPuzzles={() => setView("puzzles")} />
          ) : view === "analysis" ? (
            <AnalysisScreen initialInput={analysisInput} />
          ) : view === "puzzles" ? (
            <PuzzlesScreen />
          ) : view === "academy" ? (
            <AcademyScreen />
          ) : view === "trainers" ? (
            <TrainersScreen onStartDrill={(fen, title) => launchCustomGame(fen, title)} />
          ) : view === "editor" ? (
            <BoardEditorScreen
              onPlayFen={(fen, label) => launchCustomGame(fen, label)}
              onAnalyzeFen={(fen) => openAnalysis(fen)}
            />
          ) : view === "archive" ? (
            <ArchiveScreen
              onOpenInAnalysis={(pgn) => openAnalysis(pgn)}
              onStartGame={() => setView("game")}
            />
          ) : view === "profile" ? (
            <ProfileScreen />
          ) : view === "collection" ? (
            <CollectionScreen onOpenBoardCustomizer={() => openSettingsAt("pieces")} />
          ) : (
            <PlayScreen
              onInProgressChange={setInProgress}
              onOpenAnalysisWithPgn={(pgn) => openAnalysis(pgn)}
              launchPosition={launchPosition}
              onLaunchConsumed={() => setLaunchPosition(null)}
            />
          )}
        </div>
      )}

      {recentUnlock && (
        <aside
          role="status"
          className="fixed bottom-4 right-4 z-50 flex max-w-sm items-start gap-3 rounded-xl border border-primary/50 bg-card/95 p-3.5 shadow-2xl backdrop-blur-md"
        >
          <Trophy className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0 flex-1 text-xs">
            <p className="eyebrow text-primary">Новое достижение · +{recentUnlock.xp} XP</p>
            <p className="mt-0.5 font-semibold text-foreground">{recentUnlock.title}</p>
            <p className="mt-0.5 text-muted-foreground">{recentUnlock.description}</p>
          </div>
          <button
            type="button"
            onClick={dismissUnlock}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Закрыть уведомление"
          >
            <X className="size-4" />
          </button>
        </aside>
      )}

      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} defaultTab={settingsTab} />
    </div>
  );
}
