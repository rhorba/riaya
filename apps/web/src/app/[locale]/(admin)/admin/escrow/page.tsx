import { getTranslations } from "next-intl/server";
import { getEscrowHealth } from "../actions";

function centimesToMAD(centimes: number) {
  return (centimes / 100).toLocaleString("fr-MA", {
    style: "currency",
    currency: "MAD",
    maximumFractionDigits: 0,
  });
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-600",
  authorized: "bg-blue-100 text-blue-700",
  captured: "bg-amber-100 text-amber-700",
  released: "bg-green-100 text-green-700",
  refunded: "bg-purple-100 text-purple-700",
  disputed: "bg-red-100 text-red-700",
};

export default async function AdminEscrowPage() {
  const [health, t] = await Promise.all([getEscrowHealth(), getTranslations("admin")]);

  const totalEscrowMAD = centimesToMAD(
    health.byStatus.reduce((acc, r) => acc + r.totalCentimes, 0)
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-xl font-semibold text-gray-800">{t("escrow.title")}</h2>
        <p className="mt-1 text-sm text-gray-500">{t("escrow.subtitle")}</p>
      </div>

      {/* Status breakdown */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <p className="mb-4 text-sm font-semibold text-gray-700">{t("escrow.byStatus")}</p>
        <div className="space-y-2">
          {health.byStatus.map((row) => (
            <div key={row.status} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[row.status] ?? "bg-gray-100 text-gray-600"}`}
                >
                  {t(`escrow.statuses.${row.status}` as Parameters<typeof t>[0])}
                </span>
                <span className="text-sm text-gray-500">
                  {t("escrow.nEscrows", { count: row.count })}
                </span>
              </div>
              <span className="font-semibold tabular-nums text-gray-800">
                {centimesToMAD(row.totalCentimes)}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 border-t border-gray-100 pt-3 flex justify-between text-sm font-semibold text-gray-800">
          <span>{t("escrow.total")}</span>
          <span className="tabular-nums">{totalEscrowMAD}</span>
        </div>
      </div>

      {/* Stuck authorized */}
      <div>
        <p className="mb-3 text-sm font-semibold text-gray-700">
          {t("escrow.stuckTitle")}
          {health.stuckAuthorized.length > 0 && (
            <span className="ms-2 rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-700">
              {health.stuckAuthorized.length}
            </span>
          )}
        </p>

        {health.stuckAuthorized.length === 0 ? (
          <div className="rounded-xl border border-gray-100 bg-white p-6 text-center text-sm text-gray-400">
            {t("escrow.noStuck")}
          </div>
        ) : (
          <div className="space-y-2">
            {health.stuckAuthorized.map((e) => (
              <div
                key={e.escrowId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-orange-100 bg-orange-50 p-4"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">{e.caregiverName}</p>
                  <p className="text-xs text-gray-400">
                    {t("escrow.authorizedAt", {
                      date: e.authorizedAt
                        ? new Date(e.authorizedAt).toLocaleDateString("fr-MA")
                        : "—",
                    })}
                  </p>
                </div>
                <span className="font-semibold text-orange-700 tabular-nums">
                  {centimesToMAD(e.familyPaysCentimes)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
