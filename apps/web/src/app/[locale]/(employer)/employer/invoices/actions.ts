"use server";

import { withRoleTx } from "@/lib/db";
import { employerAccounts, employerInvoices, enrolledEmployees } from "@riaya/db";
import { count, desc, eq } from "drizzle-orm";

export type InvoiceRow = typeof employerInvoices.$inferSelect;

export type EmployerBilling = {
  invoices: InvoiceRow[];
  /** Running total of all subsidy disbursed (centimes). */
  totalBudgetUsed: number;
  /** Monthly benefit budget per enrolled employee (centimes). */
  budgetPerEmployee: number;
  /** Number of active enrolled employees. */
  employeeCount: number;
};

/**
 * Employer billing view (Module C/E). Lists the monthly subsidy invoices and the
 * running budget usage. All amounts integer centimes. Reads only employer-owned
 * tables (RLS-scoped to the signed-in employer's account).
 */
export const getEmployerBilling = withRoleTx(
  ["employer"],
  async (tx, user): Promise<EmployerBilling> => {
    const [account] = await tx
      .select({
        id: employerAccounts.id,
        totalBudgetUsed: employerAccounts.totalBudgetUsed,
        budgetPerEmployee: employerAccounts.benefitBudgetPerEmployee,
      })
      .from(employerAccounts)
      .where(eq(employerAccounts.userId, user.id))
      .limit(1);
    if (!account) {
      return { invoices: [], totalBudgetUsed: 0, budgetPerEmployee: 0, employeeCount: 0 };
    }

    const invoices = await tx
      .select()
      .from(employerInvoices)
      .where(eq(employerInvoices.employerAccountId, account.id))
      .orderBy(desc(employerInvoices.periodYear), desc(employerInvoices.periodMonth));

    const [{ value: employeeCount } = { value: 0 }] = await tx
      .select({ value: count() })
      .from(enrolledEmployees)
      .where(eq(enrolledEmployees.employerAccountId, account.id));

    return {
      invoices,
      totalBudgetUsed: account.totalBudgetUsed,
      budgetPerEmployee: account.budgetPerEmployee,
      employeeCount,
    };
  }
);
