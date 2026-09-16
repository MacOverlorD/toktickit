# Lab 3 AI Use

Status: Updated through the Issue #41 release candidate on 2026-09-16.
Assistant: OpenAI Codex (exact deployed model variant not exposed to the repository).

## Selected prompts recorded so far

1. Read docs/lab-03/Lab_3_sheet.pdf using grill-with-docs and propose an issue count.
2. Reduce the breakdown to eight or nine issues while retaining complete lab coverage.
3. After the Staff Queue PR merged, the user requested continuing through implementation and opening the next feature PR.
4. User requested addressing PR #46 requested changes, updating Lab 3 documentation, replying to the reviewer, and requesting approval again.
5. User requested completing all Issue 1 authoring work and making the PR ready.
6. User requested continuing by merging the reviewed Issue 1 PR.
7. User requested continuing with Issue 2 after Issue 1 was merged.
8. User requested addressing the peer's requested changes, updating Lab 3 documentation, and resubmitting PR #44 for approval.
9. After the reviewed PR was merged, the user requested continuing with the next Lab 3 issue.
10. User requested running the complete front end and back end, confirming the remaining issue, and completing the Lab 3 release-submission work.

These are English summaries, not verbatim quotations. Maintain 6-10 selected
key prompts by submission, including meaningful specification and coding work.

## Work performed

Read the lab, proposed nine issues, inspected the Lab 2 baseline and initialized
Lab 3 workflow plus proposed contract documents. Expanded authorization, eight-state
workflow, migration, session/CSRF, UI and test scenarios using the existing code
and OWASP primary guidance. Proposed choices are not labeled user approval.
Completed an author audit and requirement/test coverage checks, then prepared
PR #42 for peer review. Collaborator `Ohmmykung09` approved and merged the PR;
the review evidence was transcribed from GitHub and its non-blocking source-range
finding was corrected. For Issue #34, implemented the data-preserving User
migration, Lab 3 account/Ticket communication seeds, guarded Argon2id local
provisioning, Lab 2 compatibility updates, and isolated clean/populated/preflight
migration tests. Backed up the existing development database before applying the
forward migration.
After peer review on PR #44, added an explicit migration transaction and a
failure-path rollback test, expanded legacy-email preflight to the complete Lab 3
syntax policy, and replaced editable-email seed identity with an immutable
reserved fixture key. Re-ran focused migration/password tests, the full server
suite, production build, and repeated seed checks before requesting re-review.
For Issue #35, implemented opaque cookie sessions, Argon2id login verification,
bounded concurrent-safe rate limits, exact Origin and CSRF checks, mandatory
password rotation, current-user restoration, logout, role enforcement, and the
role-aware React shell. Removed the development requester selector/header and
migrated ticket regressions to authenticated session fixtures. Added API, UI,
parallel-request, and browser E2E coverage for the complete authentication flow.
After peer review on PR #45, expanded client parsing and badges to all eight
migrated ticket statuses, moved current Requester active/role checks into ticket
and attachment write transactions, mapped PostgreSQL serialization conflicts to
documented outcomes, globally reclaimed expired rate-limit buckets, and added
mandatory-change logout. Added focused status, expiry, active/role and concurrent
password regressions, then reran the complete server, client, E2E and build checks.
For Issue #36, audited the inherited authenticated Requester implementation
against every acceptance criterion, retained the existing server-owned identity
and Lab 2 regressions, strengthened exact missing/cross-owner Attachment response
comparisons, and made draft/submission UI state reset synchronously whenever the
authenticated user, role or version changes. Verification was limited to the
affected Requester API/UI suites and client typecheck. After peer review on
PR #46 identified the excluded legacy browser flow, migrated the complete
Requester ticket/attachment lifecycle into the Lab 3 Playwright project using
real login, opaque cookie sessions and CSRF-backed UI mutations for two isolated
Requester accounts. Expanded state-reset coverage across user ID, role, version,
draft and active-submission transitions, and migrated E2E cleanup to the current
User schema. Re-ran the focused API/UI suites, executable Requester browser flow
and production build before requesting approval again. For Issue #37, implemented the
authorized Staff Queue API and responsive card UI with strict normalized query
validation, URL-backed filters, deterministic sorting, snapshot-consistent paging,
historical reference filters, safe feedback and direct Detail navigation. Added
focused API/UI tests and a three-viewport Playwright check with screenshots.
For Issue #38, implemented the Staff Ticket Detail API/UI, transactionally revalidated owner/priority/status operations, exact eight-state transitions and optimistic versions, Requester resolution indication, operational attachment reads, and append-only Public Comments/Internal Notes with strict visibility. Added API/domain/UI/browser coverage and repeatable E2E cleanup, and verified the cross-role workflow against a disposable PostgreSQL container.
 For Issue #39, implemented Administrator-only account list/search/filter/create/edit/reset endpoints and a responsive User Management screen. Added strict canonical-email/name/role/boolean/version validation, current-actor transaction checks, serializable last-admin safeguards, optimistic account versions, session invalidation, atomic owner unassignment with Ticket version increments, field-specific conflict recovery and self-session navigation. Verified focused and complete API/UI suites, production build, and a real Administrator browser flow against disposable PostgreSQL.


For Issue #40, used Codex to inventory the merged test/evidence state, add an
independent visual-authentication fixture, build four responsive browser evidence
cases, and run the complete integrated suites against a disposable PostgreSQL
container. The first integrated E2E run exposed an inherited assertion for a
heading that the Staff Detail page does not render; the assertion was corrected
to the visible ticket-number heading and rerun. Codex assembled a contact sheet
for manual inspection after the direct image and Computer Use paths were blocked
by Windows ACL/runtime errors.

After peer review on PR #50, Codex converted the single-Tab smoke check into
complete keyboard target/focus-indicator traversal, added explicit mobile
navigation and responsive Administrator editor viewport checks, implemented
first-invalid focus for password, account, communication and Staff operation
errors, and regenerated 37 screenshots with dedicated validation evidence. The
client, production build and complete Playwright suites were rerun.

For Issue #41, Codex created an isolated release worktree from the merged
`lab3-staging` baseline, installed dependencies, generated Prisma Client, and
ran the complete server, client, build and browser verification. A live
development API exposed an unmocked client-test request; Codex made the suite
deterministic by rejecting unexpected fetches globally and explicitly mocking
the Attachment communication dependency. Codex then updated traceability,
review evidence and the nine-part submission PDF without claiming a formal
approval that GitHub does not record.

The student reflection below is a Codex-assisted draft based on the recorded
work. The student must confirm that it matches their experience before submission.

## My Reflection

AI was most useful for turning the Lab 3 handout into traceable requirements,
implementing repetitive API/UI tests, and checking the same behavior across
roles and screen sizes. I did not treat generated work or self-review as proof:
I used executable server, client, build and browser checks, inspected visual
evidence, and kept the collaborator's formal review state separate from positive
comments. The main limitation was environment sensitivity, demonstrated when a
running development API changed a unit-test result; isolating network access and
rerunning the complete suites was necessary before trusting the evidence.
