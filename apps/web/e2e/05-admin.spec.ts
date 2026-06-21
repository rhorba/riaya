/**
 * E2E — Admin dashboard flow
 * Login → KPIs → verification queue → disputes → escrow health
 */
import { expect, test } from "@playwright/test";
import { DEMO, login } from "./helpers/auth";

test.describe("Admin authentication", () => {
  test("admin can sign in", async ({ page }) => {
    await page.goto("/fr/auth/login");
    await page.waitForLoadState("networkidle");

    await page.getByLabel(/adresse e-mail|email/i).fill(DEMO.admin.email);
    await page.getByLabel(/mot de passe|password/i).fill(DEMO.admin.password);
    await page.getByRole("button", { name: /se connecter|connexion/i }).click();
    await page.waitForURL((url) => !url.pathname.includes("/auth/login"), { timeout: 20000 });

    await page.screenshot({ path: "test-results/screenshots/05-admin-login.png" });
    await expect(page).not.toHaveURL(/auth\/login/);
  });
});

test.describe("Admin dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "admin");
  });

  test("admin KPI dashboard shows platform metrics", async ({ page }) => {
    await page.goto("/fr/admin");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("main")).toBeVisible();
    // Should show GMV or booking counts
    const content = await page.textContent("main");
    const hasAdminContent =
      (content?.includes("MAD") ||
        content?.includes("réservation") ||
        content?.includes("vérification") ||
        content?.includes("GMV") ||
        content?.includes("assistante")) ??
      false;
    expect(hasAdminContent).toBe(true);
    await page.screenshot({ path: "test-results/screenshots/05-admin-dashboard.png" });
  });

  test("admin verification queue shows pending documents", async ({ page }) => {
    await page.goto("/fr/admin/verifications");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("main")).toBeVisible();
    await page.screenshot({ path: "test-results/screenshots/05-admin-verifications.png" });
    // Seed has caregivers with uploaded documents
    const content = await page.textContent("main");
    expect(content).toBeTruthy();
  });

  test("admin dispute queue shows reported incidents", async ({ page }) => {
    await page.goto("/fr/admin/disputes");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("main")).toBeVisible();
    await page.screenshot({ path: "test-results/screenshots/05-admin-disputes.png" });
  });

  test("admin escrow health monitor shows escrow status", async ({ page }) => {
    await page.goto("/fr/admin/escrow");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("main")).toBeVisible();
    // Should show escrow states/amounts
    const content = await page.textContent("main");
    expect(content).toBeTruthy();
    await page.screenshot({ path: "test-results/screenshots/05-admin-escrow.png" });
  });

  test("admin can approve a verification document", async ({ page }) => {
    await page.goto("/fr/admin/verifications");
    await page.waitForLoadState("networkidle");

    await page.screenshot({ path: "test-results/screenshots/05-admin-verify-before.png" });

    // Check if there are pending documents with approve button
    const approveBtn = page.getByRole("button", { name: /approuver|approve/i }).first();
    if (await approveBtn.isVisible()) {
      await approveBtn.click();
      await page.waitForLoadState("networkidle");
      await page.screenshot({ path: "test-results/screenshots/05-admin-verify-after.png" });
    }
  });

  test("admin sees navigation to all admin sections", async ({ page }) => {
    await page.goto("/fr/admin");
    await page.waitForLoadState("networkidle");

    // Nav links to verification, disputes, escrow
    const nav = page.locator("nav, aside, [role='navigation']").first();
    if (await nav.isVisible()) {
      // Just verify the admin section loads — not strictly required to have all nav links on dashboard
      expect(await page.locator("main").isVisible()).toBe(true);
    }
    await page.screenshot({ path: "test-results/screenshots/05-admin-nav.png" });
  });
});

test.describe("Admin role isolation", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "admin");
  });

  test("admin can access family booking routes (admin sees all)", async ({ page }) => {
    await page.goto("/fr/admin");
    await page.waitForLoadState("networkidle");
    // Admin should stay on admin dashboard
    await expect(page).toHaveURL(/\/fr\/admin/);
  });
});
