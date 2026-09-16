import { expect, test, type Page } from "@playwright/test";
import {
  E2E_REQUESTER_PASSWORD,
  E2E_STAFF_USER,
  E2E_WORKFLOW_TICKET,
} from "./values.js";

async function loginStaff(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/^Email/).fill(E2E_STAFF_USER.email);
  await page.getByLabel(/^Password/).fill(E2E_REQUESTER_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(
    page.getByRole("heading", { name: "Ticket Queue" }),
  ).toBeVisible();
  await page.goto("/staff/tickets/" + E2E_WORKFLOW_TICKET);
  await expect(
    page.getByRole("heading", { name: E2E_WORKFLOW_TICKET }),
  ).toBeVisible();
}

test("a communication refresh cannot combine another operator's version with stale operation drafts", async ({
  browser,
}) => {
  const firstContext = await browser.newContext();
  const secondContext = await browser.newContext();
  const first = await firstContext.newPage();
  const second = await secondContext.newPage();
  try {
    await loginStaff(first);
    await loginStaff(second);
    await first.getByLabel("IT Priority").selectOption("HIGH");
    await second.getByLabel("IT Priority").selectOption("LOW");
    await second.getByRole("button", { name: "Save IT Priority" }).click();
    await expect(second.getByText("Ticket updated.")).toBeVisible();
    await first
      .getByLabel("Internal: staff only")
      .fill("Concurrent refresh " + Date.now());
    await first.getByRole("button", { name: "Add Internal Note" }).click();
    await expect(
      first.getByRole("button", { name: "Reload latest" }),
    ).toBeVisible();
    await expect(first.getByLabel("IT Priority")).toHaveValue("HIGH");
    await first.getByRole("button", { name: "Save IT Priority" }).click();
    await expect(first.getByLabel("IT Priority")).toHaveValue("HIGH");
    await first.getByRole("button", { name: "Reload latest" }).click();
    await expect(first.getByLabel("IT Priority")).toHaveValue("LOW");
    await second.reload();
    await expect(second.getByLabel("IT Priority")).toHaveValue("LOW");
  } finally {
    await firstContext.close();
    await secondContext.close();
  }
});
