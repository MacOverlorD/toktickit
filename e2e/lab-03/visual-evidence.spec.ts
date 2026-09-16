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
const tabbableSelector =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

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

async function verifyMobileNavigation(page: Page) {
  const menu = page.getByRole("button", { name: "Open navigation" });
  if (!(await menu.isVisible())) return;
  await menu.click();
  const close = page.getByRole("button", { name: "Close navigation" });
  await expect(close).toHaveAttribute("aria-expanded", "true");
  await close.focus();
  await page.keyboard.press("Tab");
  const result = await page.evaluate(() => {
    const active = document.activeElement as HTMLElement;
    const navigation = document.getElementById("primary-navigation");
    const style = getComputedStyle(active);
    return {
      insideNavigation: Boolean(navigation?.contains(active)),
      visible: Boolean(
        active.getBoundingClientRect().width &&
        active.getBoundingClientRect().height,
      ),
      focusVisible: active.matches(":focus-visible"),
      hasIndicator:
        style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0,
    };
  });
  expect(result).toEqual({
    insideNavigation: true,
    visible: true,
    focusVisible: true,
    hasIndicator: true,
  });
  await close.click();
}

async function verifyCompleteKeyboardPath(page: Page) {
  await verifyMobileNavigation(page);
  const count = await page.locator(tabbableSelector).evaluateAll(
    (elements) =>
      elements.filter((element) => {
        const html = element as HTMLElement;
        const style = getComputedStyle(html);
        const rectangle = html.getBoundingClientRect();
        return (
          html.tabIndex >= 0 &&
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          rectangle.width > 0 &&
          rectangle.height > 0
        );
      }).length,
  );
  expect(count).toBeGreaterThan(0);
  let startIndex = 0;
  const skipLink = page.locator(".skip-link");
  if (await skipLink.isVisible()) {
    await skipLink.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect(skipLink).toBeFocused();
    const skipFocus = await skipLink.evaluate((element) => {
      const rectangle = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        inViewport: rectangle.top >= 0 && rectangle.bottom <= innerHeight,
        focusVisible: element.matches(":focus-visible"),
        hasIndicator:
          style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0,
      };
    });
    expect(skipFocus).toEqual({
      inViewport: true,
      focusVisible: true,
      hasIndicator: true,
    });
    startIndex = 1;
  } else {
    await page.locator("body").click({ position: { x: 1, y: 1 } });
    await page.evaluate(() =>
      (document.activeElement as HTMLElement | null)?.blur(),
    );
  }
  for (let index = startIndex; index < count; index += 1) {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(50);

    const result = await page.evaluate(
      ({ selector, expectedIndex }) => {
        const elements = Array.from(
          document.querySelectorAll<HTMLElement>(selector),
        ).filter((element) => {
          const style = getComputedStyle(element);
          const rectangle = element.getBoundingClientRect();
          return (
            element.tabIndex >= 0 &&
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            rectangle.width > 0 &&
            rectangle.height > 0
          );
        });
        const active = document.activeElement as HTMLElement;
        const visualTarget =
          active instanceof HTMLInputElement &&
          active.classList.contains("visually-hidden")
            ? active.labels?.[0] ?? active
            : active;
        const rectangle = visualTarget.getBoundingClientRect();
        const style = getComputedStyle(visualTarget);
        const expected = elements[expectedIndex];
        return {
          expectedTarget: active === expected,
          expectedLabel:
            expected?.getAttribute("aria-label") ||
            expected?.textContent?.trim() ||
            expected?.tagName,
          activeLabel:
            active.getAttribute("aria-label") ||
            active.textContent?.trim() ||
            active.tagName,
          actualIndex: elements.indexOf(active),
          rectangle: {
            top: rectangle.top,
            bottom: rectangle.bottom,
            left: rectangle.left,
            right: rectangle.right,
          },
          viewport: { width: innerWidth, height: innerHeight, scrollY },
          inViewport:
            rectangle.bottom > 0 &&
            rectangle.top < innerHeight &&
            rectangle.right > 0 &&
            rectangle.left < innerWidth,
          focusVisible: active.matches(":focus-visible"),
          hasIndicator:
            style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0,
        };
      },
      { selector: tabbableSelector, expectedIndex: index },
    );
    expect(result.expectedTarget, JSON.stringify(result)).toBe(true);
    expect(result.focusVisible, JSON.stringify(result)).toBe(true);
    expect(result.hasIndicator, JSON.stringify(result)).toBe(true);
  }
}

async function capture(page: Page, folder: string, screen: string) {
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => scrollTo(0, 0));
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
    await verifyCompleteKeyboardPath(page);
    await page.screenshot({
      path: `artifacts/lab-03/screenshots/${folder}/${screen}-${viewport.name}.png`,
      fullPage: true,
    });
  }
}

async function saveValidationEvidence(
  page: Page,
  folder: string,
  screen: string,
) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `artifacts/lab-03/screenshots/${folder}/${screen}-boundary-320.png`,
    fullPage: true,
  });
}

test("captures authentication, validation, and mandatory-change evidence", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await capture(page, "authentication", "login");
  await page.setViewportSize({ width: 320, height: 844 });
  await page.getByLabel(/^Email/).fill("invalid-email");
  await page.getByLabel(/^Password/).fill("x");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByLabel(/^Email/)).toBeFocused();
  await expect(page.getByLabel(/^Email/)).toHaveJSProperty(
    "validity.valid",
    false,
  );
  await saveValidationEvidence(page, "authentication", "login-validation");

  await login(page, E2E_VISUAL_AUTH_USER.email, E2E_INITIAL_PASSWORD);
  await expect(
    page.getByRole("heading", { name: "Change password" }),
  ).toBeVisible();
  await capture(page, "authentication", "mandatory-change");
  await page.setViewportSize({ width: 320, height: 844 });
  await page.getByLabel(/^Current password/).fill(E2E_INITIAL_PASSWORD);
  await page.getByLabel(/^New password/).fill("short");
  await page.getByLabel(/^Confirm new password/).fill("different");
  await page.getByRole("button", { name: "Save password" }).click();
  await expect(
    page.getByText(
      "Use 15 to 128 characters and no more than 512 UTF-8 bytes.",
    ),
  ).toBeVisible();
  await expect(page.getByLabel(/^New password/)).toBeFocused();
  await saveValidationEvidence(
    page,
    "authentication",
    "change-password-validation",
  );
});

test("captures Requester keyboard and communication validation evidence", async ({
  page,
}) => {
  await login(page, E2E_REQUESTER_USERS[0].email);
  await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
  await capture(page, "requester", "my-tickets");
  await page.goto(`/tickets/${E2E_WORKFLOW_TICKET}`);
  await expect(
    page.getByRole("heading", { name: E2E_WORKFLOW_TICKET }),
  ).toBeVisible();
  await expect(page.getByText("Internal Notes")).toHaveCount(0);
  await capture(page, "requester", "ticket-detail");
  await page.setViewportSize({ width: 320, height: 844 });
  await page.getByRole("button", { name: "Add Public Comment" }).click();
  await expect(page.getByText("Enter a public comment.")).toBeVisible();
  await expect(
    page.getByLabel("Public: visible to Requester and staff"),
  ).toBeFocused();
  await saveValidationEvidence(page, "requester", "comment-validation");
});

test("captures Staff keyboard and communication validation evidence", async ({
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
  await page.setViewportSize({ width: 320, height: 844 });
  await page.getByRole("button", { name: "Add Public Comment" }).click();
  await expect(page.getByText("Enter a message.")).toBeVisible();
  await expect(page.getByLabel("Public: visible to Requester")).toBeFocused();
  await saveValidationEvidence(
    page,
    "staff-ticket-detail",
    "comment-validation",
  );
  const owner = page.getByLabel("Owner");
  const rejectedOperation =
    (await owner.inputValue()) === ""
      ? {
          control: page.getByLabel("Next Status"),
          submit: page.getByRole("button", { name: "Change Status" }),
        }
      : {
          control: owner,
          submit: page.getByRole("button", { name: "Save Owner" }),
        };
  if ((await owner.inputValue()) !== "") await owner.selectOption("");
  await rejectedOperation.submit.click();
  await expect(
    page.getByText("Assign an eligible owner before this action."),
  ).toBeVisible();
  await expect(rejectedOperation.control).toBeFocused();
  await expect(rejectedOperation.control).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await saveValidationEvidence(
    page,
    "staff-ticket-detail",
    "operation-validation",
  );
});

test("brings the Administrator editor and validation into view at every responsive width", async ({
  page,
}) => {
  await login(page, E2E_ADMIN_USER.email);
  await page.goto("/admin/users");
  await expect(
    page.getByRole("heading", { name: "User Management" }),
  ).toBeVisible();
  await capture(page, "user-management", "accounts");
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto("/admin/users");
    await expect(
      page.getByRole("heading", { name: "User Management" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Create User" }).click();
    const editorHeading = page.getByRole("heading", { name: "Create User" });
    await expect(editorHeading).toBeFocused();
    await expect
      .poll(async () =>
        editorHeading.evaluate((heading) => {
          const rectangle = heading.getBoundingClientRect();
          return rectangle.top >= 0 && rectangle.bottom <= innerHeight;
        }),
      )
      .toBe(true);
    await page.keyboard.press("Tab");
    const firstEditorField = page.getByLabel("Name", { exact: true });
    await expect(firstEditorField).toBeFocused();
    const editorFieldFocus = await firstEditorField.evaluate((element) => {
      const rectangle = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        inViewport: rectangle.top >= 0 && rectangle.bottom <= innerHeight,
        focusVisible: element.matches(":focus-visible"),
        hasIndicator:
          style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0,
      };
    });
    expect(editorFieldFocus).toEqual({
      inViewport: true,
      focusVisible: true,
      hasIndicator: true,
    });
    await page
      .getByRole("button", { name: "Create User", exact: true })
      .last()
      .click();
    await expect(page.getByRole("alert").first()).toBeVisible();
    await expect(page.getByLabel("Name", { exact: true })).toBeFocused();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `artifacts/lab-03/screenshots/user-management/create-user-validation-${viewport.name}.png`,
    });
  }
});
