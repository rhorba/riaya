import type { VerificationLevel } from "@riaya/core";
import { useTranslations } from "next-intl";

/**
 * Verification badge — the platform's hero trust signal (UX principle #1: safety
 * first). Color-coded by level; "certified" is the strongest, terracotta accent.
 * Usable in both Server and Client Components (next-intl useTranslations).
 */
const RING: Record<VerificationLevel, string> = {
  unverified: "ring-gray-200",
  id_checked: "ring-[var(--color-cream-300)]",
  cin_verified: "ring-[var(--color-sage-200)]",
  background_cleared: "ring-[var(--color-sage-300)]",
  certified: "ring-[var(--color-terracotta-300)]",
};

const BG: Record<VerificationLevel, string> = {
  unverified: "bg-gray-100 text-gray-600",
  id_checked: "bg-[var(--color-cream-100)] text-[var(--color-terracotta-700)]",
  cin_verified: "bg-[var(--color-sage-50)] text-[var(--color-sage-600)]",
  background_cleared: "bg-[var(--color-sage-100)] text-[var(--color-sage-700)]",
  certified: "bg-[var(--color-terracotta-50)] text-[var(--color-terracotta-700)]",
};

export function VerificationBadge({
  level,
  size = "md",
  showIcon = true,
}: {
  level: VerificationLevel;
  size?: "sm" | "md";
  showIcon?: boolean;
}) {
  const t = useTranslations("verification");
  const padding = size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ${BG[level]} ${RING[level]} ${padding}`}
    >
      {showIcon && <ShieldIcon level={level} />}
      {t(level)}
    </span>
  );
}

function ShieldIcon({ level }: { level: VerificationLevel }) {
  // Filled check shield for cleared/certified; outline for lower levels.
  const filled = level === "certified" || level === "background_cleared";
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-3.5 w-3.5"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.6}
    >
      <path
        d="M10 1.5l6.5 2.4v5c0 4-2.8 7.4-6.5 8.6C6.3 16.3 3.5 12.9 3.5 8.9v-5L10 1.5z"
        strokeLinejoin="round"
      />
      {filled && (
        <path
          d="M7 9.8l2 2 4-4.2"
          fill="none"
          stroke="white"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
