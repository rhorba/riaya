"use server";

import { type ActionResult, fail, ok } from "@/lib/action-result";
import { withRoleTx } from "@/lib/db";
import { CaregiverProfileCreateSchema, CaregiverProfileUpdateSchema } from "@riaya/core";
import { caregiverProfiles } from "@riaya/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

type CaregiverProfile = typeof caregiverProfiles.$inferSelect;

/** Get the signed-in caregiver's own profile (null if not yet created). */
export const getMyCaregiverProfile = withRoleTx(
  ["caregiver"],
  async (tx, user): Promise<CaregiverProfile | null> => {
    const [row] = await tx
      .select()
      .from(caregiverProfiles)
      .where(eq(caregiverProfiles.userId, user.id))
      .limit(1);
    return row ?? null;
  }
);

/** Create the caregiver's profile (one per user — enforced by unique userId). */
export const createCaregiverProfile = withRoleTx(
  ["caregiver"],
  async (tx, user, input: unknown): Promise<ActionResult<{ id: string }>> => {
    const parsed = CaregiverProfileCreateSchema.safeParse(input);
    if (!parsed.success) return fail("invalidInput");

    const [existing] = await tx
      .select({ id: caregiverProfiles.id })
      .from(caregiverProfiles)
      .where(eq(caregiverProfiles.userId, user.id))
      .limit(1);
    if (existing) return fail("profileExists");

    const [created] = await tx
      .insert(caregiverProfiles)
      .values({ userId: user.id, displayName: user.name, ...parsed.data })
      .returning({ id: caregiverProfiles.id });
    if (!created) return fail("createFailed");

    revalidatePath("/caregiver/profile");
    return ok({ id: created.id });
  }
);

/** Update the caregiver's own profile. RLS guarantees ownership; we also scope by userId. */
export const updateCaregiverProfile = withRoleTx(
  ["caregiver"],
  async (tx, user, input: unknown): Promise<ActionResult> => {
    const parsed = CaregiverProfileUpdateSchema.safeParse(input);
    if (!parsed.success) return fail("invalidInput");

    const result = await tx
      .update(caregiverProfiles)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(caregiverProfiles.userId, user.id))
      .returning({ id: caregiverProfiles.id });

    if (result.length === 0) return fail("profileNotFound");

    revalidatePath("/caregiver/profile");
    return ok(undefined);
  }
);
