# Lab 4 Glossary

- **Action Taken:** An auditable unit of operational work performed or planned for one Ticket.
- **Creator:** Authenticated operational user who creates the Action; backend-derived and immutable.
- **Performer:** Authenticated operational user who completes the Action; null before completion, then backend-derived and immutable.
- **Assignee:** Active operational user responsible for pending work; optional and may differ from creator or performer.
- **Action status:** PLANNED, IN_PROGRESS, COMPLETED, or CANCELLED under the proposed contract.
- **Formal resolution:** Authorized Ticket transition to Resolved after the Action prerequisite succeeds.
- **Resolution indication:** Requester's advisory statement that the problem appears resolved; it is not formal resolution.
- **Shared-safe projection:** Requester-visible Action fields that exclude operational-only assignment/control metadata.
- **Operational user:** IT Staff or Administrator for the capabilities explicitly allowed by the authorization matrix.
- **Recent:** A bounded deterministic set ordered by update time and ID, calculated at one server query instant.
- **Idempotency key:** Client-generated token used by the backend to return the original successful create instead of creating a duplicate.
- **Optimistic version:** Integer revision checked on mutation to reject stale updates.
- **Resolution gate:** Backend rule preventing formal resolution until a qualifying completed Action exists.
- **Work cycle:** Positive Ticket revision of the problem-solving period; REOPENED starts a new cycle so prior Actions cannot satisfy the new resolution gate.
