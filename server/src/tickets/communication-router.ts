import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { authSession, requireRole } from "../auth/auth-middleware.js";
import { ApiError } from "../errors/api-error.js";
import prisma from "../prisma.js";
import {
  INDICATION_STATUSES,
  notFound,
  parseTicketNumber,
  positiveVersion,
  requireExactBody,
  requireOperationalActor,
  stale,
  validateContent,
} from "./ticket-domain.js";

export const communicationRouter = Router();
const authorSelect = { id: true, name: true, role: true } as const;

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

function entryDto(item: any) {
  return {
    id: item.id,
    content: item.content,
    author: item.author,
    createdAt: item.createdAt.toISOString(),
  };
}
async function accessibleTicket(
  ticketNumber: string,
  user: { id: number; role: string },
  operationalOnly = false,
) {
  if (operationalOnly && !["IT_STAFF", "ADMINISTRATOR"].includes(user.role))
    throw new ApiError(
      403,
      "FORBIDDEN",
      "You do not have permission to perform this action.",
    );
  const ticket = await prisma.ticket.findFirst({
    where: {
      ticketNumber,
      ...(!["IT_STAFF", "ADMINISTRATOR"].includes(user.role)
        ? { requesterId: user.id }
        : {}),
    },
    select: { id: true },
  });
  if (!ticket) throw notFound();
  return ticket;
}

communicationRouter.get(
  "/tickets/:ticketNumber/comments",
  async (request, response, next) => {
    try {
      if (Object.keys(request.query).length)
        throw new ApiError(
          400,
          "INVALID_QUERY",
          "This endpoint does not accept query parameters.",
        );
      const ticket = await accessibleTicket(
        parseTicketNumber(request.params.ticketNumber),
        authSession(response).user,
      );
      const items = await prisma.publicComment.findMany({
        where: { ticketId: ticket.id },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          content: true,
          createdAt: true,
          author: { select: authorSelect },
        },
      });
      response.json({ items: items.map(entryDto) });
    } catch (error) {
      next(error);
    }
  },
);
communicationRouter.post(
  "/tickets/:ticketNumber/comments",
  async (request, response, next) => {
    try {
      const number = parseTicketNumber(request.params.ticketNumber);
      const actor = authSession(response).user;
      const item = await serializable(async (transaction) => {
        const current = await transaction.user.findUnique({
          where: { id: actor.id },
          select: {
            id: true,
            role: true,
            isActive: true,
            mustChangePassword: true,
          },
        });
        if (!current || !current.isActive || current.mustChangePassword)
          throw new ApiError(
            403,
            "FORBIDDEN",
            "You do not have permission to perform this action.",
          );
        const operational = ["IT_STAFF", "ADMINISTRATOR"].includes(
          current.role,
        );
        const ticket = await transaction.ticket.findFirst({
          where: {
            ticketNumber: number,
            ...(!operational ? { requesterId: current.id } : {}),
          },
          select: { id: true },
        });
        if (!ticket) throw notFound();
        const content = validateContent(request.body);
        const created = await transaction.publicComment.create({
          data: { ticketId: ticket.id, authorId: current.id, content },
          select: {
            id: true,
            content: true,
            createdAt: true,
            author: { select: authorSelect },
          },
        });
        await transaction.ticket.update({
          where: { id: ticket.id },
          data: { version: { increment: 1 } },
        });
        return created;
      });
      response.status(201).json(entryDto(item));
    } catch (error) {
      next(error);
    }
  },
);
communicationRouter.get(
  "/tickets/:ticketNumber/notes",
  requireRole("IT_STAFF", "ADMINISTRATOR"),
  async (request, response, next) => {
    try {
      if (Object.keys(request.query).length)
        throw new ApiError(
          400,
          "INVALID_QUERY",
          "This endpoint does not accept query parameters.",
        );
      const ticket = await accessibleTicket(
        parseTicketNumber(request.params.ticketNumber),
        authSession(response).user,
        true,
      );
      const items = await prisma.internalNote.findMany({
        where: { ticketId: ticket.id },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          content: true,
          createdAt: true,
          author: { select: authorSelect },
        },
      });
      response.json({ items: items.map(entryDto) });
    } catch (error) {
      next(error);
    }
  },
);
communicationRouter.post(
  "/tickets/:ticketNumber/notes",
  requireRole("IT_STAFF", "ADMINISTRATOR"),
  async (request, response, next) => {
    try {
      const number = parseTicketNumber(request.params.ticketNumber);
      const actorId = authSession(response).user.id;
      const item = await serializable(async (transaction) => {
        await requireOperationalActor(transaction, actorId);
        const ticket = await transaction.ticket.findUnique({
          where: { ticketNumber: number },
          select: { id: true },
        });
        if (!ticket) throw notFound();
        const content = validateContent(request.body);
        const created = await transaction.internalNote.create({
          data: { ticketId: ticket.id, authorId: actorId, content },
          select: {
            id: true,
            content: true,
            createdAt: true,
            author: { select: authorSelect },
          },
        });
        await transaction.ticket.update({
          where: { id: ticket.id },
          data: { version: { increment: 1 } },
        });
        return created;
      });
      response.status(201).json(entryDto(item));
    } catch (error) {
      next(error);
    }
  },
);
communicationRouter.post(
  "/tickets/:ticketNumber/resolution-indication",
  requireRole("REQUESTER"),
  async (request, response, next) => {
    try {
      const number = parseTicketNumber(request.params.ticketNumber);
      const actorId = authSession(response).user.id;
      const result = await serializable(async (transaction) => {
        const actor = await transaction.user.findUnique({
          where: { id: actorId },
          select: {
            id: true,
            role: true,
            isActive: true,
            mustChangePassword: true,
          },
        });
        if (
          !actor ||
          !actor.isActive ||
          actor.mustChangePassword ||
          actor.role !== "REQUESTER"
        )
          throw new ApiError(
            403,
            "FORBIDDEN",
            "You do not have permission to perform this action.",
          );
        const ticket = await transaction.ticket.findFirst({
          where: { ticketNumber: number, requesterId: actorId },
          select: {
            id: true,
            ticketNumber: true,
            status: true,
            resolutionIndicatedAt: true,
            version: true,
          },
        });
        if (!ticket) throw notFound();
        if (!INDICATION_STATUSES.has(ticket.status))
          throw new ApiError(
            409,
            "INVALID_TRANSITION",
            "Resolution cannot be indicated in the current status.",
          );
        const expectedVersion = positiveVersion(
          requireExactBody(request.body, ["expectedVersion"]).expectedVersion,
        );
        if (ticket.resolutionIndicatedAt) return ticket;
        if (ticket.version !== expectedVersion) throw stale();
        return transaction.ticket.update({
          where: { id: ticket.id },
          data: {
            resolutionIndicatedAt: new Date(),
            resolutionIndicatedById: actorId,
            version: { increment: 1 },
          },
          select: {
            ticketNumber: true,
            status: true,
            resolutionIndicatedAt: true,
            version: true,
          },
        });
      });
      response.json({
        ...result,
        resolutionIndicatedAt:
          result.resolutionIndicatedAt?.toISOString() ?? null,
      });
    } catch (error) {
      next(error);
    }
  },
);
