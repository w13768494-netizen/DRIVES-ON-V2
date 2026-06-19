-- ============================================================
-- DRIVES ON — Migration 017 : city_id sur assistance_requests
-- Phase 5 Chantier B — référence vers deployment_cities pour analytics nationales.
-- Nullable : toutes les demandes existantes conservent city_id = NULL.
-- Pas de backfill maintenant — les nouvelles demandes alimenteront le FK.
-- Note : deployment_cities.id est de type text (pas uuid).
-- ============================================================

ALTER TABLE assistance_requests
  ADD COLUMN IF NOT EXISTS city_id text REFERENCES deployment_cities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_assistance_requests_city_id
  ON assistance_requests (city_id);
