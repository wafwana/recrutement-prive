-- Grant the already-approved METIERS_DOSSIERS permission to the existing ADMIN account.
-- Idempotent: preserves every existing permission and only appends the approved capability when absent.
INSERT INTO "SystemSetting" ("id", "key", "value", "createdAt", "updatedAt")
SELECT
  'perm_' || u."id",
  'permissions:' || u."id",
  '["METIERS_DOSSIERS"]'::jsonb,
  NOW(),
  NOW()
FROM "User" u
WHERE lower(u."email") = lower('collettee18@gmail.com')
  AND u."role" = 'ADMIN'
ON CONFLICT ("key") DO UPDATE
SET
  "value" = CASE
    WHEN jsonb_typeof("SystemSetting"."value") = 'array'
      AND "SystemSetting"."value" @> '["METIERS_DOSSIERS"]'::jsonb
      THEN "SystemSetting"."value"
    WHEN jsonb_typeof("SystemSetting"."value") = 'array'
      THEN "SystemSetting"."value" || '["METIERS_DOSSIERS"]'::jsonb
    ELSE '["METIERS_DOSSIERS"]'::jsonb
  END,
  "updatedAt" = NOW();
