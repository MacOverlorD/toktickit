import { expect, test, type Page } from "@playwright/test";
import {
  E2E_ADMIN_USER,
  E2E_INITIAL_PASSWORD,
  E2E_REQUESTER_PASSWORD,
  E2E_REQUESTER_USERS,
  E2E_STAFF_USER,
  E2E_VISUAL_AUTH_USER,
  E2E_WORKFLOW_TICKET,
} from "./values.js";

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "mobile", width: 390, height: 844 },
  { name: "boundary-320", width: 320, height: 844 },
] as const;

async function login(
  page: Page,
  email: string,
  password = E2E_REQUESTER_PASSWORD,
) {
  await page.goto("/login");
  await page.getByLabel(/^Email/).fill(email);
  await page.getByLabel(/^Password/).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/login$/);
}

async function capture(page: Page, folder: string, screen: string) {
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await expect(page.locator("main")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      await page
        .locator("input:not([type=hidden]), select, textarea")
        .evaluateAll((controls) =>
          controls.every((control) => {
            const element = control as HTMLInputElement;
            return Boolean(
              element.labels?.length ||
              element.getAttribute("aria-label") ||
              element.getAttribute("aria-labelledby"),
            );
          }),
        ),
    ).toBe(true);
    await page.locator("main").click({ position: { x: 1, y: 1 } });
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(() => document.activeElement !== document.body),
    ).toBe(true);
    await page.screenshot({
      path: `artifacts/lab-03/screenshots/${folder}/${screen}-${viewport.name}.png`,
      fullPage: true,
    });
  }
}

test("captures authentication and mandatory-change evidence", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await capture(page, "authentication", "login");
  await login(page, E2E_VISUAL_AUTH_USER.email, E2E_INITIAL_PASSWORD);
  await expect(
    page.getByRole("heading", { name: "Change password" }),
  ).toBeVisible();
  await capture(page, "authentication", "mandatory-change");
});

test("captures authenticated Requester evidence", async ({ page }) => {
  await login(page, E2E_REQUESTER_USERS[0].email);
  await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
  await capture(page, "requester", "my-tickets");
  await page.goto(`/tickets/${E2E_WORKFLOW_TICKET}`);
  await expect(
    page.getByRole("heading", { name: E2E_WORKFLOW_TICKET }),
  ).toBeVisible();
  await expect(page.getByText("Internal Notes")).toHaveCount(0);
  await capture(page, "requester", "ticket-detail");
});

test("captures Staff queue and operational detail evidence", async ({
  page,
}) => {
  await login(page, E2E_STAFF_USER.email);
  await expect(
    page.getByRole("heading", { name: "Ticket Queue" }),
  ).toBeVisible();
  await capture(page, "staff-queue", "queue");
  await page.goto(`/staff/tickets/${E2E_WORKFLOW_TICKET}`);
  await expect(
    page.getByRole("heading", { name: E2E_WORKFLOW_TICKET }),
  ).toBeVisible();
  await expect(page.getByText("Public Comments")).toBeVisible();
  await expect(page.getByText("Internal Notes")).toBeVisible();
  await capture(page, "staff-ticket-detail", "ticket-detail");
});

test("captures Administrator user-management evidence", async ({ page }) => {
  await login(page, E2E_ADMIN_USER.email);
  await page.goto("/admin/users");
  await expect(
    page.getByRole("heading", { name: "User Management" }),
  ).toBeVisible();
  await capture(page, "user-management", "accounts");
  await page.getByRole("button", { name: "Create User" }).click();
  await expect(
    page.getByRole("heading", { name: "Create User" }),
  ).toBeVisible();
  await capture(page, "user-management", "create-user");
});
