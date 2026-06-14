"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addChild, createFamilyProfile, removeChild, updateFamilyProfile } from "./actions";

type Child = { id: string; name: string; ageMonths: number; specialNeeds?: string | undefined };
type Initial = {
  address: string;
  neighborhood: string;
  city: string;
  children: Child[];
};

export function FamilyProfileForm({ initial }: { initial: Initial | null }) {
  const t = useTranslations("familyProfile");
  const tCommon = useTranslations("common");
  const tErr = useTranslations("actionErrors");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [city, setCity] = useState(initial?.city ?? "");
  const [neighborhood, setNeighborhood] = useState(initial?.neighborhood ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");

  function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const input = {
      city: city.trim(),
      neighborhood: neighborhood.trim() || undefined,
      address: address.trim() || undefined,
    };
    startTransition(async () => {
      const result = initial
        ? await updateFamilyProfile(input)
        : await createFamilyProfile({ ...input, children: [] });
      if (result.ok) {
        setSaved(true);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={saveProfile} className="space-y-4 rounded-2xl bg-white p-6 shadow-sm">
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

        <Field label={t("city")}>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[var(--color-terracotta-500)] focus:outline-none"
          />
        </Field>
        <Field label={t("neighborhood")}>
          <input
            value={neighborhood}
            onChange={(e) => setNeighborhood(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[var(--color-terracotta-500)] focus:outline-none"
          />
        </Field>
        <Field label={t("address")}>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[var(--color-terracotta-500)] focus:outline-none"
          />
        </Field>

        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-[var(--color-terracotta-500)] px-5 py-2.5 font-medium text-white transition-colors hover:bg-[var(--color-terracotta-600)] disabled:opacity-60"
        >
          {initial ? tCommon("save") : t("createCta")}
        </button>
      </form>

      {initial && <ChildrenSection childList={initial.children} />}
    </div>
  );
}

function ChildrenSection({ childList }: { childList: Child[] }) {
  const t = useTranslations("familyProfile");
  const tCommon = useTranslations("common");
  const tErr = useTranslations("actionErrors");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [ageMonths, setAgeMonths] = useState("");
  const [specialNeeds, setSpecialNeeds] = useState("");

  function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const input = {
      name: name.trim(),
      ageMonths: Number(ageMonths) || 0,
      specialNeeds: specialNeeds.trim() || undefined,
    };
    startTransition(async () => {
      const result = await addChild(input);
      if (result.ok) {
        setName("");
        setAgeMonths("");
        setSpecialNeeds("");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  function remove(childId: string) {
    startTransition(async () => {
      const result = await removeChild(childId);
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  }

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="mb-4 font-serif text-lg font-semibold text-gray-900">{t("children")}</h2>

      {error && (
        <p role="alert" className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {tErr(error)}
        </p>
      )}

      {childList.length === 0 ? (
        <p className="mb-4 text-sm text-gray-500">{t("noChildren")}</p>
      ) : (
        <ul className="mb-4 space-y-2">
          {childList.map((c) => (
            <li
              key={c.id}
              className="flex items-start justify-between rounded-lg bg-[var(--color-cream-50)] px-4 py-3"
            >
              <div>
                <p className="font-medium text-gray-900">
                  {c.name}{" "}
                  <span className="text-sm font-normal text-gray-500">
                    · {t("ageMonths", { months: c.ageMonths })}
                  </span>
                </p>
                {c.specialNeeds && (
                  <p className="mt-0.5 text-sm text-[var(--color-terracotta-700)]">
                    {c.specialNeeds}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => remove(c.id)}
                disabled={isPending}
                className="text-sm text-gray-400 hover:text-red-600 disabled:opacity-50"
              >
                {tCommon("remove")}
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} className="space-y-3 border-t border-gray-100 pt-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t("childName")}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[var(--color-terracotta-500)] focus:outline-none"
            />
          </Field>
          <Field label={t("childAgeMonths")}>
            <input
              type="number"
              min={0}
              max={216}
              value={ageMonths}
              onChange={(e) => setAgeMonths(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[var(--color-terracotta-500)] focus:outline-none"
            />
          </Field>
        </div>
        <Field label={t("specialNeeds")} hint={t("specialNeedsHint")}>
          <input
            value={specialNeeds}
            onChange={(e) => setSpecialNeeds(e.target.value)}
            maxLength={500}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[var(--color-terracotta-500)] focus:outline-none"
          />
        </Field>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg border border-[var(--color-sage-500)] px-4 py-2 text-sm font-medium text-[var(--color-sage-700)] transition-colors hover:bg-[var(--color-sage-50)] disabled:opacity-60"
        >
          {t("addChild")}
        </button>
      </form>
    </section>
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
