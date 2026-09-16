import { randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import app from "../../src/app.js";
import prisma from "../../src/prisma.js";
import {
  createTestSession,
  type TestSession,
} from "../helpers/auth-session.js";
const marker = randomUUID().slice(0, 8);
const number = `TKT-20990303-${marker.toUpperCase()}`;
let requesterId: number,
  otherId: number,
  staffId: number,
  adminId: number,
  ineligibleId: number,
  ticketId: number,
  attachmentId: number;
let uploadDir: string;
const sessions: TestSession[] = [];
function api(
  session: TestSession,
  method: "get" | "post" | "patch",
  path: string,
  body?: unknown,
) {
  const call = request(app)[method](path).set(session.headers);
  return body === undefined ? call : call.send(body);
}
beforeAll(async () => {
  const category = await prisma.category.findFirstOrThrow({
    where: { isActive: true },
  });
  const system = await prisma.relatedSystem.findFirstOrThrow({
    where: { isActive: true },
  });
  const users = await Promise.all(
    [
      ["Detail Requester", "REQUESTER"],
      ["Other Requester", "REQUESTER"],
      ["Detail Staff", "IT_STAFF"],
      ["Detail Admin", "ADMINISTRATOR"],
      ["Inactive Staff", "IT_STAFF"],
    ].map(([name, role], i) =>
      prisma.user.create({
        data: {
          name: `${name} ${marker}`,
          email: `detail-${i}-${marker}@example.test`,
          role: role as any,
          isActive: i !== 4,
        },
      }),
    ),
  );
  [requesterId, otherId, staffId, adminId, ineligibleId] = users.map(
    (u) => u.id,
  );
  for (const id of [requesterId, otherId, staffId, adminId])
    sessions.push(await createTestSession(id));
  const ticket = await prisma.ticket.create({
    data: {
      ticketNumber: number,
      submissionKey: randomUUID(),
      requesterId,
      categoryId: category.id,
      relatedSystemId: system.id,
      summary: "Workflow fixture",
      requestedPriority: "HIGH",
      itPriority: "MEDIUM",
      description: "Detail and communication fixture.",
      status: "OPEN",
    },
  });
  ticketId = ticket.id;
  uploadDir = await mkdtemp(join(tmpdir(), "toktickit-detail-"));
  process.env.UPLOAD_DIR = uploadDir;
  const storedName = `${marker}.pdf`;
  await writeFile(
    join(uploadDir, storedName),
    Buffer.from("staff attachment evidence"),
  );
  const attachment = await prisma.attachment.create({
    data: {
      ticketId,
      originalName: "evidence.pdf",
      storedName,
      mimeType: "application/pdf",
      sizeBytes: 25,
      uploadedByUserId: requesterId,
    },
  });
  attachmentId = attachment.id;
});
beforeEach(async () => {
  await prisma.publicComment.deleteMany({ where: { ticketId } });
  await prisma.internalNote.deleteMany({ where: { ticketId } });
  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      ownerId: staffId,
      status: "OPEN",
      itPriority: "MEDIUM",
      version: 1,
      resolutionIndicatedAt: null,
      resolutionIndicatedById: null,
    },
  });
});
afterAll(async () => {
  await prisma.publicComment.deleteMany({ where: { ticketId } });
  await prisma.internalNote.deleteMany({ where: { ticketId } });
  await prisma.attachment.deleteMany({ where: { ticketId } });
  await prisma.ticket.deleteMany({ where: { id: ticketId } });
  for (const session of sessions) await session.cleanup();
  await prisma.user.deleteMany({
    where: {
      id: { in: [requesterId, otherId, staffId, adminId, ineligibleId] },
    },
  });
  await prisma.$disconnect();
  await rm(uploadDir, { recursive: true, force: true });
});
describe("Lab 3 ticket detail and workflow API", () => {
  it("allows operational detail without leaking account/session fields and rejects Requesters", async () => {
    expect(
      (await request(app).get(`/api/staff/tickets/${number}`)).status,
    ).toBe(401);
    expect(
      (await api(sessions[0], "get", `/api/staff/tickets/${number}`)).status,
    ).toBe(403);
    for (const session of [sessions[2], sessions[3]]) {
      const result = await api(session, "get", `/api/staff/tickets/${number}`);
      expect(result.status).toBe(200);
      expect(result.body).toEqual(
        expect.objectContaining({
          ticketNumber: number,
          version: 1,
          owner: expect.objectContaining({ id: staffId }),
          resolutionIndicatedAt: null,
        }),
      );
      expect(JSON.stringify(result.body)).not.toMatch(/password|session|csrf/i);
    }
  });
  it("assigns eligible owners, rejects ineligible/unassignment and preserves current no-ops", async () => {
    let result = await api(
      sessions[2],
      "patch",
      `/api/staff/tickets/${number}/owner`,
      { ownerId: adminId, expectedVersion: 1 },
    );
    expect(result.status).toBe(200);
    expect(result.body).toEqual(
      expect.objectContaining({
        owner: expect.objectContaining({ id: adminId }),
        version: 2,
      }),
    );
    result = await api(
      sessions[2],
      "patch",
      `/api/staff/tickets/${number}/owner`,
      { ownerId: adminId, expectedVersion: 2 },
    );
    expect(result.body.version).toBe(2);
    result = await api(
      sessions[2],
      "patch",
      `/api/staff/tickets/${number}/owner`,
      { ownerId: ineligibleId, expectedVersion: 2 },
    );
    expect(result.body.error.code).toBe("INELIGIBLE_OWNER");
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: "IN_PROGRESS" },
    });
    result = await api(
      sessions[2],
      "patch",
      `/api/staff/tickets/${number}/owner`,
      { ownerId: null, expectedVersion: 2 },
    );
    expect(result.body.error.code).toBe("OWNER_REQUIRED");
  });
  it("updates IT priority with optimistic versions and current no-op semantics", async () => {
    const stale = await api(
      sessions[2],
      "patch",
      `/api/staff/tickets/${number}/priority`,
      { itPriority: "URGENT", expectedVersion: 9 },
    );
    expect(stale.body.error.code).toBe("STALE_RESOURCE");
    const changed = await api(
      sessions[2],
      "patch",
      `/api/staff/tickets/${number}/priority`,
      { itPriority: "URGENT", expectedVersion: 1 },
    );
    expect(changed.body).toEqual(
      expect.objectContaining({ itPriority: "URGENT", version: 2 }),
    );
    const noOp = await api(
      sessions[2],
      "patch",
      `/api/staff/tickets/${number}/priority`,
      { itPriority: "URGENT", expectedVersion: 2 },
    );
    expect(noOp.body.version).toBe(2);
  });
  it("enforces every status edge, owner requirement and confirmation", async () => {
    const matrix: Record<string, string[]> = {
      NEW: ["OPEN", "CANCELLED"],
      OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
      IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
      WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
      RESOLVED: ["CLOSED", "REOPENED"],
      CLOSED: ["REOPENED"],
      REOPENED: ["OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
      CANCELLED: ["REOPENED"],
    };
    for (const [from, allowed] of Object.entries(matrix))
      for (const to of Object.keys(matrix)) {
        await prisma.ticket.update({
          where: { id: ticketId },
          data: { status: from as any, ownerId: staffId, version: 1 },
        });
        const result = await api(
          sessions[2],
          "patch",
          `/api/staff/tickets/${number}/status`,
          { status: to, expectedVersion: 1, confirmed: true },
        );
        expect(result.status, `${from}->${to}`).toBe(
          allowed.includes(to) ? 200 : 409,
        );
      }
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: "OPEN", ownerId: null, version: 1 },
    });
    expect(
      (
        await api(sessions[2], "patch", `/api/staff/tickets/${number}/status`, {
          status: "IN_PROGRESS",
          expectedVersion: 1,
        })
      ).body.error.code,
    ).toBe("OWNER_REQUIRED");
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: "OPEN", ownerId: staffId, version: 1 },
    });
    expect(
      (
        await api(sessions[2], "patch", `/api/staff/tickets/${number}/status`, {
          status: "CANCELLED",
          expectedVersion: 1,
        })
      ).status,
    ).toBe(400);
  });
  it("records requester resolution once without formal status change and enforces ownership/status", async () => {
    let result = await api(
      sessions[0],
      "post",
      `/api/tickets/${number}/resolution-indication`,
      { expectedVersion: 1 },
    );
    expect(result.body).toEqual(
      expect.objectContaining({
        status: "OPEN",
        version: 2,
        resolutionIndicatedAt: expect.any(String),
      }),
    );
    const first = result.body.resolutionIndicatedAt;
    result = await api(
      sessions[0],
      "post",
      `/api/tickets/${number}/resolution-indication`,
      { expectedVersion: 1 },
    );
    expect(result.body).toEqual(
      expect.objectContaining({ version: 2, resolutionIndicatedAt: first }),
    );
    expect(
      (
        await api(
          sessions[1],
          "post",
          `/api/tickets/${number}/resolution-indication`,
          { expectedVersion: 2 },
        )
      ).status,
    ).toBe(404);
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: "RESOLVED", version: 3 },
    });
    expect(
      (
        await api(
          sessions[0],
          "post",
          `/api/tickets/${number}/resolution-indication`,
          { expectedVersion: 3 },
        )
      ).body.error.code,
    ).toBe("INVALID_TRANSITION");
  });
  it("keeps public comments append-only and internal notes operational-only", async () => {
    const publicEntry = await api(
      sessions[0],
      "post",
      `/api/tickets/${number}/comments`,
      { content: "  public <script>alert(1)</script>\nline 2  " },
    );
    expect(publicEntry.status).toBe(201);
    expect(publicEntry.body).toEqual(
      expect.objectContaining({
        content: "public <script>alert(1)</script>\nline 2",
        author: expect.objectContaining({ id: requesterId }),
      }),
    );
    const note = await api(
      sessions[2],
      "post",
      `/api/tickets/${number}/notes`,
      { content: "private" },
    );
    expect(note.status).toBe(201);
    const requesterNotes = await api(
      sessions[0],
      "get",
      `/api/tickets/${number}/notes`,
    );
    expect(requesterNotes.status).toBe(403);
    const comments = await api(
      sessions[2],
      "get",
      `/api/tickets/${number}/comments`,
    );
    expect(comments.body.items).toHaveLength(1);
    expect(JSON.stringify(comments.body)).not.toContain("private");
    expect(
      (
        await api(sessions[0], "post", `/api/tickets/${number}/comments`, {
          content: "x",
          authorId: adminId,
        })
      ).status,
    ).toBe(400);
  });
  it("exposes attachment metadata/content routes to operational roles but no upload/delete", async () => {
    const list = await api(
      sessions[2],
      "get",
      `/api/staff/tickets/${number}/attachments`,
    );
    expect(list.status).toBe(200);
    expect(list.body).toEqual([
      expect.objectContaining({
        id: attachmentId,
        originalName: "evidence.pdf",
        isRemoved: false,
      }),
    ]);
    const content = await api(
      sessions[2],
      "get",
      `/api/staff/tickets/${number}/attachments/${attachmentId}/content?disposition=attachment`,
    );
    expect(content.status).toBe(200);
    expect(content.headers["content-disposition"]).toContain("evidence.pdf");
    expect(content.body.toString()).toBe("staff attachment evidence");
    expect(
      (await api(sessions[2], "post", `/api/tickets/${number}/attachments`, {}))
        .status,
    ).toBe(403);
  });
});
