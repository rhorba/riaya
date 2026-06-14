import { getTranslations } from "next-intl/server";
import { getMyEmployerAccount } from "./actions";
import { EmployerAccountForm } from "./employer-account-form";

export default async function EmployerAccountPage() {
  const t = await getTranslations("employerAccount");
  const account = await getMyEmployerAccount();

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 font-serif text-2xl font-semibold text-gray-900">{t("title")}</h1>
      <EmployerAccountForm
        initial={
          account
            ? {
                companyName: account.companyName,
                ice: account.ice ?? "",
                sector: account.sector ?? "",
                benefitBudgetPerEmployee: account.benefitBudgetPerEmployee,
                totalBudgetUsed: account.totalBudgetUsed,
                employees: account.employees.map((e) => ({
                  id: e.id,
                  employeeName: e.employeeName,
                  employeeEmail: e.employeeEmail,
                  monthlyBenefit: e.monthlyBenefit,
                  active: e.active,
                })),
              }
            : null
        }
      />
    </main>
  );
}
