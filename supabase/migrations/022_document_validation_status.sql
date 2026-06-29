-- Colonnes de validation des documents (référencées par le code mais absentes du schéma)
-- Route : src/app/api/admin/documents/[id]/validate/route.ts
-- Garde de clôture : src/app/api/admin/requests/[id]/status/route.ts
ALTER TABLE "public"."request_documents"
  ADD COLUMN IF NOT EXISTS "validation_status" text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS "validated_at"      timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "validated_by"      uuid,
  ADD COLUMN IF NOT EXISTS "validation_note"   text;

-- DROP avant ADD : ADD CONSTRAINT ne supporte pas IF NOT EXISTS → idempotence sur replay/reset
ALTER TABLE "public"."request_documents"
  DROP CONSTRAINT IF EXISTS "request_documents_validation_status_check";

ALTER TABLE "public"."request_documents"
  ADD CONSTRAINT "request_documents_validation_status_check"
  CHECK ("validation_status" IN ('pending', 'valid', 'rejected'));
