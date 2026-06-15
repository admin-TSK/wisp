import Link from "next/link";
import { cn } from "@/lib/utils";
import { WispMark } from "./wisp-mark";

type LogoProps = {
  className?: string;
  showWordmark?: boolean;
  size?: "sm" | "md" | "lg";
  href?: string | null;
};

const markSizes = { sm: 22, md: 28, lg: 36 } as const;

export function Logo({ className, showWordmark = true, size = "md", href = "/" }: LogoProps) {
  const inner = (
    <span className={cn("inline-flex items-center gap-sm", className)}>
      <WispMark size={markSizes[size]} />
      {showWordmark ? (
        <span className="text-title2 font-bold tracking-tight text-text-primary">Wisp</span>
      ) : null}
    </span>
  );

  if (href == null) return inner;

  return (
    <Link
      href={href}
      className="rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      {inner}
    </Link>
  );
}
