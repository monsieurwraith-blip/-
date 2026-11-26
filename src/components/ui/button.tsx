import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold tracking-[0.01em] cursor-pointer transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] active:translate-y-px active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border border-white/20 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--primary)_90%,#fff)_0%,var(--primary)_55%,color-mix(in_oklab,var(--primary)_80%,#000)_100%)] text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_8px_22px_-8px_color-mix(in_oklab,var(--primary)_60%,transparent)] hover:brightness-105 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_12px_28px_-8px_color-mix(in_oklab,var(--primary)_72%,transparent)]",
        destructive:
          "border border-white/15 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--destructive)_88%,#fff)_0%,var(--destructive)_100%)] text-destructive-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.24),0_6px_18px_-6px_rgba(239,68,68,0.55)] hover:brightness-105",
        outline:
          "border border-[color-mix(in_oklab,var(--foreground)_16%,transparent)] bg-card/70 backdrop-blur-sm text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_2px_6px_-2px_rgba(0,0,0,0.35)] hover:border-primary/45 hover:bg-accent/85 hover:text-accent-foreground",
        secondary:
          "border border-border/80 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--secondary)_110%,#fff)_0%,var(--secondary)_100%)] text-secondary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_2px_6px_-2px_rgba(0,0,0,0.4)] hover:brightness-110",
        ghost: "rounded-lg hover:bg-accent/80 hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        panel:
          "border border-[color-mix(in_oklab,var(--foreground)_13%,transparent)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--secondary)_112%,#fff)_0%,var(--secondary)_100%)] text-secondary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_8px_-2px_rgba(0,0,0,0.48)] hover:border-[color-mix(in_oklab,var(--primary)_45%,var(--input))] hover:bg-[linear-gradient(180deg,color-mix(in_oklab,var(--accent)_114%,#fff)_0%,var(--accent)_100%)] hover:text-foreground hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_6px_16px_-4px_rgba(0,0,0,0.55)]",
        ivory:
          "border border-white/65 bg-[linear-gradient(180deg,#ffffff_0%,var(--ivory)_65%,color-mix(in_oklab,var(--ivory)_86%,#94a3b8)_100%)] text-ivory-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_22px_-8px_rgba(0,0,0,0.65)] hover:brightness-[1.03] hover:shadow-[inset_0_1px_0_rgba(255,255,255,1),0_12px_28px_-8px_rgba(255,255,255,0.22)]",
      },
      size: {
        default: "h-9.5 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-11 rounded-xl px-7 text-sm",
        icon: "h-9 w-9 rounded-lg",
        tile: "h-auto flex-col gap-1.5 rounded-xl px-2 py-2.5 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
