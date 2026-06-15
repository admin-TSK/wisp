import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "destructive";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-hover",
  secondary: "border border-border bg-surface text-text-primary hover:bg-bg-elevated",
  // Destructive styling is reserved for destructive actions only (guideline 6.1).
  destructive: "bg-destructive text-white hover:opacity-90",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center gap-sm rounded-md px-base py-sm text-callout font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    >
      {loading ? "Working…" : children}
    </button>
  ),
);
Button.displayName = "Button";
