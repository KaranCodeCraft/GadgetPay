import { expect, test, type Locator, type Page } from "@playwright/test";

function byHeadingCard(page: Page): Locator {
  return page.getByRole("region", { name: "Selected phone quote" });
}

test("sell-phone flow reveals final quote only after OTP verification", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "gadgetpe_user_sell_phone_selected_model",
      JSON.stringify({
        brandSlug: "Apple",
        modelId: "apple__iphone13__128gb",
        modelName: "Iphone 13 (128GB)",
        listedPrice: 32500,
        updatedAt: new Date().toISOString(),
      }),
    );
    window.localStorage.setItem("gadgetpe_user_sell_phone_device_details", JSON.stringify({
      basicFunctionality: { canMakeCalls: "yes", touchWorking: "yes" },
      physicalIssues: [],
      batteryAndCharging: { charging: "yes" },
      accessoriesAndOwnership: { billInvoice: "yes" },
    }));
  });

  await page.goto("/user/sell-phone/quote");

  await expect(page.getByRole("heading", { name: /Verify your mobile to unlock final price/i })).toBeVisible();
  await expect(byHeadingCard(page)).toHaveCount(0);

  await page.getByLabel("Phone number").fill("9000001234");
  await page.getByRole("button", { name: "Send OTP" }).click();
  await page.getByLabel("OTP").fill("6767");
  await page.getByRole("button", { name: "Verify OTP" }).click();

  await expect(page.locator(".user-quote-hero-model")).toBeVisible();
  await expect(page.getByText(/Final quote/i)).toBeVisible();
  await expect(page.locator(".user-quote-selling-price")).toContainText(/₹\s*\d{1,3}(,\d{3})*/);
  await expect(page.getByRole("button", { name: /Sell Now/i })).toBeVisible();
});
