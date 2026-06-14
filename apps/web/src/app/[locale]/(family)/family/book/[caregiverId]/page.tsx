import { getSessionUser } from "@/lib/session";
import { caregiverProfiles, db } from "@riaya/db";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BookingRequestForm } from "./booking-request-form";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function BookCaregiverPage({
  params,
}: {
  params: Promise<{ locale: string; caregiverId: string }>;
}) {
  const { caregiverId } = await params;
  const t = await getTranslations("booking");

  const user = await getSessionUser();
  if (!user) redirect("/auth/login");
  if (user.role !== "family") {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-gray-600">{t("familiesOnly")}</p>
        <Link href="/search" className="mt-4 inline-block text-[var(--color-terracotta-600)]">
          {t("backToSearch")}
        </Link>
      </main>
    );
  }

  if (!UUID_RE.test(caregiverId)) notFound();
  const [caregiver] = await db
    .select({
      id: caregiverProfiles.id,
      displayName: caregiverProfiles.displayName,
      careTypes: caregiverProfiles.careTypes,
      maxChildren: caregiverProfiles.maxChildren,
      hourlyRate: caregiverProfiles.hourlyRate,
      dailyRate: caregiverProfiles.dailyRate,
    })
    .from(caregiverProfiles)
    .where(eq(caregiverProfiles.id, caregiverId))
    .limit(1);
  if (!caregiver) notFound();

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 font-serif text-2xl font-semibold text-gray-900">
        {t("requestTitle", { name: caregiver.displayName })}
      </h1>
      <p className="mb-6 text-sm text-gray-500">{t("requestSubtitle")}</p>
      <BookingRequestForm
        caregiverId={caregiver.id}
        careTypes={caregiver.careTypes}
        maxChildren={caregiver.maxChildren}
        hourlyRate={caregiver.hourlyRate}
        dailyRate={caregiver.dailyRate}
      />
    </main>
  );
}
