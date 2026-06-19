-- Migration 007 : Grille tarifaire par tranche pour les loueurs
-- Additive : daily_rate et packages[] conservés comme fallback

ALTER TABLE agency_vehicle_categories
  ADD COLUMN IF NOT EXISTS modele_equivalent  text,
  ADD COLUMN IF NOT EXISTS tarif_1_4          numeric,
  ADD COLUMN IF NOT EXISTS tarif_5_7          numeric,
  ADD COLUMN IF NOT EXISTS tarif_8_14         numeric,
  ADD COLUMN IF NOT EXISTS tarif_15_21        numeric,
  ADD COLUMN IF NOT EXISTS tarif_22_29        numeric,
  ADD COLUMN IF NOT EXISTS forfait_30_jours   numeric,
  ADD COLUMN IF NOT EXISTS actif              boolean NOT NULL DEFAULT true;
