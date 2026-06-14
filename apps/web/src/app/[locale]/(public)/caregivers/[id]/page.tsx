import { VerificationBadge } from "@/components/verification-badge";
import { formatMoney, money } from "@riaya/core";
import { caregiverProfiles, db } from "@riaya/db";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";

type Params = { locale: string; id: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Fetch a public caregiver profile. Runs on the RLS-enforced `db` connection
 * with NO user context — the caregiver_read policy is USING(true), so public
 * discovery works while every other table stays locked down.
 */
async function getCaregiver(id: string) {
  if (!UUID_RE.test(id)) return null;
  const [row] = await db
    .select()
    .from(caregiverProfiles)
    .where(eq(caregiverProfiles.id, id))
    .limit(1);
  return row ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { id } = await params;
  const caregiver = await getCaregiver(id);
  if (!caregiver) return { title: "Riaya" };
  return {
    title: caregiver.displayName,
    description: caregiver.bio ?? undefined,
  };
}

export default async function CaregiverPublicProfile({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const caregiver = await getCaregiver(id);
  if (!caregiver) notFound();

  const t = await getTranslations("publicProfile");
  const tc = await getTranslations("careTypes");

  const rating = caregiver.reviewCount > 0 ? (caregiver.avgRating / 100).toFixed(1) : null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        {/* Header */}
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[var(--color-cream-100)] text-3xl font-serif text-[var(--color-terracotta-600)]">
            {caregiver.photoUrl ? (
              <img src={caregiver.photoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              caregiver.displayName.charAt(0)
            )}
          </div>

          <div className="flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <h1 className="font-serif text-2xl font-semibold text-gray-900">
                {caregiver.displayName}
              </h1>
              <VerificationBadge level={caregiver.verificationLevel} />
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
              {rating ? (
                <span className="font-medium text-gray-800">
                  ★ {rating} · {t("reviews", { count: caregiver.reviewCount })}
                </span>
              ) : (
                <span>{t("noRating")}</span>
              )}
              {caregiver.completedBookings > 0 && (
                <span>{t("completedBookings", { count: caregiver.completedBookings })}</span>
              )}
              {caregiver.responseRate > 0 && (
                <span>{t("responseRate", { rate: caregiver.responseRate })}</span>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-6 border-t border-gray-100 p-6">
          {caregiver.bio && <p className="leading-relaxed text-gray-700">{caregiver.bio}</p>}

          <Section title={t("careTypes")}>
            <div className="flex flex-wrap gap-2">
              {caregiver.careTypes.map((ct) => (
                <span
                  key={ct}
                  className="rounded-full bg-[var(--color-sage-50)] px-3 py-1 text-sm text-[var(--color-sage-700)]"
                >
                  {tc(ct)}
                </span>
              ))}
            </div>
          </Section>

          <div className="grid gap-6 sm:grid-cols-2">
            <Section title={t("servesAreas")}>
              <p className="text-gray-700">{caregiver.cities.join(" · ")}</p>
            </Section>
            <Section title={t("languages")}>
              <p className="uppercase text-gray-700">{caregiver.languages.join(" · ")}</p>
            </Section>
          </div>

          {(caregiver.minAgeMonths != null || caregiver.maxAgeYears != null) && (
            <Section title={t("ageRange")}>
              <p className="text-gray-700">
                {caregiver.minAgeMonths != null &&
                  t("ageMonths", { months: caregiver.minAgeMonths })}
                {caregiver.minAgeMonths != null && caregiver.maxAgeYears != null && " — "}
                {caregiver.maxAgeYears != null && t("ageYears", { years: caregiver.maxAgeYears })}
              </p>
            </Section>
          )}

          {/* Rates */}
          <div className="flex flex-wrap gap-4 border-t border-gray-100 pt-4">
            {caregiver.hourlyRate != null && (
              <Rate value={caregiver.hourlyRate} unit={t("perHour")} />
            )}
            {caregiver.dailyRate != null && <Rate value={caregiver.dailyRate} unit={t("perDay")} />}
            {caregiver.monthlyRate != null && (
              <Rate value={caregiver.monthlyRate} unit={t("perMonth")} />
            )}
          </div>

          <Link
            href={`/family/book/${caregiver.id}`}
            className="block w-full rounded-lg bg-[var(--color-terracotta-500)] px-5 py-3 text-center font-medium text-white transition-colors hover:bg-[var(--color-terracotta-600)]"
          >
            {t("requestBooking")}
          </Link>
        </div>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">{title}</h2>
      {children}
    </div>
  );
}

function Rate({ value, unit }: { value: number; unit: string }) {
  return (
    <div>
      <span className="text-lg font-semibold text-[var(--color-terracotta-600)]">
        {formatMoney(money(value))}
      </span>{" "}
      <span className="text-sm text-gray-500">{unit}</span>
    </div>
  );
}
