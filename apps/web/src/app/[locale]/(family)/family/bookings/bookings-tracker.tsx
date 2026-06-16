"use client";

import { BookingStatusBadge } from "@/components/booking-status-badge";
import { formatMoney, money } from "@riaya/core";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { type FamilyBooking, cancelBooking, familyConfirmEnd, startSession } from "./actions";

export function BookingsTracker({ bookings }: { bookings: FamilyBooking[] }) {
  const t = useTranslations("booking");
  const tc = useTranslations("careTypes");

  if (bookings.length === 0) {
    return (
      <p className="rounded-2xl bg-white p-8 text-center text-gray-500 shadow-sm">
        {t("noneFamily")}
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {bookings.map((b) => (
        <Row key={b.id} booking={b} tc={tc} />
      ))}
    </ul>
  );
}

function Row({
  booking,
  tc,
}: {
  booking: FamilyBooking;
  tc: ReturnType<typeof useTranslations>;
}) {
  const t = useTranslations("booking");
  const tErr = useTranslations("bookingErrors");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const start = new Date(booking.startTime);
  const end = new Date(booking.endTime);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if (r.ok) router.refresh();
      else setError(r.error ?? "createFailed");
    });
  }

  return (
    <li className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-gray-900">{booking.caregiverName}</p>
          <p className="text-sm text-gray-500">
            {tc(booking.careType)} · {t("childrenN", { count: booking.childrenCount })}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            {start.toLocaleDateString()} ·{" "}
            {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}–
            {end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
          {booking.urgent && (
            <span className="mt-1 inline-block rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
              {t("urgentTag")}
            </span>
          )}
        </div>
        <BookingStatusBadge status={booking.status} />
      </div>

      {booking.escrow && <PaymentSummary escrow={booking.escrow} t={t} />}

      {error && (
        <p role="alert" className="mt-2 rounded-lg bg-red-50 px-3 py-1.5 text-sm text-red-700">
          {tErr(error)}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {booking.status === "confirmed" && (
          <Btn onClick={() => run(() => startSession(booking.id))} disabled={isPending} primary>
            {t("startSession")}
          </Btn>
        )}
        {booking.status === "in_progress" && (
          <Btn onClick={() => run(() => familyConfirmEnd(booking.id))} disabled={isPending} primary>
            {booking.familyEndedAt ? t("waitingCaregiverEnd") : t("confirmEnd")}
          </Btn>
        )}
        {(booking.status === "requested" || booking.status === "confirmed") && (
          <Btn
            onClick={() => run(() => cancelBooking(booking.id, "cancelled_by_family"))}
            disabled={isPending}
          >
            {t("cancel")}
          </Btn>
        )}
      </div>
    </li>
  );
}

function PaymentSummary({
  escrow,
  t,
}: {
  escrow: NonNullable<FamilyBooking["escrow"]>;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="mt-3 rounded-xl bg-[var(--color-cream-100,#faf6f0)] px-3 py-2 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-gray-600">{t("youPay")}</span>
        <span className="font-semibold text-gray-900">{formatMoney(money(escrow.familyPays))}</span>
      </div>
      {escrow.employerSubsidy > 0 && (
        <div className="mt-0.5 flex items-center justify-between text-[var(--color-sage-700,#4b7058)]">
          <span>{t("employerCovers")}</span>
          <span>−{formatMoney(money(escrow.employerSubsidy))}</span>
        </div>
      )}
      {escrow.cancellationFee > 0 && (
        <div className="mt-0.5 flex items-center justify-between text-red-600">
          <span>{t("cancellationFeeCharged")}</span>
          <span>{formatMoney(money(escrow.cancellationFee))}</span>
        </div>
      )}
      <p className="mt-1 text-xs text-gray-400">{t(`escrowStatus.${escrow.status}`)}</p>
    </div>
  );
}

function Btn({
  children,
  onClick,
  disabled,
  primary,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        primary
          ? "rounded-lg bg-[var(--color-terracotta-500)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-terracotta-600)] disabled:opacity-60"
          : "rounded-lg border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60"
      }
    >
      {children}
    </button>
  );
}
