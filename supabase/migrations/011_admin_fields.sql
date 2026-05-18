-- Migration 011 : Champs admin sur assistance_requests
-- Notes internes, flags opérationnels, traçabilité des modifications admin.
-- Toutes les colonnes sont nullable — zéro impact sur les lignes existantes.

ALTER TABLE assistance_requests
  ADD COLUMN IF NOT EXISTS admin_notes      text,
  ADD COLUMN IF NOT EXISTS admin_flags      text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS admin_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_updated_by text;   -- UUID de l'admin auteur
