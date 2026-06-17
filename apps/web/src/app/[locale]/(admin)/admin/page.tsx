import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { getAdminKPIs } from "./actions";

function KpiCard({
  label,
  value,
  sub,
  alert,
  href,
}: {
  label: string;
  value: string | number;
  sub?: string;
  alert?: boolean;
  href?: string;
}) {
  const inner = (
    <div
      className={`rounded-xl border p-5 ${
        alert ? "border-orange-200 bg-orange-50" : "border-gray-100 bg-white"
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p
        className={`mt-1 text-3xl font-semibold tabular-nums ${
          alert ? "text-orange-700" : "text-gray-900"
        }`}
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  );
  if (href)
    return (
      <Link href={href} className="block hover:opacity-90">
        {inner}
      </Link>
    );
  return inner;
}

export default async function AdminDashboardPage() {
  const [kpis, t] = await Promise.all([getAdminKPIs(), getTranslations("admin")]);

  const gmvMAD = (kpis.gmvCentimes / 100).toLocaleString("fr-MA", {
    style: "currency",
    currency: "MAD",
    maximumFractionDigits: 0,
  });

  return (
    <div className="space-y-6">
      <h2 className="font-serif text-xl font-semibold text-gray-800">{t("dashboard.title")}</h2>

      {/* Attention items */}
      {(kpis.pendingDocs > 0 || kpis.disputedBookings > 0) && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
          <p className="text-sm font-semibold text-orange-800">{t("dashboard.attention")}</p>
          <ul className="mt-2 space-y-1 text-sm text-orange-700">
            {kpis.pendingDocs > 0 && (
              <li>
                <Link href="/admin/verifications" className="underline hover:no-underline">
                  {t("dashboard.pendingDocs", { count: kpis.pendingDocs })}
                </Link>
              </li>
            )}
            {kpis.disputedBookings > 0 && (
              <li>
                <Link href="/admin/disputes" className="underline hover:no-underline">
                  {t("dashboard.openDisputes", { count: kpis.disputedBookings })}
                </Link>
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <KpiCard label={t("kpi.gmv")} value={gmvMAD} sub={t("kpi.gmvSub")} />
        <KpiCard label={t("kpi.activeBookings")} value={kpis.activeBookings} />
        <KpiCard label={t("kpi.jobsEnabled")} value={kpis.jobsEnabledHours} sub={t("kpi.hours")} />
        <KpiCard label={t("kpi.caregivers")} value={kpis.caregivers} />
        <KpiCard label={t("kpi.employers")} value={kpis.employers} />
        <KpiCard label={t("kpi.users")} value={kpis.totalUsers} />
      </div>

      {/* Queues */}
      <div className="grid grid-cols-2 gap-4">
        <KpiCard
          label={t("kpi.pendingDocs")}
          value={kpis.pendingDocs}
          alert={kpis.pendingDocs > 0}
          href="/admin/verifications"
        />
        <KpiCard
          label={t("kpi.disputes")}
          value={kpis.disputedBookings}
          alert={kpis.disputedBookings > 0}
          href="/admin/disputes"
        />
      </div>
    </div>
  );
}
