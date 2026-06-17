"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { resolveDispute } from "../actions";
import type { DisputeQueueItem } from "../actions";

function centimesToMAD(centimes: number) {
  return (centimes / 100).toLocaleString("fr-MA", {
    style: "currency",
    currency: "MAD",
    maximumFractionDigits: 0,
  });
}

export function DisputeQueueClient({ queue }: { queue: DisputeQueueItem[] }) {
  const t = useTranslations("admin");
  const tCareTypes = useTranslations("careTypes");
  const tEscrowStatus = (s: string) => t(`escrow.statuses.${s}` as Parameters<typeof t>[0]);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [resolving, setResolving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleResolve(bookingId: string, resolution: "release" | "refund") {
    setError(null);
    setResolving(bookingId);
    startTransition(async () => {
      const result = await resolveDispute(bookingId, resolution);
      setResolving(null);
      if (!result.ok) {
        setError(t("disputes.resolveError"));
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {error && <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

      {queue.map((item) => (
        <div
          key={item.bookingId}
          className="rounded-xl border border-orange-100 bg-white p-5 shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-gray-900">{item.caregiverName}</p>
              <p className="mt-0.5 text-sm text-gray-500">
                {tCareTypes(item.careType as Parameters<typeof tCareTypes>[0])} ·{" "}
                {new Date(item.startTime).toLocaleDateString("fr-MA")}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                {t("disputes.bookingId", { id: item.bookingId.slice(0, 8) })}
              </p>
            </div>
            <div className="text-end">
              <p className="font-semibold text-gray-900">
                {centimesToMAD(item.grossAmountCentimes)}
              </p>
              <p className="text-xs text-gray-400">
                {t("disputes.caregiverPayout", {
                  amount: centimesToMAD(item.caregiverPayoutCentimes),
                })}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
              <span className="font-medium">{t("disputes.escrow")}: </span>
              {tEscrowStatus(item.escrowStatus)}
              {item.capturedAt && (
                <span className="ms-1 text-gray-400">
                  · {new Date(item.capturedAt).toLocaleDateString("fr-MA")}
                </span>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => handleResolve(item.bookingId, "release")}
              disabled={isPending || resolving === item.bookingId}
              aria-busy={resolving === item.bookingId}
              className="rounded-lg bg-[var(--color-sage-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-sage-600)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-sage-500)] focus-visible:ring-offset-2 disabled:opacity-50"
            >
              {resolving === item.bookingId ? "…" : t("disputes.releaseToCare")}
            </button>
            <button
              type="button"
              onClick={() => handleResolve(item.bookingId, "refund")}
              disabled={isPending || resolving === item.bookingId}
              aria-busy={resolving === item.bookingId}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 disabled:opacity-50"
            >
              {resolving === item.bookingId ? "…" : t("disputes.refundFamily")}
            </button>
          </div>

          <p className="mt-3 text-xs text-gray-400">{t("disputes.irreversible")}</p>
        </div>
      ))}
    </div>
  );
}
