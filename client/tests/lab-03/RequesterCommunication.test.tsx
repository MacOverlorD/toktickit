import { useState } from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
const reload = vi.fn<() => Promise<TicketDetail>>();
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(workflow.listEntries).mockResolvedValue([]);
  vi.mocked(workflow.appendEntry).mockResolvedValue({
    id: 1,
    content: "saved",
    author: { id: 1, name: "Anan", role: "REQUESTER" },
    createdAt: ticket.ticketDate,
  });
  reload.mockResolvedValue({ ...ticket, version: 7 });
});
afterEach(() => vi.clearAllMocks());
function Harness() {
  const [current, setCurrent] = useState(ticket);
  return (
    <RequesterTicketCommunication
      ticket={current}
      onTicketChange={setCurrent}
      onReload={async () => {
        const latest = await reload();
        setCurrent(latest);
        return latest;
      }}
    />
  );
}
function writeComment(value: string) {
  fireEvent.change(
    screen.getByLabelText("Public: visible to Requester and staff"),
    { target: { value } },
  );
  fireEvent.click(screen.getByRole("button", { name: "Add Public Comment" }));
}
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
                onReload={reload}
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

describe("Requester concurrency and recovery", () => {
  it("loads version 7 after another client changes version 5 before a comment", async () => {
    vi.mocked(workflow.indicateResolution).mockResolvedValue({
      ticketNumber: ticket.ticketNumber,
      status: "OPEN",
      version: 8,
      resolutionIndicatedAt: "2026-09-13T03:00:00.000Z",
    });
    render(<Harness />);
    await screen.findByText("No public comments yet.");
    writeComment("After staff update");
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Problem Appears Resolved" }),
      ).toBeEnabled(),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Problem Appears Resolved" }),
    );
    await waitFor(() =>
      expect(workflow.indicateResolution).toHaveBeenCalledWith(
        ticket.ticketNumber,
        7,
      ),
    );
  });
  it("reloads authoritative detail after an uncertain comment response and keeps the draft", async () => {
    vi.mocked(workflow.appendEntry).mockRejectedValue(
      new Error("connection lost"),
    );
    render(<Harness />);
    await screen.findByText("No public comments yet.");
    writeComment("Keep uncertain draft");
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(
      screen.getByDisplayValue("Keep uncertain draft"),
    ).toBeInTheDocument();
    expect(workflow.appendEntry).toHaveBeenCalledTimes(1);
  });
  it("recovers a stale indication with an explicit reload without resubmitting or losing a draft", async () => {
    vi.mocked(workflow.indicateResolution).mockRejectedValue(
      new workflow.WorkflowError("STALE_RESOURCE", "stale"),
    );
    render(<Harness />);
    await screen.findByText("No public comments yet.");
    fireEvent.change(
      screen.getByLabelText("Public: visible to Requester and staff"),
      { target: { value: "Keep recovery draft" } },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Problem Appears Resolved" }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Reload latest" }),
    );
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Reload latest" }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByDisplayValue("Keep recovery draft")).toBeInTheDocument();
    expect(workflow.indicateResolution).toHaveBeenCalledTimes(1);
    expect(workflow.appendEntry).not.toHaveBeenCalled();
  });
  it("shows pending and failed timelines distinctly and retries before showing empty", async () => {
    let reject!: (error: Error) => void;
    vi.mocked(workflow.listEntries).mockReturnValueOnce(
      new Promise((_resolve, fail) => {
        reject = fail;
      }),
    );
    render(<Harness />);
    expect(screen.getByText("Loading public comments...")).toBeInTheDocument();
    expect(
      screen.queryByText("No public comments yet."),
    ).not.toBeInTheDocument();
    await act(async () => reject(new Error("offline")));
    expect(
      screen.getByText("Public comments could not be loaded."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("No public comments yet."),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Retry public comments" }),
    );
    await screen.findByText("No public comments yet.");
    expect(workflow.listEntries).toHaveBeenCalledTimes(2);
  });
  it.each([5000, 5001])(
    "validates an astral Unicode draft of %i code points",
    async (count) => {
      render(<Harness />);
      await screen.findByText("No public comments yet.");
      const draft = String.fromCodePoint(0x1f600).repeat(count);
      expect(
        screen.getByLabelText("Public: visible to Requester and staff"),
      ).not.toHaveAttribute("maxlength");
      writeComment(draft);
      expect(screen.getByText(`${count}/5000 characters`)).toBeInTheDocument();
      if (count === 5000) {
        await waitFor(() =>
          expect(workflow.appendEntry).toHaveBeenCalledWith(
            ticket.ticketNumber,
            "comments",
            draft,
          ),
        );
        await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
      } else {
        expect(workflow.appendEntry).not.toHaveBeenCalled();
        expect(screen.getByRole("alert")).toHaveTextContent("at most 5000");
      }
    },
  );
});
