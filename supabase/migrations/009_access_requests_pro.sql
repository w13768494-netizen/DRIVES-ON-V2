-- Migration 009 : Parcours création de compte pro (3 types demandeurs)
-- Additive uniquement — aucun changement RLS, middleware, enum user_role

-- ── 1. Colonnes étendues sur access_requests ──────────────────────────────────

ALTER TABLE access_requests
  ADD COLUMN IF NOT EXISTS account_type              TEXT
    CHECK (account_type IN ('assistance', 'insurance_agent', 'garage')),
  ADD COLUMN IF NOT EXISTS contact_function          TEXT,
  ADD COLUMN IF NOT EXISTS siret                     TEXT,
  ADD COLUMN IF NOT EXISTS address                   TEXT,
  ADD COLUMN IF NOT EXISTS city                      TEXT,
  ADD COLUMN IF NOT EXISTS postal_code               TEXT,
  ADD COLUMN IF NOT EXISTS intervention_zone         TEXT,
  ADD COLUMN IF NOT EXISTS monthly_requests_estimate INTEGER,
  ADD COLUMN IF NOT EXISTS extra_fields              JSONB;

-- ── 2. Mise à jour du trigger handle_new_user ─────────────────────────────────
-- Ajoute account_type dans le profil créé à l'invitation.
-- COALESCE sur le ON CONFLICT : ne pas écraser un account_type existant
-- avec NULL si les metadata sont partielles (re-invite, recovery, etc.).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name, company_name, account_type)
  VALUES (
    NEW.id,
    (NEW.raw_user_meta_data->>'role')::user_role,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'company_name',
    NEW.raw_user_meta_data->>'account_type'
  )
  ON CONFLICT (id) DO UPDATE SET
    role         = EXCLUDED.role,
    full_name    = EXCLUDED.full_name,
    company_name = COALESCE(EXCLUDED.company_name, profiles.company_name),
    account_type = COALESCE(EXCLUDED.account_type, profiles.account_type),
    updated_at   = NOW();
  RETURN NEW;
END;
$$;
