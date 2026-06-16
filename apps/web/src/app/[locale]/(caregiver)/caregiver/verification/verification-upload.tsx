"use client";

import type { DocumentType } from "@riaya/core";
import { ALLOWED_DOC_MIME, MAX_DOC_BYTES } from "@riaya/verification/files";
import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { uploadDocument } from "./actions";

const DOC_TYPES: DocumentType[] = [
  "cin",
  "police_clearance",
  "health_cert",
  "reference",
  "certificate",
];

const ACCEPT = Object.keys(ALLOWED_DOC_MIME).join(",");

export function VerificationUpload() {
  const t = useTranslations("verificationDash");
  const tdoc = useTranslations("documentTypes");
  const te = useTranslations("verificationErrors");
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | string>("idle");
  const [consent, setConsent] = useState(false);

  function onSubmit(formData: FormData) {
    setStatus("idle");
    startTransition(async () => {
      const res = await uploadDocument(formData);
      if (res.ok) {
        setStatus("saved");
        formRef.current?.reset();
        setConsent(false);
      } else {
        // Map the stable error code to a localized message (fallback to a generic).
        setStatus(te.has(res.error) ? te(res.error) : te("createFailed"));
      }
    });
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="mb-1 font-serif text-lg font-semibold text-gray-900">{t("uploadTitle")}</h2>
      <p className="mb-4 text-sm text-gray-500">{t("uploadHint")}</p>

      <form ref={formRef} action={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="doc-type" className="mb-1 block text-sm font-medium text-gray-700">
            {t("documentType")}
          </label>
          <select
            id="doc-type"
            name="type"
            required
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            {DOC_TYPES.map((dt) => (
              <option key={dt} value={dt}>
                {tdoc(dt)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="doc-file" className="mb-1 block text-sm font-medium text-gray-700">
            {t("file")}
          </label>
          <input
            id="doc-file"
            type="file"
            name="file"
            required
            accept={ACCEPT}
            className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--color-sage-50)] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[var(--color-sage-700)]"
          />
          <p className="mt-1 text-xs text-gray-400">
            {t("fileConstraints", { mb: Math.round(MAX_DOC_BYTES / (1024 * 1024)) })}
          </p>
        </div>

        <label className="flex items-start gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            name="consent"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5"
          />
          <span>{t("consent")}</span>
        </label>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending || !consent}
            className="rounded-lg bg-[var(--color-terracotta-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-terracotta-600)] disabled:opacity-50"
          >
            {isPending ? t("uploading") : t("upload")}
          </button>
          {status === "saved" && (
            <span className="text-sm text-[var(--color-sage-600)]">{t("uploaded")}</span>
          )}
          {status !== "idle" && status !== "saved" && (
            <span className="text-sm text-red-600">{status}</span>
          )}
        </div>
      </form>
    </section>
  );
}
