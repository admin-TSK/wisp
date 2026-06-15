import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "destructive" | "neutral";

// Status pairs color WITH text + a shape, never color alone (guideline 3.2, 9).
const tones: Record<Tone, { dot: string; text: string }> = {
  success: { dot: "bg-success", text: "text-success" },
  warning: { dot: "bg-warning", text: "text-warning" },
  destructive: { dot: "bg-destructive", text: "text-destructive" },
  neutral: { dot: "bg-text-tertiary", text: "text-text-secondary" },
};

export function StatusBadge({ tone, label }: { tone: Tone; label: string }) {
  const t = tones[tone];
  return (
    <span className="inline-flex items-center gap-sm text-caption">
      <span className={cn("h-2 w-2 rounded-pill", t.dot)} aria-hidden="true" />
      <span className={t.text}>{label}</span>
    </span>
  );
}
