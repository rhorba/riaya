"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { adminGetDocumentUrl, adminReviewDocument } from "../actions";
import type { VerificationQueueItem } from "../actions";

export function VerificationQueueClient({ queue }: { queue: VerificationQueueItem[] }) {
  const t = useTranslations("admin");
  const tDocTypes = useTranslations("documentTypes");
  const tDocStatus = useTranslations("documentStatus");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [viewingUrl, setViewingUrl] = useState<{ docId: string; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleNote(docId: string, value: string) {
    setNotes((prev) => ({ ...prev, [docId]: value }));
  }

  async function handleView(docId: string) {
    setError(null);
    const result = await adminGetDocumentUrl(docId);
    if (!result.ok) {
      setError(t("verifications.viewError"));
      return;
    }
    setViewingUrl({ docId, url: result.data.url });
  }

  function handleReview(docId: string, decision: "approved" | "rejected") {
    setError(null);
    startTransition(async () => {
      const result = await adminReviewDocument(docId, decision, notes[docId]);
      if (!result.ok) {
        setError(t("verifications.reviewError"));
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {error && <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

      {/* Document viewer modal */}
      {viewingUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="flex w-full max-w-3xl flex-col gap-3 rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-gray-800">{t("verifications.viewing")}</p>
              <button
                type="button"
                onClick={() => setViewingUrl(null)}
                aria-label={t("verifications.close")}
                className="text-sm text-gray-500 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-1 rounded"
              >
                {t("verifications.close")}
              </button>
            </div>
            <iframe
              src={viewingUrl.url}
              className="h-[60vh] w-full rounded-lg border border-gray-200"
              title="Document preview"
            />
            <p className="text-xs text-gray-400">{t("verifications.signedUrlNote")}</p>
          </div>
        </div>
      )}

      {queue.map((doc) => (
        <div key={doc.id} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-gray-900">{doc.caregiverName}</p>
              <p className="mt-0.5 text-sm text-gray-500">
                {tDocTypes(doc.type as Parameters<typeof tDocTypes>[0])} ·{" "}
                {new Date(doc.uploadedAt).toLocaleDateString("fr-MA")}
              </p>
            </div>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              {tDocStatus("pending")}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <button
              type="button"
              onClick={() => handleView(doc.id)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-1 disabled:opacity-50"
              disabled={isPending}
            >
              {t("verifications.view")}
            </button>

            <div className="flex flex-1 flex-col gap-1 sm:flex-row sm:items-center">
              <input
                type="text"
                placeholder={t("verifications.notePlaceholder")}
                value={notes[doc.id] ?? ""}
                onChange={(e) => handleNote(doc.id, e.target.value)}
                className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-[var(--color-sage-400)] focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleReview(doc.id, "approved")}
                  disabled={isPending}
                  aria-busy={isPending}
                  className="rounded-lg bg-[var(--color-sage-500)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-sage-600)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-sage-500)] focus-visible:ring-offset-2 disabled:opacity-50"
                >
                  {t("verifications.approve")}
                </button>
                <button
                  type="button"
                  onClick={() => handleReview(doc.id, "rejected")}
                  disabled={isPending}
                  aria-busy={isPending}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 disabled:opacity-50"
                >
                  {t("verifications.reject")}
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
