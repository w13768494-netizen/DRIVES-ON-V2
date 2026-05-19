-- ============================================================
-- DRIVES ON — Migration 018 : déclaration de sinistre
-- Ajoute has_damage_claim sur assistance_requests
-- ============================================================

ALTER TABLE public.assistance_requests
  ADD COLUMN IF NOT EXISTS has_damage_claim boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.assistance_requests.has_damage_claim IS
  'true quand le loueur a déclaré un sinistre (dégât véhicule) sur ce dossier. '
  'Rend etat_depart et etat_retour obligatoires pour la clôture côté assisteur.';
