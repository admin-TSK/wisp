import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Check,
  GitBranch,
  Receipt,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Zap,
} from "lucide-react";
import { HeroDashboard } from "@/components/marketing/hero-dashboard";
import { SectionHeading } from "@/components/marketing/section-heading";

export const metadata: Metadata = {
  title: "Wisp — Cut LLM token spend without changing your stack",
  description:
    "Fleet-wide context compression for Claude Code, Cursor, and OpenAI-compatible tools. MDM rollout, policy control, and billing on measured net-of-cache savings.",
  openGraph: {
    title: "Wisp — Invisible intelligence. Visible savings.",
    description: "Enterprise wrapper around Headroom. Deploy once, save everywhere.",
    images: [{ url: "/brand/wisp-og.png", width: 1200, height: 630, alt: "Wisp savings dashboard" }],
  },
};

const tools = ["Claude Code", "Cursor", "Codex CLI", "OpenAI SDK", "LiteLLM"] as const;

const stats = [
  { value: "40–70%", label: "Typical input reduction" },
  { value: "Net of cache", label: "Honest billing basis" },
  { value: "10%", label: "Wisp fee on savings" },
] as const;

const steps = [
  {
    icon: SlidersHorizontal,
    title: "IT deploys one MDM profile",
    body: "Jamf or Intune pushes the Wisp PKG, then runs a one-line enrol script with your tenant secret. Each Mac gets a unique token in profile.json — no Slack threads asking devs to install anything.",
  },
  {
    icon: Zap,
    title: "Dev tools stay the same",
    body: "Point ANTHROPIC_BASE_URL or OPENAI_BASE_URL at localhost. Compression happens transparently before each request leaves the machine — no new UI, no workflow change.",
  },
  {
    icon: BarChart3,
    title: "Finance gets a reconcilable number",
    body: "Aggregate, PII-free telemetry rolls up to your tenant dashboard. Bill on measured tokens removed, net of provider cache discounts — and export a CSV for FinOps.",
  },
] as const;

const trust = [
  {
    icon: ShieldCheck,
    title: "PII-free by design",
    body: "Telemetry is aggregate token counts and model names — never prompts, repos, or hostnames. The strict schema is enforced in code and CI fails if a forbidden field slips in.",
  },
  {
    icon: Receipt,
    title: "Net-of-cache billing",
    body: "We never bill counterfactual savings. Removed tokens are valued at the cache-blended rate you'd actually pay — then we take a capped 10%. Reconciliation CSV anytime.",
  },
  {
    icon: GitBranch,
    title: "A meter you can reproduce",
    body: "The pinned, eval-gated Headroom engine and an inspectable agent mean any invoiced number can be recomputed from the same inputs. Depend on the OSS core, never fork it.",
  },
] as const;

const teamFeatures = [
  "Fleet dashboard + live savings",
  "Policy controls (off → aggressive)",
  "Reconciliation CSV export",
  "30-day shadow period",
] as const;

const enterpriseFeatures = [
  "Signed PKG + notarized menu-bar app",
  "Jamf / Intune deployment kits",
  "Custom take rate & monthly cap",
  "Negotiated rate-card overrides",
] as const;

const faqs = [
  {
    q: "Do developers change their workflow?",
    a: "No. They keep Claude Code, Cursor, or any OpenAI-compatible client. Wisp sits at the proxy layer — a base-URL change pushed via MDM, not a new tool to learn.",
  },
  {
    q: "What data leaves the device?",
    a: "Only aggregate counts: model, tokens in/out, compression ratio, and policy level. No prompts, file paths, or usernames. The telemetry contract is enforced in code and tested in CI.",
  },
  {
    q: "How is billing calculated?",
    a: "We measure tokens removed by Headroom, value them at a cache-blended rate (so you never pay for discounts you'd already get), take 10% of that net savings, and cap it monthly if agreed.",
  },
  {
    q: "What happens when the compression engine updates?",
    a: "Every Headroom version bump runs a compression-quality eval gate before it ships. Green merges; a regression is flagged for review. You depend on a pinned, tested engine — not a moving target.",
  },
] as const;

export default function MarketingPage() {
  return (
    <>
      {/* Hero */}
      <section className="marketing-grid relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_55%_at_50%_-10%,rgba(10,132,255,0.20),transparent)]" />
        <div className="relative mx-auto grid max-w-6xl gap-2xl px-base py-2xl lg:grid-cols-[1fr_1.05fr] lg:items-center lg:px-lg lg:py-3xl">
          <div>
            <span className="inline-flex items-center gap-sm rounded-pill border border-border bg-surface/60 px-md py-xs text-caption text-text-secondary backdrop-blur-sm">
              <Sparkles size={13} className="text-accent" aria-hidden="true" />
              The enterprise layer for AI coding spend
            </span>
            <h1 className="mt-base max-w-xl text-balance text-[2.5rem] font-bold leading-[1.05] tracking-tight text-text-primary sm:text-[3rem] lg:text-[3.5rem]">
              Cut LLM token spend{" "}
              <span className="bg-gradient-to-r from-accent to-[#5AB0FF] bg-clip-text text-transparent">
                without changing your stack
              </span>
            </h1>
            <p className="mt-base max-w-lg text-pretty text-body leading-relaxed text-text-secondary">
              Wisp is the enterprise wrapper around{" "}
              <a
                href="https://github.com/chopratejas/headroom"
                className="text-text-primary underline decoration-border underline-offset-2 transition-colors hover:decoration-accent"
              >
                Headroom
              </a>
              : MDM fleet rollout, compression policy, PII-free telemetry, and billing your CFO can
              reconcile.
            </p>
            <div className="mt-lg flex flex-col gap-sm sm:flex-row sm:items-center">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-sm rounded-md bg-accent px-lg py-md text-callout font-semibold text-white shadow-[0_0_28px_rgba(10,132,255,0.35)] transition hover:bg-accent-hover"
              >
                Start free
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link
                href="/login?next=/onboarding"
                className="inline-flex items-center justify-center rounded-md border border-border bg-surface/60 px-lg py-md text-callout font-medium text-text-primary backdrop-blur-sm transition hover:border-accent/40 hover:bg-bg-elevated"
              >
                Explore live demo
              </Link>
            </div>
            <p className="mt-md text-footnote text-text-tertiary">
              No credit card · 30-day shadow period · Apache-2.0 compression core
            </p>
            <dl className="mt-2xl grid grid-cols-1 gap-sm sm:grid-cols-3">
              {stats.map(({ value, label }) => (
                <div
                  key={label}
                  className="rounded-lg border border-border/60 bg-surface/40 px-md py-base backdrop-blur-sm"
                >
                  <dd className="text-title2 font-bold tabular-nums text-text-primary">{value}</dd>
                  <dt className="mt-xs text-footnote text-text-tertiary">{label}</dt>
                </div>
              ))}
            </dl>
          </div>
          <HeroDashboard />
        </div>
      </section>

      {/* Tools strip */}
      <section className="border-b border-border bg-bg-elevated/40 py-xl">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-base px-base lg:px-lg">
          <p className="text-caption uppercase tracking-widest text-text-tertiary">
            Drops into the tools your teams already use
          </p>
          <ul className="flex flex-wrap items-center justify-center gap-sm">
            {tools.map((t) => (
              <li
                key={t}
                className="rounded-pill border border-border bg-surface px-base py-xs text-footnote font-medium text-text-secondary"
              >
                {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-base py-2xl lg:px-lg lg:py-3xl">
        <SectionHeading
          eyebrow="How it works"
          title="Deploy once. Save on every request."
          description="Compression is commodity — the product is fleet control, honest metering, and zero-touch enterprise rollout."
        />
        <ol className="mt-2xl grid gap-lg lg:grid-cols-3">
          {steps.map(({ icon: Icon, title, body }, i) => (
            <li
              key={title}
              className="group relative rounded-xl border border-border bg-surface p-lg transition hover:border-accent/30 hover:shadow-[0_8px_32px_rgba(10,132,255,0.08)]"
            >
              <span className="absolute -top-3 left-lg flex h-6 w-6 items-center justify-center rounded-pill bg-accent text-footnote font-bold text-white">
                {i + 1}
              </span>
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent/10 text-accent transition group-hover:bg-accent/15">
                <Icon size={22} aria-hidden="true" />
              </span>
              <h3 className="mt-base text-headline font-semibold text-text-primary">{title}</h3>
              <p className="mt-sm text-callout leading-relaxed text-text-secondary">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Trust */}
      <section className="border-y border-border bg-bg-elevated/30 py-2xl lg:py-3xl">
        <div className="mx-auto max-w-6xl px-base lg:px-lg">
          <SectionHeading
            eyebrow="Built for trust"
            title="The meter is the product"
            description="Three commitments make a usage-based bill something procurement and security will actually sign off on."
          />
          <div className="mt-2xl grid gap-lg md:grid-cols-3">
            {trust.map(({ icon: Icon, title, body }) => (
              <article key={title} className="rounded-xl border border-border bg-surface p-lg">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <Icon size={22} aria-hidden="true" />
                </span>
                <h3 className="mt-base text-headline font-semibold text-text-primary">{title}</h3>
                <p className="mt-sm text-callout leading-relaxed text-text-secondary">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-5xl px-base py-2xl lg:px-lg lg:py-3xl">
        <SectionHeading
          eyebrow="Pricing"
          title="Pay when you save — not per seat"
          description="Start in shadow mode: see the meter, trust the math, then flip billing on when you're ready."
          align="center"
          className="mb-2xl"
        />
        <div className="grid gap-lg lg:grid-cols-2">
          <div className="flex flex-col rounded-xl border border-border bg-surface p-lg lg:p-xl">
            <p className="text-caption font-medium uppercase tracking-widest text-text-tertiary">
              Team
            </p>
            <p className="mt-sm flex items-baseline gap-xs">
              <span className="text-large-title font-bold tracking-tight">10%</span>
              <span className="text-callout text-text-secondary">of net savings</span>
            </p>
            <p className="mt-xs text-footnote text-text-tertiary">No seats. No minimums. Capped.</p>
            <ul className="mt-lg flex-1 space-y-sm">
              {teamFeatures.map((f) => (
                <li key={f} className="flex items-start gap-sm text-callout text-text-secondary">
                  <Check size={16} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/login"
              className="mt-xl inline-flex w-full items-center justify-center rounded-md bg-accent py-md text-callout font-semibold text-white transition hover:bg-accent-hover"
            >
              Start free
            </Link>
          </div>
          <div
            id="enterprise"
            className="relative flex flex-col overflow-hidden rounded-xl border border-accent/40 bg-surface p-lg ring-1 ring-accent/20 lg:p-xl"
          >
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />
            <p className="text-caption font-medium uppercase tracking-widest text-accent">Enterprise</p>
            <p className="mt-sm text-headline font-semibold text-text-primary">
              Custom take rate &amp; monthly cap
            </p>
            <p className="mt-xs text-footnote text-text-tertiary">Jamf · Intune · dedicated support</p>
            <ul className="mt-lg flex-1 space-y-sm">
              {enterpriseFeatures.map((f) => (
                <li key={f} className="flex items-start gap-sm text-callout text-text-secondary">
                  <Check size={16} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
            <a
              href="mailto:hello@wisp.dev?subject=Wisp%20Enterprise"
              className="mt-xl inline-flex w-full items-center justify-center rounded-md border border-border bg-bg-elevated py-md text-callout font-medium text-text-primary transition hover:border-accent/40"
            >
              Talk to sales
            </a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border bg-bg-elevated/20 py-2xl lg:py-3xl">
        <div className="mx-auto max-w-3xl px-base lg:px-lg">
          <SectionHeading eyebrow="FAQ" title="Common questions" align="center" className="mb-xl" />
          <div className="space-y-sm">
            {faqs.map(({ q, a }) => (
              <details
                key={q}
                className="group rounded-lg border border-border bg-surface px-lg py-base transition-colors open:border-accent/30"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-base text-callout font-medium text-text-primary marker:content-none [&::-webkit-details-marker]:hidden">
                  {q}
                  <ArrowRight
                    size={16}
                    className="shrink-0 text-text-tertiary transition-transform group-open:rotate-90"
                    aria-hidden="true"
                  />
                </summary>
                <p className="mt-sm text-callout leading-relaxed text-text-secondary">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden border-t border-border py-2xl lg:py-3xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(10,132,255,0.15),transparent_65%)]" />
        <div className="relative mx-auto max-w-2xl px-base text-center lg:px-lg">
          <h2 className="text-balance text-title font-bold tracking-tight text-text-primary lg:text-large-title">
            See your savings in minutes
          </h2>
          <p className="mx-auto mt-base max-w-lg text-pretty text-callout leading-relaxed text-text-secondary">
            Join the demo workspace with live fleet data — or create your own and enrol your first
            Mac.
          </p>
          <div className="mt-lg flex flex-col justify-center gap-sm sm:flex-row">
            <Link
              href="/login?next=/onboarding"
              className="inline-flex items-center justify-center gap-sm rounded-md bg-accent px-xl py-md text-callout font-semibold text-white shadow-[0_0_28px_rgba(10,132,255,0.35)] transition hover:bg-accent-hover"
            >
              Explore demo
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-md border border-border px-xl py-md text-callout font-medium text-text-primary transition hover:bg-bg-elevated"
            >
              Create workspace
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
