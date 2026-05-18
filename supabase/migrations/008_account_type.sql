-- Migration 008 : Types de comptes demandeurs (espace pro)
-- Additive uniquement — aucun changement RLS, middleware, enum user_role

-- 1. account_type sur profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS account_type TEXT
    CHECK (account_type IN ('assistance', 'insurance_agent', 'garage'));

-- 2. Migrer les comptes assisteur existants → assistance
UPDATE profiles
  SET account_type = 'assistance'
  WHERE role = 'assisteur'
  AND account_type IS NULL;

-- 3. coverage_type et requester_account_type sur assistance_requests
ALTER TABLE assistance_requests
  ADD COLUMN IF NOT EXISTS coverage_type TEXT
    CHECK (coverage_type IN ('none', 'partial', 'full'))
    DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS requester_account_type TEXT;

-- 4. Dériver coverage_type depuis coverage JSONB existant
UPDATE assistance_requests
  SET coverage_type = CASE
    WHEN coverage->>'creditType' = 'full'    THEN 'full'
    WHEN coverage->>'creditType' = 'partial' THEN 'partial'
    ELSE 'none'
  END
  WHERE coverage_type = 'none' OR coverage_type IS NULL;

-- 5. Marquer les demandes existantes comme créées par un compte assistance
UPDATE assistance_requests
  SET requester_account_type = 'assistance'
  WHERE requester_account_type IS NULL;
