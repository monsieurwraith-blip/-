import { Link } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { SettingsSheet } from "@/features/settings/SettingsSheet";

/**
 * Top navigation. Only sections that actually exist are listed —
 * future sections (online, analysis, puzzles, stats) get added here as they ship.
 */
const NAV_ITEMS = [{ to: "/", label: "Игра" }] as const;

export function AppHeader() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Ctrl/Cmd + , opens the settings, like in desktop apps.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === ",") {
        e.preventDefault();
        setSettingsOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="border-b border-border/70">
      <div className="mx-auto flex h-14 w-full max-w-[1320px] items-center justify-between px-4 sm:px-6">
        <Link
          to="/"
          className="flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <LogoMark />
          <span className="text-[13px] font-semibold tracking-[0.32em]">CHESS STUDIO</span>
        </Link>
        <nav aria-label="Основная навигация" className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              activeProps={{ className: "bg-secondary text-foreground" }}
              activeOptions={{ exact: true }}
            >
              {item.label}
            </Link>
          ))}
          <Button
            variant="ghost"
            size="icon"
            className="ml-1 text-muted-foreground hover:text-foreground"
            onClick={() => setSettingsOpen(true)}
            aria-label="Настройки"
            title="Настройки (Ctrl + ,)"
          >
            <Settings className="size-[18px]" />
          </Button>
        </nav>
      </div>
      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
    </header>
  );
}

function LogoMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
      <rect x="1" y="1" width="22" height="22" rx="6" className="fill-secondary stroke-border" />
      <rect x="6" y="6" width="6" height="6" rx="1" className="fill-ivory" />
      <rect x="12" y="12" width="6" height="6" rx="1" className="fill-primary" />
      <rect x="12" y="6" width="6" height="6" rx="1" className="fill-muted" />
      <rect x="6" y="12" width="6" height="6" rx="1" className="fill-muted" />
    </svg>
  );
}
