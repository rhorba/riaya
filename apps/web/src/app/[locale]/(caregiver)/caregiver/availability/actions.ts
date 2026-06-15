"use server";

import { type ActionResult, fail, ok } from "@/lib/action-result";
import { withRoleTx } from "@/lib/db";
import { AvailabilitySaveSchema } from "@riaya/core";
import { availabilitySlots, caregiverProfiles } from "@riaya/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type Slot = typeof availabilitySlots.$inferSelect;

/** The signed-in caregiver's published availability slots. */
export const getMyAvailability = withRoleTx(["caregiver"], async (tx, user): Promise<Slot[]> => {
  const [profile] = await tx
    .select({ id: caregiverProfiles.id })
    .from(caregiverProfiles)
    .where(eq(caregiverProfiles.userId, user.id))
    .limit(1);
  if (!profile) return [];
  return tx.select().from(availabilitySlots).where(eq(availabilitySlots.caregiverId, profile.id));
});

/**
 * Replace the caregiver's entire availability calendar (weekly recurring slots +
 * date overrides) in one transaction. RLS (slots_write / slots_delete) guarantees
 * a caregiver can only touch their own slots; we also scope by profile id.
 */
export const saveAvailability = withRoleTx(
  ["caregiver"],
  async (tx, user, input: unknown): Promise<ActionResult> => {
    const parsed = AvailabilitySaveSchema.safeParse(input);
    if (!parsed.success) return fail("invalidInput");

    const [profile] = await tx
      .select({ id: caregiverProfiles.id })
      .from(caregiverProfiles)
      .where(eq(caregiverProfiles.userId, user.id))
      .limit(1);
    if (!profile) return fail("profileNotFound");

    await tx.delete(availabilitySlots).where(eq(availabilitySlots.caregiverId, profile.id));
    if (parsed.data.slots.length > 0) {
      await tx.insert(availabilitySlots).values(
        parsed.data.slots.map((s) => ({
          caregiverId: profile.id,
          dayOfWeek: s.dayOfWeek,
          specificDate: s.specificDate,
          startTime: s.startTime,
          endTime: s.endTime,
          available: s.available,
        }))
      );
    }

    revalidatePath("/caregiver/availability");
    return ok(undefined);
  }
);
