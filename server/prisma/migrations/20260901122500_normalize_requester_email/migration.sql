-- Canonicalize existing Requester natural keys before enforcing the invariant.
UPDATE "Requester"
SET "email" = LOWER(BTRIM("email"));

ALTER TABLE "Requester"
ADD CONSTRAINT "Requester_email_canonical_check"
CHECK ("email" = LOWER(BTRIM("email")));
