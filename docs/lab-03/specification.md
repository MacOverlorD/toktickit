# Lab 3 Sprint Engineering Specification

Status: Approved in PR #42 and merged into `lab3-staging` on 2026-09-10.
Source: [Lab 3 sheet](./Lab_3_sheet.pdf), sections 1-14.
Baseline: `main` / `lab3-staging` at `6a015da569b8f8e276f32ab67071acb891580836`.
Related: [API](./api-spec.md), [UI](./ui-spec.md), [tests](./tests.md), [decisions](./decisions.md), [glossary](./glossary.md).

## 1. Sprint Goal

Replace the temporary Development Requester identity with authenticated accounts
and deliver role-controlled Requester, IT Staff and Administrator workflows
while preserving existing tickets, attachments and Zen Green components.

## 2. Stakeholder Request

Users sign in with email/password and must replace initial passwords. Requesters
continue their own ticket work. IT Staff locate and own work, set IT Priority,
communicate publicly or privately, and control formal status. Administrators
manage accounts with one role per account and essential safety rules.

## 3. Scope

Included: authentication, mandatory password change, server authorization,
identity/data migration, Requester regression, staff queue/detail, assignment,
IT Priority, status workflow, comments/notes, user administration, tests and evidence.

Excluded: self-registration, invitations/reset email, MFA/SSO/social login,
Actions Taken, SLA/escalation/notifications, analytics dashboards, cloud deployment,
multiple roles, user deletion/bulk/import/export, departments/organizations,
profile photos, account-history screens and advanced identity management.
Administrator list pagination and advanced sorting/filtering are not required.

## 4. Functional Requirements

| ID | Requirement | Issue sequence |
|---|---|---|
| FR-01 | Login/logout/current user and mandatory initial-password change | 3 |
| FR-02 | Backend role/active-state/ownership checks and role navigation | 3, 4 |
| FR-03 | Preserve all Lab 2 Requester Ticket/Attachment operations under real identity | 2, 4 |
| FR-04 | Staff queue search, filters, sorting and pagination | 5 |
| FR-05 | Staff detail, attachment access, claim/assign/reassign and IT Priority | 6 |
| FR-06 | Eight-state workflow and separate Requester resolution indication | 6 |
| FR-07 | Public Comments and restricted Internal Notes | 6 |
| FR-08 | Minimal Administrator user management and account safety | 7 |
| FR-09 | Responsive accessible Zen Green screens and meaningful feedback | 3-8 |
| FR-10 | Repeatable migration/seeds and traceable final-main delivery evidence | 2, 8, 9 |

## 5. Business Rules

- BR-01: Only active users with valid credentials may authenticate.
- BR-02: Initial-password users cannot enter normal application APIs or screens until a valid new password is saved.
- BR-03: Authenticated identity determines Requester ownership; client requester IDs never grant authority.
- BR-04: Public Comments are visible to the owning Requester, IT Staff and Administrator; Internal Notes only to IT Staff and Administrator.
- BR-05: Requesters may indicate a problem appears resolved, but cannot formally set Resolved or Closed.
- BR-06: One User has exactly one of Requester, IT Staff or Administrator roles.
- BR-07: One Ticket has zero or one primary operational owner, eligible only when active IT Staff or Administrator.
- BR-08: IT Priority initially copies Requested Priority. Only IT Staff or Administrator may change it, as explicitly permitted by the authorization matrix.
- BR-09: Status values are New, Open, In Progress, Waiting for Requester, Resolved, Closed, Reopened and Cancelled. Permitted edges are defined in the matrix below.
- BR-10: Comments/Notes are append-only with backend author/time; blank content is rejected and content is safely rendered. Content is trimmed and limited to 1-5,000 Unicode code points.
- BR-11: Duplicate canonical email and invalid roles are rejected. Passwords are never stored in plaintext or returned in user payloads.
- BR-12: Administrators cannot deactivate themselves or remove/deactivate the last active Administrator, including by role changes.
- BR-13: Deactivate users instead of deleting them. Setting an initial password requires a change at the next login.
- BR-14: Existing Ticket ownership, attachment authorship, file storage and reference relationships survive migration.
- BR-15: Protected-resource errors do not reveal another Requester's tickets, attachments or Internal Notes.

### Authorization matrix

| Capability | Requester | IT Staff | Administrator |
|---|---|---|---|
| Own Ticket create/list/detail and permitted attachment mutations | Own only | No Requester role | No Requester role |
| Staff queue and operational detail | No | Yes | Yes |
| Public Comment read | Own Ticket | Yes | Yes |
| Internal Note read | No | Yes | Yes |
| Comment/Note creation | Public, own Ticket only | Public and Internal | Yes |
| Claim/assign/reassign, IT Priority and status | No | Yes | Yes |
| Problem Appears Resolved | Own Ticket | No | No |
| User management | No | No | Yes |

Public Comments are not anonymous/public-internet data. Administrator ticket
access is explicitly granted under D-01; only Administrator may manage users.
Unauthenticated and password-change-only sessions cannot use any matrix operation.
Staff/Administrator can read ticket attachment metadata/content but cannot upload
or remove Requester attachments. The Requester can use owned attachments in all statuses.

### Status transition matrix (BR-16)

Only IT Staff and Administrator may use these edges. All other edges, including
same-status requests, return 409 INVALID_TRANSITION without a write.

| From | Permitted next statuses |
|---|---|
| NEW | OPEN, CANCELLED |
| OPEN | IN_PROGRESS, WAITING_FOR_REQUESTER, CANCELLED |
| IN_PROGRESS | WAITING_FOR_REQUESTER, RESOLVED, CANCELLED |
| WAITING_FOR_REQUESTER | IN_PROGRESS, RESOLVED, CANCELLED |
| RESOLVED | CLOSED, REOPENED |
| CLOSED | REOPENED |
| REOPENED | OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, CANCELLED |
| CANCELLED | REOPENED |

- BR-17: IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED and CLOSED require an eligible active owner; otherwise 409 OWNER_REQUIRED. No automatic claim on status update.
- BR-18: RESOLVED, CLOSED, CANCELLED and REOPENED require confirmed=true and a UI confirmation naming the action; other transitions accept omitted/false confirmation. Server still verifies roles/edges.
- BR-19: Requester indication is permitted only in OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER and REOPENED. Repeat preserves original timestamp; it never changes status. REOPENED or WAITING_FOR_REQUESTER transition clears the indication. Other transitions preserve it as context.
- BR-20: Any operational role can work any ticket, not just tickets assigned to them. Assign/claim accepts an active IT Staff or Administrator; null unassign is allowed except in the four owner-required statuses above. It never changes formal status.
- BR-21: Owner deactivation or change to Requester unassigns all their tickets atomically with the user update and increments affected ticket versions. Existing statuses are preserved; such tickets show Needs assignment and future owner-required transitions are blocked until reassigned. Historical comments, requester identity and attachment authorship remain intact.
- BR-22: Changing a Requester role does not transfer their submitted tickets; the user loses Requester routes until returned to that role. Historical tickets remain visible operationally and regain owned access if the account is later a Requester again.
- BR-23: Ticket operational changes, resolution indication and Administrator account edits/resets require expectedVersion. Account creation, login, self password change and communication appends use their own authentication/transaction guards. A stale version returns 409 STALE_RESOURCE except the already-recorded resolution indication retry defined in the API contract. Comments/notes are independent append operations. Owner, priority, status, indication and communication changes update Ticket.updatedAt; actual writes increment Ticket.version. Current-version owner/priority no-ops and repeated resolution indications preserve version and updatedAt. The server authorizes before returning conflict details.
- BR-24: Last-active-Administrator protection uses serializable transactions with bounded retry (three total attempts); recheck count and target state on retry. Return 409 ACCOUNT_CONFLICT when exhausted. Database email uniqueness is authoritative.
- BR-25: User name is trimmed 1-120 Unicode code points; email is trimmed/lowercased, syntactically valid and at most 254 characters. Do not apply provider-specific dot/plus rewriting. Password policy and login-attempt handling are normative in api-spec.md.
- BR-26: Public Comments and Internal Notes may be appended in every status. They do not automatically reopen/change status. Render plain text with line breaks; never interpret user text as HTML/Markdown.

## 6. UI Specification Summary

Reuse Lab 2 tokens and reusable components. Add Login, Change Password, Staff
Queue, Staff Detail and User Management; extend Requester Detail and shell.
See [ui-spec.md](./ui-spec.md) for the screen, mode, feedback and responsive contract.

## 7. Data Changes

The existing Prisma model has Requester, Ticket, Attachment, Category and
RelatedSystem; TicketStatus currently contains only NEW. Ticket.requesterId and
Attachment uploadedByRequesterId/removedByRequesterId reference Requester.

### Schema and migration contract

| Model | Changes / relationships / indexes |
|---|---|
| User (renamed Requester) | Preserve id/name/email/isActive/createdAt/updatedAt. Add role enum REQUESTER/IT_STAFF/ADMINISTRATOR default REQUESTER, nullable passwordHash Text during provisioning, mustChangePassword Boolean default true, version Int default 1. Preserve canonical email unique constraint; index (role,isActive,id). Null hash never authenticates. |
| Session | tokenHash char(64) primary key, userId FK Restrict, csrfToken char(64), createdAt/lastSeenAt/expiresAt timestamptz. Index userId and expiresAt. Token itself never stored. |
| Ticket | Preserve all fields. Add ownerId nullable FK User Restrict, itPriority RequestedPriority NOT NULL backfilled from requestedPriority, version Int default 1, resolutionIndicatedAt timestamptz nullable and resolutionIndicatedById nullable FK User Restrict. Both indication fields null together; indicator must be submitter. Index (status,itPriority,updatedAt,id), (ownerId,updatedAt,id). |
| PublicComment | id Int PK, ticketId FK Restrict, authorId FK User Restrict, content Text, createdAt timestamptz default now. Index (ticketId,createdAt,id); trimmed length 1-5000. |
| InternalNote | Same structure as PublicComment in a separate table; same index and content constraint. Never included in Requester DTO joins. |
| Attachment | Preserve all metadata and file bytes; rename uploadedByRequesterId/removedByRequesterId to uploadedByUserId/removedByUserId and repoint Prisma relations to renamed User table, without changing values. |

TicketStatus enum values: NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER,
RESOLVED, CLOSED, REOPENED, CANCELLED. RequestedPriority remains
LOW, MEDIUM, HIGH, URGENT. Stored timestamps are UTC; display uses browser locale.

Migration sequence: back up the local database and private upload directory;
preflight row counts, canonical-email collisions, email-policy compatibility and orphan relations; run a
transactional additive/rename migration preserving IDs and sequences; add enum
values and backfill IT Priority. Commit enum expansion before any seed/statement
uses a newly added status value; check counts/FKs/file references; generate Prisma
client; run explicit credential provisioning and seed; verify before switching
the application to authenticated routes. Test on a disposable populated Lab 2
copy and a clean database first. On failure roll back the transaction; after a
committed migration use the verified backup or a forward fix, never reset the
user's database. No migration may delete historical tickets or file metadata.

Existing Users with no passwordHash cannot log in. A local provisioning command
accepts LAB3_INITIAL_PASSWORD from an ignored environment file, validates/hashes
it per user and updates only users with null passwordHash. It must not log the
password. Record the local delivery process: the operator knows the supplied
lab-only password and communicates it locally; no email service is involved.

Idempotent seed creates missing local demonstration accounts with at least four
active and one inactive Requesters, three active and one inactive IT Staff and
one active Administrator. Existing accounts are not reactivated, re-roled or
password-reset by reruns. If an existing customized fixture prevents minimum
counts, report the unmet requirement rather than overwriting it. Add missing
realistic fixtures across all eight statuses, four priorities, assigned/unassigned
owners and sample Public Comments/Internal Notes. Identify fixtures by reserved
deterministic keys and skip existing fixtures. Test changed-password preservation
and repeat seeding, not just absence of duplicates.

## 8. API Contract

[api-spec.md](./api-spec.md) defines methods, payloads, session/CSRF behavior,
validation, authorization and safe errors. Existing Lab 2 DTOs remain the
baseline except for explicitly documented authenticated-identity changes.

## 9. Acceptance Criteria

| ID | Observable outcome |
|---|---|
| AC-01 | Active valid login establishes authenticated identity; invalid/inactive login does not. |
| AC-02 | Initial-password user cannot access normal APIs/screens until a valid replacement is saved. |
| AC-03 | Logout invalidates access; expiry, deactivation and role/password changes follow the documented session policy. |
| AC-04 | Direct unauthorized APIs and routes reject access without protected data. |
| AC-05 | Spoofed requester IDs cannot alter identity or expose another Requester's tickets/attachments. |
| AC-06 | Existing Lab 2 create/list/detail/attachment functions continue with authenticated identity and preserved data. |
| AC-07 | Queue query controls produce deterministic correctly paginated results and reject invalid parameters. |
| AC-08 | Detail supports eligible ownership changes, separate IT Priority and permitted attachment access. |
| AC-09 | Only allowed status edges/roles succeed; Requester indication never formally resolves/closes a ticket. |
| AC-10 | Append-only public/private entries enforce author/time, visibility, validation and safe rendering. |
| AC-11 | Administrator lists/searches/creates/edits users with one valid role and unique email. |
| AC-12 | Administrator initial-password reset requires a change at next login. |
| AC-13 | Self-deactivation and loss of last active Administrator are rejected, including concurrent changes. |
| AC-14 | Migration preserves Lab 2 data/relations/files and repeated seeds do not duplicate or reset user-managed state. |
| AC-15 | Required screen modes and processing/validation/success/empty/forbidden/not-found/conflict/failure feedback work. |
| AC-16 | Desktop/tablet/mobile screens retain Zen Green consistency, keyboard usability and no clipping/overflow. |
| AC-17 | Final main has passing traceable tests, real review evidence and the nine-part submission PDF. |

Concrete positive, negative and boundary scenarios for these ACs are specified
in [tests.md](./tests.md); all statuses remain Planned until actually executed.

## 10. Definition of Done

- Approved engineering contract and every numbered AC implemented and evidenced.
- Migration works on populated Lab 2 and clean databases; repeated seeds are safe.
- All protected operations enforce backend roles/ownership and safe errors.
- Feature tests plus integrated unit/API/UI/style/security/regression/E2E pass.
- Desktop/tablet/mobile screenshots and visual/accessibility checklist complete.
- Feature PRs reviewed into lab3-staging; release reviewed into main; checks rerun on final main.
- README, tests, reviewer and AI-use records reflect actual evidence; no invented approvals/results.
- Exactly one readable PDF with working links and Answer Part 1 through Answer Part 9.

## 11. Assumptions and Decisions

See [decisions.md](./decisions.md) for D-01 through D-07 and rationale,
and [review readiness](./review-readiness.md) for the author audit and lab coverage.
Issue #33 was approved and merged through PR #42. No feature implementation`r`nis claimed by this documentation contract.
