import { getSessionUser } from "@/lib/session";
import { formatMoney, money } from "@riaya/core";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getEmployerBilling } from "./actions";

const MONTHS_FR = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

export default async function EmployerInvoicesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login");

  const t = await getTranslations("invoices");
  const { invoices, totalBudgetUsed, budgetPerEmployee, employeeCount } =
    await getEmployerBilling();
  const monthlyPool = budgetPerEmployee * employeeCount;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 font-serif text-2xl font-semibold text-gray-900">{t("title")}</h1>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <Stat
          label={t("monthlyPool")}
          value={monthlyPool}
          sub={t("forNEmployees", { count: employeeCount })}
        />
        <Stat label={t("totalDisbursed")} value={totalBudgetUsed} />
      </div>

      <h2 className="mb-3 font-serif text-lg font-semibold text-gray-900">
        {t("monthlyInvoices")}
      </h2>
      {invoices.length === 0 ? (
        <p className="rounded-2xl bg-white p-8 text-center text-gray-500 shadow-sm">{t("none")}</p>
      ) : (
        <ul className="space-y-2">
          {invoices.map((inv) => (
            <li
              key={inv.id}
              className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm"
            >
              <div>
                <p className="font-medium text-gray-900">
                  {MONTHS_FR[inv.periodMonth - 1]} {inv.periodYear}
                </p>
                <p className="text-sm text-gray-500">
                  {t("bookingsCount", { count: inv.bookingCount })}
                  {inv.ice ? ` · ICE ${inv.ice}` : ""}
                </p>
              </div>
              <div className="text-end">
                <p className="font-semibold text-gray-900">{formatMoney(money(inv.total))}</p>
                <p className="text-xs text-gray-400">{t(`status.${inv.status}`)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function Stat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 text-center shadow-sm">
      <p className="text-lg font-semibold text-gray-900">{formatMoney(money(value))}</p>
      <p className="mt-1 text-xs text-gray-500">{label}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}
