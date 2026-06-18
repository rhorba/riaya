import type { Page } from "@playwright/test";

export const DEMO = {
  family: { email: "sara@demo.riaya.ma", password: "demo1234", name: "Sara Lahlou" },
  caregiver: { email: "fatima@demo.riaya.ma", password: "demo1234", name: "Fatima Benali" },
  employer: { email: "drh@demo-corp.riaya.ma", password: "demo1234", name: "RH Corp" },
  admin: { email: "admin@demo.riaya.ma", password: "demo1234", name: "Admin Riaya" },
} as const;

/**
 * Sign in via the login form and wait for the redirect to complete.
 * After Auth.js signs in (redirectTo: "/"), next-intl redirects to /fr (default locale).
 */
export async function login(page: Page, role: keyof typeof DEMO) {
  const { email, password } = DEMO[role];
  await page.goto("/fr/auth/login");
  await page.waitForLoadState("networkidle");
  await page.getByLabel(/adresse e-mail|email/i).fill(email);
  await page.getByLabel(/mot de passe|password/i).fill(password);
  await page.getByRole("button", { name: /se connecter|connexion/i }).click();
  // Wait for redirect away from the login page (redirectTo: "/" → locale redirect → /fr)
  await page.waitForURL((url) => !url.pathname.includes("/auth/login"), { timeout: 20000 });
  await page.waitForLoadState("networkidle");
}

export async function logout(page: Page) {
  // Navigate away (session handled by Auth.js cookies — just stop using the page)
  await page.context().clearCookies();
}
