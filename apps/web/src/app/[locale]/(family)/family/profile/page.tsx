import { getTranslations } from "next-intl/server";
import { getMyFamilyProfile } from "./actions";
import { FamilyProfileForm } from "./family-profile-form";

export default async function FamilyProfilePage() {
  const t = await getTranslations("familyProfile");
  const profile = await getMyFamilyProfile();

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 font-serif text-2xl font-semibold text-gray-900">{t("title")}</h1>
      <FamilyProfileForm
        initial={
          profile
            ? {
                address: profile.address ?? "",
                neighborhood: profile.neighborhood ?? "",
                city: profile.city,
                children: profile.children,
              }
            : null
        }
      />
    </main>
  );
}
