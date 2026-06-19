-- ============================================================
-- DRIVES ON — Migration 019 : règles métier Phase 1
-- Ajout colonnes pour overdue tracking et déclaration de dégât
-- ============================================================

ALTER TABLE public.assistance_requests
  ADD COLUMN IF NOT EXISTS overdue_at        timestamptz,
  ADD COLUMN IF NOT EXISTS damage_description text;

COMMENT ON COLUMN public.assistance_requests.overdue_at IS
  'Timestamp UTC du basculement en statut overdue (détecté par le cron check-overdue). '
  'NULL si le dossier n''a jamais été overdue.';

COMMENT ON COLUMN public.assistance_requests.damage_description IS
  'Description libre du sinistre saisie par le loueur lors de la déclaration de dégât. '
  'Renseigné uniquement quand has_damage_claim = true.';

-- notifications.agency_id nullable : les notifs partenaires n'ont pas d'agence
ALTER TABLE public.notifications
  ALTER COLUMN agency_id DROP NOT NULL;

COMMENT ON COLUMN public.notifications.agency_id IS
  'NULL pour les notifications partenaires (assisteurs, assureurs, garages) sans agence de location.';
