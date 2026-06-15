"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/brand/logo";

const links = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#enterprise", label: "Enterprise" },
] as const;

export function MarketingHeader() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="border-b border-border/40 bg-bg-elevated/50 py-xs text-center text-footnote text-text-tertiary">
        <span className="font-semibold text-accent">New</span>
        <span className="mx-sm text-border" aria-hidden="true">·</span>
        Enterprise token compression with MDM rollout and savings-based pricing
      </div>
      <header className="sticky top-0 z-50 border-b border-border/60 bg-bg/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-base lg:px-lg">
          <Logo href="/" size="sm" />

          <nav aria-label="Marketing" className="hidden items-center gap-lg md:flex">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-callout text-text-secondary transition-colors hover:text-text-primary"
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-sm">
            <Link
              href="/login"
              className="hidden text-callout text-text-secondary hover:text-text-primary sm:inline"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="hidden rounded-md bg-accent px-base py-sm text-callout font-medium text-white hover:bg-accent-hover sm:inline-flex"
            >
              Start free
            </Link>
            <button
              type="button"
              className="rounded-md p-sm text-text-secondary hover:bg-bg-elevated md:hidden"
              aria-expanded={open}
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {open ? (
          <nav
            aria-label="Mobile"
            className="border-t border-border bg-bg px-base py-base md:hidden"
          >
            <ul className="flex flex-col gap-sm">
              {links.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="block rounded-md py-sm text-callout text-text-primary"
                    onClick={() => setOpen(false)}
                  >
                    {label}
                  </Link>
                </li>
              ))}
              <li className="mt-sm border-t border-border pt-sm">
                <Link
                  href="/login"
                  className="block rounded-md bg-accent py-sm text-center text-callout font-medium text-white"
                  onClick={() => setOpen(false)}
                >
                  Start free
                </Link>
              </li>
            </ul>
          </nav>
        ) : null}
      </header>
    </>
  );
}
