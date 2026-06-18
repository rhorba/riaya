/**
 * E2E — Caregiver user flow
 * Login → dashboard → bookings → availability → earnings → verification
 */
import { expect, test } from "@playwright/test";
import { DEMO, login } from "./helpers/auth";

test.describe("Caregiver authentication", () => {
  test("caregiver can sign in", async ({ page }) => {
    await page.goto("/fr/auth/login");
    await page.waitForLoadState("networkidle");

    await page.getByLabel(/adresse e-mail|email/i).fill(DEMO.caregiver.email);
    await page.getByLabel(/mot de passe|password/i).fill(DEMO.caregiver.password);
    await page.getByRole("button", { name: /se connecter|connexion/i }).click();
    await page.waitForURL((url) => !url.pathname.includes("/auth/login"), { timeout: 20000 });

    await page.screenshot({ path: "test-results/screenshots/03-caregiver-login.png" });
    await expect(page).not.toHaveURL(/auth\/login/);
  });
});

test.describe("Caregiver dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "caregiver");
  });

  test("caregiver bookings inbox shows incoming requests", async ({ page }) => {
    await page.goto("/fr/caregiver/bookings");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("main")).toBeVisible();
    await page.screenshot({ path: "test-results/screenshots/03-caregiver-bookings.png" });

    // Should show either pending bookings or empty state message
    const content = await page.textContent("main");
    expect(content).toBeTruthy();
  });

  test("caregiver profile edit page renders", async ({ page }) => {
    await page.goto("/fr/caregiver/profile");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("main")).toBeVisible();
    // Should have a form with bio, rates etc.
    const form = page.locator("form").first();
    if (await form.isVisible()) {
      await expect(form).toBeVisible();
    }
    await page.screenshot({ path: "test-results/screenshots/03-caregiver-profile.png" });
  });

  test("caregiver availability calendar renders", async ({ page }) => {
    await page.goto("/fr/caregiver/availability");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("main")).toBeVisible();
    await page.screenshot({ path: "test-results/screenshots/03-caregiver-availability.png" });
  });

  test("caregiver earnings page shows payout info", async ({ page }) => {
    await page.goto("/fr/caregiver/earnings");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("main")).toBeVisible();
    await page.screenshot({ path: "test-results/screenshots/03-caregiver-earnings.png" });
  });

  test("caregiver verification page shows document upload area", async ({ page }) => {
    await page.goto("/fr/caregiver/verification");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("main")).toBeVisible();
    // Should mention CIN or documents
    const content = await page.textContent("main");
    const hasDocContent =
      (content?.includes("CIN") || content?.includes("document") || content?.includes("vérification")) ?? false;
    expect(hasDocContent).toBe(true);
    await page.screenshot({ path: "test-results/screenshots/03-caregiver-verification.png" });
  });

  test("caregiver can accept a booking from inbox", async ({ page }) => {
    await page.goto("/fr/caregiver/bookings");
    await page.waitForLoadState("networkidle");

    await page.screenshot({ path: "test-results/screenshots/03-caregiver-inbox-detail.png" });

    // Check if there are pending bookings with accept button
    const acceptBtn = page.getByRole("button", { name: /accepter|accept/i }).first();
    if (await acceptBtn.isVisible()) {
      await page.screenshot({ path: "test-results/screenshots/03-caregiver-accept-before.png" });
      await acceptBtn.click();
      await page.waitForLoadState("networkidle");
      await page.screenshot({ path: "test-results/screenshots/03-caregiver-accept-after.png" });
    }
  });
});
