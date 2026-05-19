-- ============================================================
-- DRIVES ON — Migration 016 : colonnes score qualité loueur
-- Phase 5 Chantier C — scoring opérationnel admin-only.
-- Toutes les colonnes sont nullable — NULL = jamais calculé.
-- score_total /100 = score_reactivity/40 + score_response_rate/40 + score_reliability/20
-- ============================================================

ALTER TABLE rental_agencies
  ADD COLUMN IF NOT EXISTS score_total         integer,
  ADD COLUMN IF NOT EXISTS score_reactivity    integer,
  ADD COLUMN IF NOT EXISTS score_response_rate integer,
  ADD COLUMN IF NOT EXISTS score_reliability   integer,
  ADD COLUMN IF NOT EXISTS total_received      integer,
  ADD COLUMN IF NOT EXISTS total_confirmed     integer,
  ADD COLUMN IF NOT EXISTS avg_response_min    numeric(6,1),
  ADD COLUMN IF NOT EXISTS score_updated_at    timestamptz;
