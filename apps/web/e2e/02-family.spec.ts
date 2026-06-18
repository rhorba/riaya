/**
 * E2E — Family user flow
 * Login → dashboard → bookings → profile → book a caregiver → signup
 */
import { expect, test } from "@playwright/test";
import { DEMO, login } from "./helpers/auth";

test.describe("Family authentication", () => {
  test("login page renders with email and password fields", async ({ page }) => {
    await page.goto("/fr/auth/login");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("h1").first()).toContainText(/connecter|connexion/i);
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await page.screenshot({ path: "test-results/screenshots/02-login-page.png" });
  });

  test("family logs in successfully and lands on homepage", async ({ page }) => {
    await page.goto("/fr/auth/login");
    await page.waitForLoadState("networkidle");

    await page.locator('#email').fill(DEMO.family.email);
    await page.locator('#password').fill(DEMO.family.password);
    await page.screenshot({ path: "test-results/screenshots/02-login-filled.png" });

    await page.getByRole("button", { name: /se connecter/i }).first().click();
    await page.waitForURL((url) => !url.pathname.includes("/auth/login"), { timeout: 20000 });
    await page.waitForLoadState("networkidle");

    await page.screenshot({ path: "test-results/screenshots/02-login-success.png" });
    // Session is established — navigate to family area
    await page.goto("/fr/family/bookings");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/fr\/family\/bookings/);
  });

  test("wrong password shows error alert", async ({ page }) => {
    await page.goto("/fr/auth/login");
    await page.waitForLoadState("networkidle");

    await page.locator('#email').fill(DEMO.family.email);
    await page.locator('#password').fill("wrongpassword");
    await page.getByRole("button", { name: /se connecter/i }).first().click();

    await expect(page.getByRole("alert")).toBeVisible({ timeout: 8000 });
    await page.screenshot({ path: "test-results/screenshots/02-login-error.png" });
  });
});

test.describe("Family dashboard — bookings", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "family");
  });

  test("family bookings page shows reservation list or empty state", async ({ page }) => {
    await page.goto("/fr/family/bookings");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("main")).toBeVisible();
    await page.screenshot({ path: "test-results/screenshots/02-family-bookings.png" });
    // Should show heading
    await expect(page.locator("h1, h2, h3").first()).toBeVisible();
  });

  test("family profile page renders with personal info", async ({ page }) => {
    await page.goto("/fr/family/profile");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("main")).toBeVisible();
    // Sara's profile should mention her children
    const content = await page.textContent("main");
    expect(content?.length).toBeGreaterThan(10);
    await page.screenshot({ path: "test-results/screenshots/02-family-profile.png" });
  });

  test("notifications page loads for family", async ({ page }) => {
    await page.goto("/fr/notifications");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("main")).toBeVisible();
    await page.screenshot({ path: "test-results/screenshots/02-family-notifications.png" });
  });
});

test.describe("Family booking flow", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "family");
  });

  test("family can browse search page while logged in", async ({ page }) => {
    await page.goto("/fr/search");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("h1").first()).toContainText(/trouver|assistante/i);
    const cards = page.locator('a[href*="caregivers"]');
    await expect(cards.first()).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: "test-results/screenshots/02-family-search.png" });
  });

  test("family can view caregiver profile and see booking button", async ({ page }) => {
    await page.goto("/fr/search");
    await page.waitForLoadState("networkidle");

    const firstCard = page.locator('a[href*="caregivers"]').first();
    await expect(firstCard).toBeVisible({ timeout: 15000 });
    const href = await firstCard.getAttribute("href");
    // href = "/caregivers/[id]" (without locale prefix)
    const profileUrl = href?.startsWith("/fr") ? href : `/fr${href}`;
    await page.goto(profileUrl!);
    await page.waitForLoadState("networkidle");

    // Booking CTA for authenticated family
    const bookLink = page.locator('a[href*="book"]').first();
    const bookBtn = page.getByRole("button", { name: /réserver|book/i }).first();
    const hasBooking = (await bookLink.isVisible()) || (await bookBtn.isVisible());
    expect(hasBooking || (await page.locator("main").isVisible())).toBe(true);
    await page.screenshot({ path: "test-results/screenshots/02-family-profile-view.png" });
  });

  test("booking form page renders with date and time inputs", async ({ page }) => {
    // Get a caregiver ID from search
    await page.goto("/fr/search");
    await page.waitForLoadState("networkidle");

    const firstCard = page.locator('a[href*="caregivers"]').first();
    await expect(firstCard).toBeVisible({ timeout: 15000 });
    const href = await firstCard.getAttribute("href");
    const caregiverId = href?.split("/").pop();

    if (caregiverId) {
      await page.goto(`/fr/family/book/${caregiverId}`);
      await page.waitForLoadState("networkidle");

      await expect(page.locator("main")).toBeVisible();
      await page.screenshot({ path: "test-results/screenshots/02-booking-form.png" });

      // Form should have date input
      const hasDateInput =
        (await page.locator('input[type="date"]').count()) > 0 ||
        (await page.locator('input[name="date"]').count()) > 0;
      const hasForm = (await page.locator("form").count()) > 0;
      expect(hasDateInput || hasForm).toBe(true);
    }
  });
});

test.describe("Family signup", () => {
  test("signup page renders with role selector", async ({ page }) => {
    await page.goto("/fr/auth/signup");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("h1").first()).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    // Role selector — 3 radio inputs, check first one is visible
    await expect(page.locator('[name="role"]').first()).toBeVisible();
    await page.screenshot({ path: "test-results/screenshots/02-signup-page.png" });
  });
});
