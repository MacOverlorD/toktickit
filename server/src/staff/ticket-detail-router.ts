import { constants } from "node:fs";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Prisma, RequestedPriority, TicketStatus } from "@prisma/client";
import { Router } from "express";
import { authSession, requireRole } from "../auth/auth-middleware.js";
import { ApiError } from "../errors/api-error.js";
import prisma from "../prisma.js";
import { parseAttachmentId } from "../attachments/attachment-policy.js";
import { contentDisposition } from "../attachments/attachment-handlers.js";
import {
  CONFIRMED_STATUSES,
  OWNER_REQUIRED_STATUSES,
  TRANSITIONS,
  notFound,
  parseTicketNumber,
  positiveVersion,
  requireExactBody,
  requireOperationalActor,
  stale,
} from "../tickets/ticket-domain.js";

export const ticketDetailRouter = Router();
ticketDetailRouter.use(requireRole("IT_STAFF", "ADMINISTRATOR"));
const ownerSelect = { id: true, name: true, role: true } as const;
const detailSelect = {
  ticketNumber: true,
  createdAt: true,
  updatedAt: true,
  summary: true,
  requestedPriority: true,
  itPriority: true,
  description: true,
  status: true,
  version: true,
  resolutionIndicatedAt: true,
  requester: { select: { id: true, name: true, email: true } },
  category: { select: { id: true, name: true } },
  relatedSystem: { select: { id: true, name: true } },
  owner: { select: ownerSelect },
  resolutionIndicatedBy: { select: { id: true, name: true } },
} as const;

function detailDto(ticket: any) {
  return {
    ...ticket,
    ticketDate: ticket.createdAt.toISOString(),
    createdAt: undefined,
    createdAtValue: undefined,
    updatedAt: ticket.updatedAt.toISOString(),
    resolutionIndicatedAt: ticket.resolutionIndicatedAt?.toISOString() ?? null,
  };
}
function operationDto(ticket: any) {
  return {
    ticketNumber: ticket.ticketNumber,
    owner: ticket.owner,
    itPriority: ticket.itPriority,
    status: ticket.status,
    version: ticket.version,
    updatedAt: ticket.updatedAt.toISOString(),
    resolutionIndicatedAt: ticket.resolutionIndicatedAt?.toISOString() ?? null,
  };
}

async function serializable<T>(
  work: (transaction: Prisma.TransactionClient) => Promise<T>,
) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(work, {
        isolationLevel: "Serializable",
      });
    } catch (error: any) {
      if (error?.code !== "P2034" || attempt === 2)
        throw error?.code === "P2034"
          ? new ApiError(
              409,
              "CONCURRENT_UPDATE",
              "The ticket changed concurrently. Try again.",
            )
          : error;
    }
  }
  throw new Error("Transaction retry exhausted.");
}

async function mutate(
  request: any,
  response: any,
  kind: "owner" | "priority" | "status",
) {
  const number = parseTicketNumber(request.params.ticketNumber);
  const allowed =
    kind === "owner"
      ? ["ownerId", "expectedVersion"]
      : kind === "priority"
        ? ["itPriority", "expectedVersion"]
        : ["status", "expectedVersion", "confirmed"];
  const actorId = authSession(response).user.id;
  return serializable(async (transaction) => {
    await requireOperationalActor(transaction, actorId);
    const ticket = await transaction.ticket.findUnique({
      where: { ticketNumber: number },
      select: {
        id: true,
        ownerId: true,
        status: true,
        itPriority: true,
        version: true,
      },
    });
    if (!ticket) throw notFound();
    const body = requireExactBody(request.body, allowed);
    const expectedVersion = positiveVersion(body.expectedVersion);
    if (
      kind === "owner" &&
      body.ownerId !== null &&
      (!Number.isSafeInteger(body.ownerId) || Number(body.ownerId) <= 0)
    ) {
      throw new ApiError(
        400,
        "VALIDATION_ERROR",
        "Review the highlighted fields.",
        { ownerId: "Owner must be a positive integer or null." },
      );
    }
    if (
      kind === "priority" &&
      (typeof body.itPriority !== "string" ||
        !["LOW", "MEDIUM", "HIGH", "URGENT"].includes(body.itPriority))
    ) {
      throw new ApiError(
        400,
        "VALIDATION_ERROR",
        "Review the highlighted fields.",
        { itPriority: "Choose a valid IT Priority." },
      );
    }
    if (
      kind === "status" &&
      (typeof body.status !== "string" ||
        !Object.keys(TRANSITIONS).includes(body.status))
    ) {
      throw new ApiError(
        400,
        "VALIDATION_ERROR",
        "Review the highlighted fields.",
        { status: "Choose a valid status." },
      );
    }
    if (
      kind === "status" &&
      body.confirmed !== undefined &&
      typeof body.confirmed !== "boolean"
    ) {
      throw new ApiError(
        400,
        "VALIDATION_ERROR",
        "Review the highlighted fields.",
        { confirmed: "Confirmation must be true or false." },
      );
    }
    if (ticket.version !== expectedVersion) throw stale();
    if (kind === "owner") {
      const ownerId = body.ownerId === null ? null : Number(body.ownerId);
      if (ownerId === null && OWNER_REQUIRED_STATUSES.has(ticket.status))
        throw new ApiError(
          409,
          "OWNER_REQUIRED",
          "This status requires an eligible owner.",
        );
      if (ownerId !== null) {
        const owner = await transaction.user.findUnique({
          where: { id: ownerId },
          select: { isActive: true, role: true },
        });
        if (
          !owner ||
          !owner.isActive ||
          !["IT_STAFF", "ADMINISTRATOR"].includes(owner.role)
        )
          throw new ApiError(
            409,
            "INELIGIBLE_OWNER",
            "Choose an active IT Staff or Administrator owner.",
          );
      }
      if (ownerId === ticket.ownerId)
        return operationDto(
          await transaction.ticket.findUniqueOrThrow({
            where: { id: ticket.id },
            select: {
              ...detailSelect,
              description: false,
              requester: false,
              category: false,
              relatedSystem: false,
              resolutionIndicatedBy: false,
              createdAt: false,
            },
          }),
        );
      return operationDto(
        await transaction.ticket.update({
          where: { id: ticket.id },
          data: { ownerId, version: { increment: 1 } },
          select: {
            ...detailSelect,
            description: false,
            requester: false,
            category: false,
            relatedSystem: false,
            resolutionIndicatedBy: false,
            createdAt: false,
          },
        }),
      );
    }
    if (kind === "priority") {
      if (body.itPriority === ticket.itPriority)
        return operationDto(
          await transaction.ticket.findUniqueOrThrow({
            where: { id: ticket.id },
            select: {
              ticketNumber: true,
              owner: { select: ownerSelect },
              itPriority: true,
              status: true,
              version: true,
              updatedAt: true,
              resolutionIndicatedAt: true,
            },
          }),
        );
      return operationDto(
        await transaction.ticket.update({
          where: { id: ticket.id },
          data: {
            itPriority: body.itPriority as RequestedPriority,
            version: { increment: 1 },
          },
          select: {
            ticketNumber: true,
            owner: { select: ownerSelect },
            itPriority: true,
            status: true,
            version: true,
            updatedAt: true,
            resolutionIndicatedAt: true,
          },
        }),
      );
    }
    const status = body.status as TicketStatus;
    if (!TRANSITIONS[ticket.status].includes(status))
      throw new ApiError(
        409,
        "INVALID_TRANSITION",
        "That status transition is not permitted.",
      );
    if (CONFIRMED_STATUSES.has(status) && body.confirmed !== true)
      throw new ApiError(
        400,
        "VALIDATION_ERROR",
        "Confirm this status change.",
        { confirmed: "Confirmation is required." },
      );
    if (OWNER_REQUIRED_STATUSES.has(status)) {
      if (ticket.ownerId === null)
        throw new ApiError(
          409,
          "OWNER_REQUIRED",
          "This status requires an eligible owner.",
        );
      const owner = await transaction.user.findUnique({
        where: { id: ticket.ownerId },
        select: { isActive: true, role: true },
      });
      if (
        !owner ||
        !owner.isActive ||
        !["IT_STAFF", "ADMINISTRATOR"].includes(owner.role)
      )
        throw new ApiError(
          409,
          "OWNER_REQUIRED",
          "This status requires an eligible owner.",
        );
    }
    return operationDto(
      await transaction.ticket.update({
        where: { id: ticket.id },
        data: {
          status,
          version: { increment: 1 },
          ...(["REOPENED", "WAITING_FOR_REQUESTER"].includes(status)
            ? { resolutionIndicatedAt: null, resolutionIndicatedById: null }
            : {}),
        },
        select: {
          ticketNumber: true,
          owner: { select: ownerSelect },
          itPriority: true,
          status: true,
          version: true,
          updatedAt: true,
          resolutionIndicatedAt: true,
        },
      }),
    );
  });
}

ticketDetailRouter.get(
  "/tickets/:ticketNumber",
  async (request, response, next) => {
    try {
      const ticket = await prisma.ticket.findUnique({
        where: { ticketNumber: parseTicketNumber(request.params.ticketNumber) },
        select: detailSelect,
      });
      if (!ticket) throw notFound();
      response.json(detailDto(ticket));
    } catch (error) {
      next(error);
    }
  },
);
ticketDetailRouter.patch(
  "/tickets/:ticketNumber/owner",
  async (request, response, next) => {
    try {
      response.json(await mutate(request, response, "owner"));
    } catch (error) {
      next(error);
    }
  },
);
ticketDetailRouter.patch(
  "/tickets/:ticketNumber/priority",
  async (request, response, next) => {
    try {
      response.json(await mutate(request, response, "priority"));
    } catch (error) {
      next(error);
    }
  },
);
ticketDetailRouter.patch(
  "/tickets/:ticketNumber/status",
  async (request, response, next) => {
    try {
      response.json(await mutate(request, response, "status"));
    } catch (error) {
      next(error);
    }
  },
);

function attachmentDto(item: any) {
  return {
    id: item.id,
    originalName: item.originalName,
    mimeType: item.mimeType,
    sizeBytes: item.sizeBytes,
    createdAt: item.createdAt.toISOString(),
    isRemoved: item.removedAt !== null,
    removedAt: item.removedAt?.toISOString() ?? null,
    removalReason: item.removalReason,
  };
}
ticketDetailRouter.get(
  "/tickets/:ticketNumber/attachments",
  async (request, response, next) => {
    try {
      const ticket = await prisma.ticket.findUnique({
        where: { ticketNumber: parseTicketNumber(request.params.ticketNumber) },
        select: { id: true },
      });
      if (!ticket) throw notFound();
      const items = await prisma.attachment.findMany({
        where: { ticketId: ticket.id },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      });
      response.json(items.map(attachmentDto));
    } catch (error) {
      next(error);
    }
  },
);
ticketDetailRouter.get(
  "/tickets/:ticketNumber/attachments/:attachmentId/content",
  async (request, response, next) => {
    try {
      const keys = Object.keys(request.query);
      const disposition = request.query.disposition;
      if (
        keys.some((key) => key !== "disposition") ||
        Array.isArray(disposition) ||
        (disposition !== undefined &&
          disposition !== "inline" &&
          disposition !== "attachment")
      )
        throw new ApiError(
          400,
          "INVALID_QUERY",
          "Provide valid attachment query parameters.",
        );
      const ticket = await prisma.ticket.findUnique({
        where: { ticketNumber: parseTicketNumber(request.params.ticketNumber) },
        select: { id: true },
      });
      if (!ticket) throw notFound();
      const item = await prisma.attachment.findFirst({
        where: {
          id: parseAttachmentId(request.params.attachmentId),
          ticketId: ticket.id,
        },
      });
      if (!item) throw notFound();
      if (item.removedAt)
        throw new ApiError(
          410,
          "ATTACHMENT_REMOVED",
          "Attachment content is no longer available.",
        );
      const path = resolve(
        process.env.UPLOAD_DIR ?? "uploads",
        item.storedName,
      );
      await access(path, constants.R_OK).catch(() => {
        throw new ApiError(
          500,
          "ATTACHMENT_CONTENT_UNAVAILABLE",
          "Attachment content is unavailable.",
        );
      });
      const content = await readFile(path);
      response
        .set({
          "Content-Type": item.mimeType,
          "Content-Length": String(content.length),
          "Content-Disposition": contentDisposition(
            item.originalName,
            disposition === "attachment" ? "attachment" : "inline",
          ),
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "private, no-store",
        })
        .send(content);
    } catch (error) {
      next(error);
    }
  },
);
