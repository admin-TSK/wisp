import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  Check,
  GitBranch,
  Receipt,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { FleetPreview } from "@/components/marketing/fleet-preview";
import { HeroDashboard } from "@/components/marketing/hero-dashboard";
import { SectionHeading } from "@/components/marketing/section-heading";

export const metadata: Metadata = {
  title: "Wisp — Enterprise token compression for lower LLM bills",
  description:
    "Fleet-wide token compression for Claude Code, Cursor, and OpenAI-compatible tools. Deploy through MDM or gateway, remove costly input tokens, and pay only a capped share of measured net savings.",
  openGraph: {
    title: "Wisp — Enterprise token compression for lower LLM bills.",
    description: "Compress LLM context across the fleet. Deploy once, save on every request.",
    images: [{ url: "/brand/wisp-og.png", width: 1200, height: 630, alt: "Wisp savings dashboard" }],
  },
};

const tools = ["Claude Code", "Cursor", "Codex CLI", "OpenAI SDK", "LiteLLM"] as const;

const stats = [
  { value: "40–70%", label: "Typical input reduction" },
  { value: "Fleet-wide", label: "MDM or gateway rollout" },
  { value: "10%", label: "Capped share of savings" },
] as const;

const steps = [
  {
    icon: SlidersHorizontal,
    title: "Deploy compression across the fleet",
    body: "Jamf or Intune pushes the Wisp PKG, then runs a one-line enrol script with your tenant secret. Gateway mode covers central LiteLLM, Bedrock, or Azure chokepoints when endpoint rollout is not the right fit.",
  },
  {
    icon: Zap,
    title: "Compress costly context before it reaches the model",
    body: "Wisp removes redundant input tokens from prompts, tool output, logs, RAG, and code context before each request leaves the machine or gateway. Developers keep the same tools and workflows.",
  },
  {
    icon: BarChart3,
    title: "Turn removed tokens into verified savings",
    body: "Aggregate, PII-free telemetry rolls up to your tenant dashboard. Wisp bills on measured tokens removed, net of provider cache discounts, so FinOps can reconcile every dollar.",
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
    title: "Savings-based billing",
    body: "Wisp prices from the savings token compression creates. Removed tokens are valued at the cache-blended rate you'd actually pay — then we take a capped 10%. Reconciliation CSV anytime.",
  },
  {
    icon: GitBranch,
    title: "Compression you can reproduce",
    body: "A pinned, eval-gated compression engine and an inspectable agent mean savings can be recomputed from the same inputs — no black-box math, no surprise true-ups.",
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

const proofs = [
  { icon: Sparkles, label: "Fleet-wide token compression" },
  { icon: ShieldCheck, label: "PII-free telemetry" },
  { icon: Boxes, label: "Jamf & Intune ready" },
  { icon: Receipt, label: "Capped savings-based pricing" },
] as const;

const comparison = [
  { dim: "Compression", diy: "One-off scripts with uneven coverage", wisp: "Managed compression on every covered request" },
  { dim: "Rollout", diy: "Per-dev setup, Slack reminders", wisp: "MDM or gateway rollout at fleet scale" },
  { dim: "Policy", diy: "Hardcoded per machine", wisp: "Central, per-group, instant" },
  { dim: "Visibility", diy: "DIY logs, if any", wisp: "Live token removal and savings dashboard" },
  { dim: "Billing", diy: "Spreadsheets & guesswork", wisp: "Capped share of measured net savings" },
  { dim: "Upkeep", diy: "You patch and babysit it", wisp: "Pinned, eval-gated compression updates" },
  { dim: "Support", diy: "Community threads", wisp: "Dedicated enterprise support" },
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
    a: "We measure the input tokens Wisp removes, value them at a cache-blended rate (so you never pay for discounts you'd already get), take 10% of that net savings, and cap it monthly if agreed.",
  },
  {
    q: "What happens when the compression engine updates?",
    a: "Every compression-engine update runs a quality eval gate before it ships. Green merges; a regression is flagged for review — so your savings stay stable and your meter stays reproducible.",
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
              Enterprise token compression for AI fleets
            </span>
            <h1 className="mt-base max-w-xl text-balance text-[2.5rem] font-bold leading-[1.05] tracking-tight text-text-primary sm:text-[3rem] lg:text-[3.5rem]">
              Compress LLM tokens.{" "}
              <span className="bg-gradient-to-r from-accent to-[#5AB0FF] bg-clip-text text-transparent">
                Cut the bill.
              </span>
            </h1>
            <p className="mt-base max-w-lg text-pretty text-body leading-relaxed text-text-secondary">
              Wisp is token compression for enterprise LLM usage. It removes costly input context
              before requests hit the model, scales through MDM-managed devices or central gateways,
              and prices as a capped share of measured net savings.
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
              No credit card · 30-day shadow period · pay only when compression saves money
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

      {/* Trust bar */}
      <section className="border-b border-border bg-bg/60 py-base">
        <ul className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-lg gap-y-sm px-base text-caption text-text-secondary lg:px-lg">
          {proofs.map(({ icon: Icon, label }) => (
            <li key={label} className="inline-flex items-center gap-sm">
              <Icon size={15} className="text-accent" aria-hidden="true" />
              {label}
            </li>
          ))}
        </ul>
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
          title="Token compression is the product. Enterprise scale is the delivery model."
          description="Wisp compresses LLM inputs wherever your teams generate them, then makes those savings deployable, governable, and billable across the fleet."
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

      {/* Product preview — fleet */}
      <section className="border-t border-border bg-bg-elevated/20 py-2xl lg:py-3xl">
        <div className="mx-auto grid max-w-6xl items-center gap-2xl px-base lg:grid-cols-[1fr_1.05fr] lg:px-lg">
          <div>
            <SectionHeading
              eyebrow="Fleet control"
              title="One dashboard for enterprise compression"
              description="See where Wisp is running, which policy each group uses, and how much token compression is saving — then tune coverage without touching a single laptop."
            />
            <ul className="mt-lg space-y-sm">
              {[
                "Per-group policy, pushed instantly",
                "Stale-device health at a glance",
                "Per-model token reduction, gross and net",
              ].map((f) => (
                <li key={f} className="flex items-start gap-sm text-callout text-text-secondary">
                  <Check size={16} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <FleetPreview />
        </div>
      </section>

      {/* Trust */}
      <section className="border-y border-border bg-bg-elevated/30 py-2xl lg:py-3xl">
        <div className="mx-auto max-w-6xl px-base lg:px-lg">
          <SectionHeading
            eyebrow="Built for trust"
            title="Compression savings procurement can trust"
            description="Wisp makes token reduction measurable, privacy-preserving, and reconcilable enough for enterprise finance and security teams."
          />
          <div className="mt-2xl grid gap-lg md:grid-cols-3">
            {trust.map(({ icon: Icon, title, body }) => (
              <article
                key={title}
                className="rounded-xl border border-border bg-surface p-lg transition hover:border-accent/30 hover:shadow-[0_8px_32px_rgba(10,132,255,0.08)]"
              >
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

      {/* Build vs. buy */}
      <section className="border-y border-border bg-bg-elevated/20 py-2xl lg:py-3xl">
        <div className="mx-auto max-w-5xl px-base lg:px-lg">
        <SectionHeading
          eyebrow="Build vs. buy"
          title="Enterprise token compression beats ad hoc scripts"
          description="The compression creates the savings. Wisp makes that compression reliable across enterprise compute, device management, policy, telemetry, and billing."
          align="center"
          className="mb-2xl"
        />
        <div className="grid gap-lg md:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface p-lg">
            <p className="text-caption font-medium uppercase tracking-widest text-text-tertiary">
              Ad hoc compression
            </p>
            <ul className="mt-lg space-y-md">
              {comparison.map((row) => (
                <li key={row.dim} className="flex items-start gap-sm text-callout text-text-secondary">
                  <X size={16} className="mt-0.5 shrink-0 text-text-tertiary" aria-hidden="true" />
                  <span>
                    <span className="text-text-primary">{row.dim}:</span> {row.diy}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-accent/40 bg-surface p-lg ring-1 ring-accent/20">
            <p className="text-caption font-medium uppercase tracking-widest text-accent">Managed by Wisp</p>
            <ul className="mt-lg space-y-md">
              {comparison.map((row) => (
                <li key={row.dim} className="flex items-start gap-sm text-callout text-text-secondary">
                  <Check size={16} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
                  <span>
                    <span className="text-text-primary">{row.dim}:</span> {row.wisp}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-5xl px-base py-2xl lg:px-lg lg:py-3xl">
        <SectionHeading
          eyebrow="No-brainer pricing"
          title="Pay from compression savings — not seats"
          description="Start in shadow mode, prove token reduction against real usage, then pay Wisp a capped share of the net savings it creates."
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
            <div className="pointer-events-none absolute -top-16 right-0 h-48 w-48 rounded-full bg-accent/10 blur-3xl sm:-right-16" />
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
