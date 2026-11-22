import { Clock, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CUSTOM_THINK_MAX_S,
  CUSTOM_THINK_MIN_S,
  THINK_TIME_PRESETS,
  clampCustomSeconds,
  type ThinkTimeId,
} from "@/lib/engine/thinkTime";
import type { EngineSettings } from "@/lib/settings/settings";
import { cn } from "@/lib/utils";

interface ThinkTimeSelectorProps {
  thinkTime: ThinkTimeId;
  customSeconds: number;
  onChange: (patch: Partial<EngineSettings>) => void;
  variant?: "grid" | "compact";
}

export function ThinkTimeSelector({
  thinkTime,
  customSeconds,
  onChange,
  variant = "grid",
}: ThinkTimeSelectorProps) {
  const [draft, setDraft] = useState(String(customSeconds));

  useEffect(() => {
    setDraft(String(customSeconds));
  }, [customSeconds]);

  const commitCustom = (raw: string) => {
    const clamped = clampCustomSeconds(raw, customSeconds);
    setDraft(String(clamped));
    onChange({ thinkTime: "custom", customSeconds: clamped });
  };

  if (variant === "compact") {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5" aria-hidden />
            Время бота
          </span>
          <Select
            value={thinkTime}
            onValueChange={(value) => onChange({ thinkTime: value as ThinkTimeId })}
          >
            <SelectTrigger
              aria-label="Время мышления бота"
              className="h-8 w-[12rem] border-border bg-secondary/70 text-xs"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">
                <span className="font-mono">3–7 с</span>
                <span className="ml-1.5 text-muted-foreground">· Адаптивный</span>
              </SelectItem>
              {THINK_TIME_PRESETS.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  <span className="font-mono">{p.label}</span>
                  <span className="ml-1.5 text-muted-foreground">· {p.description}</span>
                </SelectItem>
              ))}
              <SelectItem value="custom">
                Своё ({customSeconds.toLocaleString("ru-RU")} с)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        {thinkTime === "custom" && (
          <div className="flex items-center justify-end gap-2">
            <label htmlFor="compact-custom-think" className="text-xs text-muted-foreground">
              Секунд:
            </label>
            <Input
              id="compact-custom-think"
              type="number"
              min={CUSTOM_THINK_MIN_S}
              max={CUSTOM_THINK_MAX_S}
              step={0.5}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                const n = Number(e.target.value.replace(",", "."));
                if (Number.isFinite(n) && n >= CUSTOM_THINK_MIN_S && n <= CUSTOM_THINK_MAX_S) {
                  onChange({ thinkTime: "custom", customSeconds: clampCustomSeconds(n) });
                }
              }}
              onBlur={() => commitCustom(draft)}
              className="h-7 w-20 bg-secondary/70 font-mono text-xs"
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <button
        type="button"
        role="radio"
        aria-checked={thinkTime === "auto"}
        onClick={() => onChange({ thinkTime: "auto" })}
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          thinkTime === "auto"
            ? "border-primary/70 bg-primary/10 text-foreground"
            : "border-border bg-secondary/60 text-foreground/85 hover:border-input hover:bg-accent",
        )}
      >
        <span className="flex items-center gap-2">
          <Sparkles className="size-4 shrink-0 text-primary" aria-hidden />
          <span>
            <span className="block text-xs font-medium">Адаптивный режим</span>
            <span className="block text-[11px] text-muted-foreground">
              Естественное время 3–7 с в зависимости от сложности позиции
            </span>
          </span>
        </span>
        <span className="shrink-0 font-mono text-xs font-medium text-primary">3–7 с</span>
      </button>

      <div
        role="radiogroup"
        aria-label="Время мышления бота"
        className="grid grid-cols-2 gap-1.5 sm:grid-cols-4"
      >
        {THINK_TIME_PRESETS.map((preset) => {
          const selected = thinkTime === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange({ thinkTime: preset.id })}
              className={cn(
                "flex flex-col items-start rounded-lg border px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected
                  ? "border-primary/70 bg-primary/10 text-foreground"
                  : "border-border bg-secondary/60 text-foreground/85 hover:border-input hover:bg-accent",
              )}
            >
              <span className="font-mono text-sm font-medium">{preset.label}</span>
              <span className="line-clamp-1 text-[10px] leading-tight text-muted-foreground">
                {preset.description}
              </span>
            </button>
          );
        })}
        <button
          type="button"
          role="radio"
          aria-checked={thinkTime === "custom"}
          onClick={() => onChange({ thinkTime: "custom" })}
          className={cn(
            "flex flex-col items-start rounded-lg border px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            thinkTime === "custom"
              ? "border-primary/70 bg-primary/10 text-foreground"
              : "border-border bg-secondary/60 text-foreground/85 hover:border-input hover:bg-accent",
          )}
        >
          <span className="font-mono text-sm font-medium">
            {thinkTime === "custom" ? `${customSeconds.toLocaleString("ru-RU")} с` : "Своё"}
          </span>
          <span className="line-clamp-1 text-[10px] leading-tight text-muted-foreground">
            Вручную (с)
          </span>
        </button>
      </div>

      {thinkTime === "custom" && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary/50 px-3 py-2">
          <div>
            <label htmlFor="custom-think-seconds" className="text-xs font-medium">
              Пользовательское время
            </label>
            <p className="text-[11px] text-muted-foreground">
              От {CUSTOM_THINK_MIN_S} до {CUSTOM_THINK_MAX_S} секунд
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Input
              id="custom-think-seconds"
              type="number"
              min={CUSTOM_THINK_MIN_S}
              max={CUSTOM_THINK_MAX_S}
              step={0.5}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                const n = Number(e.target.value.replace(",", "."));
                if (Number.isFinite(n) && n >= CUSTOM_THINK_MIN_S && n <= CUSTOM_THINK_MAX_S) {
                  onChange({ thinkTime: "custom", customSeconds: clampCustomSeconds(n) });
                }
              }}
              onBlur={() => commitCustom(draft)}
              className="h-8 w-20 bg-background/60 font-mono text-sm"
            />
            <span className="text-xs text-muted-foreground">с</span>
          </div>
        </div>
      )}
    </div>
  );
}
