import { Cpu, Crown, LayoutGrid, Mic, RotateCcw, SlidersHorizontal, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { BoardSettingsPanel } from "./components/BoardSettingsPanel";
import { DisplaySettingsPanel } from "./components/DisplaySettingsPanel";
import { EngineSettingsPanel } from "./components/EngineSettingsPanel";
import { PieceSettingsPanel } from "./components/PieceSettingsPanel";
import { SoundSettingsPanel } from "./components/SoundSettingsPanel";
import { VoiceSettingsPanel } from "./components/VoiceSettingsPanel";
import { useSettings } from "./SettingsProvider";

const TABS = [
  { id: "sound", label: "Звук", icon: Volume2, panel: SoundSettingsPanel },
  { id: "voice", label: "Тренер", icon: Mic, panel: VoiceSettingsPanel },
  { id: "pieces", label: "Фигуры", icon: Crown, panel: PieceSettingsPanel },
  { id: "board", label: "Темы и доска", icon: LayoutGrid, panel: BoardSettingsPanel },
  { id: "display", label: "Профиль", icon: SlidersHorizontal, panel: DisplaySettingsPanel },
  { id: "engine", label: "Движок", icon: Cpu, panel: EngineSettingsPanel },
] as const;

export type SettingsTabId = (typeof TABS)[number]["id"];

interface SettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: SettingsTabId;
}

/** Settings panel. Slides over the side panel so the board stays visible and updates live. */
export function SettingsSheet({ open, onOpenChange, defaultTab = "sound" }: SettingsSheetProps) {
  const { reset } = useSettings();
  const [tab, setTab] = useState<SettingsTabId>(defaultTab);

  useEffect(() => {
    if (open) setTab(defaultTab);
  }, [open, defaultTab]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        overlayClassName="bg-overlay/30"
        className="flex w-full flex-col gap-0 border-border bg-card p-0 sm:max-w-[44rem]"
      >
        <div className="border-b border-border px-5 pb-4 pt-5 sm:px-6">
          <p className="eyebrow text-primary">PROCHESS</p>
          <SheetTitle className="mt-1 font-display text-3xl font-normal tracking-tight">
            Настройки и кастомизация
          </SheetTitle>
          <SheetDescription className="mt-1 text-sm text-muted-foreground">
            Изменения применяются сразу и сохраняются автоматически.
          </SheetDescription>
        </div>

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as SettingsTabId)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <TabsList className="mx-5 mt-4 grid h-auto grid-cols-2 gap-1 rounded-lg border border-border bg-secondary p-1 sm:mx-6 sm:grid-cols-3">
            {TABS.map(({ id, label, icon: Icon }) => (
              <TabsTrigger
                key={id}
                value={id}
                className="flex h-auto shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground sm:text-sm"
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-5 sm:px-6">
            {TABS.map(({ id, panel: Panel }) => (
              <TabsContent
                key={id}
                value={id}
                className="mt-0 animate-rise focus-visible:outline-none"
              >
                <Panel />
              </TabsContent>
            ))}
          </div>
        </Tabs>

        <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3 sm:px-6">
          <p className="text-xs text-muted-foreground">Ctrl + , — открыть настройки</p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="panel" size="sm">
                <RotateCcw /> Сбросить настройки
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Сбросить все настройки?</AlertDialogTitle>
                <AlertDialogDescription>
                  Цветовая схема, фигуры и доска, звуки, голосовой тренер и параметры движка
                  вернутся к значениям по умолчанию.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction onClick={reset}>Сбросить</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </SheetContent>
    </Sheet>
  );
}
