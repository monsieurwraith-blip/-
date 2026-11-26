import { CheckCircle2, Download, Upload } from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";

import { Button } from "@/components/ui/button";
import { useProgression } from "@/features/progression/ProgressionProvider";
import { useSettings } from "@/features/settings/SettingsProvider";
import { parseProfileBackup, serializeProfileBackup } from "@/lib/progression/backup";
import { triggerFileDownload } from "@/lib/progression/storage";

export function ProfileBackupCard() {
  const { settings, replaceSettings, preview } = useSettings();
  const { progression, replaceProgression } = useProgression();
  const fileRef = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const handleExport = () => {
    preview("menu");
    const json = serializeProfileBackup(settings, progression);
    const stamp = new Date().toISOString().slice(0, 10);
    triggerFileDownload(`prochess-profile-${stamp}.json`, json, "application/json;charset=utf-8");
    setFeedback({
      kind: "ok",
      text: `Профиль «${settings.playerName}» экспортирован в файл JSON.`,
    });
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const imported = parseProfileBackup(text);
      replaceSettings(imported.settings);
      replaceProgression(imported.progression);
      preview("win");
      setFeedback({
        kind: "ok",
        text: `Импорт выполнен: профиль «${imported.settings.playerName}» (${imported.progression.rating} Эло, партий: ${imported.progression.gamesPlayed}).`,
      });
    } catch (err) {
      preview("mistake");
      setFeedback({
        kind: "error",
        text: err instanceof Error ? err.message : "Не удалось прочитать файл профиля.",
      });
    }
  };

  return (
    <div className="panel space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Резервная копия профиля (JSON)</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Сохраните все настройки, темы, рейтинг, достижения и архив партий в один файл или
            перенесите на другое устройство.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button type="button" variant="panel" size="sm" onClick={handleExport}>
            <Download className="size-3.5 text-primary" />
            Экспорт JSON
          </Button>
          <Button
            type="button"
            variant="ivory"
            size="sm"
            onClick={() => {
              preview("menu");
              fileRef.current?.click();
            }}
          >
            <Upload className="size-3.5" />
            Импорт JSON
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
            aria-label="Выберите JSON файл профиля ProChess"
          />
        </div>
      </div>

      {feedback && (
        <p
          role="status"
          className={
            feedback.kind === "ok"
              ? "flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs text-foreground"
              : "rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
          }
        >
          {feedback.kind === "ok" && <CheckCircle2 className="size-3.5 shrink-0 text-primary" />}
          <span>{feedback.text}</span>
        </p>
      )}
    </div>
  );
}
