import { ThinkTimeSelector } from "@/features/play/components/ThinkTimeSelector";

import { useSettings } from "../SettingsProvider";
import { SectionTitle } from "./SettingRow";

export function EngineSettingsPanel() {
  const { settings, update } = useSettings();

  return (
    <div className="space-y-6">
      <section>
        <SectionTitle hint="Сколько времени Stockfish анализирует позицию перед каждым ходом. Применяется к следующим ходам и сохраняется между запусками.">
          Время мышления бота
        </SectionTitle>
        <div className="panel p-4">
          <ThinkTimeSelector
            thinkTime={settings.engine.thinkTime}
            customSeconds={settings.engine.customSeconds}
            onChange={(patch) => update({ engine: patch })}
            variant="grid"
          />
        </div>
      </section>
    </div>
  );
}
