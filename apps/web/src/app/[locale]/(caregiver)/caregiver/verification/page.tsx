import { VerificationBadge } from "@/components/verification-badge";
import { getSessionUser } from "@/lib/session";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getMyVerification } from "./actions";
import { VerificationUpload } from "./verification-upload";

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-[var(--color-cream-100)] text-[var(--color-terracotta-700)]",
  approved: "bg-[var(--color-sage-100)] text-[var(--color-sage-700)]",
  rejected: "bg-red-50 text-red-700",
  expired: "bg-gray-100 text-gray-600",
};

export default async function CaregiverVerificationPage() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login");

  const t = await getTranslations("verificationDash");
  const tvd = await getTranslations("verificationDesc");
  const tdoc = await getTranslations("documentTypes");
  const tstatus = await getTranslations("documentStatus");

  const { level, hasProfile, documents } = await getMyVerification();

  if (!hasProfile) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-4 font-serif text-2xl font-semibold text-gray-900">{t("title")}</h1>
        <p className="rounded-2xl bg-white p-8 text-center text-gray-500 shadow-sm">
          {t("noProfile")}{" "}
          <Link href="/caregiver/profile" className="text-[var(--color-terracotta-600)] underline">
            {t("createProfile")}
          </Link>
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-2 font-serif text-2xl font-semibold text-gray-900">{t("title")}</h1>
      <p className="mb-6 text-sm text-gray-500">{t("subtitle")}</p>

      <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">{t("currentLevel")}</span>
          <VerificationBadge level={level} />
        </div>
        <p className="text-sm text-gray-500">{tvd(level)}</p>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 font-serif text-lg font-semibold text-gray-900">{t("myDocuments")}</h2>
        {documents.length === 0 ? (
          <p className="rounded-2xl bg-white p-6 text-center text-gray-500 shadow-sm">
            {t("noDocuments")}
          </p>
        ) : (
          <ul className="space-y-2">
            {documents.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm"
              >
                <div>
                  <p className="font-medium text-gray-900">{tdoc(d.type)}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(d.uploadedAt).toLocaleDateString()}
                    {d.adminNote ? ` · ${d.adminNote}` : ""}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    STATUS_STYLE[d.status] ?? STATUS_STYLE.expired
                  }`}
                >
                  {tstatus(d.status)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <VerificationUpload />
    </main>
  );
}
