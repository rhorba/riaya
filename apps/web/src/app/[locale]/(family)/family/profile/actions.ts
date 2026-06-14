"use server";

import { randomUUID } from "node:crypto";
import { type ActionResult, fail, ok } from "@/lib/action-result";
import { withRoleTx } from "@/lib/db";
import {
  ChildRecordSchema,
  FamilyProfileCreateSchema,
  FamilyProfileUpdateSchema,
} from "@riaya/core";
import { familyProfiles } from "@riaya/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

type FamilyProfile = typeof familyProfiles.$inferSelect;
type ChildRecord = FamilyProfile["children"][number];

/** Get the signed-in family's own profile (null if not yet created). */
export const getMyFamilyProfile = withRoleTx(
  ["family"],
  async (tx, user): Promise<FamilyProfile | null> => {
    const [row] = await tx
      .select()
      .from(familyProfiles)
      .where(eq(familyProfiles.userId, user.id))
      .limit(1);
    return row ?? null;
  }
);

/** Create the family's profile. Children get server-generated IDs. */
export const createFamilyProfile = withRoleTx(
  ["family"],
  async (tx, user, input: unknown): Promise<ActionResult<{ id: string }>> => {
    const parsed = FamilyProfileCreateSchema.safeParse(input);
    if (!parsed.success) return fail("invalidInput");

    const [existing] = await tx
      .select({ id: familyProfiles.id })
      .from(familyProfiles)
      .where(eq(familyProfiles.userId, user.id))
      .limit(1);
    if (existing) return fail("profileExists");

    const children: ChildRecord[] = parsed.data.children.map((c) => ({
      id: randomUUID(),
      ...c,
    }));

    const [created] = await tx
      .insert(familyProfiles)
      .values({
        userId: user.id,
        address: parsed.data.address,
        neighborhood: parsed.data.neighborhood,
        city: parsed.data.city,
        children,
      })
      .returning({ id: familyProfiles.id });
    if (!created) return fail("createFailed");

    revalidatePath("/family/profile");
    return ok({ id: created.id });
  }
);

/** Update the family's own profile fields (not children — use the child helpers). */
export const updateFamilyProfile = withRoleTx(
  ["family"],
  async (tx, user, input: unknown): Promise<ActionResult> => {
    const parsed = FamilyProfileUpdateSchema.omit({ children: true }).safeParse(input);
    if (!parsed.success) return fail("invalidInput");

    const result = await tx
      .update(familyProfiles)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(familyProfiles.userId, user.id))
      .returning({ id: familyProfiles.id });

    if (result.length === 0) return fail("profileNotFound");

    revalidatePath("/family/profile");
    return ok(undefined);
  }
);

/** Add a child record. Returns the new child id. */
export const addChild = withRoleTx(
  ["family"],
  async (tx, user, input: unknown): Promise<ActionResult<{ id: string }>> => {
    const parsed = ChildRecordSchema.safeParse(input);
    if (!parsed.success) return fail("invalidInput");

    const [profile] = await tx
      .select({ children: familyProfiles.children })
      .from(familyProfiles)
      .where(eq(familyProfiles.userId, user.id))
      .limit(1);
    if (!profile) return fail("profileNotFound");
    if (profile.children.length >= 10) return fail("tooManyChildren");

    const child: ChildRecord = { id: randomUUID(), ...parsed.data };
    await tx
      .update(familyProfiles)
      .set({ children: [...profile.children, child], updatedAt: new Date() })
      .where(eq(familyProfiles.userId, user.id));

    revalidatePath("/family/profile");
    return ok({ id: child.id });
  }
);

/** Update one child record in place. */
export const updateChild = withRoleTx(
  ["family"],
  async (tx, user, childId: string, input: unknown): Promise<ActionResult> => {
    const parsed = ChildRecordSchema.safeParse(input);
    if (!parsed.success) return fail("invalidInput");

    const [profile] = await tx
      .select({ children: familyProfiles.children })
      .from(familyProfiles)
      .where(eq(familyProfiles.userId, user.id))
      .limit(1);
    if (!profile) return fail("profileNotFound");

    let found = false;
    const children = profile.children.map((c) => {
      if (c.id !== childId) return c;
      found = true;
      return { id: c.id, ...parsed.data };
    });
    if (!found) return fail("childNotFound");

    await tx
      .update(familyProfiles)
      .set({ children, updatedAt: new Date() })
      .where(eq(familyProfiles.userId, user.id));

    revalidatePath("/family/profile");
    return ok(undefined);
  }
);

/** Remove a child record. */
export const removeChild = withRoleTx(
  ["family"],
  async (tx, user, childId: string): Promise<ActionResult> => {
    const [profile] = await tx
      .select({ children: familyProfiles.children })
      .from(familyProfiles)
      .where(eq(familyProfiles.userId, user.id))
      .limit(1);
    if (!profile) return fail("profileNotFound");

    const children = profile.children.filter((c) => c.id !== childId);
    if (children.length === profile.children.length) return fail("childNotFound");

    await tx
      .update(familyProfiles)
      .set({ children, updatedAt: new Date() })
      .where(eq(familyProfiles.userId, user.id));

    revalidatePath("/family/profile");
    return ok(undefined);
  }
);
