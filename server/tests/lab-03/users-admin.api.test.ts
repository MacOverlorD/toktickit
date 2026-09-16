import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import app from "../../src/app.js";
import prisma from "../../src/prisma.js";
import {
  createTestSession,
  type TestSession,
} from "../helpers/auth-session.js";
const mark = randomUUID().slice(0, 8),
  prefix = `admin-${mark}`;
let adminId: number, secondId: number, requesterId: number;
const sessions: TestSession[] = [];
function call(
  s: TestSession,
  method: "get" | "post" | "patch",
  path: string,
  body?: unknown,
) {
  const r = request(app)[method](path).set(s.headers);
  return body === undefined ? r : r.send(body);
}
beforeAll(async () => {
  const users = await Promise.all(
    ["ADMINISTRATOR", "ADMINISTRATOR", "REQUESTER"].map((role, i) =>
      prisma.user.create({
        data: {
          name: `Admin Test ${i}`,
          email: `${prefix}-${i}@example.test`,
          role: role as any,
          isActive: true,
          passwordHash: "test",
          mustChangePassword: false,
        },
      }),
    ),
  );
  [adminId, secondId, requesterId] = users.map((x) => x.id);
  for (const id of [adminId, secondId, requesterId])
    sessions.push(await createTestSession(id));
});
afterAll(async () => {
  for (const s of sessions) await s.cleanup();
  await prisma.session.deleteMany({
    where: { user: { email: { startsWith: prefix } } },
  });
  await prisma.ticket.updateMany({
    where: { owner: { email: { startsWith: prefix } } },
    data: { ownerId: null },
  });
  await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
  await prisma.$disconnect();
});
describe("Administrator users API", () => {
  it("rejects non-administrators before returning account data", async () => {
    const result = await call(sessions[2], "get", "/api/admin/users");
    expect(result.status).toBe(403);
    expect(result.body.error.code).toBe("FORBIDDEN");
  });
  it("lists, creates, canonicalizes, edits and resets with safe DTOs", async () => {
    const listed = await call(
      sessions[0],
      "get",
      "/api/admin/users?search=Admin%20Test&role=ADMINISTRATOR",
    );
    expect(listed.status).toBe(200);
    expect(listed.body.items.length).toBeGreaterThanOrEqual(2);
    expect(listed.body.items[0]).not.toHaveProperty("passwordHash");
    const email = `${prefix}-created@Example.Test`;
    const created = await call(sessions[0], "post", "/api/admin/users", {
      name: "Managed User",
      email,
      role: "IT_STAFF",
      isActive: true,
      initialPassword: "Initial password 2026!",
    });
    expect(created.status).toBe(201);
    expect(created.body.email).toBe(email.toLowerCase());
    expect(created.body.mustChangePassword).toBe(true);
    const stale = await call(
      sessions[0],
      "patch",
      `/api/admin/users/${created.body.id}`,
      { name: "stale", expectedVersion: created.body.version + 1 },
    );
    expect(stale.status).toBe(409);
    const edited = await call(
      sessions[0],
      "patch",
      `/api/admin/users/${created.body.id}`,
      { name: "Managed Staff", expectedVersion: created.body.version },
    );
    expect(edited.status).toBe(200);
    expect(edited.body.version).toBe(created.body.version + 1);
    const reset = await call(
      sessions[0],
      "post",
      `/api/admin/users/${created.body.id}/initial-password`,
      {
        initialPassword: "Replacement password 2026!",
        expectedVersion: edited.body.version,
      },
    );
    expect(reset.status).toBe(200);
    expect(reset.body.version).toBe(edited.body.version + 1);
  });
  it("blocks self-deactivation and preserves one active Administrator under concurrent removals", async () => {
    const self = await call(
      sessions[0],
      "patch",
      `/api/admin/users/${adminId}`,
      { isActive: false, expectedVersion: 1 },
    );
    expect(self.status).toBe(409);
    expect(self.body.error.code).toBe("ADMIN_REQUIRED");
    const versions = await prisma.user.findMany({
      where: { id: { in: [adminId, secondId] } },
      select: { id: true, version: true },
    });
    const v = new Map(versions.map((x) => [x.id, x.version]));
    const results = await Promise.all([
      call(sessions[0], "patch", `/api/admin/users/${secondId}`, {
        isActive: false,
        expectedVersion: v.get(secondId),
      }),
      call(sessions[1], "patch", `/api/admin/users/${adminId}`, {
        isActive: false,
        expectedVersion: v.get(adminId),
      }),
    ]);
    expect(results.filter((x) => x.status === 200)).toHaveLength(1);
    expect(
      await prisma.user.count({
        where: {
          id: { in: [adminId, secondId] },
          role: "ADMINISTRATOR",
          isActive: true,
        },
      }),
    ).toBe(1);
  });
  it("unassigns a deactivated owner and increments the ticket version without changing status", async () => {
    const activeAdmin = await prisma.user.findFirstOrThrow({
      where: {
        id: { in: [adminId, secondId] },
        role: "ADMINISTRATOR",
        isActive: true,
      },
      select: { id: true },
    });
    const activeSession = await createTestSession(activeAdmin.id);
    sessions.push(activeSession);
    const owner = await prisma.user.create({
      data: {
        name: "Owner",
        email: `${prefix}-owner@example.test`,
        role: "IT_STAFF",
        isActive: true,
      },
    });
    const [cat, sys] = await Promise.all([
      prisma.category.findFirstOrThrow(),
      prisma.relatedSystem.findFirstOrThrow(),
    ]);
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-20990101-${mark.toUpperCase()}`,
        submissionKey: randomUUID(),
        requesterId: requesterId,
        ownerId: owner.id,
        categoryId: cat.id,
        relatedSystemId: sys.id,
        summary: "Admin owner test",
        description: "Owner deactivation keeps history.",
        requestedPriority: "MEDIUM",
        itPriority: "MEDIUM",
        status: "IN_PROGRESS",
      },
    });
    const result = await call(
      activeSession,
      "patch",
      `/api/admin/users/${owner.id}`,
      { isActive: false, expectedVersion: owner.version },
    );
    expect(result.status).toBe(200);
    const stored = await prisma.ticket.findUniqueOrThrow({
      where: { id: ticket.id },
    });
    expect(stored.ownerId).toBeNull();
    expect(stored.status).toBe("IN_PROGRESS");
    expect(stored.version).toBe(ticket.version + 1);
    await prisma.ticket.delete({ where: { id: ticket.id } });
  });
});
