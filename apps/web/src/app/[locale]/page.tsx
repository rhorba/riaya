import { useTranslations } from "next-intl";
import Link from "next/link";

export default function HomePage() {
  const t = useTranslations("home");

  return (
    <main className="min-h-screen bg-[var(--color-surface)]">
      <div className="mx-auto max-w-4xl px-4 py-24 text-center">
        <h1 className="text-5xl font-bold text-[var(--color-terracotta-500)] mb-4">
          Riaya · رعاية
        </h1>
        <p className="text-xl text-gray-600 mb-8">{t("tagline")}</p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/fr/search"
            className="px-6 py-3 bg-[var(--color-terracotta-500)] text-white rounded-lg font-medium hover:bg-[var(--color-terracotta-600)] transition-colors"
          >
            {t("findCaregiver")}
          </Link>
          <Link
            href="/fr/auth/signup"
            className="px-6 py-3 border border-[var(--color-sage-500)] text-[var(--color-sage-500)] rounded-lg font-medium hover:bg-[var(--color-sage-50)] transition-colors"
          >
            {t("joinAsCaregiver")}
          </Link>
        </div>
      </div>
    </main>
  );
}
