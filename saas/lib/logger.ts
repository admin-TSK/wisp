import "server-only";

type LogLevel = "debug" | "info" | "warn" | "error";

/** Structured JSON logs for API routes (Vercel log drain friendly). */
export function log(
  level: LogLevel,
  message: string,
  fields: Record<string, unknown> = {},
): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    message,
    ...fields,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
