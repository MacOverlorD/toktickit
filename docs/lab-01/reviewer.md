# Peer Review Record

## Reviewer

| Field | Details |
| --- | --- |
| Reviewer name | SITTHICHAI PHIROMPAN |
| Student ID | 67070501074 |
| GitHub username | Bank848 |

## Issue 1: Project Foundation

| Field | Details |
| --- | --- |
| Pull Request | [TokTickIT PR #5](https://github.com/MacOverlorD/toktickit/pull/5) |
| Result | Approved and merged |

### Reviewer Feedback

The reviewer confirmed that the project structure was clean, strict TypeScript was configured on both sides, tests ran successfully, no secrets were committed, and the security-related ignore rules looked correct.

The reviewer also noted that `.env.example` existed at the repository root and in both applications, and asked whether the empty `schema.prisma` was intentional.

### Author Response

The root `.env.example` is an intentional repository-level reference, while the files under `client/` and `server/` are runtime-specific templates. The empty Prisma schema was also intentional because Issue 1 only required Prisma initialization and database connectivity. The Category model, migration, and seed data belong to Issue 3.

## Issue 2: API Health Check

| Field | Details |
| --- | --- |
| Pull Request | [TokTickIT PR #6](https://github.com/MacOverlorD/toktickit/pull/6) |
| Review status | Reviewed and merged |

### Reviewer Feedback

- Express returns HTTP 200 by default when `.json()` is used, so the explicit `.status(200)` call is not technically required.
- The frontend request had no timeout, which could leave the interface in the loading state indefinitely if the API accepted the connection but did not respond.
- The frontend tests covered the loading, success, and error states.
- The Issue 1 review record appeared in the Issue 2 PR and should be checked before merging.

### Author Response

- The explicit `.status(200)` is retained because HTTP 200 is part of the documented health endpoint contract and Lab 1 acceptance criteria.
- An eight-second timeout was added with `AbortController`, together with a Vitest case proving that a timed-out request changes the interface to the offline error state.
- The positive feedback about the three existing UI states was acknowledged.
- The Issue 1 review evidence must remain in `docs/lab-01/reviewer.md` for the final Lab 1 submission. The file is now organized into separate Issue 1 and Issue 2 sections so the origin and status of each review are clear.

## Issue 3: Category Seed

| Field | Details |
| --- | --- |
| Pull Request | [TokTickIT PR #7](https://github.com/MacOverlorD/toktickit/pull/7) |
| Review status | Reviewed with a non-blocking comment and merged |

### Reviewer Feedback

The reviewer noted that the seed behavior had only been verified manually and suggested adding a quick automated check later.

### Author Response

The Lab 1 requirements do not require a dedicated automated seed test, so idempotency was verified by running the seed repeatedly and confirming that the database still contained four categories. Issue 4 adds the required automated category API test against the seeded PostgreSQL data.
