# Lab 3 Test Plan and Traceability

Status: Ready for Issue #33 PR review; test plan written before implementation. All tests below are Planned, not executed.
Paths are proposed targets, not files that already exist. The scenarios below
are mandatory cases to implement alongside features and expand when new defects arise.

| Test ID | Type | Acceptance criteria | Planned file | Coverage | Status |
|---|---|---|---|---|---|
| AUTH-01 | API | AC-01, AC-02, AC-03 | server/tests/lab-03/auth.api.test.ts | Credentials, inactive users, password-change gate, expiry/logout and session policy | Planned |
| AUTHZ-01 | API/security | AC-04, AC-05 | server/tests/lab-03/authorization.api.test.ts | Direct role denial, spoofing, cross-owner resources and private-note leakage | Planned |
| REG-01 | API/regression | AC-05, AC-06 | server/tests/lab-03/requester-regression.api.test.ts | Authenticated Lab 2 ticket/idempotency/attachment behavior | Planned |
| QUEUE-01 | API | AC-07 | server/tests/lab-03/staff-queue.api.test.ts | Query controls, paging, invalid input and authorization | Planned |
| DETAIL-01 | API | AC-08, AC-09 | server/tests/lab-03/staff-ticket-detail.api.test.ts | Assignment, priority, transitions, resolution indication and conflicts | Planned |
| COMM-01 | API | AC-10 | server/tests/lab-03/comments-notes.api.test.ts | Visibility, append-only author/time, limits and rendering payloads | Planned |
| ADMIN-01 | API | AC-11, AC-12, AC-13 | server/tests/lab-03/users-admin.api.test.ts | Search/CRUD scope/reset/duplicates/one role and concurrent last-admin protection | Planned |
| MIG-01 | Integration | AC-06, AC-14 | server/tests/lab-03/migration.test.ts | Populated Lab 2 and clean migration, relationships and repeated seed safety | Planned |
| UI-01 | UI component | AC-01, AC-15 | client/src/tests/lab-03/Login.test.tsx | Controls, validation, feedback and role behavior | Planned |
| UI-02 | UI component | AC-02, AC-15 | client/src/tests/lab-03/ChangePassword.test.tsx | Controls, validation, feedback and role behavior | Planned |
| UI-03 | UI component | AC-03, AC-04, AC-15 | client/src/tests/lab-03/RoleNavigation.test.tsx | Controls, validation, feedback and role behavior | Planned |
| UI-04 | UI component | AC-05, AC-06, AC-09, AC-10, AC-15 | client/src/tests/lab-03/RequesterRegression.test.tsx | Controls, validation, feedback and role behavior | Planned |
| UI-05 | UI component | AC-07, AC-15 | client/src/tests/lab-03/StaffTicketQueue.test.tsx | Controls, validation, feedback and role behavior | Planned |
| UI-06 | UI component | AC-08, AC-09, AC-10, AC-15 | client/src/tests/lab-03/StaffTicketDetail.test.tsx | Controls, validation, feedback and role behavior | Planned |
| UI-07 | UI component | AC-11, AC-12, AC-13, AC-15 | client/src/tests/lab-03/UserManagement.test.tsx | Controls, validation, feedback and role behavior | Planned |
| UNIT-01 | Unit | AC-01, AC-02, AC-09, AC-10, AC-13 | server/tests/lab-03/business-rules.test.ts | Validation boundaries and allowed transitions; supplement real DB concurrency tests | Planned |
| STYLE-01 | UI/style | AC-15, AC-16 | client/src/tests/lab-03/ZenGreen.test.tsx | Tokens, shared components and editable/read-only presentation | Planned |
| E2E-01 | E2E | AC-01, AC-02, AC-03, AC-04 | e2e/lab-03/authentication.spec.ts | Full login/change-password/logout and direct-access flow | Planned |
| E2E-02 | E2E | AC-05, AC-06, AC-07, AC-08, AC-09, AC-10 | e2e/lab-03/staff-ticket-flow.spec.ts | Requester/staff ticket, attachments and communication | Planned |
| E2E-03 | E2E | AC-11, AC-12, AC-13 | e2e/lab-03/user-administration.spec.ts | User lifecycle and safety rules | Planned |
| VIS-01 | Responsive/accessibility/visual | AC-15, AC-16 | e2e/lab-03/visual-evidence.spec.ts | Desktop/tablet/mobile screenshots plus manual keyboard/focus and visual inspection | Planned |
| REL-01 | Release verification | AC-17 | docs/lab-03/reviewer.md; final-main CI/command evidence | Passing suites, peer reviews, traceability and nine-part PDF review | Planned |

## Existing commands

- `npm run test:server`
- `npm run test:client`
- `npm run test:e2e`
- `npm run build`

Confirm Lab 3 test discovery and E2E setup during implementation. Existing E2E
uses local PostgreSQL and creates/deletes scoped test records; do not reset the
development database to obtain evidence. No tests have run for this setup-only change.

## Completion evidence

Replace proposed paths with actual paths, record exact commands, commit SHA,
results and artifacts. Every final AC needs at least one test. Retain feature-level
tests in Issues 3-7; Issue 8 adds integrated verification rather than delaying TDD.

## Scenario-level cases

Each row is a required group under the referenced test ID above. Split into
individual executable tests when coding. Use a controllable clock for expiry
and rate limits; do not slow suites with real waiting or weaken production rules.

| Group | Given / When | Expected result and AC |
|---|---|---|
| AUTH-01.a | Active valid, wrong-password, unknown-email, inactive and null-hash users submit login | Only active valid gets session; other credential failures use same 401 body. Hash/salt/session internals absent. AC-01 |
| AUTH-01.b | New/initial passwords of 14,15,128,129 code points, multibyte text, whitespace-only, mismatched confirmation or unchanged value | Exact policy boundaries; preserve valid spaces/Unicode, reject invalid with field feedback. AC-01/02 |
| AUTH-01.c | Restricted session directly accesses each normal API, then changes valid password | 403 before change; rotated unrestricted session afterward; old sessions fail. AC-02/03 |
| AUTH-01.d | Time crosses 15-minute restricted expiry, 30-minute idle or 8-hour absolute expiry | Exact boundary invalidates; expired session does not regain validity via lastSeen update. AC-03 |
| AUTH-01.e | Logout, role edit, deactivation, reset or password change followed by old-cookie replay | Required sessions invalidated; cleared cookie scope matches original. AC-03 |
| AUTH-01.f | Mutations omit/wrong CSRF or Origin; login uses hostile/null/missing Origin or non-JSON media | Forbidden or safe media error; trusted Origin + token succeeds. Include multipart upload CSRF. AC-04 |
| AUTH-01.g | Email failure/IP attempt buckets cross limits, expire or reach capacity | 429 and truthful Retry-After; same unknown-email behavior; success clears only email bucket. AC-01/04 |
| AUTHZ-01.a | Every route called as anonymous, restricted, Requester A/B, IT Staff and Administrator | Exact authorization matrix, including Administrator ticket permission and exclusive user management. AC-04/05 |
| AUTHZ-01.b | Requester sends another ID in body/query/development header and guesses protected resources | Body/query rejected, header grants no identity; missing/cross-owner responses identical; Internal Notes contain no data. AC-05 |
| REG-01.a | Existing authenticated Lab 2 fixture runs create/list/detail and UUID duplicate-intent tests | Original owned data and idempotency preserved; all eight status filters supported. AC-06 |
| REG-01.b | File types/signatures/size/count and remove/re-download boundaries from Lab 2 | Same 5 MiB/five-active-file policies and soft-remove behavior; Staff can read but cannot upload/delete. AC-05/06/08 |
| QUEUE-01.a | Seed tickets across statuses/priorities/owners and apply combined filters/search/sorts | AND filters, OR search fields, numeric priority order, stable ID ties and accurate paging. AC-07 |
| QUEUE-01.b | Unknown/repeated/empty query, invalid enum/ID/page; empty dataset and beyond-last page | Invalid gives 400; legitimate empty gives 200 with correct pagination/filter options. AC-07 |
| DETAIL-01.a | Claim/reassign/unassign eligible/inactive/Requester owner; stale version races | Eligible current-version write succeeds; invalid owner rejected, no silent overwrite/status change. AC-08 |
| DETAIL-01.b | Each of 8x8 source/target combinations by each role | Only matrix edges succeed; same-state invalid; Requester cannot resolve/close; required confirmation and owner enforced. AC-09 |
| DETAIL-01.c | Eligible Requester indicates resolution twice, including response-loss retry; later reopen/wait transition | First timestamp recorded once, status unchanged, repeat idempotent, clear only on defined transitions. AC-09 |
| DETAIL-01.d | Two clients update same Ticket version; concurrent comment increments version | One stale mutation gets 409; no lost update. UI reloads instead of auto-overwrite. AC-08/09/10 |
| COMM-01.a | Empty/whitespace, 1/5000/5001 code points, HTML/script-like input and line breaks | Valid text stored/rendered literally; bounds enforced, no script execution. AC-10 |
| COMM-01.b | User forges author/time, requests edit/delete or reads private notes as Requester | Unknown fields rejected, backend identity/time authoritative, editing/deletion unavailable; no private entry leaks. AC-10 |
| COMM-01.c | Public/private entries added in every status | Append succeeds for permitted participants, ascending time/id order, no automatic status transition. AC-10 |
| ADMIN-01.a | Create/edit/search, casing-equivalent email collision, invalid/array roles, empty patch | Safe account DTOs; duplicate 409; invalid 400; one role only; search/optional role filter correct. AC-11 |
| ADMIN-01.b | Reset another or own initial password and retry old session/login | Old sessions invalid; next login gated; self-reset UI returns to Login. AC-12 |
| ADMIN-01.c | Self-deactivation or last-active demotion/deactivation; two admins concurrently deactivate each other | Self-deactivation denied, at least one active Administrator persists in real PostgreSQL; retries bounded. AC-13 |
| ADMIN-01.d | Deactivate/demote owner with tickets in owner-required states | Atomic unassignment/version increments, status/history preserved, Needs assignment displayed; sessions revoked. AC-08/11/13 |
| MIG-01.a | Populated Lab 2 copy with active/removed attachments undergoes migration | IDs, counts, ticket/author FKs, canonical email, hashes of file bytes and reference data preserved. AC-06/14 |
| MIG-01.b | Clean DB migration plus seed twice; user password/role/fixture edited between seeds | Minimum fixtures created initially; rerun does not reset user-managed values or duplicate rows. AC-14 |
| MIG-01.c | Credential provision runs twice; preflight detects orphan/collision | Only null hashes provisioned, passwords not logged; preflight stops before destructive changes. AC-14 |
| UI-01-07 | Each screen loads/saves/succeeds/fails; empty/no-results/401/403/404/409 cases | Correct accessible feedback, retained recoverable input, no duplicate submit, safe role destination. AC-15 |
| STYLE-01/VIS-01 | 1440x900,820x1180,390x844 and 320px width; long text; keyboard-only use | No clipping/overlap/page overflow; correct tokens, focus, labels, badge text and read-only distinction. AC-16 |
| E2E-01 | Initial login -> forced change -> role home -> logout -> direct URL/API | Complete gated flow and replay denial using real cookies/CSRF. AC-01-04 |
| E2E-02 | Requester creates/upload/comments -> Staff queue/claim/status/internal note -> Requester indication -> Staff resolves/closes | Shared public communication and private-note isolation, attachments preserved, indication not formal resolution. AC-05-10 |
| E2E-03 | Admin creates/edits/deactivates/resets user then user signs in | Account safeguards and forced-change behavior end to end. AC-11-13 |
| REL-01 | Final main and all nine PDF answer sections reviewed against rubric | Real passing outputs/commit/PR reviews/links/screenshots, six-to-ten AI prompts and own reflection, complete board evidence. AC-17 |

## Test design and fixtures

Use real PostgreSQL integration tests for foreign keys, migrations, uniqueness,
transaction retries and concurrent last-admin/owner changes; mocks alone cannot
prove those invariants. Use isolated test databases or namespaced records and
existing scoped cleanup; never reset the development database. Supply correct
Origin/cookies/CSRF in helpers, then deliberately vary them in negative tests.
Use unit tests for validators/transition matrices and UI tests for feedback;
retain E2E proof across real API boundaries. Hashes must use configured cost in
security integration checks; any faster unit fixture is explicitly isolated.

Every new FR/BR must map through an AC to a scenario here. All BR-01-26 are
covered by AUTH/AUTHZ, REG/MIG, DETAIL/COMM and ADMIN groups; UI/API rules share
these ACs. Keep final statuses Planned until commands actually execute.

## Complete requirement-to-test map

| Requirement | Acceptance criteria | Test groups |
|---|---|---|
| FR-01 | AC-01, AC-02, AC-03 | AUTH-01, UI-01, UI-02, E2E-01 |
| FR-02 | AC-04, AC-05 | AUTHZ-01, UI-03, E2E-01 |
| FR-03 | AC-05, AC-06, AC-14 | REG-01, MIG-01, UI-04, E2E-02 |
| FR-04 | AC-07 | QUEUE-01, UI-05, E2E-02 |
| FR-05 | AC-08 | DETAIL-01, REG-01, UI-06, E2E-02 |
| FR-06 | AC-09 | DETAIL-01, UNIT-01, UI-04, UI-06, E2E-02 |
| FR-07 | AC-10 | COMM-01, UNIT-01, UI-04, UI-06, E2E-02 |
| FR-08 | AC-11, AC-12, AC-13 | ADMIN-01, UI-07, E2E-03 |
| FR-09 | AC-15, AC-16 | UI-01, UI-02, UI-03, UI-04, UI-05, UI-06, UI-07, STYLE-01, VIS-01 |
| FR-10 | AC-14, AC-17 | MIG-01, REL-01 |
| BR-01 | AC-01 | AUTH-01.a |
| BR-02 | AC-02 | AUTH-01.b, AUTH-01.c |
| BR-03 | AC-05 | AUTHZ-01.b |
| BR-04 | AC-04, AC-10 | AUTHZ-01.a, COMM-01.b |
| BR-05 | AC-09 | DETAIL-01.b, DETAIL-01.c |
| BR-06 | AC-11 | ADMIN-01.a |
| BR-07 | AC-08 | DETAIL-01.a, ADMIN-01.d |
| BR-08 | AC-08, AC-14 | DETAIL-01.a, MIG-01.a |
| BR-09 | AC-09 | DETAIL-01.b |
| BR-10 | AC-10 | COMM-01.a, COMM-01.b |
| BR-11 | AC-01, AC-11 | AUTH-01.a, ADMIN-01.a |
| BR-12 | AC-13 | ADMIN-01.c |
| BR-13 | AC-12, AC-13 | ADMIN-01.b, ADMIN-01.c |
| BR-14 | AC-06, AC-14 | MIG-01.a, REG-01.a, REG-01.b |
| BR-15 | AC-05 | AUTHZ-01.b |
| BR-16 | AC-09 | DETAIL-01.b |
| BR-17 | AC-09 | DETAIL-01.b, ADMIN-01.d |
| BR-18 | AC-09 | DETAIL-01.b, UI-06 |
| BR-19 | AC-09 | DETAIL-01.c |
| BR-20 | AC-08 | DETAIL-01.a |
| BR-21 | AC-08, AC-11, AC-13 | ADMIN-01.d |
| BR-22 | AC-05, AC-06, AC-11 | AUTHZ-01.a, ADMIN-01.e |
| BR-23 | AC-08, AC-09, AC-10 | DETAIL-01.d, DETAIL-01.e |
| BR-24 | AC-13 | ADMIN-01.c |
| BR-25 | AC-01, AC-11 | AUTH-01.b, ADMIN-01.a, ADMIN-01.f |
| BR-26 | AC-10 | COMM-01.a, COMM-01.c |

### Cases added during author audit

- AUTH-01.h: Pause login after credential verification; reset/deactivate/change role,
  then resume login. No session is created from a stale User snapshot. Race two
  self password changes and one reset; only a valid serialized change may succeed.
  Prove a business mutation serialized after deactivation is denied (AC-03/04).
- AUTH-01.i: Reject unpaired UTF-16 surrogates consistently and verify cookie
  HttpOnly/SameSite/Path/Domain/Secure settings, server expiry and rotation;
  no credential token appears in JSON or logs (AC-01/03).
- DETAIL-01.e: Current-version identical owner/priority changes preserve version
  and updatedAt; stale identical writes still reject. Invalid owner yields
  INELIGIBLE_OWNER; prohibited unassignment yields OWNER_REQUIRED (AC-08).
- ADMIN-01.e: Change a Requester to IT Staff and back, then deactivate/reactivate.
  Submitted Ticket/Attachment author IDs remain unchanged; owned access follows
  current active role. No transfer or data loss occurs (AC-05/06/11).
- ADMIN-01.f: Check email local/domain lengths, consecutive dots, leading/trailing
  dot or domain hyphen, ASCII policy, lowercase canonicalization and plus/dot
  preservation; reject null/string boolean/version coercions (AC-11).
- UI-07.a: Show distinct duplicate-email, administrator-safety, invalid-owner and
  stale-version feedback; no incorrect Reload latest prompt on email conflict
  (AC-15). Apply equivalent owner/status feedback in UI-06.

All added cases remain Planned. The author audit validates this contract; it
is not evidence that application behavior has already passed these tests.
