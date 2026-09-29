import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import app from "../../src/app.js";
import prisma from "../../src/prisma.js";
import {
  createTestSession,
  type TestSession,
} from "../helpers/auth-session.js";

const marker = randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
const emailMarker = marker.toLowerCase();
const ticketNumber = `TKT-20990405-${marker}`;
let requesterId: number;
let staffId: number;
let adminId: number;
let ticketId: number;
let staffSession: TestSession;
let adminSession: TestSession;

function api(session: TestSession, body: Record<string, unknown>) {
  return request(app)
    .patch(`/api/staff/tickets/${ticketNumber}/status`)
    .set(session.headers)
    .send(body);
}

async function completedAction(ticketWorkCycle: number) {
  return prisma.actionTaken.create({
    data: {
      ticketId,
      ticketWorkCycle,
      status: "COMPLETED",
      actionAt: new Date(),
      description: `Completed work for cycle ${ticketWorkCycle}.`,
      result: "The requested work was completed and verified.",
      createdById: staffId,
      performedById: staffId,
      assignedToId: staffId,
      idempotencyKey: randomUUID(),
      requestFingerprint: randomUUID().replaceAll("-", "").padEnd(64, "0"),
      completedAt: new Date(),
    },
  });
}

beforeAll(async () => {
  const [category, relatedSystem] = await Promise.all([
    prisma.category.findFirstOrThrow({ where: { isActive: true } }),
    prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } }),
  ]);
  const users = await Promise.all([
    prisma.user.create({
      data: {
        name: `Workflow Requester ${marker}`,
        email: `workflow-requester-${emailMarker}@example.test`,
        role: "REQUESTER",
      },
    }),
    prisma.user.create({
      data: {
        name: `Workflow Staff ${marker}`,
        email: `workflow-staff-${emailMarker}@example.test`,
        role: "IT_STAFF",
      },
    }),
    prisma.user.create({
      data: {
        name: `Workflow Admin ${marker}`,
        email: `workflow-admin-${emailMarker}@example.test`,
        role: "ADMINISTRATOR",
      },
    }),
  ]);
  [requesterId, staffId, adminId] = users.map(({ id }) => id);
  [staffSession, adminSession] = await Promise.all([
    createTestSession(staffId),
    createTestSession(adminId),
  ]);
  const ticket = await prisma.ticket.create({
    data: {
      ticketNumber,
      submissionKey: randomUUID(),
      requesterId,
      ownerId: staffId,
      categoryId: category.id,
      relatedSystemId: relatedSystem.id,
      summary: "Final workflow fixture",
      description: "Exercises the Lab 4 resolution gate and work-cycle rules.",
      requestedPriority: "HIGH",
      itPriority: "HIGH",
      status: "IN_PROGRESS",
    },
  });
  ticketId = ticket.id;
});

beforeEach(async () => {
  await prisma.actionTaken.deleteMany({ where: { ticketId } });
  await prisma.user.update({ where: { id: staffId }, data: { isActive: true } });
  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      ownerId: staffId,
      status: "IN_PROGRESS",
      version: 1,
      workCycle: 1,
      resolvedAt: null,
      resolutionIndicatedAt: null,
      resolutionIndicatedById: null,
    },
  });
});

afterAll(async () => {
  if (ticketId) {
    await prisma.actionTaken.deleteMany({ where: { ticketId } });
    await prisma.ticket.delete({ where: { id: ticketId } });
  }
  await Promise.all(
    [staffSession, adminSession].filter(Boolean).map((session) => session.cleanup()),
  );
  const userIds = [requesterId, staffId, adminId].filter(Number.isSafeInteger);
  if (userIds.length)
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
});

describe("Lab 4 final Ticket workflow and resolution gate", () => {
  it("rejects a direct resolve without qualifying current-cycle work and commits once eligible", async () => {
    await prisma.actionTaken.createMany({
      data: [
        {
          ticketId,
          ticketWorkCycle: 1,
          status: "PLANNED",
          description: "Work is planned but not completed.",
          result: "A draft result cannot satisfy resolution.",
          createdById: staffId,
          assignedToId: staffId,
          idempotencyKey: randomUUID(),
          requestFingerprint: "b".repeat(64),
        },
        {
          ticketId,
          ticketWorkCycle: 1,
          status: "CANCELLED",
          description: "Cancelled work must not satisfy resolution.",
          result: "This action was cancelled.",
          createdById: staffId,
          assignedToId: staffId,
          idempotencyKey: randomUUID(),
          requestFingerprint: "c".repeat(64),
          cancelledAt: new Date(),
        },
      ],
    });
    const blocked = await api(staffSession, {
      status: "RESOLVED",
      expectedVersion: 1,
      confirmed: true,
    });
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.code).toBe("RESOLUTION_ACTION_REQUIRED");
    expect(await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } })).toEqual(
      expect.objectContaining({ status: "IN_PROGRESS", version: 1, resolvedAt: null }),
    );

    await completedAction(1);
    const resolved = await api(staffSession, {
      status: "RESOLVED",
      expectedVersion: 1,
      confirmed: true,
    });
    expect(resolved.status).toBe(200);
    expect(resolved.body).toEqual(
      expect.objectContaining({
        status: "RESOLVED",
        version: 2,
        workCycle: 1,
        resolvedAt: expect.any(String),
      }),
    );
  });

  it("reopening starts a new work cycle and prevents historical work from resolving it", async () => {
    await completedAction(1);
    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
        resolutionIndicatedAt: new Date(),
        resolutionIndicatedById: requesterId,
      },
    });
    const reopened = await api(adminSession, {
      status: "REOPENED",
      expectedVersion: 1,
      confirmed: true,
    });
    expect(reopened.status).toBe(200);
    expect(reopened.body).toEqual(
      expect.objectContaining({
        status: "REOPENED",
        version: 2,
        workCycle: 2,
        resolvedAt: null,
        resolutionIndicatedAt: null,
      }),
    );
    const inProgress = await api(adminSession, {
      status: "IN_PROGRESS",
      expectedVersion: 2,
    });
    expect(inProgress.status).toBe(200);

    const blocked = await api(adminSession, {
      status: "RESOLVED",
      expectedVersion: 3,
      confirmed: true,
    });
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.code).toBe("RESOLUTION_ACTION_REQUIRED");

    await completedAction(2);
    const resolved = await api(adminSession, {
      status: "RESOLVED",
      expectedVersion: 3,
      confirmed: true,
    });
    expect(resolved.status).toBe(200);
    expect(resolved.body).toEqual(
      expect.objectContaining({ status: "RESOLVED", version: 4, workCycle: 2 }),
    );
    expect(await prisma.actionTaken.count({ where: { ticketId } })).toBe(2);
  });

  it("serializes concurrent status commands so exactly one version-bound write wins", async () => {
    await prisma.ticket.update({ where: { id: ticketId }, data: { status: "OPEN" } });
    const [progress, cancelled] = await Promise.all([
      api(staffSession, { status: "IN_PROGRESS", expectedVersion: 1 }),
      api(adminSession, {
        status: "CANCELLED",
        expectedVersion: 1,
        confirmed: true,
      }),
    ]);
    expect([progress.status, cancelled.status].sort()).toEqual([200, 409]);
    expect([progress, cancelled].find(({ status }) => status === 409)?.body.error.code).toMatch(
      /STALE_RESOURCE|CONCURRENT_UPDATE/,
    );
    expect(await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } })).toEqual(
      expect.objectContaining({ version: 2 }),
    );
  });

  it("revalidates owner eligibility inside the locked status transaction", async () => {
    await prisma.ticket.update({ where: { id: ticketId }, data: { status: "OPEN" } });
    await prisma.user.update({ where: { id: staffId }, data: { isActive: false } });
    const response = await api(adminSession, {
      status: "IN_PROGRESS",
      expectedVersion: 1,
    });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("OWNER_REQUIRED");
    expect(await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } })).toEqual(
      expect.objectContaining({ status: "OPEN", version: 1 }),
    );
  });
});
