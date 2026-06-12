import { bigint, boolean, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

export const employerAccounts = pgTable(
  "employer_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    companyName: text("company_name").notNull(),
    // ICE: 15-digit Moroccan tax identifier
    ice: text("ice"),
    sector: text("sector"),
    // Per-employee monthly benefit budget in centimes
    benefitBudgetPerEmployee: bigint("benefit_budget_per_employee", {
      mode: "number",
    }).notNull(),
    // Running total of all subsidy disbursements
    totalBudgetUsed: bigint("total_budget_used", { mode: "number" }).default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("idx_employer_user_id").on(t.userId)]
);

export const enrolledEmployees = pgTable(
  "enrolled_employees",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    employerAccountId: uuid("employer_account_id")
      .notNull()
      .references(() => employerAccounts.id, { onDelete: "cascade" }),
    employeeEmail: text("employee_email").notNull(),
    employeeName: text("employee_name").notNull(),
    // Monthly benefit for this employee in centimes
    monthlyBenefit: bigint("monthly_benefit", { mode: "number" }).notNull(),
    // Linked family user if they registered on Riaya
    userId: uuid("user_id").references(() => users.id),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("idx_enrolled_employer").on(t.employerAccountId),
    index("idx_enrolled_email").on(t.employeeEmail),
    index("idx_enrolled_user").on(t.userId),
  ]
);
