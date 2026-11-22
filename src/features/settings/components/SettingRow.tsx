import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface SettingRowProps {
  id: string;
  label: string;
  description?: string;
  children: ReactNode;
}

export function SettingRow({ id, label, description, children }: SettingRowProps) {
  return (
    <div className="setting-row">
      <div className="min-w-0">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );
}

interface SwitchRowProps {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
  extra?: ReactNode;
}

export function SwitchRow({
  id,
  label,
  description,
  checked,
  disabled,
  onChange,
  extra,
}: SwitchRowProps) {
  return (
    <SettingRow id={id} label={label} {...(description ? { description } : {})}>
      {extra}
      <Switch id={id} checked={checked} disabled={disabled ?? false} onCheckedChange={onChange} />
    </SettingRow>
  );
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-3">
      <h3 className="eyebrow">{children}</h3>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
