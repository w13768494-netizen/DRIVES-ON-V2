-- ============================================================
-- DRIVES ON — Migration 014 : stock_live sur agency_vehicle_categories
-- Phase 5 Chantier D — Capacity Engine
-- stock_live = disponibilité réelle actuelle (mise à jour par le loueur)
-- stock_estimate = capacité théorique / config longue durée (inchangé)
-- Matching utilise COALESCE(stock_live, stock_estimate)
-- ============================================================

ALTER TABLE agency_vehicle_categories
  ADD COLUMN IF NOT EXISTS stock_live integer;

-- Pas de DEFAULT (NULL = fallback vers stock_estimate)
-- Pas de contrainte CHECK au départ (stock_live = 0 est valide = "indisponible aujourd'hui")
