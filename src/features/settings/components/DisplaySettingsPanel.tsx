import { Keyboard, User } from "lucide-react";

import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  ANIMATION_LEVELS,
  ANIMATION_SPEEDS,
  LAYOUT_DENSITIES,
  type AnimationLevel,
  type AnimationSpeed,
  type LayoutDensity,
} from "@/lib/settings/settings";
import { cn } from "@/lib/utils";

import { useSettings } from "../SettingsProvider";
import { ProfileBackupCard } from "./ProfileBackupCard";
import { SectionTitle, SettingRow, SwitchRow } from "./SettingRow";

const TOGGLES = [
  {
    key: "showCoordinates",
    label: "Координаты",
    description: "Буквы A–H и цифры 1–8 по краям доски",
  },
  {
    key: "highlightLastMove",
    label: "Подсветка последнего хода",
    description: "Откуда и куда пошла фигура",
  },
  {
    key: "showLegalMoves",
    label: "Подсказки возможных ходов",
    description: "Точки на клетках, куда можно пойти",
  },
  {
    key: "highlightCheck",
    label: "Подсветка шаха",
    description: "Свечение под королём под шахом",
  },
  { key: "animations", label: "Анимации фигур", description: "Плавное перемещение фигур по доске" },
] as const;

const HOTKEY_LIST = [
  { key: "Z", label: "Отменить ход" },
  { key: "Y", label: "Повторить ход" },
  { key: "H", label: "Подсказка" },
  { key: "F", label: "Перевернуть доску" },
  { key: "C", label: "Показать / скрыть тренера" },
  { key: "M", label: "Вкл / выкл звук тренера" },
  { key: "Shift + F", label: "Полноэкранный режим" },
  { key: "Ctrl + ,", label: "Открыть настройки" },
];

export function DisplaySettingsPanel() {
  const { settings, update } = useSettings();
  const board = settings.board;

  return (
    <div className="space-y-6">
      <section>
        <SectionTitle hint="Отображается в главном меню, профиле и архиве партий.">
          Профиль игрока
        </SectionTitle>
        <div className="panel flex items-center gap-3 p-4">
          <User className="size-4 shrink-0 text-primary" aria-hidden />
          <label htmlFor="player-profile-name" className="text-sm font-medium">
            Имя игрока
          </label>
          <Input
            id="player-profile-name"
            value={settings.playerName}
            maxLength={28}
            placeholder="Гроссмейстер"
            onChange={(e) => update({ playerName: e.target.value })}
            className="ml-auto h-9 max-w-[14rem] bg-secondary/70 text-sm"
          />
        </div>
        <div className="mt-3">
          <ProfileBackupCard />
        </div>
      </section>

      <section>
        <SectionTitle hint="Управляет объёмом панелей телеметрии вокруг шахматной доски.">
          Плотность интерфейса
        </SectionTitle>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {LAYOUT_DENSITIES.map((d) => {
            const selected = settings.layoutDensity === d.id;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => update({ layoutDensity: d.id as LayoutDensity })}
                className={cn(
                  "rounded-lg border p-3 text-left transition-colors",
                  selected
                    ? "border-primary/70 bg-primary/15 text-foreground"
                    : "border-border bg-secondary/60 text-foreground/85 hover:bg-accent",
                )}
              >
                <p className="text-sm font-medium">{d.label}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{d.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <SectionTitle>Доска</SectionTitle>
        <div className="panel px-4">
          {TOGGLES.map((t) => (
            <SwitchRow
              key={t.key}
              id={`board-${t.key}`}
              label={t.label}
              description={t.description}
              checked={board[t.key]}
              onChange={(value) => update({ board: { [t.key]: value } })}
            />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>Анимации и производительность</SectionTitle>
        <div className="panel space-y-1 px-4 py-1">
          <SettingRow
            id="animation-speed"
            label="Скорость ходов"
            description={
              board.animations
                ? "Применяется ко всем перемещениям фигур"
                : "Включите анимации, чтобы выбрать скорость"
            }
          >
            <ToggleGroup
              id="animation-speed"
              type="single"
              variant="segment"
              size="sm"
              value={board.animationSpeed}
              disabled={!board.animations}
              onValueChange={(v) => v && update({ board: { animationSpeed: v as AnimationSpeed } })}
              className="rounded-lg border border-border bg-secondary p-0.5"
            >
              {ANIMATION_SPEEDS.map((s) => (
                <ToggleGroupItem key={s.id} value={s.id} className="px-3 text-xs">
                  {s.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </SettingRow>

          <SettingRow
            id="animation-level"
            label="Интенсивность эффектов"
            description="Управляет бликами GOLD MIRROR и живым портретом тренера"
          >
            <ToggleGroup
              id="animation-level"
              type="single"
              variant="segment"
              size="sm"
              value={board.animationLevel}
              onValueChange={(v) => v && update({ board: { animationLevel: v as AnimationLevel } })}
              className="rounded-lg border border-border bg-secondary p-0.5"
            >
              {ANIMATION_LEVELS.map((lvl) => (
                <ToggleGroupItem key={lvl.id} value={lvl.id} className="px-2 text-xs">
                  {lvl.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </SettingRow>
        </div>
      </section>

      <section>
        <SectionTitle>Горячие клавиши</SectionTitle>
        <div className="panel p-4">
          <SwitchRow
            id="hotkeys-enabled"
            label="Быстрые клавиши в партии"
            description="Позволяют управлять доской и тренером с клавиатуры"
            checked={settings.hotkeysEnabled}
            onChange={(hotkeysEnabled) => update({ hotkeysEnabled })}
          />
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/70 pt-3 text-xs">
            {HOTKEY_LIST.map((hk) => (
              <div key={hk.key} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Keyboard className="size-3" aria-hidden />
                  {hk.label}
                </span>
                <kbd className="rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                  {hk.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
