"use client";

import { computeBookingAmount, durationMinutes } from "@riaya/booking/pricing";
import { type CareType, formatMoney, money } from "@riaya/core";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { requestBooking } from "../../bookings/actions";

type Props = {
  caregiverId: string;
  careTypes: CareType[];
  maxChildren: number;
  hourlyRate: number | null;
  dailyRate: number | null;
};

export function BookingRequestForm({
  caregiverId,
  careTypes,
  maxChildren,
  hourlyRate,
  dailyRate,
}: Props) {
  const t = useTranslations("booking");
  const tc = useTranslations("careTypes");
  const tErr = useTranslations("bookingErrors");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [careType, setCareType] = useState<CareType>(careTypes[0] ?? "babysitter");
  const [date, setDate] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("13:00");
  const [childrenCount, setChildrenCount] = useState("1");
  const [locationNote, setLocationNote] = useState("");
  const [familyNotes, setFamilyNotes] = useState("");
  const [urgent, setUrgent] = useState(false);

  const estimate = useMemo(() => {
    if (!date) return null;
    const s = new Date(`${date}T${start}`);
    const e = new Date(`${date}T${end}`);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e <= s) return null;
    const mins = durationMinutes(s, e);
    return { mins, amount: computeBookingAmount({ hourlyRate, dailyRate }, mins) };
  }, [date, start, end, hourlyRate, dailyRate]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const startTime = new Date(`${date}T${start}`);
    const endTime = new Date(`${date}T${end}`);
    if (Number.isNaN(startTime.getTime()) || endTime <= startTime) {
      setError("invalidInput");
      return;
    }
    startTransition(async () => {
      const result = await requestBooking({
        caregiverId,
        careType,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        childrenCount: Number(childrenCount) || 1,
        locationNote: locationNote.trim() || undefined,
        familyNotes: familyNotes.trim() || undefined,
        urgent,
      });
      if (result.ok) router.push("/family/bookings");
      else setError(result.error);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white p-6 shadow-sm">
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {tErr(error)}
        </p>
      )}

      <Field label={t("careType")}>
        <select
          value={careType}
          onChange={(e) => setCareType(e.target.value as CareType)}
          className={INPUT}
        >
          {careTypes.map((ct) => (
            <option key={ct} value={ct}>
              {tc(ct)}
            </option>
          ))}
        </select>
      </Field>

      <Field label={t("date")}>
        <input
          type="date"
          required
          value={date}
          min={new Date().toISOString().slice(0, 10)}
          onChange={(e) => setDate(e.target.value)}
          className={INPUT}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t("startTime")}>
          <input
            type="time"
            required
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className={INPUT}
          />
        </Field>
        <Field label={t("endTime")}>
          <input
            type="time"
            required
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className={INPUT}
          />
        </Field>
      </div>

      <Field label={t("childrenCount")}>
        <input
          type="number"
          min={1}
          max={maxChildren}
          required
          value={childrenCount}
          onChange={(e) => setChildrenCount(e.target.value)}
          className={INPUT}
        />
        <span className="mt-1 block text-xs text-gray-400">
          {t("maxChildren", { max: maxChildren })}
        </span>
      </Field>

      <Field label={t("locationNote")}>
        <input
          value={locationNote}
          onChange={(e) => setLocationNote(e.target.value)}
          maxLength={300}
          className={INPUT}
        />
      </Field>

      <Field label={t("familyNotes")}>
        <textarea
          value={familyNotes}
          onChange={(e) => setFamilyNotes(e.target.value)}
          maxLength={1000}
          rows={3}
          className={INPUT}
        />
      </Field>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />
        {t("urgent")}
      </label>

      {estimate && (
        <p className="rounded-lg bg-[var(--color-cream-50)] px-4 py-2 text-sm text-gray-700">
          {t("estimate", {
            duration: (estimate.mins / 60).toFixed(1),
            amount: formatMoney(money(estimate.amount)),
          })}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-[var(--color-terracotta-500)] px-5 py-2.5 font-medium text-white transition-colors hover:bg-[var(--color-terracotta-600)] disabled:opacity-60"
      >
        {t("requestCta")}
      </button>
    </form>
  );
}

const INPUT =
  "w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[var(--color-terracotta-500)] focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: control supplied via {children}
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}
