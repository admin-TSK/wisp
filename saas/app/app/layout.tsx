import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, CreditCard, LogOut, Server, SlidersHorizontal, Users } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { createClient } from "@/lib/supabase/server";
import { getTenantContext } from "@/lib/queries";
import { signOut } from "@/app/login/actions";

const nav = [
  { href: "/app", label: "Savings", icon: BarChart3 },
  { href: "/app/fleet", label: "Fleet", icon: Server },
  { href: "/app/policy", label: "Policy", icon: SlidersHorizontal },
  { href: "/app/members", label: "Members", icon: Users },
  { href: "/app/billing", label: "Billing", icon: CreditCard },
] as const;

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ctx = await getTenantContext();
  if (!ctx) redirect("/onboarding");

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-surface p-base">
        <div className="mb-xl px-sm">
          <Logo href="/app" size="sm" />
        </div>
        <nav aria-label="Primary" className="flex flex-1 flex-col gap-xs">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-sm rounded-md px-sm py-sm text-callout text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
            >
              <Icon size={18} aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-base border-t border-border pt-base">
          <p className="truncate px-sm text-footnote text-text-tertiary" title={user.email ?? ""}>
            {user.email}
          </p>
          <form action={signOut}>
            <button
              type="submit"
              className="mt-xs flex w-full items-center gap-sm rounded-md px-sm py-sm text-callout text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
            >
              <LogOut size={18} aria-hidden="true" />
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-xl">{children}</main>
    </div>
  );
}
