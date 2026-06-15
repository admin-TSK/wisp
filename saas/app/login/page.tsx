import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { signIn, signUp } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; next?: string }>;
}) {
  const { error, message, next } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[radial-gradient(ellipse_at_top,_rgba(10,132,255,0.08)_0%,_transparent_50%)] p-base">
      <div className="mb-lg">
        <Logo href="/" size="lg" />
      </div>
      <div className="w-full max-w-sm">
        <p className="mb-lg text-center text-callout text-text-secondary">
          Sign in to your fleet dashboard
        </p>

        {error ? (
          <p
            role="alert"
            className="mb-base rounded-md border border-destructive/40 bg-destructive/10 px-md py-sm text-caption text-destructive"
          >
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="mb-base rounded-md border border-border bg-bg-elevated px-md py-sm text-caption text-text-secondary">
            {message}
          </p>
        ) : null}

        <form className="flex flex-col gap-md rounded-lg border border-border bg-surface p-lg shadow-md">
          <input type="hidden" name="next" value={next ?? "/app"} />
          <label className="flex flex-col gap-xs">
            <span className="text-caption text-text-secondary">Work email</span>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="rounded-md border border-border bg-bg px-md py-sm text-body text-text-primary"
            />
          </label>
          <label className="flex flex-col gap-xs">
            <span className="text-caption text-text-secondary">Password</span>
            <input
              type="password"
              name="password"
              required
              minLength={8}
              autoComplete="current-password"
              className="rounded-md border border-border bg-bg px-md py-sm text-body text-text-primary"
            />
          </label>
          <div className="mt-xs flex gap-sm">
            <Button formAction={signIn} className="flex-1">
              Sign In
            </Button>
            <Button formAction={signUp} variant="secondary" className="flex-1">
              Create Account
            </Button>
          </div>
          <p className="text-center text-caption text-text-tertiary">
            <a href="/auth/reset-password" className="underline hover:text-text-secondary">
              Forgot password?
            </a>
          </p>
        </form>
        <p className="mt-base text-center text-caption text-text-tertiary">
          <Link href="/" className="hover:text-text-secondary">
            ← Back to wisp.dev
          </Link>
        </p>
      </div>
    </div>
  );
}
