# Lab 3 Decision Register

Status: Initial analysis; pending choices are not approved requirements.

| ID | Topic | Current direction / work remaining |
|---|---|---|
| D-01 | Administrator ticket privileges | Lab sections 4.3-4.6 overlap: separate responsibilities, but Administrator may own tickets, set IT Priority and read public/private entries. Define explicit read/write/assignment/status matrix. |
| D-02 | Authentication/session | Choose hashing, credential rules, server session or token, storage, expiry, CSRF, throttling and invalidation after logout/deactivation/role/password changes. |
| D-03 | Status workflow | Define all allowed edges among eight statuses, permitted roles, confirmations, terminal behavior, reopen/cancel rules and stale-update conflicts. |
| D-04 | Requester resolution indication | Choose persisted representation, permitted source statuses, repeat behavior and whether staff action clears it. It cannot formally resolve/close. |
| D-05 | Migration | Prefer preserving Requester IDs while evolving to User; specify exact schema, backfill, initial credential provisioning and verification/recovery. |
| D-06 | Validation and concurrency | Set text/password/query limits, assignment races, owner deactivation/role-change behavior and atomic last-Administrator protection. |
| D-07 | Scope | Exactly nine issues. No production deployment, Actions Taken, user deletion, email reset or multi-role accounts. |

The supplied grill-with-docs skill refers to grilling and domain-modeling skills
that were not found in the previous inspection. This register and glossary are
ordinary project documents; no completed skill interview is claimed.
