"use client";

import type { ActionResult } from "@/lib/action-result";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/**
 * Mutual review prompt (Module G). Shown after a booking is completed, once per
 * party. Submitting both parties' reviews releases the escrow early (the rest is
 * handled server-side). The submit `action` is injected so the same UI serves
 * both the family and the caregiver side.
 */
export function ReviewForm({
  bookingId,
  action,
}: {
  bookingId: string;
  action: (bookingId: string, input: unknown) => Promise<ActionResult<unknown>>;
}) {
  const t = useTranslations("reviews");
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function submit() {
    if (rating < 1) {
      setError("ratingRequired");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await action(bookingId, { rating, comment: comment || undefined });
      if (res.ok) {
        setDone(true);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  if (done) {
    return (
      <p className="mt-3 rounded-xl bg-[var(--color-sage-50)] px-3 py-2 text-sm text-[var(--color-sage-700)]">
        {t("thanks")}
      </p>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-gray-100 bg-[var(--color-cream-50,#fdfbf7)] p-3">
      <p className="mb-2 text-sm font-medium text-gray-700">{t("prompt")}</p>
      <div className="mb-2 flex gap-1" aria-label={t("rating")}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            aria-pressed={rating === star}
            aria-label={t("stars", { count: star })}
            onClick={() => setRating(star)}
            className={`text-2xl leading-none ${
              star <= rating ? "text-[var(--color-terracotta-500)]" : "text-gray-300"
            }`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={t("commentPlaceholder")}
        maxLength={1000}
        rows={2}
        className="mb-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
      />
      {error && (
        <p role="alert" className="mb-2 text-sm text-red-600">
          {t.has(`errors.${error}`) ? t(`errors.${error}`) : t("errors.createFailed")}
        </p>
      )}
      <button
        type="button"
        onClick={submit}
        disabled={isPending}
        className="rounded-lg bg-[var(--color-terracotta-500)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-terracotta-600)] disabled:opacity-60"
      >
        {isPending ? t("submitting") : t("submit")}
      </button>
    </div>
  );
}
