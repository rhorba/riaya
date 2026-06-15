import { signOutAction } from "@/app/[locale]/auth/actions";
import { getSessionUser } from "@/lib/session";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

/**
 * Role-aware top bar. Server component — reads the session server-side so the
 * displayed role can never be spoofed by the client. Logged-out users see
 * sign in / sign up; logged-in users see a role badge + sign out.
 */
export async function AppHeader() {
  const t = await getTranslations("nav");
  const user = await getSessionUser();

  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link
          href="/"
          className="font-serif text-xl font-semibold text-[var(--color-terracotta-600)]"
        >
          Riaya · رعاية
        </Link>

        <div className="flex items-center gap-3 text-sm">
          <Link href="/search" className="text-gray-600 hover:text-[var(--color-terracotta-600)]">
            {t("search")}
          </Link>

          {user ? (
            <>
              {user.role === "family" && (
                <Link
                  href="/family/bookings"
                  className="text-gray-600 hover:text-[var(--color-terracotta-600)]"
                >
                  {t("myBookings")}
                </Link>
              )}
              {user.role === "caregiver" && (
                <>
                  <Link
                    href="/caregiver/bookings"
                    className="text-gray-600 hover:text-[var(--color-terracotta-600)]"
                  >
                    {t("inbox")}
                  </Link>
                  <Link
                    href="/caregiver/availability"
                    className="text-gray-600 hover:text-[var(--color-terracotta-600)]"
                  >
                    {t("availability")}
                  </Link>
                </>
              )}
              <span className="rounded-full bg-[var(--color-sage-50)] px-3 py-1 text-xs font-medium text-[var(--color-sage-600)]">
                {t(`roles.${user.role}`)}
              </span>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="text-gray-600 hover:text-[var(--color-terracotta-600)]"
                >
                  {t("signout")}
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="text-gray-600 hover:text-[var(--color-terracotta-600)]"
              >
                {t("signin")}
              </Link>
              <Link
                href="/auth/signup"
                className="rounded-lg bg-[var(--color-terracotta-500)] px-3 py-1.5 font-medium text-white hover:bg-[var(--color-terracotta-600)]"
              >
                {t("signup")}
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
