import { VerificationBadge } from "@/components/verification-badge";
import { type CareType, type VerificationLevel, formatMoney, money } from "@riaya/core";
import { useTranslations } from "next-intl";
import Link from "next/link";

export type CaregiverCardData = {
  id: string;
  displayName: string;
  photoUrl: string | null;
  careTypes: CareType[];
  cities: string[];
  hourlyRate: number | null;
  verificationLevel: VerificationLevel;
  avgRating: number;
  reviewCount: number;
};

/** Caregiver result card. Safety badge is the dominant signal (UX principle #1). */
export function CaregiverCard({ caregiver }: { caregiver: CaregiverCardData }) {
  const t = useTranslations("search");
  const tc = useTranslations("careTypes");
  const tp = useTranslations("publicProfile");
  const rating = caregiver.reviewCount > 0 ? (caregiver.avgRating / 100).toFixed(1) : null;

  return (
    <Link
      href={`/caregivers/${caregiver.id}`}
      className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 transition-shadow hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--color-cream-100)] font-serif text-xl text-[var(--color-terracotta-600)]">
          {caregiver.photoUrl ? (
            <img src={caregiver.photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            caregiver.displayName.charAt(0)
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-serif text-lg font-semibold text-gray-900">
            {caregiver.displayName}
          </h3>
          <p className="truncate text-sm text-gray-500">{caregiver.cities.join(" · ")}</p>
        </div>
      </div>

      <VerificationBadge level={caregiver.verificationLevel} size="sm" />

      <div className="flex flex-wrap gap-1.5">
        {caregiver.careTypes.slice(0, 3).map((ct) => (
          <span
            key={ct}
            className="rounded-full bg-[var(--color-sage-50)] px-2.5 py-0.5 text-xs text-[var(--color-sage-700)]"
          >
            {tc(ct)}
          </span>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-3">
        <span className="text-sm text-gray-600">
          {rating
            ? `★ ${rating} · ${tp("reviews", { count: caregiver.reviewCount })}`
            : tp("noRating")}
        </span>
        {caregiver.hourlyRate != null && (
          <span className="text-sm font-semibold text-[var(--color-terracotta-600)]">
            {formatMoney(money(caregiver.hourlyRate))}
            <span className="font-normal text-gray-400">/{t("hourShort")}</span>
          </span>
        )}
      </div>
    </Link>
  );
}
