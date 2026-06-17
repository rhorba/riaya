import { getTranslations } from "next-intl/server";
import { getVerificationQueue } from "../actions";
import { VerificationQueueClient } from "./verification-queue-client";

export default async function AdminVerificationsPage() {
  const [queue, t] = await Promise.all([getVerificationQueue(), getTranslations("admin")]);

  return (
    <div className="space-y-4">
      <h2 className="font-serif text-xl font-semibold text-gray-800">{t("verifications.title")}</h2>
      <p className="text-sm text-gray-500">{t("verifications.subtitle")}</p>

      {queue.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-400">
          {t("verifications.empty")}
        </div>
      ) : (
        <VerificationQueueClient queue={queue} />
      )}
    </div>
  );
}
