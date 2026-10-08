import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getAccount } from "@/lib/session";
import { SignOutButton } from "@/components/AccountBits";

export const dynamic = "force-dynamic";

const NAV = [
  ["/account", "Overview"],
  ["/account/orders", "Orders"],
  ["/account/addresses", "Addresses"],
] as const;

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const a = await getAccount();
  if (!a) redirect("/login?next=/account");
  return (
    <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
      <aside>
        <p className="eyebrow">My account</p>
        <p className="mt-2 truncate text-sm text-muted">{a.user.email}</p>
        <nav className="mt-6 flex gap-2 overflow-x-auto lg:flex-col lg:gap-1" aria-label="Account">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className="whitespace-nowrap border border-line px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] transition hover:border-accent hover:text-accent lg:border-0 lg:px-0">{label}</Link>
          ))}
          <SignOutButton />
        </nav>
      </aside>
      <div>{children}</div>
    </div>
  );
}
