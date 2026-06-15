import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.WISP_SENTRY_DSN ?? process.env.SENTRY_DSN,
  enabled: Boolean(process.env.WISP_SENTRY_DSN ?? process.env.SENTRY_DSN),
  tracesSampleRate: 0.1,
});
