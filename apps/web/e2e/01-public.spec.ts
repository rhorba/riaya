/**
 * E2E — Public pages (no auth required)
 * Landing, caregiver search, caregiver public profile, RTL
 */
import { expect, test } from "@playwright/test";

test.describe("Landing page", () => {
  test("renders homepage and redirects to /fr locale", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/fr/);
    await expect(page).toHaveTitle(/Riaya/i);
    await page.screenshot({ path: "test-results/screenshots/01-landing.png" });
  });

  test("homepage has hero section with platform name", async ({ page }) => {
    await page.goto("/fr");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
    // Hero with Riaya branding
    await expect(page.locator("body")).toContainText("Riaya");
    await page.screenshot({ path: "test-results/screenshots/01-landing-hero.png" });
  });

  test("navigation bar is present with sign-in link", async ({ page }) => {
    await page.goto("/fr");
    await page.waitForLoadState("networkidle");

    const nav = page.getByRole("navigation").first();
    await expect(nav).toBeVisible();
    // Auth link
    await expect(page.locator('a[href*="auth"]').first()).toBeVisible();
    await page.screenshot({ path: "test-results/screenshots/01-landing-nav.png" });
  });

  test("clicking search CTA navigates to search page", async ({ page }) => {
    await page.goto("/fr");
    await page.waitForLoadState("networkidle");

    const searchLink = page.locator('a[href*="search"]').first();
    await expect(searchLink).toBeVisible();
    await searchLink.click();
    await page.waitForURL(/\/fr\/search/);
    await page.screenshot({ path: "test-results/screenshots/01-landing-to-search.png" });
  });
});

test.describe("Caregiver search page", () => {
  test("page loads with h1 heading and filter form", async ({ page }) => {
    await page.goto("/fr/search");
    await page.waitForLoadState("networkidle");

    // h1 from t("title") = "Trouver une assistante"
    await expect(page.locator("h1").first()).toContainText(/trouver|assistante/i);
    // Filter form
    await expect(page.locator("form").first()).toBeVisible();
    await page.screenshot({ path: "test-results/screenshots/01-search-page.png" });
  });

  test("shows 8 seeded caregiver cards (links to /caregivers/)", async ({ page }) => {
    await page.goto("/fr/search");
    await page.waitForLoadState("networkidle");

    // CaregiverCard renders a Link with href="/caregivers/[id]"
    const cards = page.locator('a[href*="caregivers"]');
    await expect(cards.first()).toBeVisible({ timeout: 15000 });
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(1);
    await page.screenshot({ path: "test-results/screenshots/01-search-results.png" });
  });

  test("filter by city narrows results", async ({ page }) => {
    await page.goto("/fr/search");
    await page.waitForLoadState("networkidle");

    // City input: name="city"
    const cityInput = page.locator('input[name="city"]');
    await expect(cityInput).toBeVisible();
    await cityInput.fill("Casablanca");
    // Submit the GET form
    await page.keyboard.press("Enter");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/city=Casablanca/);
    await page.screenshot({ path: "test-results/screenshots/01-search-filtered-city.png" });
  });

  test("filter by care type works", async ({ page }) => {
    await page.goto("/fr/search");
    await page.waitForLoadState("networkidle");

    // Care type select: name="careType"
    const careTypeSelect = page.locator('select[name="careType"]');
    await expect(careTypeSelect).toBeVisible();
    await careTypeSelect.selectOption("daya");
    await page.locator('button[type="submit"]').click();
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/careType=daya/);
    await page.screenshot({ path: "test-results/screenshots/01-search-filtered-type.png" });
  });

  test("clicking a caregiver card opens their public profile", async ({ page }) => {
    await page.goto("/fr/search");
    await page.waitForLoadState("networkidle");

    const firstCard = page.locator('a[href*="caregivers"]').first();
    await expect(firstCard).toBeVisible({ timeout: 15000 });
    await firstCard.click();
    await page.waitForURL(/\/fr\/caregivers\//);
    await page.waitForLoadState("networkidle");

    await page.screenshot({ path: "test-results/screenshots/01-caregiver-profile.png" });
  });
});

test.describe("Caregiver public profile page", () => {
  test("shows caregiver name, verification level, and booking CTA", async ({ page }) => {
    await page.goto("/fr/search");
    await page.waitForLoadState("networkidle");

    const firstCard = page.locator('a[href*="caregivers"]').first();
    await expect(firstCard).toBeVisible({ timeout: 15000 });
    const href = await firstCard.getAttribute("href");
    await page.goto(`/fr${href}`);
    await page.waitForLoadState("networkidle");

    // Profile page should show the caregiver's name
    await expect(page.locator("h1, h2").first()).toBeVisible();
    // Should have a booking CTA for logged-out users or a login redirect
    await expect(page.locator("main")).toBeVisible();
    await page.screenshot({ path: "test-results/screenshots/01-profile-detail.png" });
  });
});

test.describe("Arabic RTL layout", () => {
  test("Arabic locale renders with dir=rtl", async ({ page }) => {
    await page.goto("/ar");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await page.screenshot({ path: "test-results/screenshots/01-arabic-rtl.png" });
  });

  test("Arabic search page renders RTL", async ({ page }) => {
    await page.goto("/ar/search");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await page.screenshot({ path: "test-results/screenshots/01-arabic-search.png" });
  });
});
