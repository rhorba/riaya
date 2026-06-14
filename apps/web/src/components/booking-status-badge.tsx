"use client";

import type { BookingStatus } from "@riaya/booking";
import { useTranslations } from "next-intl";

const STYLES: Record<BookingStatus, string> = {
  requested: "bg-[var(--color-cream-100)] text-[var(--color-terracotta-700)]",
  confirmed: "bg-[var(--color-sage-50)] text-[var(--color-sage-700)]",
  in_progress: "bg-[var(--color-sage-100)] text-[var(--color-sage-800)]",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-gray-100 text-gray-400",
  disputed: "bg-red-50 text-red-700",
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const t = useTranslations("bookingStatus");
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[status]}`}>
      {t(status)}
    </span>
  );
}
