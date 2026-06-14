"use server";

import { type ActionResult, fail, ok } from "@/lib/action-result";
import { withRoleTx } from "@/lib/db";
import { EmployerAccountCreateSchema, EnrolledEmployeeSchema, MoneySchema } from "@riaya/core";
import { employerAccounts, enrolledEmployees } from "@riaya/db";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

type EmployerAccount = typeof employerAccounts.$inferSelect;
type EnrolledEmployee = typeof enrolledEmployees.$inferSelect;

/** Get the signed-in employer's account plus enrolled employees (null if none). */
export const getMyEmployerAccount = withRoleTx(
  ["employer"],
  async (tx, user): Promise<(EmployerAccount & { employees: EnrolledEmployee[] }) | null> => {
    const [account] = await tx
      .select()
      .from(employerAccounts)
      .where(eq(employerAccounts.userId, user.id))
      .limit(1);
    if (!account) return null;

    const employees = await tx
      .select()
      .from(enrolledEmployees)
      .where(eq(enrolledEmployees.employerAccountId, account.id));

    return { ...account, employees };
  }
);

/** Create the employer account (one per user). */
export const createEmployerAccount = withRoleTx(
  ["employer"],
  async (tx, user, input: unknown): Promise<ActionResult<{ id: string }>> => {
    const parsed = EmployerAccountCreateSchema.safeParse(input);
    if (!parsed.success) return fail("invalidInput");

    const [existing] = await tx
      .select({ id: employerAccounts.id })
      .from(employerAccounts)
      .where(eq(employerAccounts.userId, user.id))
      .limit(1);
    if (existing) return fail("accountExists");

    const [created] = await tx
      .insert(employerAccounts)
      .values({ userId: user.id, ...parsed.data })
      .returning({ id: employerAccounts.id });
    if (!created) return fail("createFailed");

    revalidatePath("/employer/account");
    return ok({ id: created.id });
  }
);

/** Update the per-employee monthly benefit budget (centimes). */
export const setBenefitBudget = withRoleTx(
  ["employer"],
  async (tx, user, input: unknown): Promise<ActionResult> => {
    const parsed = MoneySchema.safeParse(input);
    if (!parsed.success) return fail("invalidInput");

    const result = await tx
      .update(employerAccounts)
      .set({ benefitBudgetPerEmployee: parsed.data, updatedAt: new Date() })
      .where(eq(employerAccounts.userId, user.id))
      .returning({ id: employerAccounts.id });

    if (result.length === 0) return fail("accountNotFound");

    revalidatePath("/employer/account");
    return ok(undefined);
  }
);

/** Enroll an employee in the benefit program. */
export const enrollEmployee = withRoleTx(
  ["employer"],
  async (tx, user, input: unknown): Promise<ActionResult<{ id: string }>> => {
    const parsed = EnrolledEmployeeSchema.safeParse(input);
    if (!parsed.success) return fail("invalidInput");

    const [account] = await tx
      .select({ id: employerAccounts.id })
      .from(employerAccounts)
      .where(eq(employerAccounts.userId, user.id))
      .limit(1);
    if (!account) return fail("accountNotFound");

    const email = parsed.data.employeeEmail.toLowerCase();
    const [dup] = await tx
      .select({ id: enrolledEmployees.id })
      .from(enrolledEmployees)
      .where(
        and(
          eq(enrolledEmployees.employerAccountId, account.id),
          eq(enrolledEmployees.employeeEmail, email)
        )
      )
      .limit(1);
    if (dup) return fail("alreadyEnrolled");

    const [created] = await tx
      .insert(enrolledEmployees)
      .values({
        employerAccountId: account.id,
        employeeEmail: email,
        employeeName: parsed.data.employeeName,
        monthlyBenefit: parsed.data.monthlyBenefit,
      })
      .returning({ id: enrolledEmployees.id });
    if (!created) return fail("createFailed");

    revalidatePath("/employer/account");
    return ok({ id: created.id });
  }
);

/** Deactivate an enrolled employee (kept for audit/history, not deleted). */
export const setEmployeeActive = withRoleTx(
  ["employer"],
  async (tx, user, employeeId: string, active: boolean): Promise<ActionResult> => {
    const [account] = await tx
      .select({ id: employerAccounts.id })
      .from(employerAccounts)
      .where(eq(employerAccounts.userId, user.id))
      .limit(1);
    if (!account) return fail("accountNotFound");

    const result = await tx
      .update(enrolledEmployees)
      .set({ active })
      .where(
        and(
          eq(enrolledEmployees.id, employeeId),
          eq(enrolledEmployees.employerAccountId, account.id)
        )
      )
      .returning({ id: enrolledEmployees.id });

    if (result.length === 0) return fail("employeeNotFound");

    revalidatePath("/employer/account");
    return ok(undefined);
  }
);
