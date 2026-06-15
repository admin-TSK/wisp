import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto grid max-w-6xl gap-xl px-base py-2xl md:grid-cols-4 lg:px-lg">
        <div className="md:col-span-2">
          <Logo href="/" size="sm" />
          <p className="mt-md max-w-sm text-callout leading-relaxed text-text-secondary">
            Invisible intelligence. Visible savings. Fleet-wide LLM context compression with honest,
            net-of-cache billing.
          </p>
        </div>
        <div>
          <h2 className="text-footnote font-semibold uppercase tracking-widest text-text-tertiary">
            Product
          </h2>
          <ul className="mt-md space-y-sm text-callout text-text-secondary">
            <li>
              <Link href="/#how-it-works" className="hover:text-text-primary">
                How it works
              </Link>
            </li>
            <li>
              <Link href="/#pricing" className="hover:text-text-primary">
                Pricing
              </Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-text-primary">
                Dashboard
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h2 className="text-footnote font-semibold uppercase tracking-widest text-text-tertiary">
            Company
          </h2>
          <ul className="mt-md space-y-sm text-callout text-text-secondary">
            <li>
              <Link href="/#enterprise" className="hover:text-text-primary">
                Enterprise &amp; MDM
              </Link>
            </li>
            <li>
              <a href="mailto:hello@wisp.dev" className="hover:text-text-primary">
                hello@wisp.dev
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border px-base py-md text-center text-footnote text-text-tertiary lg:px-lg">
        © {new Date().getFullYear()} Wisp · Compression powered by{" "}
        <a
          href="https://github.com/chopratejas/headroom"
          className="underline hover:text-text-secondary"
        >
          Headroom
        </a>{" "}
        (Apache 2.0)
      </div>
    </footer>
  );
}
