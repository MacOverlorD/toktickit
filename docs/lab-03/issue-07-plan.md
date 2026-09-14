# Issue #39 implementation preparation

Issue: [#39](https://github.com/MacOverlorD/toktickit/issues/39)
Branch: `feature/3-07-user-management`
PR base: `lab3-staging`
Baseline: `e74f3de13cf1b6636a68962e862dda0d31f9ce8b`, merge of PR #48.
Status: Prepared; implementation and runtime verification have not started.

## Contract

Implement FR-08 / AC-11-13 using [api-spec.md](./api-spec.md) section 6,
[specification.md](./specification.md) BR-21-25 and the existing
[UI feedback contract](./ui-spec.md). Keep the approved schema and enum roles.

- Administrator-only GET/POST `/api/admin/users`, PATCH `/api/admin/users/:id`,
  and POST `/api/admin/users/:id/initial-password`.
- Allowlisted Account DTOs, ordered name/id list, validated name/email search
  and optional exact role filter; reject unknown/repeated/empty parameters.
- Required create fields, canonical unique email, exactly one role, JSON boolean
  activation and the existing initial-password policy.
- Edit/reset require a positive expectedVersion. Stale versions return
  STALE_RESOURCE. Every account PATCH increments version, including equal values.
- Revalidate the active Administrator and session authority inside the mutation
  transaction. Hash passwords before entering short write transactions, then
  recheck relevant actor/target state before writing.
- Block self-deactivation. Allow self-demotion only with another active admin;
  enforce last-active-admin protection in serializable transactions with three
  total attempts and ACCOUNT_CONFLICT after retry exhaustion.
- Actual role/activation transitions revoke affected sessions. Initial-password
  reset revokes all target sessions and sets mustChangePassword. Self-demotion
  and self-reset return the UI to Login.
- Owner deactivation/change to Requester atomically unassigns tickets, increments
  affected Ticket versions and preserves statuses/history. Existing queue and
  detail screens must continue to show Needs assignment.
- No user deletion, bulk actions, invitations or password disclosure.

## Implementation order

1. Write input/query policy tests and API regression scenarios alongside the
   Administrator router/domain implementation; reuse password/email helpers,
   ApiError and session conventions instead of creating a second policy.
2. Build the API client and replace the protected `/admin/users` placeholder.
   Reuse Zen Green controls for search/list/create/edit/reset, keyboard focus,
   confirmations and responsive presentation.
3. Preserve recoverable form drafts on failures. Bind drafts to their source
   version, expose explicit Reload latest for stale edits, and distinguish
   EMAIL_CONFLICT and ADMIN_REQUIRED from stale-resource feedback.
4. Run focused API/UI tests against a disposable PostgreSQL database, then
   complete the real authentication/admin browser flow and relevant regressions.
5. Update tests/reviewer/AI-use evidence with actual results. Commit and open
   the implementation PR to staging after checks pass; request peer review.

## Planned test coverage

All scenarios below are Planned, not passing evidence.

| Layer / proposed path | Scenarios |
|---|---|
| `server/tests/lab-03/users-admin.api.test.ts` | All endpoints reject non-admin/anonymous/mandatory-change sessions; safe DTOs; owned resource checks before conflict disclosure; create/search/filter/edit/reset; strict input and duplicate canonical email |
| Account policy unit tests | Unicode name 1/120/121 boundaries, malformed surrogates, email syntax/length/canonicalization, unknown fields and null/string coercions |
| Real PostgreSQL transaction tests | Two admins removing each other; last-admin role/activation changes; stale edits/resets; bounded retries; actor deactivated/demoted while a request is paused |
| Owner/session regressions | Deactivate/demote owner: atomic unassignment and ticket-version increments with unchanged status/history; requester role round trip preserves authored/submitted identities; revoked sessions denied |
| `client/tests/lab-03/UserManagement.test.tsx` | List/search/create/edit/reset, loading/empty/no-results/error/retry/forbidden; field validation and focus; distinct safeguards; stale reload preserves drafts without resubmitting; self-reset/demotion navigates to Login |
| `e2e/lab-03/user-administration.spec.ts` | Real admin create/edit/reset/login gating, duplicate/safety feedback and non-admin denial; browser server must use the disposable database and must not reuse an unrelated local server |

## Preparation verification

- Confirmed PR #48 is merged; latest recorded peer review is Changes requested
  on `18ca182`, with fixes in `3615182`. No later peer approval is recorded.
- Created a separate worktree under `tmp/feature-3-07` from the merge baseline.
- Read normative API, data, UI and test contracts; current admin UI is a protected
  placeholder and the server has no Administrator user-management router yet.
- Original Lab 2 working files remain outside this feature worktree.
- Preparation changes require whitespace/link review; runtime checks belong to
  the implementation, and no implementation tests are claimed as run here.
