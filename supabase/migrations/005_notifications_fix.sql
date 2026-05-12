-- ============================================================
-- DRIVES ON — Migration 005 : correction table notifications
-- Prérequis : migrations 001–004 exécutées
-- ============================================================

-- ── 1. Ajouter agency_id (référence l'agence notifiée) ────────────────────────
-- Optionnel (NULL autorisé) : pas toutes les notifs sont liées à une agence.
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS agency_id text;

CREATE INDEX IF NOT EXISTS idx_notif_agency
  ON public.notifications (agency_id)
  WHERE agency_id IS NOT NULL;

-- ── 2. Corriger le DEFAULT de notifications.id ───────────────────────────────
-- uuid_generate_v4() nécessite l'extension uuid-ossp qui n'est pas garantie
-- disponible. gen_random_uuid() est natif PostgreSQL 13+ (Supabase >= PG13).
ALTER TABLE public.notifications
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- ── 3. S'assurer que la colonne read existe ──────────────────────────────────
-- CREATE TABLE IF NOT EXISTS dans 002 peut avoir skippé la création si la table
-- existait déjà sans cette colonne. ADD COLUMN IF NOT EXISTS est idempotent.
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS read BOOLEAN NOT NULL DEFAULT FALSE;

-- ── 3. Vérification finale ────────────────────────────────────────────────────
-- Après exécution, la table doit avoir :
--   id          uuid        PK (auto-généré)
--   user_id     text        NOT NULL
--   agency_id   text        (nullable)
--   request_id  text
--   type        text        NOT NULL
--   title       text        NOT NULL
--   body        text
--   read        boolean     DEFAULT false
--   created_at  timestamptz DEFAULT now()
