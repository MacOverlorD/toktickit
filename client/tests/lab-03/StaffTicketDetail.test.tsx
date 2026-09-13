import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import * as workflow from "../../src/api/ticket-workflow";
import type { AuthPayload } from "../../src/auth/AuthContext";

vi.mock("../../src/api/ticket-workflow", async (importOriginal) => ({
  ...(await importOriginal<typeof workflow>()),
  getStaffTicketDetail: vi.fn(),
  getOwners: vi.fn(),
  getStaffAttachments: vi.fn(),
  listEntries: vi.fn(),
  updateOperation: vi.fn(),
  appendEntry: vi.fn(),
  getStaffAttachmentContent: vi.fn(),
}));
const staff: AuthPayload = {
  user: {
    id: 9,
    name: "Suda",
    email: "suda@example.test",
    role: "IT_STAFF",
    isActive: true,
    mustChangePassword: false,
    version: 1,
  },
  csrfToken: "a".repeat(64),
  expiresAt: "2026-09-14T00:00:00.000Z",
};
const detail: workflow.StaffTicketDetail = {
  ticketNumber: "TKT-20260913-ABCDEF01",
  ticketDate: "2026-09-13T01:00:00.000Z",
  updatedAt: "2026-09-13T02:00:00.000Z",
  version: 3,
  requester: { id: 1, name: "Anan", email: "anan@example.test" },
  category: { id: 1, name: "Hardware" },
  relatedSystem: { id: 1, name: "Laptop" },
  summary: "Laptop offline",
  description: "Cannot connect.",
  requestedPriority: "HIGH",
  itPriority: "MEDIUM",
  status: "OPEN",
  owner: null,
  resolutionIndicatedAt: null,
  resolutionIndicatedBy: null,
};
const updated = {
  ticketNumber: detail.ticketNumber,
  owner: { id: 9, name: "Suda", role: "IT_STAFF" } as const,
  itPriority: "URGENT" as const,
  status: "IN_PROGRESS" as const,
  version: 4,
  updatedAt: detail.updatedAt,
  resolutionIndicatedAt: null,
};
beforeEach(() => {
  window.history.replaceState({}, "", "/staff/tickets/" + detail.ticketNumber);
  vi.mocked(workflow.getStaffTicketDetail).mockResolvedValue(detail);
  vi.mocked(workflow.getOwners).mockResolvedValue([
    { id: 9, name: "Suda", role: "IT_STAFF" },
  ]);
  vi.mocked(workflow.getStaffAttachments).mockResolvedValue([
    {
      id: 2,
      originalName: "proof.pdf",
      mimeType: "application/pdf",
      sizeBytes: 12,
      createdAt: detail.ticketDate,
      isRemoved: false,
      removedAt: null,
      removalReason: null,
    },
  ]);
  vi.mocked(workflow.listEntries).mockImplementation(async (_n, kind) =>
    kind === "comments"
      ? [
          {
            id: 1,
            content: "Public <script>alert(1)</script>",
            author: { id: 1, name: "Anan", role: "REQUESTER" },
            createdAt: detail.ticketDate,
          },
        ]
      : [
          {
            id: 2,
            content: "Private note",
            author: { id: 9, name: "Suda", role: "IT_STAFF" },
            createdAt: detail.ticketDate,
          },
        ],
  );
  vi.mocked(workflow.updateOperation).mockResolvedValue(updated);
  vi.mocked(workflow.appendEntry).mockResolvedValue({
    id: 3,
    content: "saved",
    author: { id: 9, name: "Suda", role: "IT_STAFF" },
    createdAt: detail.ticketDate,
  });
});
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  window.history.replaceState({}, "", "/");
});
describe("Staff Ticket Detail", () => {
  it("loads safe fields, read-only attachments and distinct public/private timelines", async () => {
    render(<App initialAuth={staff} />);
    expect(
      await screen.findByRole("heading", { name: detail.ticketNumber }),
    ).toBeInTheDocument();
    expect(screen.getByText("Laptop offline")).toBeInTheDocument();
    expect(screen.getByText("proof.pdf")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /remove proof/i }),
    ).not.toBeInTheDocument();
    const comments = screen
      .getByRole("heading", { name: "Public Comments" })
      .closest("section")!;
    const notes = screen
      .getByRole("heading", { name: "Internal Notes" })
      .closest("section")!;
    expect(
      within(comments).getByText("Public <script>alert(1)</script>"),
    ).toBeInTheDocument();
    expect(within(notes).getByText("Private note")).toBeInTheDocument();
  });
  it("claims, changes priority and confirms named status transitions with current versions", async () => {
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );
    render(<App initialAuth={staff} />);
    await screen.findByRole("heading", { name: detail.ticketNumber });
    fireEvent.click(screen.getByRole("button", { name: "Claim" }));
    await waitFor(() =>
      expect(workflow.updateOperation).toHaveBeenCalledWith(
        detail.ticketNumber,
        "owner",
        { ownerId: 9, expectedVersion: 3 },
      ),
    );
    fireEvent.change(screen.getByLabelText("IT Priority"), {
      target: { value: "URGENT" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save IT Priority" }));
    await waitFor(() =>
      expect(workflow.updateOperation).toHaveBeenCalledWith(
        detail.ticketNumber,
        "priority",
        expect.objectContaining({ itPriority: "URGENT" }),
      ),
    );
    fireEvent.change(screen.getByLabelText("Next Status"), {
      target: { value: "CANCELLED" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Change Status" }));
    await waitFor(() =>
      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringContaining(detail.ticketNumber),
      ),
    );
    expect(workflow.updateOperation).toHaveBeenCalledWith(
      detail.ticketNumber,
      "status",
      expect.objectContaining({ status: "CANCELLED", confirmed: true }),
    );
  });
  it("preserves a failed comment draft and reports stale operation feedback", async () => {
    vi.mocked(workflow.appendEntry).mockRejectedValue(new Error("offline"));
    vi.mocked(workflow.updateOperation).mockRejectedValue(
      new workflow.WorkflowError("STALE_RESOURCE", "stale"),
    );
    render(<App initialAuth={staff} />);
    await screen.findByRole("heading", { name: detail.ticketNumber });
    const publicDraft = screen.getByLabelText("Public: visible to Requester");
    fireEvent.change(publicDraft, { target: { value: "keep this" } });
    fireEvent.click(screen.getByRole("button", { name: "Add Public Comment" }));
    expect(await screen.findByDisplayValue("keep this")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save IT Priority" }));
    await waitFor(() =>
      expect(
        screen
          .getAllByRole("alert")
          .some((item) => item.textContent?.includes("Reload latest")),
      ).toBe(true),
    );
  });
});
