import { expect, test } from "@playwright/test";

test("incomplete referral recovers from interruption without duplicate delivery", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Reset demo" }).click();
  await expect(page.getByText("Synthetic records only")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Maya Chen" })).toBeVisible();

  await page.getByRole("button", { name: "Review extraction" }).click();
  await expect(page.getByText("Needs information", { exact: true }).first()).toBeVisible();
  await page.getByLabel("Enter Callback number").fill("416-555-0199");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByText("FHIR R4 structure passes")).toBeVisible();

  await page.getByRole("button", { name: "Assign to me" }).click();
  await page.getByRole("button", { name: "Send with outage simulation" }).click();
  await expect(page.getByText("Handoff failed", { exact: true }).first()).toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: "Retry safely" })).toBeVisible();
  await page.getByRole("button", { name: "Retry safely" }).click();
  await expect(page.getByText("Awaiting acknowledgement", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Prove duplicate prevention" }).click();
  await expect(page.getByText("Duplicate prevented — no second referral was sent.")).toBeVisible();
  await page.getByRole("button", { name: "Simulate acknowledgement" }).click();
  await expect(page.getByText("Administrative handoff closed", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Handoffs" }).click();
  await expect(page.getByText("DUPLICATE SUPPRESSED")).toBeVisible();
  await expect(page.getByText("200 Reconciled · existing receipt NORTHSTAR-2901")).toBeVisible();
});

test("ambiguous identity cannot advance without staff confirmation", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /REF-1044/ }).click();
  await page.getByRole("button", { name: "Review extraction" }).click();
  await expect(page.getByText("Synthetic identity match requires explicit staff confirmation")).toBeVisible();
  await expect(page.getByRole("button", { name: "Assign to me" })).toHaveCount(0);
  await page.getByRole("button", { name: "Confirm synthetic identity" }).click();
  await expect(page.getByRole("button", { name: "Assign to me" })).toBeVisible();
});

test("public scope and evidence remain explicit", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Evidence" }).click();
  await expect(page.getByText("95.8%")).toBeVisible();
  await expect(page.getByText("not hospital outcomes or clinical validation")).toBeVisible();
  await page.getByRole("button", { name: "System" }).click();
  await expect(page.getByText("Real patient health information")).toBeVisible();
  await expect(page.getByText("Compliance or interoperability certification")).toBeVisible();
});
