-- DRIVES ON — Migration 020 : validation documentaire
-- Ajoute un statut de validation admin sur chaque document request
-- Migration additive — aucun document existant n'est supprimé ni modifié
-- ============================================================

ALTER TABLE public.request_documents
  ADD COLUMN IF NOT EXISTS validation_status text NOT NULL DEFAULT 'pending'
    CONSTRAINT request_documents_validation_status_check
      CHECK (validation_status IN ('pending', 'valid', 'rejected')),
  ADD COLUMN IF NOT EXISTS validated_at   timestamptz,
  ADD COLUMN IF NOT EXISTS validated_by   uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS validation_note text;

COMMENT ON COLUMN public.request_documents.validation_status IS
  'État de validation admin : pending (non examiné), valid (validé), '
  'rejected (refusé — note obligatoire). '
  'Tout nouveau document démarre en pending. Seul un admin peut modifier ce statut.';

COMMENT ON COLUMN public.request_documents.validated_at IS
  'Horodatage de la dernière action de validation (admin uniquement).';

COMMENT ON COLUMN public.request_documents.validated_by IS
  'UUID de l''admin ayant effectué la dernière action de validation.';

COMMENT ON COLUMN public.request_documents.validation_note IS
  'Note explicative obligatoire en cas de refus (rejected). Null si validé.';
