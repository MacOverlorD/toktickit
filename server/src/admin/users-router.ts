import { Prisma, UserRole } from "@prisma/client";
import { Router } from "express";
import { authSession, requireRole } from "../auth/auth-middleware.js";
import { hashPassword } from "../auth/password-hash.js";
import { passwordValidationError } from "../auth/password-policy.js";
import { ApiError } from "../errors/api-error.js";
import prisma from "../prisma.js";
import {
  accountName,
  accountRoles,
  canonicalEmail,
  positiveVersion,
  validRole,
  validation,
} from "./account-domain.js";

export const usersAdminRouter = Router();
usersAdminRouter.use(requireRole(UserRole.ADMINISTRATOR));
const accountSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  mustChangePassword: true,
  version: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;
const attempts = 3;
type Hook = {
  beforeTransaction?: () => Promise<void>;
  insideTransaction?: () => Promise<void>;
};
let hooks: Hook = {};
export function setAdminHooksForTesting(value: Hook) {
  if (process.env.NODE_ENV !== "test") throw new Error("Test only");
  hooks = value;
}
async function currentAdmin(tx: Prisma.TransactionClient, id: number) {
  const actor = await tx.user.findUnique({
    where: { id },
    select: { id: true, role: true, isActive: true, mustChangePassword: true },
  });
  if (
    !actor ||
    !actor.isActive ||
    actor.mustChangePassword ||
    actor.role !== UserRole.ADMINISTRATOR
  )
    throw new ApiError(
      403,
      "FORBIDDEN",
      "You do not have permission to perform this action.",
    );
}
async function serial<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  await hooks.beforeTransaction?.();
  for (let attempt = 1; attempt <= attempts; attempt++)
    try {
      return await prisma.$transaction(
        async (tx) => {
          await hooks.insideTransaction?.();
          return operation(tx);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      const retry =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034";
      if (!retry) throw error;
      if (attempt === attempts)
        throw new ApiError(
          409,
          "ACCOUNT_CONFLICT",
          "Account data changed. Reload and try again.",
        );
    }
  throw new ApiError(
    409,
    "ACCOUNT_CONFLICT",
    "Account data changed. Reload and try again.",
  );
}
function duplicate(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  )
    throw new ApiError(
      409,
      "EMAIL_CONFLICT",
      "An account already uses this email.",
      { email: "An account already uses this email." },
    );
  throw error;
}
function parseCreate(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    validation({ form: "Enter account details." });
  const b = body as Record<string, unknown>;
  const allowed = ["name", "email", "role", "isActive", "initialPassword"];
  if (Object.keys(b).some((k) => !allowed.includes(k)))
    validation({ form: "Only supported account fields may be submitted." });
  const name = accountName(b.name),
    email = canonicalEmail(b.email),
    role = validRole(b.role) ? b.role : null;
  const password =
    typeof b.initialPassword === "string" ? b.initialPassword : "";
  const fields: Record<string, string> = {};
  if (!name) fields.name = "Name must contain 1 to 120 valid characters.";
  if (!email) fields.email = "Enter a valid email address.";
  if (!role) fields.role = "Select one role.";
  if (typeof b.isActive !== "boolean")
    fields.isActive = "Select an activation state.";
  const passwordError = passwordValidationError(password);
  if (passwordError) fields.initialPassword = passwordError;
  if (Object.keys(fields).length) validation(fields);
  return {
    name: name!,
    email: email!,
    role: role!,
    isActive: b.isActive as boolean,
    password,
  };
}
function parsePatch(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    validation({ form: "Enter account changes." });
  const b = body as Record<string, unknown>;
  const allowed = ["name", "email", "role", "isActive", "expectedVersion"];
  if (Object.keys(b).some((k) => !allowed.includes(k)))
    validation({ form: "Only supported account fields may be submitted." });
  const expectedVersion = positiveVersion(b.expectedVersion);
  const data: {
    name?: string;
    email?: string;
    role?: UserRole;
    isActive?: boolean;
  } = {};
  const fields: Record<string, string> = {};
  if (!expectedVersion)
    fields.expectedVersion = "Reload the account before saving.";
  for (const key of ["name", "email", "role", "isActive"] as const)
    if (key in b) {
      if (key === "name") {
        const v = accountName(b.name);
        if (v) data.name = v;
        else fields.name = "Name must contain 1 to 120 valid characters.";
      }
      if (key === "email") {
        const v = canonicalEmail(b.email);
        if (v) data.email = v;
        else fields.email = "Enter a valid email address.";
      }
      if (key === "role") {
        if (validRole(b.role)) data.role = b.role;
        else fields.role = "Select one role.";
      }
      if (key === "isActive") {
        if (typeof b.isActive === "boolean") data.isActive = b.isActive;
        else fields.isActive = "Select an activation state.";
      }
    }
  if (!Object.keys(data).length)
    fields.form = "Change at least one editable field.";
  if (Object.keys(fields).length) validation(fields);
  return { expectedVersion: expectedVersion!, data };
}
async function getTarget(
  tx: Prisma.TransactionClient,
  id: number,
  version: number,
) {
  const target = await tx.user.findUnique({ where: { id } });
  if (!target)
    throw new ApiError(404, "RESOURCE_NOT_FOUND", "Account was not found.");
  if (target.version !== version)
    throw new ApiError(
      409,
      "STALE_RESOURCE",
      "The account changed. Reload the latest version.",
    );
  return target;
}
usersAdminRouter.get("/users", async (_req, res, next) => {
  try {
    const actor = authSession(res).user;
    const searchValue = _req.query.search,
      roleValue = _req.query.role;
    if (
      Array.isArray(searchValue) ||
      Array.isArray(roleValue) ||
      (_req.query &&
        Object.keys(_req.query).some((k) => !["search", "role"].includes(k)))
    )
      throw new ApiError(
        400,
        "INVALID_QUERY",
        "User list parameters are invalid.",
      );
    const search =
      typeof searchValue === "string" ? searchValue.trim() : undefined;
    if (
      searchValue !== undefined &&
      (!search || Array.from(search).length > 100)
    )
      throw new ApiError(
        400,
        "INVALID_QUERY",
        "User list parameters are invalid.",
      );
    if (roleValue !== undefined && !validRole(roleValue))
      throw new ApiError(
        400,
        "INVALID_QUERY",
        "User list parameters are invalid.",
      );
    const items = await prisma.$transaction(async (tx) => {
      await currentAdmin(tx, actor.id);
      return tx.user.findMany({
        where: {
          ...(roleValue ? { role: roleValue as UserRole } : {}),
          ...(search
            ? {
                OR: [
                  { name: { contains: search, mode: "insensitive" } },
                  {
                    email: {
                      contains: search.toLowerCase(),
                      mode: "insensitive",
                    },
                  },
                ],
              }
            : {}),
        },
        orderBy: [{ name: "asc" }, { id: "asc" }],
        select: accountSelect,
      });
    });
    res.json({ items });
  } catch (e) {
    next(e);
  }
});
usersAdminRouter.post("/users", async (req, res, next) => {
  try {
    const input = parseCreate(req.body);
    const passwordHash = await hashPassword(input.password);
    const item = await serial(async (tx) => {
      await currentAdmin(tx, authSession(res).user.id);
      return tx.user.create({
        data: {
          name: input.name,
          email: input.email,
          role: input.role,
          isActive: input.isActive,
          passwordHash,
          mustChangePassword: true,
        },
        select: accountSelect,
      });
    });
    res.status(201).json(item);
  } catch (e) {
    try {
      duplicate(e);
    } catch (x) {
      next(x);
    }
  }
});
usersAdminRouter.patch("/users/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0)
      throw new ApiError(404, "RESOURCE_NOT_FOUND", "Account was not found.");
    const input = parsePatch(req.body);
    const item = await serial(async (tx) => {
      const actorId = authSession(res).user.id;
      await currentAdmin(tx, actorId);
      const target = await getTarget(tx, id, input.expectedVersion);
      const nextRole = input.data.role ?? target.role,
        nextActive = input.data.isActive ?? target.isActive;
      if (id === actorId && input.data.isActive === false)
        throw new ApiError(
          409,
          "ADMIN_REQUIRED",
          "You cannot deactivate your own account.",
        );
      const removesAdmin =
        target.role === UserRole.ADMINISTRATOR &&
        target.isActive &&
        (!nextActive || nextRole !== UserRole.ADMINISTRATOR);
      if (removesAdmin) {
        const count = await tx.user.count({
          where: { role: UserRole.ADMINISTRATOR, isActive: true },
        });
        if (count <= 1)
          throw new ApiError(
            409,
            "ADMIN_REQUIRED",
            "At least one active Administrator must remain.",
          );
      }
      const roleChanged = nextRole !== target.role,
        activeChanged = nextActive !== target.isActive;
      if (roleChanged || activeChanged) {
        await tx.session.deleteMany({ where: { userId: id } });
      }
      if (
        target.isActive &&
        ((roleChanged && nextRole === UserRole.REQUESTER) ||
          (activeChanged && !nextActive))
      ) {
        await tx.ticket.updateMany({
          where: { ownerId: id },
          data: { ownerId: null, version: { increment: 1 } },
        });
      }
      return tx.user.update({
        where: { id },
        data: { ...input.data, version: { increment: 1 } },
        select: accountSelect,
      });
    });
    res.json(item);
  } catch (e) {
    try {
      duplicate(e);
    } catch (x) {
      next(x);
    }
  }
});
usersAdminRouter.post("/users/:id/initial-password", async (req, res, next) => {
  try {
    const id = Number(req.params.id),
      version = positiveVersion(req.body?.expectedVersion),
      password =
        typeof req.body?.initialPassword === "string"
          ? req.body.initialPassword
          : "";
    if (!Number.isSafeInteger(id) || id <= 0)
      throw new ApiError(404, "RESOURCE_NOT_FOUND", "Account was not found.");
    const fields: Record<string, string> = {};
    if (!version)
      fields.expectedVersion = "Reload the account before resetting.";
    const pe = passwordValidationError(password);
    if (pe) fields.initialPassword = pe;
    if (
      !req.body ||
      typeof req.body !== "object" ||
      Array.isArray(req.body) ||
      Object.keys(req.body).some(
        (k) => !["initialPassword", "expectedVersion"].includes(k),
      )
    )
      fields.form = "Only supported reset fields may be submitted.";
    if (Object.keys(fields).length) validation(fields);
    const passwordHash = await hashPassword(password);
    const item = await serial(async (tx) => {
      await currentAdmin(tx, authSession(res).user.id);
      await getTarget(tx, id, version!);
      await tx.session.deleteMany({ where: { userId: id } });
      return tx.user.update({
        where: { id },
        data: {
          passwordHash,
          mustChangePassword: true,
          version: { increment: 1 },
        },
        select: accountSelect,
      });
    });
    res.json(item);
  } catch (e) {
    next(e);
  }
});
