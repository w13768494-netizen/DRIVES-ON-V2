-- Migration 010 : Variants véhicule — carburant + boîte de vitesses
-- Additive uniquement. Nullable. Pas de contrainte UNIQUE.
-- Les lignes existantes restent valides (fuel_type = NULL = générique).

ALTER TABLE agency_vehicle_categories
  ADD COLUMN IF NOT EXISTS fuel_type    text,   -- 'essence' | 'diesel' | 'hybride' | 'electrique'
  ADD COLUMN IF NOT EXISTS transmission text;   -- 'manuelle' | 'automatique'
