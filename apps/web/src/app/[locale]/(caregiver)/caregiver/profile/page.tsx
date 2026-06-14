import { getTranslations } from "next-intl/server";
import { getMyCaregiverProfile } from "./actions";
import { CaregiverProfileForm } from "./caregiver-profile-form";

export default async function CaregiverProfilePage() {
  const t = await getTranslations("caregiverProfile");
  const profile = await getMyCaregiverProfile();

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 font-serif text-2xl font-semibold text-gray-900">{t("title")}</h1>
      <CaregiverProfileForm
        initial={
          profile
            ? {
                bio: profile.bio ?? "",
                careTypes: profile.careTypes,
                cities: profile.cities,
                languages: profile.languages,
                hourlyRate: profile.hourlyRate,
                dailyRate: profile.dailyRate,
                monthlyRate: profile.monthlyRate,
                minAgeMonths: profile.minAgeMonths,
                maxAgeYears: profile.maxAgeYears,
                maxChildren: profile.maxChildren,
                hasOwnSpace: profile.hasOwnSpace,
              }
            : null
        }
      />
    </main>
  );
}
