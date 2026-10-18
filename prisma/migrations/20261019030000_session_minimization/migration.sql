-- Sessions keep no network address or device description next to the account.
UPDATE "Session" SET "ipAddress" = NULL, "userAgent" = NULL
WHERE "ipAddress" IS NOT NULL OR "userAgent" IS NOT NULL;
