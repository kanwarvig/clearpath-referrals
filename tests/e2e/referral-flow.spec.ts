import { expect, test } from "@playwright/test";

test("guided referral recovers from interruption without duplicate delivery", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Reset demo" }).click();
  await expect(page.getByText("Synthetic records only", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: /Review next referral/ }).click();
  await expect(page).toHaveURL(/\/referrals\/REF-1042$/);
  await expect(page.getByRole("heading", { name: "Maya Chen" })).toBeVisible();

  await page.getByRole("button", { name: "Review extraction" }).click();
  await expect(page.getByText("Review found missing information.")).toBeVisible();
  await page.getByLabel("Enter Callback number").fill("416-555-0199");
  await page.getByRole("button", { name: "Add information" }).click();
  await page.getByRole("button", { name: "Inspect FHIR" }).click();
  await expect(page.getByText("FHIR R4 structure passes")).toBeVisible();

  await page.getByRole("button", { name: "Assign to me" }).click();
  await page.getByRole("button", { name: "Send with outage simulation" }).click();
  await expect(page.getByText("Recovery needed", { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: "Retry safely" })).toBeVisible();
  await page.getByRole("button", { name: "Retry safely" }).click();
  await expect(page.getByText("Awaiting acknowledgement", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Prove duplicate prevention" }).click();
  await expect(page.getByText("Duplicate prevented — no second referral was sent.")).toBeVisible();
  await page.getByRole("button", { name: "Simulate acknowledgement" }).click();
  await expect(page.getByRole("heading", { name: "Administrative handoff closed" })).toBeVisible();

  await page.getByRole("link", { name: "Handoffs" }).click();
  await expect(page).toHaveURL(/\/handoffs$/);
  await expect(page.getByText("DUPLICATE SUPPRESSED")).toBeVisible();
  await expect(page.getByText("200 Reconciled · existing receipt NORTHSTAR-2901")).toBeVisible();
});

test("direct referral route and browser back preserve validated state", async ({ page }) => {
  await page.goto("/referrals/REF-1044");
  await expect(page.getByRole("heading", { name: "Avery Singh" })).toBeVisible();
  await page.getByRole("button", { name: "Review extraction" }).click();
  await expect(page.getByRole("button", { name: "Confirm synthetic identity" })).toBeVisible();
  await page.getByRole("button", { name: "Inspect FHIR" }).click();
  await expect(page.getByText("Synthetic identity match requires explicit staff confirmation")).toBeVisible();
  await page.getByRole("button", { name: "Confirm synthetic identity" }).click();
  await expect(page.getByRole("button", { name: "Assign to me" })).toBeVisible();

  await page.getByRole("link", { name: "Intake", exact: true }).click();
  await expect(page.getByRole("link", { name: /REF-1044/ })).toContainText("Ready for assignment");
  await page.goBack();
  await expect(page.getByRole("button", { name: "Assign to me" })).toBeVisible();
});

test("route-level IA and public scope remain explicit", async ({ page }) => {
  await page.goto("/evidence");
  await expect(page.getByText("95.8%")).toBeVisible();
  await expect(page.getByText("not hospital outcomes", { exact: false })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Measured claims, bounded honestly" })).toBeVisible();
  await page.getByRole("link", { name: "System" }).click();
  await expect(page.getByText("Real patient health information")).toBeVisible();
  await expect(page.getByText("Compliance or interoperability certification")).toBeVisible();
});

test("mobile overview and focused review stay usable without horizontal clipping", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Move a referral from messy intake to a confirmed handoff." })).toBeVisible();
  await expect(page.getByRole("link", { name: /Review next referral/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.getByRole("link", { name: /Review next referral/ }).click();
  await expect(page.getByRole("button", { name: "Review extraction" })).toBeVisible();
  await expect(page.locator("[data-nextjs-dialog]")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test("interactive states remain visible and reduced motion is respected", async ({ page }) => {
  await page.goto("/");
  const cta = page.getByRole("link", { name: /Review next referral/ });
  await cta.focus();
  expect(await cta.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe("solid");
  await cta.hover();
  await expect.poll(() => cta.evaluate((element) => getComputedStyle(element).transform)).not.toBe("none");
  const box = await cta.boundingBox();
  if (!box) throw new Error("Review CTA does not have a visible hit area");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(250);
  expect(await cta.evaluate((element) => getComputedStyle(element).boxShadow)).toContain("2px");
  await page.mouse.move(0, 0);
  await page.mouse.up();

  await page.emulateMedia({ reducedMotion: "reduce" });
  await cta.hover();
  expect(await cta.evaluate((element) => getComputedStyle(element).transform)).toBe("none");
});
