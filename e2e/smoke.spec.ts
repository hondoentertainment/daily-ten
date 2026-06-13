import { expect, test } from "@playwright/test";

test.describe("Daily Tens web shell", () => {
  test("skip link and setup hint without Supabase env", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("link", { name: /skip to main content/i }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "Daily Tens" })).toBeVisible();
    await expect(page.getByText(/environment variables/i)).toBeVisible();
    await expect(page.getByText("VITE_SUPABASE_URL")).toBeVisible();
  });
});
