import { getSessionUser } from "@/lib/session";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getMyAvailability } from "./actions";
import { AvailabilityEditor } from "./availability-editor";

export default async function CaregiverAvailabilityPage() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login");
  if (user.role !== "caregiver") redirect("/");

  const t = await getTranslations("availability");
  const slots = await getMyAvailability();

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 font-serif text-2xl font-semibold text-gray-900">{t("title")}</h1>
      <p className="mb-6 text-sm text-gray-500">{t("subtitle")}</p>
      <AvailabilityEditor initialSlots={slots} />
    </main>
  );
}
