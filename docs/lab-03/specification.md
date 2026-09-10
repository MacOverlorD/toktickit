# Lab 3 Sprint Engineering Specification

Status: Draft - Issue #33 started; not approved for implementation.
Source: [Lab 3 sheet](./Lab_3_sheet.pdf), sections 1-13.
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
- BR-08: IT Priority initially copies Requested Priority. Only IT Staff or Administrator may change it, subject to the completed authorization matrix.
- BR-09: Status values are New, Open, In Progress, Waiting for Requester, Resolved, Closed, Reopened and Cancelled. Exact permitted edges remain to be specified.
- BR-10: Comments/Notes are append-only with backend author/time; blank content is rejected and content is safely rendered. Length limits remain to be specified.
- BR-11: Duplicate canonical email and invalid roles are rejected. Passwords are never stored in plaintext or returned in user payloads.
- BR-12: Administrators cannot deactivate themselves or remove/deactivate the last active Administrator, including by role changes.
- BR-13: Deactivate users instead of deleting them. Setting an initial password requires a change at the next login.
- BR-14: Existing Ticket ownership, attachment authorship, file storage and reference relationships survive migration.
- BR-15: Protected-resource errors do not reveal another Requester's tickets, attachments or Internal Notes.

### Initial authorization matrix

| Capability | Requester | IT Staff | Administrator |
|---|---|---|---|
| Own Ticket create/list/detail and permitted attachment mutations | Own only | No Requester role | No Requester role |
| Staff queue and operational detail | No | Yes | Decision D-01 pending |
| Public Comment read | Own Ticket | Yes | Yes |
| Internal Note read | No | Yes | Yes |
| Comment/Note creation | Public, own Ticket only | Public and Internal | Decision D-01 pending |
| Claim/assign/reassign, IT Priority and status | No | Yes | Decision D-01 pending |
| Problem Appears Resolved | Own Ticket | No | No |
| User management | No | No | Yes |

This matrix is a draft, not a complete endpoint policy. Public comments are
not anonymous/public-internet data. Do not infer Administrator operational
permissions from its name; resolve the handout's overlap explicitly.

## 6. UI Specification Summary

Reuse Lab 2 tokens and reusable components. Add Login, Change Password, Staff
Queue, Staff Detail and User Management; extend Requester Detail and shell.
See [ui-spec.md](./ui-spec.md) for the initial screen inventory.

## 7. Data Changes

The existing Prisma model has Requester, Ticket, Attachment, Category and
RelatedSystem; TicketStatus currently contains only NEW. Ticket.requesterId and
Attachment uploadedByRequesterId/removedByRequesterId reference Requester.

Proposed direction: evolve Requester to User while preserving IDs, relations,
canonical email and timestamps. Add credential/role/password-change state,
operational Ticket owner, IT Priority, statuses, resolution indication and
comment/note authorship. Exact fields, indexes, constraints, session storage,
backfill order and migration failure recovery are Issue #33 work remaining.

Seeds must be idempotent and include at least four active plus one inactive
Requester, three active plus one inactive IT Staff, one active Administrator,
and realistic assigned/unassigned tickets across priorities/statuses with
sample comments/notes. Initial credentials are local-lab-only, never real secrets.

## 8. API Contract

[api-spec.md](./api-spec.md) inventories required capabilities. Final methods,
payloads, authorization, cookies/tokens, validation and safe status/error
contracts must be finished before feature implementation.

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

These initial ACs will be expanded with Given/When/Then boundaries as decisions close.

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

See [decisions.md](./decisions.md). Issue #33 remains Started until unresolved
contracts are completed and reviewed. No feature implementation has started.
