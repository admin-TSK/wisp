import { cn } from "@/lib/utils";

type WispMarkProps = {
  className?: string;
  size?: number;
};

/** Crisp vector brand mark — layered leaf / compression motif. */
export function WispMark({ className, size = 28 }: WispMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="wisp-grad" x1="6" y1="4" x2="26" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#409CFF" />
          <stop offset="1" stopColor="#0A84FF" />
        </linearGradient>
      </defs>
      <path
        d="M16 4C11 10 8 14 8 19a8 8 0 1 0 16 0c0-5-3-9-8-15Z"
        fill="url(#wisp-grad)"
        opacity="0.35"
      />
      <path
        d="M16 7c-3.5 5-5.5 8.5-5.5 12.5a5.5 5.5 0 1 0 11 0C21.5 15.5 19.5 12 16 7Z"
        fill="url(#wisp-grad)"
        opacity="0.65"
      />
      <path
        d="M16 10c-2 3.2-3.2 5.6-3.2 8.8a3.2 3.2 0 1 0 6.4 0c0-3.2-1.2-5.6-3.2-8.8Z"
        fill="url(#wisp-grad)"
      />
    </svg>
  );
}
