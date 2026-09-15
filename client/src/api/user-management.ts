import { apiFetch } from "./request";
export type AccountRole = "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
export type Account = {
  id: number;
  name: string;
  email: string;
  role: AccountRole;
  isActive: boolean;
  mustChangePassword: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
};
export class AccountError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly fields: Record<string, string> = {},
  ) {
    super(message);
  }
}
async function call(path: string, init?: RequestInit) {
  const response = await apiFetch(path, init);
  if (!response.ok) {
    let body: any = {};
    try {
      body = await response.json();
    } catch {}
    throw new AccountError(
      body.error?.code ?? "REQUEST_FAILED",
      body.error?.message ?? "The request failed.",
      body.error?.fieldErrors ?? {},
    );
  }
  return response.json();
}
export async function listAccounts(search = "", role = "") {
  const q = new URLSearchParams();
  if (search) q.set("search", search);
  if (role) q.set("role", role);
  return ((await call(`/api/admin/users?${q}`)) as { items: Account[] }).items;
}
export const createAccount = (body: object) =>
  call("/api/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as Promise<Account>;
export const editAccount = (id: number, body: object) =>
  call(`/api/admin/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as Promise<Account>;
export const resetInitialPassword = (id: number, body: object) =>
  call(`/api/admin/users/${id}/initial-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as Promise<Account>;
