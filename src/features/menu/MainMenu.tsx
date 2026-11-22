import {
  ArrowRight,
  BarChart3,
  Cpu,
  GraduationCap,
  Palette,
  Play,
  Settings,
  User,
} from "lucide-react";
import { useState } from "react";

import heroImage from "@/assets/images/chess_studio_hero_1795348937860.jpg";
import { ProChessLogo } from "@/components/brand/ProChessLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSettings } from "@/features/settings/SettingsProvider";
import { STOCKFISH_BUILD_LABEL } from "@/lib/engine/config";
import { cn } from "@/lib/utils";

interface MainMenuProps {
  onPlay: () => void;
  onCoach: () => void;
  onAnalysis: () => void;
  onCustomization: () => void;
  onOpenSettings: () => void;
}

/**
 * ProChess Command Center:
 * Professional desktop terminal header, central 3D-lit atmospheric chess showcase,
 * real engine indicator, player profile quick-edit, and 5 primary command actions.
 */
export function MainMenu({
  onPlay,
  onCoach,
  onAnalysis,
  onCustomization,
  onOpenSettings,
}: MainMenuProps) {
  const { settings, update, preview } = useSettings();
  const [imageError, setImageError] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(settings.playerName);

  const clickAction = (fn: () => void) => {
    preview("menu");
    fn();
  };

  const commitName = () => {
    const clean = nameDraft.trim().slice(0, 28) || "Гроссмейстер";
    setNameDraft(clean);
    update({ playerName: clean });
    setEditingName(false);
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-background text-foreground">
      {/* Studio atmospheric backdrop with metallic + emerald rim lighting */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(960px 620px at 78% 46%, rgba(22, 199, 132, 0.14), transparent 64%), radial-gradient(740px 540px at 66% 30%, rgba(198, 205, 214, 0.08), transparent 60%), #0B0D10",
        }}
      >
        {!imageError && (
          <img
            src={heroImage}
            alt=""
            onError={() => setImageError(true)}
            className="h-full w-full animate-menu-hero object-cover object-right opacity-80 sm:object-center"
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(95deg, rgba(11, 13, 16, 0.97) 0%, rgba(11, 13, 16, 0.91) 42%, rgba(11, 13, 16, 0.62) 70%, rgba(11, 13, 16, 0.35) 100%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(11, 13, 16, 0.72) 0%, transparent 18%, transparent 78%, rgba(11, 13, 16, 0.9) 100%)",
          }}
        />
      </div>

      {/* Top Command Center Bar */}
      <header className="relative z-10 border-b border-border/80 bg-background/60 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-[1360px] items-center justify-between gap-4 px-4 sm:px-8">
          <ProChessLogo variant="menu" withWordmark subtitle="PROFESSIONAL TERMINAL" />

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Engine Status Indicator */}
            <div className="hidden items-center gap-2 text-xs font-mono text-muted-foreground md:flex">
              <Cpu className="size-3.5 text-primary" aria-hidden />
              <span>{STOCKFISH_BUILD_LABEL}</span>
              <span className="text-primary">· READY</span>
            </div>

            {/* Editable Player Profile */}
            {editingName ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  commitName();
                }}
                className="flex items-center gap-1.5"
              >
                <Input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onBlur={commitName}
                  autoFocus
                  maxLength={28}
                  aria-label="Имя игрока"
                  className="h-8 w-36 bg-secondary/80 text-xs"
                />
              </form>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setNameDraft(settings.playerName);
                  setEditingName(true);
                }}
                className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-card/80 px-2.5 py-1.5 text-xs text-foreground/90 transition-colors hover:border-primary/50 hover:text-foreground"
                title="Нажмите, чтобы изменить имя игрока"
              >
                <User className="size-3.5 text-primary" aria-hidden />
                <span className="max-w-[9rem] truncate font-medium">{settings.playerName}</span>
              </button>
            )}

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => clickAction(onOpenSettings)}
              aria-label="Настройки приложения"
              title="Настройки (Ctrl + ,)"
              className="text-muted-foreground hover:text-foreground"
            >
              <Settings className="size-[18px]" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Command Stage */}
      <main className="relative z-10 mx-auto grid w-full max-w-[1360px] flex-1 items-center gap-10 px-6 py-10 sm:px-10 lg:grid-cols-[minmax(0,30rem)_1fr] lg:px-14">
        <div className="flex flex-col">
          <div
            className="animate-rise flex items-center gap-3"
            style={{ animationDelay: "40ms", animationFillMode: "both" }}
          >
            <span className="h-px w-8 bg-primary" aria-hidden />
            <span className="font-mono text-[11px] font-medium uppercase tracking-[0.28em] text-primary">
              GRANDMASTER ANALYTICS SUITE
            </span>
          </div>

          <h1
            className="animate-rise mt-4 font-sans text-4xl font-semibold uppercase tracking-[0.18em] text-foreground sm:text-5xl lg:text-[3.4rem]"
            style={{ animationDelay: "90ms", animationFillMode: "both" }}
          >
            PRO<span className="text-primary">CHESS</span>
          </h1>

          <p
            className="animate-rise mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base"
            style={{ animationDelay: "140ms", animationFillMode: "both" }}
          >
            Профессиональный шахматный терминал с движком Stockfish 19, многоуровневым ИИ-тренером,
            живой телеметрией и 16 коллекциями фигур.
          </p>

          {/* 5 Software Command Actions */}
          <nav
            aria-label="Командный центр ProChess"
            className="animate-rise mt-8 flex flex-col gap-2.5"
            style={{ animationDelay: "200ms", animationFillMode: "both" }}
          >
            <Button
              type="button"
              variant="default"
              size="lg"
              onClick={() => clickAction(onPlay)}
              className="group h-13 w-full justify-between px-6 text-sm font-semibold uppercase tracking-[0.16em] shadow-[0_12px_36px_-10px_rgba(22,199,132,0.45)] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
            >
              <span className="flex items-center gap-3">
                <Play className="size-4 fill-current" aria-hidden />
                PLAY
              </span>
              <span className="flex items-center gap-2 text-xs font-normal tracking-normal opacity-90">
                Партия со Stockfish
                <ArrowRight
                  className="size-4 transition-transform duration-200 group-hover:translate-x-1"
                  aria-hidden
                />
              </span>
            </Button>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <CommandTile
                icon={<GraduationCap className="size-4 text-primary" aria-hidden />}
                title="COACH"
                subtitle="ИИ-тренер и подсказки"
                onClick={() => clickAction(onCoach)}
              />
              <CommandTile
                icon={<BarChart3 className="size-4 text-primary" aria-hidden />}
                title="ANALYSIS"
                subtitle="Лаборатория и MultiPV"
                onClick={() => clickAction(onAnalysis)}
              />
              <CommandTile
                icon={<Palette className="size-4 text-primary" aria-hidden />}
                title="CUSTOMIZATION"
                subtitle="Доски, фигуры, темы"
                onClick={() => clickAction(onCustomization)}
              />
              <CommandTile
                icon={<Settings className="size-4 text-primary" aria-hidden />}
                title="SETTINGS"
                subtitle="Звук, голос и движок"
                onClick={() => clickAction(onOpenSettings)}
              />
            </div>
          </nav>

          <p
            className="animate-rise mt-8 font-mono text-[11px] tracking-wider text-muted-foreground/75"
            style={{ animationDelay: "260ms", animationFillMode: "both" }}
          >
            STOCKFISH 19 WASM · VOICE COACH · CTRL + , НАСТРОЙКИ
          </p>
        </div>

        {/* Central / Right Illuminated Winged Knight Showcase */}
        <div
          className="animate-rise hidden items-center justify-center lg:flex"
          style={{ animationDelay: "180ms", animationFillMode: "both" }}
        >
          <div className="relative grid place-items-center rounded-3xl border border-primary/20 bg-card/45 p-10 backdrop-blur-md shadow-[0_32px_90px_-30px_rgba(0,0,0,0.9),0_0_60px_-24px_rgba(22,199,132,0.28)]">
            <div
              className="pointer-events-none absolute -inset-6 rounded-full opacity-35 blur-3xl"
              style={{ background: "radial-gradient(circle, #16C784 0%, transparent 70%)" }}
              aria-hidden
            />
            <ProChessLogo variant="splash" className="relative z-10 scale-110" />
            <div className="relative z-10 mt-5 text-center">
              <p className="font-mono text-xs uppercase tracking-[0.26em] text-primary">
                WINGED KNIGHT CORE
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Интерактивный разбор и живая оценка позиции
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function CommandTile({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="panel"
      onClick={onClick}
      className={cn(
        "h-auto flex-col items-start justify-center gap-1 rounded-xl border-border/90 bg-card/85 px-4 py-3 text-left backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/55 hover:bg-accent/90 active:translate-y-0",
      )}
    >
      <span className="flex items-center gap-2 font-sans text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
        {icon}
        {title}
      </span>
      <span className="text-[11px] font-normal text-muted-foreground">{subtitle}</span>
    </Button>
  );
}
