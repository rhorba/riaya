import { CaregiverCard } from "@/components/caregiver-card";
import type { CareType, VerificationLevel } from "@riaya/core";
import { caregiverProfiles, db } from "@riaya/db";
import { searchCaregivers } from "@riaya/matching";
import { type SQL, and, count, desc, inArray, lte, sql } from "drizzle-orm";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

const CARE_TYPES: CareType[] = ["daya", "nanny", "after_school", "nursery_assistant", "babysitter"];
const LEVELS: VerificationLevel[] = [
  "unverified",
  "id_checked",
  "cin_verified",
  "background_cleared",
  "certified",
];
const PAGE_SIZE = 12;

type RawParams = { [key: string]: string | string[] | undefined };

function str(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s?.trim() ? s.trim() : undefined;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("search");
  return { title: `${t("title")} · Riaya`, description: t("metaDescription") };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}) {
  const sp = await searchParams;
  const t = await getTranslations("search");
  const tc = await getTranslations("careTypes");
  const tv = await getTranslations("verification");

  // ── Parse + validate filters from the URL ──────────────────────────────────
  const careTypeRaw = str(sp.careType);
  const careType = CARE_TYPES.includes(careTypeRaw as CareType)
    ? (careTypeRaw as CareType)
    : undefined;
  const city = str(sp.city);
  const levelRaw = str(sp.verificationLevel);
  const minLevel = LEVELS.includes(levelRaw as VerificationLevel)
    ? (levelRaw as VerificationLevel)
    : undefined;
  const maxRateMad = Number(str(sp.maxHourlyRate));
  const maxHourlyRate = Number.isFinite(maxRateMad) && maxRateMad > 0 ? maxRateMad : undefined;
  const page = Math.max(1, Number(str(sp.page)) || 1);
  // Free-text query → AI (pgvector) relevance ranking instead of rating order.
  const query = str(sp.q);

  // ── Build WHERE ─────────────────────────────────────────────────────────────
  const conditions: SQL[] = [];
  if (careType) {
    conditions.push(sql`${caregiverProfiles.careTypes} @> ARRAY[${careType}]::care_type[]`);
  }
  if (city) {
    conditions.push(
      sql`EXISTS (SELECT 1 FROM unnest(${caregiverProfiles.cities}) AS c WHERE c ILIKE ${`%${city}%`})`
    );
  }
  if (maxHourlyRate) {
    conditions.push(lte(caregiverProfiles.hourlyRate, maxHourlyRate * 100));
  }
  if (minLevel) {
    // "At least this level" — verification is an ordered ladder.
    const allowed = LEVELS.slice(LEVELS.indexOf(minLevel));
    conditions.push(inArray(caregiverProfiles.verificationLevel, allowed));
  }
  const where = conditions.length ? and(...conditions) : undefined;

  // Columns every result card needs (public read — caregiver_read RLS USING(true)).
  const cardCols = {
    id: caregiverProfiles.id,
    displayName: caregiverProfiles.displayName,
    photoUrl: caregiverProfiles.photoUrl,
    careTypes: caregiverProfiles.careTypes,
    cities: caregiverProfiles.cities,
    hourlyRate: caregiverProfiles.hourlyRate,
    verificationLevel: caregiverProfiles.verificationLevel,
    avgRating: caregiverProfiles.avgRating,
    reviewCount: caregiverProfiles.reviewCount,
  };

  // ── Query ───────────────────────────────────────────────────────────────────
  // With a free-text query → pgvector relevance ranking (S3-06/07). Otherwise the
  // structured browse: verified + highest-rated first, paginated.
  async function loadCards(ids: string[]) {
    if (ids.length === 0) return [];
    return db.select(cardCols).from(caregiverProfiles).where(inArray(caregiverProfiles.id, ids));
  }

  let results: Awaited<ReturnType<typeof loadCards>> = [];
  let relevanceById = new Map<string, number>();
  let total = 0;
  let totalPages = 1;

  if (query) {
    const matches = await searchCaregivers(db, {
      careTypes: careType ? [careType] : [],
      text: [query, city].filter(Boolean).join(" "),
      where,
      limit: PAGE_SIZE,
    });
    relevanceById = new Map(matches.map((m) => [m.id, m.score]));
    const cards = await loadCards(matches.map((m) => m.id));
    const byId = new Map(cards.map((c) => [c.id, c]));
    // Preserve relevance order (DB IN() does not guarantee order).
    results = matches.map((m) => byId.get(m.id)).filter((c): c is (typeof cards)[number] => !!c);
    total = results.length;
  } else {
    const [rows, totalRow] = await Promise.all([
      db
        .select(cardCols)
        .from(caregiverProfiles)
        .where(where)
        // Verified caregivers first (safety), then highest rated.
        .orderBy(desc(caregiverProfiles.avgRating), desc(caregiverProfiles.completedBookings))
        .limit(PAGE_SIZE)
        .offset((page - 1) * PAGE_SIZE),
      db.select({ n: count() }).from(caregiverProfiles).where(where),
    ]);
    results = rows;
    total = totalRow[0]?.n ?? 0;
    totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  }

  const buildHref = (overrides: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams();
    if (query) q.set("q", query);
    if (careType) q.set("careType", careType);
    if (city) q.set("city", city);
    if (maxHourlyRate) q.set("maxHourlyRate", String(maxHourlyRate));
    if (minLevel) q.set("verificationLevel", minLevel);
    q.set("page", String(page));
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined || v === "") q.delete(k);
      else q.set(k, String(v));
    }
    const s = q.toString();
    return s ? `/search?${s}` : "/search";
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-1 font-serif text-2xl font-semibold text-gray-900">{t("title")}</h1>
      <p className="mb-6 text-sm text-gray-500">{t("subtitle")}</p>

      {/* No-JS GET filter form — works on 3G / without client hydration.
          No action → submits to the current locale-prefixed URL. */}
      <form
        method="get"
        className="mb-8 grid grid-cols-1 gap-3 rounded-2xl bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5"
      >
        <div className="sm:col-span-2 lg:col-span-5">
          <Field label={t("queryLabel")}>
            <input
              name="q"
              defaultValue={query ?? ""}
              placeholder={t("queryPlaceholder")}
              className={SELECT_CLS}
            />
          </Field>
        </div>
        <Field label={t("careType")}>
          <select name="careType" defaultValue={careType ?? ""} className={SELECT_CLS}>
            <option value="">{t("any")}</option>
            {CARE_TYPES.map((ct) => (
              <option key={ct} value={ct}>
                {tc(ct)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("city")}>
          <input
            name="city"
            defaultValue={city ?? ""}
            placeholder={t("cityPlaceholder")}
            className={SELECT_CLS}
          />
        </Field>
        <Field label={t("maxHourlyRate")}>
          <input
            name="maxHourlyRate"
            type="number"
            min={0}
            inputMode="numeric"
            defaultValue={maxHourlyRate ?? ""}
            className={SELECT_CLS}
          />
        </Field>
        <Field label={t("minVerification")}>
          <select name="verificationLevel" defaultValue={minLevel ?? ""} className={SELECT_CLS}>
            <option value="">{t("any")}</option>
            {LEVELS.map((lv) => (
              <option key={lv} value={lv}>
                {tv(lv)}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="flex-1 rounded-lg bg-[var(--color-terracotta-500)] px-4 py-2 font-medium text-white transition-colors hover:bg-[var(--color-terracotta-600)]"
          >
            {t("apply")}
          </button>
          <Link
            href="/search"
            className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            {t("reset")}
          </Link>
        </div>
      </form>

      <p className="mb-4 text-sm text-gray-500">{t("resultCount", { count: total })}</p>

      {results.length === 0 ? (
        <p className="rounded-2xl bg-white p-8 text-center text-gray-500 shadow-sm">{t("empty")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((c) => (
            <CaregiverCard key={c.id} caregiver={c} relevance={relevanceById.get(c.id)} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav className="mt-8 flex items-center justify-center gap-4 text-sm">
          {page > 1 ? (
            <Link
              href={buildHref({ page: page - 1 })}
              className="text-[var(--color-terracotta-600)]"
            >
              ← {t("prev")}
            </Link>
          ) : (
            <span className="text-gray-300">← {t("prev")}</span>
          )}
          <span className="text-gray-500">{t("pageOf", { page, total: totalPages })}</span>
          {page < totalPages ? (
            <Link
              href={buildHref({ page: page + 1 })}
              className="text-[var(--color-terracotta-600)]"
            >
              {t("next")} →
            </Link>
          ) : (
            <span className="text-gray-300">{t("next")} →</span>
          )}
        </nav>
      )}
    </main>
  );
}

const SELECT_CLS =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-terracotta-500)] focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: control supplied via {children}
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-600">{label}</span>
      {children}
    </label>
  );
}
