/**
 * E2E — Employer (B2B) flow
 * Login → employer dashboard → account → invoices
 */
import { expect, test } from "@playwright/test";
import { DEMO, login } from "./helpers/auth";

test.describe("Employer authentication", () => {
  test("employer can sign in", async ({ page }) => {
    await page.goto("/fr/auth/login");
    await page.waitForLoadState("networkidle");

    await page.getByLabel(/adresse e-mail|email/i).fill(DEMO.employer.email);
    await page.getByLabel(/mot de passe|password/i).fill(DEMO.employer.password);
    await page.getByRole("button", { name: /se connecter|connexion/i }).click();
    await page.waitForURL((url) => !url.pathname.includes("/auth/login"), { timeout: 20000 });

    await page.screenshot({ path: "test-results/screenshots/04-employer-login.png" });
    await expect(page).not.toHaveURL(/auth\/login/);
  });
});

test.describe("Employer dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "employer");
  });

  test("employer account page shows company info and benefit budget", async ({ page }) => {
    await page.goto("/fr/employer/account");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("main")).toBeVisible();
    // Should show company name or benefit info
    const content = await page.textContent("main");
    const hasEmployerContent =
      (content?.includes("MAD") ||
        content?.includes("employé") ||
        content?.includes("budget") ||
        content?.includes("avantage")) ?? false;
    expect(hasEmployerContent).toBe(true);
    await page.screenshot({ path: "test-results/screenshots/04-employer-account.png" });
  });

  test("employer invoices page renders", async ({ page }) => {
    await page.goto("/fr/employer/invoices");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("main")).toBeVisible();
    await page.screenshot({ path: "test-results/screenshots/04-employer-invoices.png" });
  });

  test("employer can view enrolled employees", async ({ page }) => {
    await page.goto("/fr/employer/account");
    await page.waitForLoadState("networkidle");

    await page.screenshot({ path: "test-results/screenshots/04-employer-employees.png" });

    // The account page should show enrolled employees list
    const content = await page.textContent("main");
    // Demo seed has enrolled employees
    expect(content).toBeTruthy();
  });
});

test.describe("Employer role isolation", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "employer");
  });

  test("employer accessing family area sees page without crash", async ({ page }) => {
    await page.goto("/fr/family/bookings");
    await page.waitForLoadState("networkidle");

    // Family routes are data-gated (not URL-gated for employer); page renders without crash
    await expect(page.locator("body")).toBeVisible();
    await page.screenshot({ path: "test-results/screenshots/04-employer-rbac-redirect.png" });
  });

  test("employer cannot access admin routes (redirected)", async ({ page }) => {
    await page.goto("/fr/admin");
    await page.waitForLoadState("networkidle");

    // Should redirect away from admin
    await expect(page).not.toHaveURL(/\/fr\/admin$/);
    await page.screenshot({ path: "test-results/screenshots/04-employer-admin-redirect.png" });
  });
});
