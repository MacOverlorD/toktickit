import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import * as actions from "../../src/api/actions-taken";
import * as workflow from "../../src/api/ticket-workflow";
import type { AuthPayload } from "../../src/auth/AuthContext";

vi.mock("../../src/api/actions-taken", async (importOriginal) => ({
  ...(await importOriginal<typeof actions>()),
  listActionsTaken: vi.fn(),
}));
vi.mock("../../src/api/ticket-workflow", async (importOriginal) => ({
  ...(await importOriginal<typeof workflow>()),
  getStaffTicketDetail: vi.fn(),
  getOwners: vi.fn(),
  getStaffAttachments: vi.fn(),
  listEntries: vi.fn(),
  updateOperation: vi.fn(),
}));

const staff: AuthPayload = {
  user: {
    id: 9,
    name: "Suda Staff",
    email: "suda@example.test",
    role: "IT_STAFF",
    isActive: true,
    mustChangePassword: false,
    version: 1,
  },
  csrfToken: "a".repeat(64),
  expiresAt: "2026-10-01T00:00:00.000Z",
};
const detail: workflow.StaffTicketDetail = {
  ticketNumber: "TKT-20260930-A1B2C3D4",
  ticketDate: "2026-09-30T01:00:00.000Z",
  updatedAt: "2026-09-30T02:00:00.000Z",
  version: 6,
  requester: { id: 1, name: "Anan", email: "anan@example.test" },
  category: { id: 1, name: "Hardware" },
  relatedSystem: { id: 1, name: "Laptop" },
  summary: "Laptop cannot connect",
  description: "The connection drops repeatedly.",
  requestedPriority: "HIGH",
  itPriority: "HIGH",
  status: "IN_PROGRESS",
  workCycle: 1,
  resolvedAt: null,
  owner: { id: 9, name: "Suda Staff", role: "IT_STAFF" },
  resolutionIndicatedAt: null,
  resolutionIndicatedBy: null,
};

beforeEach(() => {
  window.history.replaceState({}, "", `/staff/tickets/${detail.ticketNumber}`);
  vi.mocked(workflow.getStaffTicketDetail).mockResolvedValue(detail);
  vi.mocked(workflow.getOwners).mockResolvedValue([detail.owner!]);
  vi.mocked(workflow.getStaffAttachments).mockResolvedValue([]);
  vi.mocked(workflow.listEntries).mockResolvedValue([]);
  vi.mocked(actions.listActionsTaken).mockResolvedValue([]);
  vi.stubGlobal("confirm", vi.fn(() => true));
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  window.history.replaceState({}, "", "/");
});

describe("Lab 4 final Ticket workflow UI", () => {
  it("offers only transitions permitted from the authoritative current status", async () => {
    render(<App initialAuth={staff} />);
    const select = await screen.findByLabelText("Next Status");
    const options = within(select).getAllByRole("option").map((item) => item.textContent);
    expect(options).toEqual(["Waiting For Requester", "Resolved", "Cancelled"]);
    expect(options).not.toContain("Closed");
    expect(options).not.toContain("Reopened");
  });

  it("hides owner-required transitions when the current owner is no longer eligible", async () => {
    vi.mocked(workflow.getStaffTicketDetail).mockResolvedValue({
      ...detail,
      status: "OPEN",
    });
    vi.mocked(workflow.getOwners).mockResolvedValue([]);
    render(<App initialAuth={staff} />);
    const select = await screen.findByLabelText("Next Status");
    expect(
      within(select).getAllByRole("option").map((item) => item.textContent),
    ).toEqual(["Cancelled"]);
  });

  it("explains a backend resolution-gate rejection and preserves the current summary", async () => {
    vi.mocked(workflow.updateOperation).mockRejectedValueOnce(
      new workflow.WorkflowError(
        "RESOLUTION_ACTION_REQUIRED",
        "qualifying Action required",
      ),
    );
    render(<App initialAuth={staff} />);
    const select = await screen.findByLabelText("Next Status");
    fireEvent.change(select, { target: { value: "RESOLVED" } });
    expect(
      screen.getByText("Requires a completed Action Taken from work cycle 1."),
    ).toBeInTheDocument();
    expect(select).toHaveAttribute("aria-describedby", "resolution-status-help");
    expect(select.parentElement).toContainElement(
      screen.getByText("Requires a completed Action Taken from work cycle 1."),
    );
    fireEvent.click(screen.getByRole("button", { name: "Change Status" }));
    expect(window.confirm).toHaveBeenCalled();
    expect(
      await screen.findByText(
        "Complete an Action Taken in the current work cycle before resolving this ticket.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByRole("region", { name: "Actions Taken" }),
      ).toHaveFocus(),
    );
  });

  it("treats an exhausted concurrent transaction as a reloadable conflict", async () => {
    vi.mocked(workflow.updateOperation).mockRejectedValueOnce(
      new workflow.WorkflowError(
        "CONCURRENT_UPDATE",
        "The ticket changed concurrently. Try again.",
      ),
    );
    render(<App initialAuth={staff} />);
    await screen.findByLabelText("Next Status");
    fireEvent.click(screen.getByRole("button", { name: "Change Status" }));
    expect(
      await screen.findByText(
        "This ticket changed. Reload latest before trying again.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Reload latest" }),
    ).toBeInTheDocument();
  });

  it("refreshes status, version, work cycle, and resolved summary after reopening", async () => {
    const resolved = {
      ...detail,
      status: "RESOLVED" as const,
      resolvedAt: "2026-09-30T02:30:00.000Z",
      version: 7,
    };
    vi.mocked(workflow.getStaffTicketDetail).mockResolvedValue(resolved);
    vi.mocked(workflow.updateOperation).mockResolvedValue({
      ticketNumber: detail.ticketNumber,
      owner: detail.owner,
      itPriority: detail.itPriority,
      status: "REOPENED",
      workCycle: 2,
      resolvedAt: null,
      version: 8,
      updatedAt: "2026-09-30T03:00:00.000Z",
      resolutionIndicatedAt: null,
    });
    render(<App initialAuth={staff} />);
    await screen.findByRole("heading", { name: detail.ticketNumber });
    fireEvent.change(screen.getByLabelText("Next Status"), {
      target: { value: "REOPENED" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Change Status" }));
    expect(await screen.findByText("Ticket updated.")).toBeInTheDocument();
    expect(screen.getByText(/Version 8/)).toBeInTheDocument();
    expect(screen.getByText("Reopened")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Not resolved")).toBeInTheDocument();
  });
});
