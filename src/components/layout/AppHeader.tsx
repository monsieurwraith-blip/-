import { ArrowLeft, BarChart3, Palette, Settings, Swords, User } from "lucide-react";
import { useEffect, useState } from "react";

import { ProChessLogo } from "@/components/brand/ProChessLogo";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/features/settings/SettingsProvider";
import { SettingsSheet } from "@/features/settings/SettingsSheet";
import { cn } from "@/lib/utils";

export type AppRouteView = "menu" | "game" | "analysis";

interface AppHeaderProps {
  activeView?: Exclude<AppRouteView, "menu">;
  onNavigate?: (view: AppRouteView) => void;
  onMainMenu?: () => void;
  onOpenSettings?: () => void;
  onOpenCustomization?: () => void;
  confirmLeave?: boolean;
}

export function AppHeader({
  activeView = "game",
  onNavigate,
  onMainMenu,
  onOpenSettings,
  onOpenCustomization,
  confirmLeave = false,
}: AppHeaderProps) {
  const { settings, preview } = useSettings();
  const [localSettingsOpen, setLocalSettingsOpen] = useState(false);
  const [pendingTarget, setPendingTarget] = useState<AppRouteView | null>(null);

  const openSettings = onOpenSettings ?? (() => setLocalSettingsOpen(true));

  useEffect(() => {
    if (onOpenSettings) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === ",") {
        e.preventDefault();
        setLocalSettingsOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onOpenSettings]);

  const navigate = (target: AppRouteView) => {
    preview("menu");
    if (confirmLeave) {
      setPendingTarget(target);
      return;
    }
    if (target === "menu" && onMainMenu) onMainMenu();
    else onNavigate?.(target);
  };

  return (
    <header className="border-b border-border/80 bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center justify-between gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={() => navigate("menu")}
          className="flex items-center gap-2.5 rounded-md text-left transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ProChessLogo variant="icon" withWordmark />
        </button>

        <nav aria-label="Основная навигация" className="flex items-center gap-1 sm:gap-1.5">
          {(onMainMenu || onNavigate) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5 whitespace-nowrap text-muted-foreground hover:text-foreground"
              onClick={() => navigate("menu")}
            >
              <ArrowLeft className="size-4" aria-hidden />
              Главное меню
            </Button>
          )}

          {onNavigate && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => navigate("game")}
                className={cn(
                  "hidden gap-1.5 whitespace-nowrap sm:inline-flex",
                  activeView === "game"
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Swords className="size-3.5" aria-hidden />
                Арена
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => navigate("analysis")}
                className={cn(
                  "hidden gap-1.5 whitespace-nowrap sm:inline-flex",
                  activeView === "analysis"
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <BarChart3 className="size-3.5" aria-hidden />
                Анализ
              </Button>
            </>
          )}

          <div className="hidden items-center gap-1.5 px-2 text-xs text-muted-foreground md:flex">
            <User className="size-3.5 text-primary" aria-hidden />
            <span className="max-w-[8rem] truncate">{settings.playerName}</span>
          </div>

          {onOpenCustomization && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => {
                preview("menu");
                onOpenCustomization();
              }}
              aria-label="Темы и фигуры"
              title="Кастомизация доски и фигур"
            >
              <Palette className="size-[17px]" />
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => {
              preview("menu");
              openSettings();
            }}
            aria-label="Настройки"
            title="Настройки (Ctrl + ,)"
          >
            <Settings className="size-[18px]" />
          </Button>
        </nav>
      </div>

      {!onOpenSettings && (
        <SettingsSheet open={localSettingsOpen} onOpenChange={setLocalSettingsOpen} />
      )}

      {(onMainMenu || onNavigate) && (
        <AlertDialog
          open={pendingTarget !== null}
          onOpenChange={(open) => !open && setPendingTarget(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Покинуть текущую партию?</AlertDialogTitle>
              <AlertDialogDescription>
                Текущая партия ещё не завершена и будет сброшена при переходе.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Остаться</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  const target = pendingTarget;
                  setPendingTarget(null);
                  if (!target) return;
                  if (target === "menu" && onMainMenu) onMainMenu();
                  else onNavigate?.(target);
                }}
              >
                Перейти
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </header>
  );
}
