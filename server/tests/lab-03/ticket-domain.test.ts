import { describe, expect, it } from "vitest";
import type { TicketStatus } from "@prisma/client";
import {
  CONFIRMED_STATUSES,
  OWNER_REQUIRED_STATUSES,
  TRANSITIONS,
  validateContent,
} from "../../src/tickets/ticket-domain.js";
const statuses = Object.keys(TRANSITIONS) as TicketStatus[];
describe("Lab 3 ticket workflow domain", () => {
  it("defines every edge in the approved eight-by-eight transition matrix", () => {
    expect(statuses).toHaveLength(8);
    for (const from of statuses)
      for (const to of statuses)
        expect(TRANSITIONS[from].includes(to)).toBe(
          (
            {
              NEW: ["OPEN", "CANCELLED"],
              OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
              IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
              WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
              RESOLVED: ["CLOSED", "REOPENED"],
              CLOSED: ["REOPENED"],
              REOPENED: [
                "OPEN",
                "IN_PROGRESS",
                "WAITING_FOR_REQUESTER",
                "CANCELLED",
              ],
              CANCELLED: ["REOPENED"],
            } as Record<TicketStatus, TicketStatus[]>
          )[from].includes(to),
        );
  });
  it("keeps confirmation and owner-required sets exact", () => {
    expect([...CONFIRMED_STATUSES].sort()).toEqual([
      "CANCELLED",
      "CLOSED",
      "REOPENED",
      "RESOLVED",
    ]);
    expect([...OWNER_REQUIRED_STATUSES].sort()).toEqual([
      "CLOSED",
      "IN_PROGRESS",
      "RESOLVED",
      "WAITING_FOR_REQUESTER",
    ]);
  });
  it("trims valid plain text and rejects blank, oversized, unknown and malformed values", () => {
    expect(validateContent({ content: "  hello\nworld  " })).toBe(
      "hello\nworld",
    );
    for (const body of [
      { content: " " },
      { content: "x".repeat(5001) },
      { content: "ok", authorId: 1 },
      { content: 7 },
      { content: "\ud800" },
    ])
      expect(() => validateContent(body)).toThrow();
  });
});
