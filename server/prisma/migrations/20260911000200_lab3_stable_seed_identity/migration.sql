BEGIN;

ALTER TABLE "User"
  ADD COLUMN "fixtureKey" VARCHAR(64);

-- Lab 2 did not permit account email edits, so these canonical addresses safely
-- identify the known local fixtures once. Future seed runs use fixtureKey only.
UPDATE "User"
SET "fixtureKey" = CASE "email"
  WHEN 'anan.wong@example.test' THEN 'lab3-requester-anan'
  WHEN 'mali.chaiyasit@example.test' THEN 'lab3-requester-mali'
  WHEN 'narin.suksan@example.test' THEN 'lab3-requester-narin'
  WHEN 'pimchanok.dee@example.test' THEN 'lab3-requester-pimchanok'
  WHEN 'former.requester@example.test' THEN 'lab3-requester-former'
  WHEN 'kanya.support@example.test' THEN 'lab3-staff-kanya'
  WHEN 'somchai.service@example.test' THEN 'lab3-staff-somchai'
  WHEN 'nicha.helpdesk@example.test' THEN 'lab3-staff-nicha'
  WHEN 'former.staff@example.test' THEN 'lab3-staff-former'
  WHEN 'admin@example.test' THEN 'lab3-admin-local'
END
WHERE "email" IN (
  'anan.wong@example.test',
  'mali.chaiyasit@example.test',
  'narin.suksan@example.test',
  'pimchanok.dee@example.test',
  'former.requester@example.test',
  'kanya.support@example.test',
  'somchai.service@example.test',
  'nicha.helpdesk@example.test',
  'former.staff@example.test',
  'admin@example.test'
);

ALTER TABLE "User"
  ADD CONSTRAINT "User_fixtureKey_format_check"
  CHECK (
    "fixtureKey" IS NULL
    OR "fixtureKey" ~ '^lab3-(requester|staff|admin)-[a-z0-9-]+$'
  );

CREATE UNIQUE INDEX "User_fixtureKey_key" ON "User"("fixtureKey");

COMMIT;