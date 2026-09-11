# Lab 3 Data Migration and Local Accounts

Issue: [#34](https://github.com/MacOverlorD/toktickit/issues/34)

## Before migrating a populated Lab 2 database

Keep the database container running and take a PostgreSQL custom-format backup.
The backup path below is local evidence and must remain outside Git:

```powershell
docker exec toktickit-postgres pg_dump -U postgres -d toktickit -Fc -f /tmp/toktickit-before-lab3.dump
docker cp toktickit-postgres:/tmp/toktickit-before-lab3.dump tmp/lab3-backups/toktickit-before-lab3.dump
docker exec toktickit-postgres pg_restore --list /tmp/toktickit-before-lab3.dump
```

If `server/.env` uses a different database name or container, adjust the command
to match it. Keep a separate copy of the ignored upload directory when it
contains files. The migration renames database columns and preserves stored
attachment names; it does not move or rewrite file bytes.

## Apply the migration and seed

From the repository root:

```powershell
npm install --prefix server
npm run prisma:generate --prefix server
npm run prisma:deploy --prefix server
npm run prisma:seed --prefix server
```

The explicitly transactional migration renames `Requester` to `User` while
preserving IDs and its sequence. Its preflight enforces the complete Lab 3 email
syntax policy before any rename. Existing Ticket submitter links and Attachment
actor links continue
to reference those same IDs. Existing Tickets receive `itPriority` from
`requestedPriority`. The seed is safe to repeat and does not update existing
User or Ticket rows selected by their immutable reserved `fixtureKey` values.
Editable account fields such as email are never used as seed identity.

The seed supplies at least four active and one inactive Requester, three active
and one inactive IT Staff account, one active Administrator, and demonstration
Tickets covering all eight workflow states with public comments and an internal
note. Seeded accounts initially have no password hash and cannot authenticate.

## Provision local initial passwords

Choose a local development password that satisfies the 15-128 character policy.
Put it only in the ignored `server/.env` file:

```dotenv
LAB3_INITIAL_PASSWORD=replace-with-your-local-development-password
```

Then run the explicit guarded command:

```powershell
npm run prisma:provision-initial-passwords --prefix server -- --all-unprovisioned
```

The command provisions only Users whose `passwordHash` is null, creates a fresh
Argon2id salt per User, sets `mustChangePassword`, and never prints the password.
Running it again provisions zero accounts and does not replace an existing hash.
Remove `LAB3_INITIAL_PASSWORD` from `server/.env` after provisioning. Do not
commit a real password or copy it into evidence.

## Verification

```powershell
npm run prisma:status --prefix server
npm run prisma:seed --prefix server
npm run prisma:seed --prefix server
npm test --prefix server -- tests/lab-03/migration.test.ts tests/lab-03/password-foundation.test.ts
npm test --prefix server
npm run build --prefix server
```

`migration.test.ts` creates isolated PostgreSQL schemas. It applies the real SQL
to a clean database and to a populated Lab 2 shape with active and removed
Attachment metadata, then drops only those temporary schemas. Failure-path
coverage proves that the whole migration rolls back after a deliberate
post-rename conflict. Preflight coverage rejects canonical-but-invalid legacy
email syntax. Seed coverage runs twice on clean and populated schemas and edits
a fixture email between runs to prove immutable fixture identity. Credential
provisioning is also verified as repeatable.
