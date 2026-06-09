import { test, expect } from "@playwright/test";

test.describe("Authentication Page E2E", () => {
  test("successfully loads the authentication page and shows login view", async ({ page }) => {
    // Navigate to auth page
    await page.goto("/auth");

    // Expect the header to contain Welcome Back
    await expect(page.locator("h1")).toContainText("Welcome Back");

    // Expect email and password inputs to be visible
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("allows switching to signup tab", async ({ page }) => {
    await page.goto("/auth");

    // Click on Sign Up navigation button
    const signUpButton = page.locator('button:has-text("Sign Up")').first();
    await signUpButton.click();

    // The header should change to Create Account
    await expect(page.locator("h1")).toContainText("Create Account");

    // Name field and terms checkbox should now be visible
    await expect(page.locator('placeholder="John Doe"')).toBeVisible();
    await expect(page.locator("#tos")).toBeVisible();
  });
});
