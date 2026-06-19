-- ============================================================
-- DRIVES ON — Migration 015 : index unique sur variants véhicules
-- Phase 5 Chantier A — unicité (agency_id, category, fuel_type, transmission)
-- NULLS NOT DISTINCT : deux NULL sont traités comme identiques (PG 15+).
-- Audit préalable : 0 doublon en base au 2026-05-19.
-- ============================================================

CREATE UNIQUE INDEX uq_avc_variant
  ON agency_vehicle_categories (agency_id, category, fuel_type, transmission)
  NULLS NOT DISTINCT;
