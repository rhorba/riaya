import { getSessionUser } from "@/lib/session";
import { formatMoney, money } from "@riaya/core";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getCaregiverEarnings } from "./actions";

export default async function CaregiverEarningsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login");

  const t = await getTranslations("earnings");
  const tc = await getTranslations("careTypes");
  const tStatus = await getTranslations("booking.escrowStatus");
  const { rows, paidOut, upcoming, compensation } = await getCaregiverEarnings();

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 font-serif text-2xl font-semibold text-gray-900">{t("title")}</h1>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Stat label={t("paidOut")} value={paidOut} />
        <Stat label={t("upcoming")} value={upcoming} />
        <Stat label={t("compensation")} value={compensation} />
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl bg-white p-8 text-center text-gray-500 shadow-sm">{t("none")}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const isComp = r.status === "refunded" && r.cancellationFee > 0;
            const amount = isComp ? r.cancellationFee : r.caregiverPayout;
            return (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm"
              >
                <div>
                  <p className="font-medium text-gray-900">{tc(r.careType)}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(r.startTime).toLocaleDateString()} · {tStatus(r.status)}
                  </p>
                </div>
                <span
                  className={
                    r.status === "released"
                      ? "font-semibold text-[var(--color-sage-700,#4b7058)]"
                      : "font-semibold text-gray-700"
                  }
                >
                  {formatMoney(money(amount))}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white p-4 text-center shadow-sm">
      <p className="text-lg font-semibold text-gray-900">{formatMoney(money(value))}</p>
      <p className="mt-1 text-xs text-gray-500">{label}</p>
    </div>
  );
}
