import { apiFetch } from "./request";
import type { RequestedPriority, TicketStatus } from "./tickets";
import type { TicketAttachmentMetadata } from "./ticket-detail";

export interface SafeOwner {
  id: number;
  name: string;
  role: "IT_STAFF" | "ADMINISTRATOR";
}
export interface Entry {
  id: number;
  content: string;
  author: {
    id: number;
    name: string;
    role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
  };
  createdAt: string;
}
export interface StaffTicketDetail {
  ticketNumber: string;
  ticketDate: string;
  updatedAt: string;
  version: number;
  requester: { id: number; name: string; email: string };
  category: { id: number; name: string };
  relatedSystem: { id: number; name: string };
  summary: string;
  description: string;
  requestedPriority: RequestedPriority;
  itPriority: RequestedPriority;
  status: TicketStatus;
  owner: SafeOwner | null;
  resolutionIndicatedAt: string | null;
  resolutionIndicatedBy: { id: number; name: string } | null;
}
export class WorkflowError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly fieldErrors: Record<string, string> = {},
  ) {
    super(message);
  }
}
async function json<T>(response: Response, fallback: string): Promise<T> {
  const body: any = await response.json().catch(() => null);
  if (!response.ok)
    throw new WorkflowError(
      body?.error?.code ?? "REQUEST_FAILED",
      body?.error?.message ?? fallback,
      body?.error?.fieldErrors ?? {},
    );
  return body as T;
}
function staff(ticket: string) {
  return `/api/staff/tickets/${encodeURIComponent(ticket)}`;
}
function ticket(ticketNumber: string) {
  return `/api/tickets/${encodeURIComponent(ticketNumber)}`;
}
export async function getStaffTicketDetail(number: string) {
  return json<StaffTicketDetail>(
    await apiFetch(staff(number)),
    "Ticket details could not be loaded.",
  );
}
export async function getOwners() {
  return (
    await json<{ items: SafeOwner[] }>(
      await apiFetch("/api/staff/ticket-owners"),
      "Owners could not be loaded.",
    )
  ).items;
}
export async function updateOperation(
  number: string,
  kind: "owner" | "priority" | "status",
  body: object,
) {
  return json<
    Pick<
      StaffTicketDetail,
      | "ticketNumber"
      | "owner"
      | "itPriority"
      | "status"
      | "version"
      | "updatedAt"
      | "resolutionIndicatedAt"
    >
  >(
    await apiFetch(`${staff(number)}/${kind}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    "The ticket could not be updated.",
  );
}
export async function getStaffAttachments(number: string) {
  return json<TicketAttachmentMetadata[]>(
    await apiFetch(`${staff(number)}/attachments`),
    "Attachments could not be loaded.",
  );
}
export async function getStaffAttachmentContent(
  number: string,
  id: number,
  disposition: "inline" | "attachment",
) {
  const response = await apiFetch(
    `${staff(number)}/attachments/${id}/content?disposition=${disposition}`,
  );
  if (!response.ok) await json(response, "Attachment content is unavailable.");
  return response.blob();
}
export async function listEntries(number: string, kind: "comments" | "notes") {
  return (
    await json<{ items: Entry[] }>(
      await apiFetch(`${ticket(number)}/${kind}`),
      "Messages could not be loaded.",
    )
  ).items;
}
export async function appendEntry(
  number: string,
  kind: "comments" | "notes",
  content: string,
) {
  return json<Entry>(
    await apiFetch(`${ticket(number)}/${kind}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    }),
    "The message could not be saved.",
  );
}
export async function indicateResolution(
  number: string,
  expectedVersion: number,
) {
  return json<{
    ticketNumber: string;
    status: TicketStatus;
    resolutionIndicatedAt: string;
    version: number;
  }>(
    await apiFetch(`${ticket(number)}/resolution-indication`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expectedVersion }),
    }),
    "Resolution could not be indicated.",
  );
}
