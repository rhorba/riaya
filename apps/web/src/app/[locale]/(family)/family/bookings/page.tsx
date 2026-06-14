import { getSessionUser } from "@/lib/session";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getMyBookings } from "./actions";
import { BookingsTracker } from "./bookings-tracker";

export default async function FamilyBookingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login");

  const t = await getTranslations("booking");
  const bookings = await getMyBookings();

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 font-serif text-2xl font-semibold text-gray-900">{t("myBookings")}</h1>
      <BookingsTracker bookings={bookings} />
    </main>
  );
}
