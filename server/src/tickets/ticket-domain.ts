import type { Prisma, TicketStatus, UserRole } from "@prisma/client";
import { ApiError } from "../errors/api-error.js";

export const TICKET_NUMBER_PATTERN = /^TKT-\d{8}-[A-F0-9]{8}$/;
export const OWNER_REQUIRED_STATUSES = new Set<TicketStatus>([
  "IN_PROGRESS",
  "WAITING_FOR_REQUESTER",
  "RESOLVED",
  "CLOSED",
]);
export const INDICATION_STATUSES = new Set<TicketStatus>([
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_REQUESTER",
  "REOPENED",
]);
export const CONFIRMED_STATUSES = new Set<TicketStatus>([
  "RESOLVED",
  "CLOSED",
  "CANCELLED",
  "REOPENED",
]);
export const TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  NEW: ["OPEN", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"],
  REOPENED: ["OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
  CANCELLED: ["REOPENED"],
};

export function parseTicketNumber(raw: string | string[] | undefined) {
  const value = typeof raw === "string" ? raw.trim().toUpperCase() : "";
  if (!TICKET_NUMBER_PATTERN.test(value))
    throw new ApiError(
      400,
      "INVALID_TICKET_NUMBER",
      "Provide a valid Ticket Number.",
    );
  return value;
}

export function requireExactBody(body: unknown, keys: string[]) {
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    Object.keys(body).some((key) => !keys.includes(key))
  ) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      "Review the highlighted fields.",
      { body: "Provide only the documented fields." },
    );
  }
  return body as Record<string, unknown>;
}

export function positiveVersion(value: unknown) {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      "Review the highlighted fields.",
      { expectedVersion: "Expected version must be a positive integer." },
    );
  }
  return Number(value);
}

export function validateContent(body: unknown) {
  const value = requireExactBody(body, ["content"]).content;
  if (typeof value !== "string")
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      "Review the highlighted fields.",
      { content: "Content must be text." },
    );
  const content = value.trim();
  const invalidSurrogate =
    /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(
      content,
    );
  if (
    invalidSurrogate ||
    Array.from(content).length < 1 ||
    Array.from(content).length > 5000
  ) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      "Review the highlighted fields.",
      { content: "Content must contain 1 to 5000 characters." },
    );
  }
  return content;
}

export function stale() {
  return new ApiError(
    409,
    "STALE_RESOURCE",
    "The ticket changed. Reload the latest version.",
  );
}
export function notFound() {
  return new ApiError(404, "RESOURCE_NOT_FOUND", "Resource was not found.");
}

export async function requireOperationalActor(
  transaction: Prisma.TransactionClient,
  id: number,
) {
  const actor = await transaction.user.findUnique({
    where: { id },
    select: { id: true, role: true, isActive: true, mustChangePassword: true },
  });
  if (
    !actor ||
    !actor.isActive ||
    actor.mustChangePassword ||
    !(["IT_STAFF", "ADMINISTRATOR"] as UserRole[]).includes(actor.role)
  ) {
    throw new ApiError(
      403,
      "FORBIDDEN",
      "You do not have permission to perform this action.",
    );
  }
  return actor;
}
