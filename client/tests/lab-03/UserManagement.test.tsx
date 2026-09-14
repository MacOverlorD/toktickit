import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import * as api from "../../src/api/user-management";
import type { AuthPayload } from "../../src/auth/AuthContext";
vi.mock("../../src/api/user-management", async (o) => ({
  ...(await o<typeof api>()),
  listAccounts: vi.fn(),
  createAccount: vi.fn(),
  editAccount: vi.fn(),
  resetInitialPassword: vi.fn(),
}));
const admin: AuthPayload = {
  user: {
    id: 9,
    name: "Admin",
    email: "admin@example.test",
    role: "ADMINISTRATOR",
    isActive: true,
    mustChangePassword: false,
    version: 1,
  },
  csrfToken: "a".repeat(64),
  expiresAt: "2099-01-01T00:00:00Z",
};
const item: api.Account = {
  id: 10,
  name: "User One",
  email: "user@example.test",
  role: "REQUESTER",
  isActive: true,
  mustChangePassword: true,
  version: 2,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};
beforeEach(() => {
  history.replaceState({}, "", "/admin/users");
  vi.resetAllMocks();
  vi.mocked(api.listAccounts).mockResolvedValue([item]);
});
describe("User Management", () => {
  it("lists, filters and opens an account editor", async () => {
    render(<App initialAuth={admin} />);
    expect(await screen.findByText("user@example.test")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Search name or email"), {
      target: { value: "user" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    await waitFor(() =>
      expect(api.listAccounts).toHaveBeenCalledWith("user", ""),
    );
    fireEvent.click(screen.getByRole("button", { name: "Edit User One" }));
    expect(screen.getByDisplayValue("user@example.test")).toBeInTheDocument();
  });
  it("creates one-role accounts and reports canonical email conflicts", async () => {
    vi.mocked(api.createAccount).mockRejectedValue(
      new api.AccountError("EMAIL_CONFLICT", "duplicate", {
        email: "duplicate",
      }),
    );
    render(<App initialAuth={admin} />);
    await screen.findByText("user@example.test");
    fireEvent.click(screen.getByRole("button", { name: "Create User" }));
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "New User" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "NEW@example.test" },
    });
    fireEvent.change(screen.getByLabelText("Initial password"), {
      target: { value: "Initial password 2026!" },
    });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "Initial password 2026!" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Create User" })[1]);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "canonical email",
    );
  });
  it("preserves edits and offers Reload latest on stale save", async () => {
    vi.mocked(api.editAccount).mockRejectedValue(
      new api.AccountError("STALE_RESOURCE", "stale"),
    );
    render(<App initialAuth={admin} />);
    await screen.findByText("user@example.test");
    fireEvent.click(screen.getByRole("button", { name: "Edit User One" }));
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Keep Draft" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(
      await screen.findByRole("button", { name: "Reload latest" }),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("Keep Draft")).toBeInTheDocument();
  });
});
