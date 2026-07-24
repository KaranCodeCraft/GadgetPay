import { expect, test, type Page } from "@playwright/test";

async function answerVisibleQuestionsAndAdvance(page: Page) {
  for (let step = 0; step < 20; step += 1) {
    if (!page.url().includes("/user/sell-tablet/device-details")) break;

    const toggleRows = page.locator(".user-toggle-row");
    const toggleRowCount = await toggleRows.count();
    for (let row = 0; row < toggleRowCount; row += 1) {
      const firstOption = toggleRows.nth(row).locator("button").first();
      if (await firstOption.count()) {
        await firstOption.click();
      }
    }

    const issueTiles = page.locator(".user-issue-tile, .user-issue-img-tile");
    if (await issueTiles.count()) {
      await issueTiles.first().click();
    }

    const batteryHealthOption = page.getByLabel("Above 95%");
    if (await batteryHealthOption.count()) {
      await batteryHealthOption.check();
    }

    const continueButton = page.getByRole("button", { name: /Continue to Quote|Continue|Next/i }).first();
    if (!(await continueButton.count())) break;
    if (await continueButton.isDisabled()) break;

    await continueButton.click();
    await page.waitForTimeout(350);
  }
}

test("sell-tablet flow reveals final quote only after OTP verification", async ({ page }) => {
  await page.goto("/user/sell-tablet");

  await expect(page.getByRole("heading", { name: /Choose a Tablet or iPad Brand/i })).toBeVisible();
  await page.locator(".user-brand-tile").first().click();

  await expect(page.locator(".user-brand-heading")).toBeVisible();
  await expect(page.locator("button", { hasText: /Rs\./i }).first()).toHaveCount(0);

  await page.locator(".user-model-select-card").first().click();

  const variantButton = page.locator(".user-storage-option").first();
  await expect(variantButton).toBeVisible();
  await variantButton.click();

  await expect(page.getByRole("button", { name: /Get Exact Value/i })).toBeVisible();
  await page.getByRole("button", { name: /Get Exact Value/i }).click();

  await expect(page).toHaveURL(/\/user\/sell-tablet\/device-details/);
  await answerVisibleQuestionsAndAdvance(page);
  await expect(page).toHaveURL(/\/user\/sell-tablet\/quote/);

  await expect(page.getByRole("heading", { name: /Verify your mobile to unlock final price/i })).toBeVisible();

  await page.getByLabel("Phone number").fill("9000001234");
  await page.getByRole("button", { name: "Send OTP" }).click();
  await page.getByLabel("OTP").fill("6767");
  await page.getByRole("button", { name: "Verify OTP" }).click();

  await expect(page.getByText(/Final quote/i)).toBeVisible();
  await expect(page.locator(".user-quote-price")).toContainText(/Rs\.\s*\d{1,3}(,\d{3})*/);
  await expect(page.getByRole("button", { name: /Sell Now/i })).toBeVisible();
});
