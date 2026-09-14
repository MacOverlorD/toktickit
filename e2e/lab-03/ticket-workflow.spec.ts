import { expect, test, type Page } from "@playwright/test";
import {
  E2E_REQUESTER_PASSWORD,
  E2E_REQUESTER_USERS,
  E2E_STAFF_USER,
  E2E_WORKFLOW_TICKET,
} from "./values.js";
async function login(page: Page, email: string, home: string) {
  await page.goto("/login");
  await page.getByLabel(/^Email/).fill(email);
  await page.getByLabel(/^Password/).fill(E2E_REQUESTER_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: home })).toBeVisible();
}
test("Requester indication and public communication continue through staff workflow with private-note isolation", async ({
  page,
}) => {
  const stamp = String(Date.now());
  const requesterComment = "Public requester update " + stamp;
  const staffComment = "Public staff response " + stamp;
  const privateNote = "Private diagnosis " + stamp;
  await login(page, E2E_REQUESTER_USERS[0].email, "My Tickets");
  await page.goto("/tickets/" + E2E_WORKFLOW_TICKET);
  await expect(
    page.getByRole("heading", { name: E2E_WORKFLOW_TICKET }),
  ).toBeVisible();
  await page
    .getByLabel("Public: visible to Requester and staff")
    .fill(requesterComment);
  await page.getByRole("button", { name: "Add Public Comment" }).click();
  await expect(page.getByText(requesterComment)).toBeVisible();
  await page.getByRole("button", { name: "Problem Appears Resolved" }).click();
  await expect(page.getByText(/Resolution indication sent/)).toBeVisible();
  await page.getByRole("button", { name: "Log out" }).click();
  await login(page, E2E_STAFF_USER.email, "Ticket Queue");
  await page.getByLabel("Search tickets").fill(E2E_WORKFLOW_TICKET);
  await page.getByRole("button", { name: "Apply" }).click();
  await page
    .getByRole("link", { name: E2E_WORKFLOW_TICKET, exact: true })
    .first()
    .click();
  await expect(page.getByText(requesterComment)).toBeVisible();
  await expect(page.getByText(/E2E Requester Owner at/)).toBeVisible();
  await page.getByRole("button", { name: "Claim" }).click();
  await expect(page.getByRole("status")).toContainText("Ticket updated");
  await page.getByLabel("IT Priority").selectOption("URGENT");
  await page.getByRole("button", { name: "Save IT Priority" }).click();
  await page.getByLabel("Next Status").selectOption("IN_PROGRESS");
  await page.getByRole("button", { name: "Change Status" }).click();
  await page.getByLabel("Public: visible to Requester").fill(staffComment);
  await page.getByRole("button", { name: "Add Public Comment" }).click();
  await expect(page.getByText(staffComment)).toBeVisible();
  await page.getByLabel("Internal: staff only").fill(privateNote);
  await page.getByRole("button", { name: "Add Internal Note" }).click();
  await expect(page.getByText(privateNote)).toBeVisible();
  await page.screenshot({
    path: "artifacts/lab-03/staff-ticket-detail.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Log out" }).click();
  await login(page, E2E_REQUESTER_USERS[0].email, "My Tickets");
  await page.goto("/tickets/" + E2E_WORKFLOW_TICKET);
  await expect(page.getByText(requesterComment)).toBeVisible();
  await expect(page.getByText(staffComment)).toBeVisible();
  await expect(page.getByText(privateNote)).toHaveCount(0);
  await expect(
    page.getByText(/IT Staff still performs formal resolution/),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/lab-03/requester-communication.png",
    fullPage: true,
  });
});
