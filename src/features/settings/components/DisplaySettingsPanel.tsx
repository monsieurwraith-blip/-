import { User } from "lucide-react";

import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  ANIMATION_SPEEDS,
  type AnimationSpeed,
  type BoardDisplaySettings,
} from "@/lib/settings/settings";

import { useSettings } from "../SettingsProvider";
import { SectionTitle, SettingRow, SwitchRow } from "./SettingRow";

const TOGGLES: {
  key: Exclude<keyof BoardDisplaySettings, "animationSpeed">;
  label: string;
  description: string;
}[] = [
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
    description: "Красное свечение под королём под шахом",
  },
  { key: "animations", label: "Анимации фигур", description: "Плавное перемещение фигур по доске" },
];

export function DisplaySettingsPanel() {
  const { settings, update } = useSettings();
  const board = settings.board;

  return (
    <div className="space-y-6">
      <section>
        <SectionTitle hint="Отображается в командном центре и на карточке игрока.">
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
        <SectionTitle>Скорость анимаций</SectionTitle>
        <div className="panel px-4">
          <SettingRow
            id="animation-speed"
            label="Перемещение фигур"
            description={
              board.animations
                ? "Применяется ко всем ходам на доске"
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
              aria-label="Скорость анимаций"
            >
              {ANIMATION_SPEEDS.map((s) => (
                <ToggleGroupItem key={s.id} value={s.id} className="px-3 text-xs">
                  {s.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </SettingRow>
        </div>
      </section>
    </div>
  );
}
