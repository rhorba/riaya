"use client";

import { BookingStatusBadge } from "@/components/booking-status-badge";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  type CaregiverBooking,
  acceptBooking,
  caregiverConfirmEnd,
  declineBooking,
} from "./actions";

export function BookingsInbox({ bookings }: { bookings: CaregiverBooking[] }) {
  const t = useTranslations("booking");

  if (bookings.length === 0) {
    return (
      <p className="rounded-2xl bg-white p-8 text-center text-gray-500 shadow-sm">
        {t("noneCaregiver")}
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {bookings.map((b) => (
        <Row key={b.id} booking={b} />
      ))}
    </ul>
  );
}

function Row({ booking }: { booking: CaregiverBooking }) {
  const t = useTranslations("booking");
  const tc = useTranslations("careTypes");
  const tErr = useTranslations("bookingErrors");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");

  const start = new Date(booking.startTime);
  const end = new Date(booking.endTime);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if (r.ok) {
        setDeclining(false);
        router.refresh();
      } else {
        setError(r.error ?? "createFailed");
      }
    });
  }

  return (
    <li className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-gray-900">
            {tc(booking.careType)} · {t("childrenN", { count: booking.childrenCount })}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            {start.toLocaleDateString()} ·{" "}
            {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}–
            {end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
          {booking.locationNote && (
            <p className="mt-1 text-sm text-gray-500">{booking.locationNote}</p>
          )}
          {booking.familyNotes && (
            <p className="mt-1 rounded bg-[var(--color-cream-50)] px-2 py-1 text-sm text-gray-600">
              {booking.familyNotes}
            </p>
          )}
          {booking.urgent && (
            <span className="mt-1 inline-block rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
              {t("urgentTag")}
            </span>
          )}
        </div>
        <BookingStatusBadge status={booking.status} />
      </div>

      {error && (
        <p role="alert" className="mt-2 rounded-lg bg-red-50 px-3 py-1.5 text-sm text-red-700">
          {tErr(error)}
        </p>
      )}

      {booking.status === "requested" && !declining && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => run(() => acceptBooking(booking.id))}
            disabled={isPending}
            className="rounded-lg bg-[var(--color-sage-500)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-sage-600)] disabled:opacity-60"
          >
            {t("accept")}
          </button>
          <button
            type="button"
            onClick={() => setDeclining(true)}
            disabled={isPending}
            className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60"
          >
            {t("decline")}
          </button>
        </div>
      )}

      {booking.status === "requested" && declining && (
        <div className="mt-3 space-y-2">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("declineReason")}
            maxLength={500}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-terracotta-500)] focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                run(() => declineBooking(booking.id, { cancelReason: reason.trim() || "declined" }))
              }
              disabled={isPending}
              className="rounded-lg bg-gray-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
            >
              {t("confirmDecline")}
            </button>
            <button
              type="button"
              onClick={() => setDeclining(false)}
              className="rounded-lg px-3 py-1.5 text-sm text-gray-500"
            >
              {t("cancel")}
            </button>
          </div>
        </div>
      )}

      {booking.status === "in_progress" && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => run(() => caregiverConfirmEnd(booking.id))}
            disabled={isPending}
            className="rounded-lg bg-[var(--color-terracotta-500)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-terracotta-600)] disabled:opacity-60"
          >
            {booking.caregiverEndedAt ? t("waitingFamilyEnd") : t("confirmEnd")}
          </button>
        </div>
      )}
    </li>
  );
}
