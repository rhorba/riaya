import { authDb, caregiverProfiles } from "@riaya/db";
import { eq } from "drizzle-orm";
import { embedCaregiver } from "./embedding.js";

/**
 * Populate `caregiver_profiles.skill_vector` for every caregiver from their care
 * types + experience text. Idempotent (recomputed deterministically each run).
 * Run after the demo seed: pnpm --filter @riaya/matching db:embed
 *
 * Uses the privileged (authDb) connection — a system maintenance task with no
 * per-user RLS context, same rationale as the seed.
 */
async function backfill(): Promise<void> {
  console.log("Embedding caregivers...");
  const rows = await authDb
    .select({
      id: caregiverProfiles.id,
      careTypes: caregiverProfiles.careTypes,
      bio: caregiverProfiles.bio,
      cities: caregiverProfiles.cities,
      languages: caregiverProfiles.languages,
    })
    .from(caregiverProfiles);

  for (const r of rows) {
    const text = [r.bio ?? "", ...r.cities, ...r.languages].filter(Boolean).join(" ");
    const vector = embedCaregiver({ careTypes: r.careTypes, text });
    await authDb
      .update(caregiverProfiles)
      .set({ skillVector: vector })
      .where(eq(caregiverProfiles.id, r.id));
  }
  console.log(`  ✓ embedded ${rows.length} caregivers`);
}

backfill()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Embedding backfill failed:", err);
    process.exit(1);
  });
