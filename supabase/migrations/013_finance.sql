-- ============================================================
-- DRIVES ON — Migration 013 : colonnes finance
-- Phase 4 Finance beta — découplage payment_status du statut opérationnel.
-- Toutes les colonnes sont nullable (sauf commission_rate et payment_status).
-- ============================================================

ALTER TABLE assistance_requests
  ADD COLUMN IF NOT EXISTS confirmed_price_per_day  numeric(10,2),
  ADD COLUMN IF NOT EXISTS confirmed_duration_days  integer,
  ADD COLUMN IF NOT EXISTS commission_rate           numeric(5,4) NOT NULL DEFAULT 0.15,
  ADD COLUMN IF NOT EXISTS commission_amount         numeric(10,2),
  ADD COLUMN IF NOT EXISTS total_amount_ht           numeric(10,2),
  ADD COLUMN IF NOT EXISTS amount_due_to_loueur      numeric(10,2),
  ADD COLUMN IF NOT EXISTS payment_status            text NOT NULL DEFAULT 'non_applicable',
  ADD COLUMN IF NOT EXISTS payment_validated_at      timestamptz,
  ADD COLUMN IF NOT EXISTS payment_validated_by      uuid;

ALTER TABLE assistance_requests
  ADD CONSTRAINT chk_payment_status
    CHECK (payment_status IN (
      'non_applicable', 'en_attente', 'pret_a_payer', 'paye', 'litigieux'
    ));

-- ── Initialisation des dossiers existants ──────────────────────────────────────
-- honoree : en attente de paiement (mission terminée, pas encore payée)
-- cloturee : supposé payé (cloture = paiement dans l'ancien modèle)
-- Les autres statuts restent non_applicable.

UPDATE assistance_requests
  SET payment_status = 'en_attente'
  WHERE status = 'honoree';

UPDATE assistance_requests
  SET payment_status = 'paye'
  WHERE status = 'cloturee';
