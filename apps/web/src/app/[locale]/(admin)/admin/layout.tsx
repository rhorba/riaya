import { requireRole } from "@/lib/session";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  let isAdmin = false;
  try {
    await requireRole(["admin"]);
    isAdmin = true;
  } catch {
    isAdmin = false;
  }
  if (!isAdmin) redirect("/");

  const t = await getTranslations("admin");

  const navItems = [
    { href: "/admin", label: t("nav.dashboard") },
    { href: "/admin/verifications", label: t("nav.verifications") },
    { href: "/admin/disputes", label: t("nav.disputes") },
    { href: "/admin/escrow", label: t("nav.escrow") },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center gap-2">
        <span className="rounded-full bg-[var(--color-terracotta-500)] px-3 py-1 text-xs font-semibold text-white">
          Admin
        </span>
        <h1 className="font-serif text-2xl font-semibold text-gray-900">{t("title")}</h1>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <nav className="w-48 shrink-0" aria-label={t("nav.ariaLabel")}>
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-[var(--color-sage-50)] hover:text-[var(--color-sage-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-sage-500)] focus-visible:ring-offset-1"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Main */}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
