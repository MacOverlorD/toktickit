import { UserRole } from "@prisma/client";
import { ApiError } from "../errors/api-error.js";

export const accountRoles = Object.values(UserRole);
const emailPattern =
  /^([A-Za-z0-9_%+-]|\.(?!\.)){1,64}@(?=.{3,189}$)(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;
export function canonicalEmail(value: unknown) {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !emailPattern.test(email)) return null;
  const local = email.slice(0, email.indexOf("@"));
  return local.startsWith(".") || local.endsWith(".") ? null : email;
}
export function accountName(value: unknown) {
  if (typeof value !== "string" || /[\uD800-\uDFFF]/u.test(value)) return null;
  const name = value.trim();
  const length = Array.from(name).length;
  return length >= 1 && length <= 120 ? name : null;
}
export function positiveVersion(value: unknown) {
  return Number.isSafeInteger(value) && Number(value) > 0
    ? Number(value)
    : null;
}
export function validRole(value: unknown): value is UserRole {
  return typeof value === "string" && accountRoles.includes(value as UserRole);
}
export function validation(fieldErrors: Record<string, string>): never {
  throw new ApiError(
    400,
    "VALIDATION_ERROR",
    "Review the highlighted fields.",
    fieldErrors,
  );
}
