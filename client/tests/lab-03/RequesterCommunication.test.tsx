import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import RequesterTicketCommunication from "../../src/components/RequesterTicketCommunication";
import * as workflow from "../../src/api/ticket-workflow";
import type { TicketDetail } from "../../src/api/ticket-detail";
vi.mock("../../src/api/ticket-workflow", async (importOriginal) => ({
  ...(await importOriginal<typeof workflow>()),
  listEntries: vi.fn().mockResolvedValue([]),
  appendEntry: vi.fn(),
  indicateResolution: vi.fn(),
}));
const ticket: TicketDetail = {
  ticketNumber: "TKT-20260913-ABCDEF01",
  ticketDate: "2026-09-13T01:00:00.000Z",
  requester: { id: 1, name: "Anan", email: "a@example.test" },
  category: { id: 1, name: "Hardware" },
  relatedSystem: { id: 1, name: "Laptop" },
  summary: "Fixed",
  description: "Works now",
  requestedPriority: "HIGH",
  status: "OPEN",
  version: 5,
  resolutionIndicatedAt: null,
  attachments: [],
};
afterEach(() => vi.clearAllMocks());
describe("Requester detail communication", () => {
  it("indicates resolution without formal status change and posts public comments", async () => {
    vi.mocked(workflow.indicateResolution).mockResolvedValue({
      ticketNumber: ticket.ticketNumber,
      status: "OPEN",
      version: 6,
      resolutionIndicatedAt: "2026-09-13T03:00:00.000Z",
    });
    vi.mocked(workflow.appendEntry).mockResolvedValue({
      id: 1,
      content: "Thanks",
      author: { id: 1, name: "Anan", role: "REQUESTER" },
      createdAt: ticket.ticketDate,
    });
    const changed = vi.fn();
    render(
      <MemoryRouter initialEntries={["/tickets/" + ticket.ticketNumber]}>
        <Routes>
          <Route
            path={"/tickets/:ticketNumber"}
            element={
              <RequesterTicketCommunication
                ticket={ticket}
                onTicketChange={changed}
              />
            }
          />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Problem Appears Resolved" }),
    );
    await waitFor(() =>
      expect(workflow.indicateResolution).toHaveBeenCalledWith(
        ticket.ticketNumber,
        5,
      ),
    );
    expect(changed).toHaveBeenCalledWith(
      expect.objectContaining({ status: "OPEN", version: 6 }),
    );
    fireEvent.change(
      screen.getByLabelText("Public: visible to Requester and staff"),
      { target: { value: "Thanks" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Add Public Comment" }));
    await waitFor(() =>
      expect(workflow.appendEntry).toHaveBeenCalledWith(
        ticket.ticketNumber,
        "comments",
        "Thanks",
      ),
    );
  });
});
