import { expect, test } from "@playwright/test";

const email = process.env.E2E_AUTH_EMAIL ?? "";
const password = process.env.E2E_AUTH_PASSWORD ?? "";
const hasViteSupabase =
  !!process.env.VITE_SUPABASE_URL && !!process.env.VITE_SUPABASE_ANON_KEY;
const authE2EEnabled =
  hasViteSupabase && email.length > 0 && password.length > 0;

test.describe("Sign-in (optional integration)", () => {
  test.skip(
    !authE2EEnabled,
    "Set VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, E2E_AUTH_EMAIL, E2E_AUTH_PASSWORD before build and test.",
  );

  test("account tab sign-in shows session", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByText(/environment variables/i),
    ).not.toBeVisible({ timeout: 5_000 });

    await page.getByRole("tab", { name: "Account" }).click();
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText(/signed in as/i)).toBeVisible({
      timeout: 15_000,
    });
  });
});
