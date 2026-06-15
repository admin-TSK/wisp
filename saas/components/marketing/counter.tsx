"use client";

import { useEffect, useRef, useState } from "react";

type CounterProps = {
  value: number;
  /** Format the in-flight number (e.g. usd / compactTokens). */
  format?: (n: number) => string;
  durationMs?: number;
  className?: string;
};

/**
 * Count-up on mount. Respects prefers-reduced-motion (jumps straight to the
 * final value) and cleans up its animation frame.
 */
export function Counter({ value, format, durationMs = 900, className }: CounterProps) {
  const [n, setN] = useState(value);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setN(value);
      return;
    }

    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min((t - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setN(value * eased);
      if (p < 1) frame.current = requestAnimationFrame(tick);
    };
    setN(0);
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [value, durationMs]);

  return <span className={className}>{format ? format(n) : Math.round(n).toLocaleString()}</span>;
}
