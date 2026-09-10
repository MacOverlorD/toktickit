# Lab 3 API Specification

Status: Draft capability inventory for Issue #33; paths below are proposals.
Baseline: Express /api routes and Prisma in server/src and server/prisma.

| Proposed method/path | Capability | Role policy |
|---|---|---|
| POST /api/auth/login | Email/password authentication | Anonymous |
| POST /api/auth/logout | Invalidate current session | Authenticated, including password-change-only session |
| GET /api/auth/me | Safe current-user identity | Authenticated |
| POST /api/auth/change-password | Replace initial password | Authenticated; restricted session allowed |
| Existing /api/tickets and attachment routes | Preserve Lab 2 functions | Owning Requester |
| GET /api/staff/tickets | Search/filter/sort/page queue | IT Staff; Administrator policy pending |
| GET /api/staff/tickets/:ticketNumber | Operational detail and safe attachment metadata | IT Staff; Administrator policy pending |
| PATCH /api/staff/tickets/:ticketNumber/owner | Claim/assign/reassign | Operational roles pending final matrix |
| PATCH /api/staff/tickets/:ticketNumber/priority | Set IT Priority | IT Staff / permitted Administrator |
| PATCH /api/staff/tickets/:ticketNumber/status | Allowed status transition | Operational roles pending final matrix |
| POST /api/tickets/:ticketNumber/resolution-indication | Problem Appears Resolved | Owning Requester |
| GET/POST /api/tickets/:ticketNumber/comments | Public Comments | Authorized ticket participants; Administrator write policy pending |
| GET/POST /api/tickets/:ticketNumber/notes | Internal Notes | IT Staff / Administrator; write policy pending |
| GET/POST /api/admin/users | Search/list and create accounts | Administrator |
| PATCH /api/admin/users/:id | Basic account edits | Administrator |
| POST /api/admin/users/:id/initial-password | Set new initial password | Administrator |

## Work remaining before approval

- Define exact request/response DTOs and field allowlists, canonicalization, limits and safe error body.
- Specify cookie/session or token behavior, hashing, expiry, logout/revocation, login attempts and applicable CSRF defense.
- Distinguish 401, 403, invalid-input 400, hidden/missing resource 404, conflict 409 and safe 500 behavior.
- Specify staff attachment content access without weakening Requester ownership checks.
- Specify query fields/default order/page sizes/metadata; reject invalid, repeated and unknown parameters consistently.
- Define atomic conflict handling for assignment/status/last-Administrator changes.
- Map every endpoint to FR/BR/AC and planned positive/negative tests.

No endpoint in this draft is claimed implemented.
