ALTER TABLE "posters" ADD COLUMN "editableUntil" TIMESTAMP(3);

UPDATE "posters"
SET "editableUntil" = "createdAt" + INTERVAL '5 days'
WHERE "editableUntil" IS NULL;

ALTER TABLE "posters" ALTER COLUMN "editableUntil" SET NOT NULL;
ALTER TABLE "posters" ALTER COLUMN "editableUntil" SET DEFAULT (now() + interval '5 days');

CREATE INDEX "posters_ownerId_editableUntil_idx" ON "posters"("ownerId", "editableUntil");
