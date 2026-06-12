"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useActionState } from "react";
import { type AuthState, googleSignInAction, signInAction } from "../actions";

export default function LoginPage() {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState<AuthState, FormData>(signInAction, null);

  return (
    <main className="min-h-screen bg-[var(--color-surface)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-center font-serif text-3xl font-semibold text-[var(--color-terracotta-600)]">
          {t("signin")}
        </h1>

        {state?.error && (
          <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
            {t(`errors.${state.error}`)}
          </p>
        )}

        <form action={action} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
              {t("email")}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[var(--color-terracotta-500)] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
              {t("password")}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[var(--color-terracotta-500)] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-[var(--color-terracotta-500)] px-4 py-2.5 font-medium text-white transition-colors hover:bg-[var(--color-terracotta-600)] disabled:opacity-60"
          >
            {t("signin")}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs text-gray-400">
          <span className="h-px flex-1 bg-gray-200" />
          <span>·</span>
          <span className="h-px flex-1 bg-gray-200" />
        </div>

        <form action={googleSignInAction}>
          <button
            type="submit"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            {t("continueWithGoogle")}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          {t("noAccount")}{" "}
          <Link
            href="/auth/signup"
            className="font-medium text-[var(--color-terracotta-600)] hover:underline"
          >
            {t("signup")}
          </Link>
        </p>
      </div>
    </main>
  );
}
