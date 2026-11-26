import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Compass,
  Crown,
  GraduationCap,
  Grid3X3,
  History,
  Palette,
  Puzzle,
  Settings,
  Swords,
  User,
} from "lucide-react";
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
import { useProgression } from "@/features/progression/ProgressionProvider";
import { useSettings } from "@/features/settings/SettingsProvider";
import { SettingsSheet } from "@/features/settings/SettingsSheet";
import { cn } from "@/lib/utils";

export type AppRouteView =
  | "menu"
  | "game"
  | "daily"
  | "puzzles"
  | "academy"
  | "trainers"
  | "editor"
  | "analysis"
  | "archive"
  | "profile"
  | "collection";

interface AppHeaderProps {
  activeView?: Exclude<AppRouteView, "menu">;
  onNavigate?: (view: AppRouteView) => void;
  onMainMenu?: () => void;
  onOpenSettings?: () => void;
  onOpenCustomization?: () => void;
  confirmLeave?: boolean;
}

const NAV_ITEMS: {
  id: Exclude<AppRouteView, "menu" | "profile">;
  label: string;
  icon: typeof Swords;
}[] = [
  { id: "game", label: "Арена", icon: Swords },
  { id: "daily", label: "Ежедневные", icon: CalendarDays },
  { id: "puzzles", label: "Задачи", icon: Puzzle },
  { id: "academy", label: "Академия", icon: GraduationCap },
  { id: "trainers", label: "Тренажёр", icon: Compass },
  { id: "editor", label: "Редактор", icon: Grid3X3 },
  { id: "analysis", label: "Анализ", icon: BarChart3 },
  { id: "archive", label: "История", icon: History },
  { id: "collection", label: "Коллекция", icon: Crown },
];

export function AppHeader({
  activeView = "game",
  onNavigate,
  onMainMenu,
  onOpenSettings,
  onOpenCustomization,
  confirmLeave = false,
}: AppHeaderProps) {
  const { settings, preview } = useSettings();
  const { progression, rank } = useProgression();
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
    <header className="border-b border-border/80 bg-background/75 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-[1460px] items-center justify-between gap-2 px-3 sm:px-6">
        <button
          type="button"
          onClick={() => navigate("menu")}
          className="flex shrink-0 items-center gap-2.5 rounded-md text-left transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ProChessLogo variant="icon" withWordmark />
        </button>

        <nav aria-label="Основная навигация" className="flex items-center gap-1 overflow-x-auto">
          {(onMainMenu || onNavigate) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0 gap-1.5 whitespace-nowrap px-2 text-muted-foreground hover:text-foreground"
              onClick={() => navigate("menu")}
            >
              <ArrowLeft className="size-4" aria-hidden />
              <span className="hidden lg:inline">Главное меню</span>
            </Button>
          )}

          {onNavigate &&
            NAV_ITEMS.map(({ id, label, icon: Icon }) => (
              <Button
                key={id}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => navigate(id)}
                className={cn(
                  "shrink-0 gap-1.5 whitespace-nowrap rounded-lg px-2.5 text-xs sm:text-sm",
                  activeView === id
                    ? "border border-primary/35 bg-primary/14 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                    : "border border-transparent text-muted-foreground hover:border-border/80 hover:bg-secondary/75 hover:text-foreground",
                )}
              >
                <Icon className="size-3.5 shrink-0" aria-hidden />
                <span className="hidden sm:inline">{label}</span>
              </Button>
            ))}

          <button
            type="button"
            onClick={() => navigate("profile")}
            className={cn(
              "hidden shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl border px-3 py-1.5 text-xs shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-all duration-150 active:translate-y-px md:flex",
              activeView === "profile"
                ? "border-primary/60 bg-primary/15 text-foreground"
                : "border-white/12 bg-card/75 text-muted-foreground hover:border-primary/45 hover:bg-accent/70 hover:text-foreground",
            )}
            title={`Профиль · ${rank.title}`}
          >
            <User className="size-3.5 text-primary" aria-hidden />
            <span className="max-w-[7rem] truncate font-semibold text-foreground">
              {settings.playerName}
            </span>
            <span className="font-mono text-[11px] font-semibold text-primary">
              {progression.rating}
            </span>
          </button>

          {onOpenCustomization && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => {
                preview("menu");
                onOpenCustomization();
              }}
              aria-label="Темы и фигуры"
              title="Кастомизация доски и GOLD MIRROR"
            >
              <Palette className="size-[17px]" />
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:text-foreground"
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
