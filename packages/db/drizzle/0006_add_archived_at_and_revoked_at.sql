ALTER TABLE "datasets" ADD COLUMN "archived_at" timestamp with time zone;
ALTER TABLE "licenses" ADD COLUMN "revoked_at" timestamp with time zone;
