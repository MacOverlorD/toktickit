import { expect, test } from "@playwright/test";
import {
  E2E_ADMIN_USER,
  E2E_MANAGED_EMAIL,
  E2E_REQUESTER_PASSWORD,
} from "./values.js";
async function login(
  page: any,
  email: string,
  password = E2E_REQUESTER_PASSWORD,
) {
  await page.goto("/login");
  await page.getByLabel(/^Email/).fill(email);
  await page.getByLabel(/^Password/).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}
test("Administrator creates, edits and resets an account while non-admin access stays denied", async ({
  page,
}) => {
  await login(page, E2E_ADMIN_USER.email);
  await expect(page).toHaveURL(/staff\/tickets/);
  await page.goto("/admin/users");
  await expect(
    page.getByRole("heading", { name: "User Management" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Create User" }).click();
  const editor = page.locator(".admin-editor");
  await editor.getByLabel("Name").fill("E2E Managed User");
  await editor.getByLabel("Email").fill(E2E_MANAGED_EMAIL);
  await editor.getByLabel("Role").selectOption("REQUESTER");
  await page
    .getByLabel("Initial password")
    .fill("Managed initial password 2026!");
  await page
    .getByLabel("Confirm password")
    .fill("Managed initial password 2026!");
  await page
    .getByRole("button", { name: "Create User", exact: true })
    .last()
    .click();
  await expect(page.getByText("Account created.")).toBeVisible();
  await expect(page.getByLabel("Initial password")).toHaveValue("");
  await expect(page.getByLabel("Confirm password")).toHaveValue("");
  for (const [width, height] of [
    [820, 1180],
    [390, 844],
    [320, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await expect(editor).toBeVisible();
    const listBox = await page.locator(".admin-layout > section").boundingBox();
    const editorBox = await editor.boundingBox();
    expect(editorBox!.y).toBeGreaterThanOrEqual(listBox!.y + listBox!.height);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `artifacts/lab-03/user-management-${width}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({
    path: "artifacts/lab-03/user-management.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Edit E2E Managed User" }).click();
  await editor.getByLabel("Role").selectOption("IT_STAFF");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(page.getByText("Account updated.")).toBeVisible();
  await page
    .getByLabel("Initial password")
    .fill("Managed reset password 2026!");
  await page
    .getByLabel("Confirm password")
    .fill("Managed reset password 2026!");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Reset Password" }).click();
  await expect(page.getByText(/Initial password reset/)).toBeVisible();
  await page.getByRole("button", { name: "Log out" }).click();
  await login(page, E2E_MANAGED_EMAIL, "Managed reset password 2026!");
  await expect(
    page.getByRole("heading", { name: "Change password" }),
  ).toBeVisible();
  await page.goto("/admin/users");
  await expect(page).toHaveURL(/change-password/);
});
