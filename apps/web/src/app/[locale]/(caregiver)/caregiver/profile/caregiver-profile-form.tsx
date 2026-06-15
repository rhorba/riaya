"use client";

import type { CareType } from "@riaya/core";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createCaregiverProfile, updateCaregiverProfile } from "./actions";

const CARE_TYPES: CareType[] = ["daya", "nanny", "after_school", "nursery_assistant", "babysitter"];

type Initial = {
  bio: string;
  careTypes: CareType[];
  cities: string[];
  languages: string[];
  hourlyRate: number | null;
  dailyRate: number | null;
  monthlyRate: number | null;
  minAgeMonths: number | null;
  maxAgeYears: number | null;
  maxChildren: number;
  hasOwnSpace: boolean;
  cancellationFreeHours: number;
  cancellationFeePercent: number;
};

// Centimes ↔ dirhams for display (rates are stored as integer centimes).
const toDirhams = (c: number | null) => (c == null ? "" : String(c / 100));
const toCentimes = (d: string) => {
  const n = Number(d);
  return d.trim() === "" || Number.isNaN(n) ? undefined : Math.round(n * 100);
};
const toList = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

export function CaregiverProfileForm({ initial }: { initial: Initial | null }) {
  const t = useTranslations("caregiverProfile");
  const tc = useTranslations("careTypes");
  const tCommon = useTranslations("common");
  const tErr = useTranslations("actionErrors");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [bio, setBio] = useState(initial?.bio ?? "");
  const [careTypes, setCareTypes] = useState<CareType[]>(initial?.careTypes ?? []);
  const [cities, setCities] = useState((initial?.cities ?? []).join(", "));
  const [languages, setLanguages] = useState((initial?.languages ?? []).join(", "));
  const [hourlyRate, setHourlyRate] = useState(toDirhams(initial?.hourlyRate ?? null));
  const [dailyRate, setDailyRate] = useState(toDirhams(initial?.dailyRate ?? null));
  const [monthlyRate, setMonthlyRate] = useState(toDirhams(initial?.monthlyRate ?? null));
  const [minAgeMonths, setMinAgeMonths] = useState(
    initial?.minAgeMonths != null ? String(initial.minAgeMonths) : ""
  );
  const [maxAgeYears, setMaxAgeYears] = useState(
    initial?.maxAgeYears != null ? String(initial.maxAgeYears) : ""
  );
  const [maxChildren, setMaxChildren] = useState(String(initial?.maxChildren ?? 1));
  const [hasOwnSpace, setHasOwnSpace] = useState(initial?.hasOwnSpace ?? false);
  const [cancellationFreeHours, setCancellationFreeHours] = useState(
    String(initial?.cancellationFreeHours ?? 24)
  );
  const [cancellationFeePercent, setCancellationFeePercent] = useState(
    String(initial?.cancellationFeePercent ?? 50)
  );

  function toggleCareType(ct: CareType) {
    setCareTypes((prev) => (prev.includes(ct) ? prev.filter((x) => x !== ct) : [...prev, ct]));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const input = {
      bio: bio.trim() || undefined,
      careTypes,
      cities: toList(cities),
      languages: toList(languages),
      hourlyRate: toCentimes(hourlyRate),
      dailyRate: toCentimes(dailyRate),
      monthlyRate: toCentimes(monthlyRate),
      minAgeMonths: minAgeMonths.trim() ? Number(minAgeMonths) : undefined,
      maxAgeYears: maxAgeYears.trim() ? Number(maxAgeYears) : undefined,
      maxChildren: Number(maxChildren) || 1,
      hasOwnSpace,
      cancellationFreeHours: Number(cancellationFreeHours) || 0,
      cancellationFeePercent: Number(cancellationFeePercent) || 0,
    };

    startTransition(async () => {
      const result = initial
        ? await updateCaregiverProfile(input)
        : await createCaregiverProfile(input);
      if (result.ok) {
        setSaved(true);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 rounded-2xl bg-white p-6 shadow-sm">
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {tErr(error)}
        </p>
      )}
      {saved && (
        <p className="rounded-lg bg-[var(--color-sage-50)] px-4 py-2 text-sm text-[var(--color-sage-700)]">
          {t("saved")}
        </p>
      )}

      <Field label={t("bio")}>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          maxLength={1000}
          placeholder={t("bioPlaceholder")}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[var(--color-terracotta-500)] focus:outline-none"
        />
      </Field>

      <fieldset>
        <legend className="mb-2 block text-sm font-medium text-gray-700">{t("careTypes")}</legend>
        <div className="flex flex-wrap gap-2">
          {CARE_TYPES.map((ct) => (
            <label
              key={ct}
              className="flex cursor-pointer items-center rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 has-[:checked]:border-[var(--color-sage-500)] has-[:checked]:bg-[var(--color-sage-50)] has-[:checked]:text-[var(--color-sage-700)]"
            >
              <input
                type="checkbox"
                checked={careTypes.includes(ct)}
                onChange={() => toggleCareType(ct)}
                className="sr-only"
              />
              {tc(ct)}
            </label>
          ))}
        </div>
      </fieldset>

      <Field label={t("cities")} hint={t("citiesHint")}>
        <input
          value={cities}
          onChange={(e) => setCities(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[var(--color-terracotta-500)] focus:outline-none"
        />
      </Field>

      <Field label={t("languages")} hint={t("languagesHint")}>
        <input
          value={languages}
          onChange={(e) => setLanguages(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[var(--color-terracotta-500)] focus:outline-none"
        />
      </Field>

      <fieldset>
        <legend className="mb-2 block text-sm font-medium text-gray-700">{t("rates")}</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <NumberField label={t("hourlyRate")} value={hourlyRate} onChange={setHourlyRate} />
          <NumberField label={t("dailyRate")} value={dailyRate} onChange={setDailyRate} />
          <NumberField label={t("monthlyRate")} value={monthlyRate} onChange={setMonthlyRate} />
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 block text-sm font-medium text-gray-700">{t("ageRange")}</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <NumberField label={t("minAgeMonths")} value={minAgeMonths} onChange={setMinAgeMonths} />
          <NumberField label={t("maxAgeYears")} value={maxAgeYears} onChange={setMaxAgeYears} />
          <NumberField label={t("maxChildren")} value={maxChildren} onChange={setMaxChildren} />
        </div>
      </fieldset>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={hasOwnSpace}
          onChange={(e) => setHasOwnSpace(e.target.checked)}
          className="h-4 w-4 accent-[var(--color-sage-500)]"
        />
        {t("hasOwnSpace")}
      </label>

      <fieldset>
        <legend className="mb-2 block text-sm font-medium text-gray-700">
          {t("cancellationPolicy")}
        </legend>
        <p className="mb-2 text-xs text-gray-400">{t("cancellationHint")}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <NumberField
            label={t("cancellationFreeHours")}
            value={cancellationFreeHours}
            onChange={setCancellationFreeHours}
          />
          <NumberField
            label={t("cancellationFeePercent")}
            value={cancellationFeePercent}
            onChange={setCancellationFeePercent}
          />
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-[var(--color-terracotta-500)] px-5 py-2.5 font-medium text-white transition-colors hover:bg-[var(--color-terracotta-600)] disabled:opacity-60"
      >
        {isPending ? tCommon("saving") : tCommon("save")}
      </button>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the control is supplied via {children}
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-gray-400">{hint}</span>}
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-xs text-gray-500">
      {label}
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-[var(--color-terracotta-500)] focus:outline-none"
      />
    </label>
  );
}
