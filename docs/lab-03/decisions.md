# Lab 3 Decision Register

Status: Proposed contract decisions for peer review; not recorded as student approval.

| ID | Decision | Reason and consequence |
|---|---|---|
| D-01 | IT Staff and Administrator may use all operational ticket APIs; only Administrator may manage users. Requesters retain owned-ticket operations only. | Explicitly resolves Lab 4.3-4.6 overlap while keeping account management a separate responsibility. One role per user still applies. Administrator navigation includes Queue and Users. |
| D-02 | Argon2id password hashes and opaque PostgreSQL-backed sessions in HttpOnly cookies. | Supports immediate revocation after account changes without trusting browser role claims. See API contract for concrete limits and CSRF behavior. |
| D-03 | Use the transition matrix in specification.md; only IT Staff/Administrator changes formal status. | Avoids implicit transitions. Assignment never changes status; no Actions Taken prerequisite exists. |
| D-04 | Store nullable resolutionIndicatedAt and resolutionIndicatedById on Ticket; repeat indication is idempotent and preserves original time. | Distinguishes the Requester's signal from formal resolution. Clear indication on reopen or waiting-for-requester transition. |
| D-05 | Rename Requester to User in a forward migration and preserve primary keys; keep requesterId as submitter relation. | Preserves Ticket and Attachment links and existing identifiers. Credentials are provisioned by an explicit local command, never a destructive reseed. |
| D-06 | Optimistic Ticket/User versions plus transactional account-safety checks. | Stale edits become 409; concurrent last-Administrator edits cannot remove all administrators. Deactivated/demoted owners are unassigned atomically. |
| D-07 | Exactly nine issues; feature tests belong with each implementation. | Integration/evidence issues supplement TDD. No deployment, Actions Taken, email reset, deletion or multiple roles. |

## Security design references

Consulted 2026-09-10. Timeout, length and rate-limit values below are project
choices, not claims that the sources mandate them.

- [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html): Argon2id minimum configuration and unique salts.
- [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html): opaque identifiers, cookie controls, renewal and revocation.
- [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html): server-validated request tokens and origin checks; SameSite is additional protection.

The supplied grill-with-docs skill's grilling/domain-modeling dependencies were
not found previously. This register and glossary do not claim a completed skill interview.
