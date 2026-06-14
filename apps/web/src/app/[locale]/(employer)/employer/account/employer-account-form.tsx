"use client";

import { formatMoney, money } from "@riaya/core";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createEmployerAccount,
  enrollEmployee,
  setBenefitBudget,
  setEmployeeActive,
} from "./actions";

type Employee = {
  id: string;
  employeeName: string;
  employeeEmail: string;
  monthlyBenefit: number;
  active: boolean;
};
type Initial = {
  companyName: string;
  ice: string;
  sector: string;
  benefitBudgetPerEmployee: number;
  totalBudgetUsed: number;
  employees: Employee[];
};

const toCentimes = (d: string) => {
  const n = Number(d);
  return Number.isNaN(n) ? 0 : Math.round(n * 100);
};

export function EmployerAccountForm({ initial }: { initial: Initial | null }) {
  if (!initial) return <CreateForm />;
  return <ManageView initial={initial} />;
}

function CreateForm() {
  const t = useTranslations("employerAccount");
  const tErr = useTranslations("actionErrors");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [ice, setIce] = useState("");
  const [sector, setSector] = useState("");
  const [budget, setBudget] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const input = {
      companyName: companyName.trim(),
      ice: ice.trim() || undefined,
      sector: sector.trim() || undefined,
      benefitBudgetPerEmployee: toCentimes(budget),
    };
    startTransition(async () => {
      const result = await createEmployerAccount(input);
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white p-6 shadow-sm">
      <p className="text-sm text-gray-500">{t("empty")}</p>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {tErr(error)}
        </p>
      )}
      <Field label={t("companyName")}>
        <input
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[var(--color-terracotta-500)] focus:outline-none"
        />
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={t("ice")}>
          <input
            value={ice}
            onChange={(e) => setIce(e.target.value)}
            pattern="\d{15}"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[var(--color-terracotta-500)] focus:outline-none"
          />
        </Field>
        <Field label={t("sector")}>
          <input
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[var(--color-terracotta-500)] focus:outline-none"
          />
        </Field>
      </div>
      <Field label={t("benefitBudget")}>
        <input
          type="number"
          min={0}
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[var(--color-terracotta-500)] focus:outline-none"
        />
      </Field>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-[var(--color-terracotta-500)] px-5 py-2.5 font-medium text-white transition-colors hover:bg-[var(--color-terracotta-600)] disabled:opacity-60"
      >
        {t("createCta")}
      </button>
    </form>
  );
}

function ManageView({ initial }: { initial: Initial }) {
  const t = useTranslations("employerAccount");
  const tCommon = useTranslations("common");
  const tErr = useTranslations("actionErrors");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [budget, setBudget] = useState(String(initial.benefitBudgetPerEmployee / 100));

  // Enrollment fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [benefit, setBenefit] = useState("");

  function saveBudget(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await setBenefitBudget(toCentimes(budget));
      if (result.ok) {
        setSaved(true);
        router.refresh();
      } else setError(result.error);
    });
  }

  function enroll(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const input = {
      employeeName: name.trim(),
      employeeEmail: email.trim(),
      monthlyBenefit: toCentimes(benefit),
    };
    startTransition(async () => {
      const result = await enrollEmployee(input);
      if (result.ok) {
        setName("");
        setEmail("");
        setBenefit("");
        router.refresh();
      } else setError(result.error);
    });
  }

  function toggleActive(id: string, active: boolean) {
    startTransition(async () => {
      const result = await setEmployeeActive(id, active);
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4">
          <p className="font-serif text-lg font-semibold text-gray-900">{initial.companyName}</p>
          <p className="text-sm text-gray-500">
            {initial.sector}
            {initial.ice && ` · ICE ${initial.ice}`}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {t("budgetUsed")}: {formatMoney(money(initial.totalBudgetUsed))}
          </p>
        </div>

        {error && (
          <p role="alert" className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
            {tErr(error)}
          </p>
        )}
        {saved && (
          <p className="mb-3 rounded-lg bg-[var(--color-sage-50)] px-4 py-2 text-sm text-[var(--color-sage-700)]">
            {t("saved")}
          </p>
        )}

        <form onSubmit={saveBudget} className="flex items-end gap-3">
          <Field label={t("benefitBudget")}>
            <input
              type="number"
              min={0}
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[var(--color-terracotta-500)] focus:outline-none"
            />
          </Field>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-[var(--color-terracotta-500)] px-5 py-2.5 font-medium text-white transition-colors hover:bg-[var(--color-terracotta-600)] disabled:opacity-60"
          >
            {tCommon("save")}
          </button>
        </form>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-serif text-lg font-semibold text-gray-900">{t("employees")}</h2>

        {initial.employees.length === 0 ? (
          <p className="mb-4 text-sm text-gray-500">{t("noEmployees")}</p>
        ) : (
          <ul className="mb-4 space-y-2">
            {initial.employees.map((emp) => (
              <li
                key={emp.id}
                className="flex items-center justify-between rounded-lg bg-[var(--color-cream-50)] px-4 py-3"
              >
                <div>
                  <p className="font-medium text-gray-900">{emp.employeeName}</p>
                  <p className="text-sm text-gray-500">
                    {emp.employeeEmail} · {formatMoney(money(emp.monthlyBenefit))}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-medium ${
                      emp.active ? "text-[var(--color-sage-600)]" : "text-gray-400"
                    }`}
                  >
                    {emp.active ? t("active") : t("inactive")}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleActive(emp.id, !emp.active)}
                    disabled={isPending}
                    className="text-sm text-gray-500 hover:text-[var(--color-terracotta-600)] disabled:opacity-50"
                  >
                    {emp.active ? t("deactivate") : t("activate")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={enroll} className="space-y-3 border-t border-gray-100 pt-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label={t("employeeName")}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[var(--color-terracotta-500)] focus:outline-none"
              />
            </Field>
            <Field label={t("employeeEmail")}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[var(--color-terracotta-500)] focus:outline-none"
              />
            </Field>
            <Field label={t("monthlyBenefit")}>
              <input
                type="number"
                min={0}
                value={benefit}
                onChange={(e) => setBenefit(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[var(--color-terracotta-500)] focus:outline-none"
              />
            </Field>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg border border-[var(--color-sage-500)] px-4 py-2 text-sm font-medium text-[var(--color-sage-700)] transition-colors hover:bg-[var(--color-sage-50)] disabled:opacity-60"
          >
            {t("enroll")}
          </button>
        </form>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the control is supplied via {children}
    <label className="block flex-1">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}
