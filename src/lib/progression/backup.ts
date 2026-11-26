/**
 * JSON Backup Export & Import for full ProChess player profile
 * (AppSettings + PlayerProgression including archive, streaks, records).
 */
import { parseSettings, type AppSettings } from "@/lib/settings/settings";

import { loadProgression, PROGRESSION_STORAGE_KEY, type PlayerProgression } from "./storage";

export interface ProChessBackupV1 {
  app: "ProChess";
  version: 1;
  exportedAt: string;
  settings: AppSettings;
  progression: PlayerProgression;
}

export function createProfileBackup(
  settings: AppSettings,
  progression: PlayerProgression,
): ProChessBackupV1 {
  return {
    app: "ProChess",
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
    progression,
  };
}

export function serializeProfileBackup(
  settings: AppSettings,
  progression: PlayerProgression,
): string {
  return JSON.stringify(createProfileBackup(settings, progression), null, 2);
}

/**
 * Validates and normalizes an imported JSON profile backup string.
 * Throws a clear Russian error message on invalid JSON or incompatible schema.
 */
export function parseProfileBackup(rawJson: string): {
  settings: AppSettings;
  progression: PlayerProgression;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error("Файл не является корректным JSON.");
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Неверная структура файла профиля ProChess.");
  }

  const record = parsed as Record<string, unknown>;
  if (record["app"] !== "ProChess" || !record["settings"] || !record["progression"]) {
    throw new Error("Этот JSON-файл не является резервной копией профиля ProChess.");
  }

  const settings = parseSettings(record["settings"]);
  const memoryStorage = {
    getItem(key: string) {
      if (key !== PROGRESSION_STORAGE_KEY) return null;
      return JSON.stringify(record["progression"]);
    },
  };
  const progression = loadProgression(memoryStorage);
  return { settings, progression };
}
