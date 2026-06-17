import { getTranslations } from "next-intl/server";
import { getDisputeQueue } from "../actions";
import { DisputeQueueClient } from "./dispute-queue-client";

export default async function AdminDisputesPage() {
  const [queue, t] = await Promise.all([getDisputeQueue(), getTranslations("admin")]);

  return (
    <div className="space-y-4">
      <h2 className="font-serif text-xl font-semibold text-gray-800">{t("disputes.title")}</h2>
      <p className="text-sm text-gray-500">{t("disputes.subtitle")}</p>

      {queue.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-400">
          {t("disputes.empty")}
        </div>
      ) : (
        <DisputeQueueClient queue={queue} />
      )}
    </div>
  );
}
