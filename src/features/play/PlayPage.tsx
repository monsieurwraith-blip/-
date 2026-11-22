import { useEffect, useState } from "react";

import { AppHeader, type AppRouteView } from "@/components/layout/AppHeader";
import { AnalysisScreen } from "@/features/analysis/AnalysisScreen";
import { MainMenu } from "@/features/menu/MainMenu";
import { useSettings } from "@/features/settings/SettingsProvider";
import { SettingsSheet, type SettingsTabId } from "@/features/settings/SettingsSheet";

import { PlayScreen } from "./PlayScreen";

/** Top-level entry shared by the web route and desktop Electron app. */
export function PlayPage() {
  const { update } = useSettings();
  const [view, setView] = useState<AppRouteView>("menu");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTabId>("sound");
  const [inProgress, setInProgress] = useState(false);

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
          onAnalysis={() => setView("analysis")}
          onCustomization={() => openSettingsAt("board")}
          onOpenSettings={() => openSettingsAt("sound")}
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
            onOpenCustomization={() => openSettingsAt("board")}
            onOpenSettings={() => openSettingsAt("sound")}
            confirmLeave={view === "game" && inProgress}
          />
          {view === "analysis" ? (
            <AnalysisScreen />
          ) : (
            <PlayScreen onInProgressChange={setInProgress} />
          )}
        </div>
      )}
      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} defaultTab={settingsTab} />
    </div>
  );
}
