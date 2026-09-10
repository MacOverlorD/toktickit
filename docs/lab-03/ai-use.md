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

## My Reflection

Pending the student's own reflection on specification-agent and coding-agent
use, choices challenged, verification performed and limitations encountered.
