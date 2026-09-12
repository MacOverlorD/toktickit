# Lab 3 AI Use

Status: Live record initialized during Issue #33.
Assistant: OpenAI Codex (GPT-6 family as identified by the session; exact deployed variant not exposed).

## Selected prompts recorded so far

1. Read docs/lab-03/Lab_3_sheet.pdf using grill-with-docs and propose an issue count.
2. Reduce the breakdown to eight or nine issues while retaining complete lab coverage.
3. User selected nine issues and requested setup through starting Issue 1.
4. User reaffirmed starting Issue 1 after setup; expanded the domain, API/UI and test contracts.
5. User requested completing all Issue 1 authoring work and making the PR ready.
6. User requested continuing by merging the reviewed Issue 1 PR.
7. User requested continuing with Issue 2 after Issue 1 was merged.
8. User requested addressing the peer's requested changes, updating Lab 3 documentation, and resubmitting PR #44 for approval.
9. After the reviewed PR was merged, the user requested continuing with the next Lab 3 issue.
10. User requested addressing all PR #45 review findings, rerunning complete verification, and resubmitting for approval.

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
affected Requester API/UI suites and client typecheck.

## My Reflection

Pending the student's own reflection on specification-agent and coding-agent
use, choices challenged, verification performed and limitations encountered.
