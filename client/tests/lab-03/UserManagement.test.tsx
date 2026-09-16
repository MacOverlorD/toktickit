import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
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
    expect(
      await screen.findByText("That canonical email is already in use."),
    ).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText("Email")).toHaveFocus());
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
    vi.mocked(api.listAccounts).mockResolvedValue([
      { ...item, name: "Server name", version: 7 },
    ]);
    fireEvent.click(screen.getByRole("button", { name: "Reload latest" }));
    await screen.findByText("Source version: 7");
    expect(screen.getByLabelText("Name")).toHaveValue("Keep Draft");
    expect(api.editAccount).toHaveBeenCalledTimes(1);
    vi.mocked(api.editAccount).mockResolvedValue({
      ...item,
      name: "Keep Draft",
      version: 8,
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() =>
      expect(api.editAccount).toHaveBeenLastCalledWith(
        item.id,
        expect.objectContaining({ name: "Keep Draft", expectedVersion: 7 }),
      ),
    );
  });
  it("keeps password input focused for each character and clears credentials after creation", async () => {
    vi.mocked(api.createAccount).mockResolvedValue(item);
    render(<App initialAuth={admin} />);
    await screen.findByText("user@example.test");
    fireEvent.click(screen.getByRole("button", { name: "Create User" }));
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: item.name },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: item.email },
    });
    for (const label of ["Initial password", "Confirm password"]) {
      const input = screen.getByLabelText(label) as HTMLInputElement;
      input.focus();
      for (const character of "Initial password 2026!") {
        fireEvent.keyDown(input, { key: character });
        fireEvent.change(input, { target: { value: input.value + character } });
        fireEvent.keyUp(input, { key: character });
        expect(input).toHaveFocus();
        expect(screen.getByLabelText(label)).toBe(input);
      }
      expect(input).toHaveValue("Initial password 2026!");
    }
    fireEvent.click(screen.getAllByRole("button", { name: "Create User" })[1]);
    await screen.findByText("Account created.");
    expect(screen.getByLabelText("Initial password")).toHaveValue("");
    expect(screen.getByLabelText("Confirm password")).toHaveValue("");
  });
  it.each(["deactivation", "Requester role"])(
    "explains ticket unassignment for %s",
    async (transition) => {
      vi.mocked(api.listAccounts).mockResolvedValue([
        { ...item, role: "IT_STAFF" },
      ]);
      const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
      render(<App initialAuth={admin} />);
      await screen.findByText("user@example.test");
      fireEvent.click(screen.getByRole("button", { name: "Edit User One" }));
      if (transition === "deactivation")
        fireEvent.click(screen.getByLabelText("Active account"));
      else
        fireEvent.change(screen.getAllByLabelText("Role")[1], {
          target: { value: "REQUESTER" },
        });
      fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
      expect(confirm).toHaveBeenCalledWith(
        expect.stringContaining(
          "Existing sessions will end. Any owned tickets will become unassigned and may require reassignment.",
        ),
      );
      expect(api.editAccount).not.toHaveBeenCalled();
      confirm.mockRestore();
    },
  );
  it("ignores older responses arriving after the newest search", async () => {
    let oldResolve!: (items: api.Account[]) => void;
    let newResolve!: (items: api.Account[]) => void;
    render(<App initialAuth={admin} />);
    await screen.findByText("user@example.test");
    vi.mocked(api.listAccounts).mockImplementation(
      (search) =>
        new Promise((resolve) => {
          if (search === "old") oldResolve = resolve;
          else newResolve = resolve;
        }),
    );
    fireEvent.change(screen.getByLabelText("Search name or email"), {
      target: { value: "old" },
    });
    fireEvent.change(screen.getByLabelText("Search name or email"), {
      target: { value: "new" },
    });
    await act(async () => newResolve([{ ...item, email: "new@example.test" }]));
    await screen.findByText("new@example.test");
    await act(async () => oldResolve([{ ...item, email: "old@example.test" }]));
    expect(screen.getByText("new@example.test")).toBeInTheDocument();
    expect(screen.queryByText("old@example.test")).not.toBeInTheDocument();
  });
  it("focuses and scrolls the responsive editor into view when opened", async () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: true })),
    );
    try {
      render(<App initialAuth={admin} />);
      await screen.findByText("user@example.test");
      fireEvent.click(screen.getByRole("button", { name: "Create User" }));
      const heading = screen.getByRole("heading", { name: "Create User" });
      await waitFor(() => expect(heading).toHaveFocus());
      expect(scrollIntoView).toHaveBeenCalledWith({
        block: "start",
        behavior: "auto",
      });
    } finally {
      vi.unstubAllGlobals();
      delete (HTMLElement.prototype as { scrollIntoView?: unknown })
        .scrollIntoView;
    }
  });
});
