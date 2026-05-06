-- ============================================================
-- DRIVES ON — Schéma initial
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TYPES ÉNUMÉRÉS
-- ============================================================

CREATE TYPE user_role AS ENUM ('assisteur', 'loueur', 'admin');

CREATE TYPE vehicle_type AS ENUM (
  'citadine',
  'berline',
  'suv',
  'utilitaire',
  'monospace',
  'cabriolet'
);

CREATE TYPE demande_status AS ENUM (
  'en_attente',
  'acceptee',
  'en_cours',
  'terminee',
  'annulee'
);

CREATE TYPE reponse_status AS ENUM ('en_attente', 'acceptee', 'refusee');

-- ============================================================
-- PROFILES (complète auth.users)
-- ============================================================

CREATE TABLE profiles (
  id           UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role         user_role NOT NULL,
  full_name    TEXT NOT NULL,
  company_name TEXT,
  phone        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PROFILS LOUEURS (données métier spécifiques)
-- ============================================================

CREATE TABLE loueur_profiles (
  id                UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  address           TEXT NOT NULL,
  city              TEXT NOT NULL,
  postal_code       TEXT,
  latitude          DOUBLE PRECISION NOT NULL,
  longitude         DOUBLE PRECISION NOT NULL,
  location          GEOGRAPHY(POINT, 4326),
  service_radius_km INTEGER DEFAULT 30 CHECK (service_radius_km > 0),
  vehicle_types     vehicle_type[] DEFAULT ARRAY['citadine', 'berline']::vehicle_type[],
  fleet_size        INTEGER DEFAULT 1,
  is_available      BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DEMANDES
-- ============================================================

CREATE TABLE demandes (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  assisteur_id UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  -- Lieu de panne
  address      TEXT NOT NULL,
  city         TEXT NOT NULL,
  postal_code  TEXT,
  latitude     DOUBLE PRECISION NOT NULL,
  longitude    DOUBLE PRECISION NOT NULL,
  location     GEOGRAPHY(POINT, 4326),
  -- Véhicule et timing
  vehicle_type vehicle_type NOT NULL,
  date_needed  TIMESTAMPTZ NOT NULL,
  duration_days INTEGER NOT NULL CHECK (duration_days > 0 AND duration_days <= 90),
  notes        TEXT,
  -- Statut et attribution
  status       demande_status DEFAULT 'en_attente',
  loueur_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  -- Métadonnées
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RÉPONSES DES LOUEURS
-- ============================================================

CREATE TABLE reponses (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  demande_id UUID REFERENCES demandes(id) ON DELETE CASCADE NOT NULL,
  loueur_id  UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status     reponse_status DEFAULT 'en_attente',
  message    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (demande_id, loueur_id)
);

-- ============================================================
-- TRIGGERS : calculer le champ geography automatiquement
-- ============================================================

CREATE OR REPLACE FUNCTION sync_location_from_coords()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location = ST_SetSRID(
      ST_MakePoint(NEW.longitude, NEW.latitude), 4326
    )::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_demande_location
  BEFORE INSERT OR UPDATE OF latitude, longitude ON demandes
  FOR EACH ROW EXECUTE FUNCTION sync_location_from_coords();

CREATE TRIGGER trg_loueur_location
  BEFORE INSERT OR UPDATE OF latitude, longitude ON loueur_profiles
  FOR EACH ROW EXECUTE FUNCTION sync_location_from_coords();

-- updated_at automatique
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated      BEFORE UPDATE ON profiles         FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_loueur_updated        BEFORE UPDATE ON loueur_profiles   FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_demandes_updated      BEFORE UPDATE ON demandes          FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_reponses_updated      BEFORE UPDATE ON reponses          FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- FONCTION : trouver loueurs proches d'une demande
-- ============================================================

CREATE OR REPLACE FUNCTION get_loueurs_for_demande(
  p_demande_id UUID
)
RETURNS TABLE (
  loueur_id       UUID,
  full_name       TEXT,
  company_name    TEXT,
  phone           TEXT,
  city            TEXT,
  distance_km     DOUBLE PRECISION,
  vehicle_types   vehicle_type[],
  is_available    BOOLEAN,
  has_responded   BOOLEAN,
  response_status reponse_status
) AS $$
DECLARE
  v_lat DOUBLE PRECISION;
  v_lng DOUBLE PRECISION;
  v_vtype vehicle_type;
BEGIN
  SELECT d.latitude, d.longitude, d.vehicle_type
  INTO v_lat, v_lng, v_vtype
  FROM demandes d WHERE d.id = p_demande_id;

  RETURN QUERY
  SELECT
    lp.id,
    p.full_name,
    p.company_name,
    p.phone,
    lp.city,
    ST_Distance(
      ST_SetSRID(ST_MakePoint(v_lng, v_lat), 4326)::geography,
      lp.location
    ) / 1000.0,
    lp.vehicle_types,
    lp.is_available,
    (r.id IS NOT NULL),
    r.status
  FROM loueur_profiles lp
  JOIN profiles p ON p.id = lp.id
  LEFT JOIN reponses r ON r.demande_id = p_demande_id AND r.loueur_id = lp.id
  WHERE lp.is_available = true
    AND v_vtype = ANY(lp.vehicle_types)
    AND ST_DWithin(
      ST_SetSRID(ST_MakePoint(v_lng, v_lat), 4326)::geography,
      lp.location,
      lp.service_radius_km * 1000
    )
  ORDER BY 6 ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE loueur_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE demandes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE reponses        ENABLE ROW LEVEL SECURITY;

-- profiles : lecture publique, écriture propriétaire
CREATE POLICY "profiles_select_all"   ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own"   ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own"   ON profiles FOR UPDATE USING (auth.uid() = id);

-- loueur_profiles : lecture publique, écriture propriétaire
CREATE POLICY "lp_select_all"  ON loueur_profiles FOR SELECT USING (true);
CREATE POLICY "lp_insert_own"  ON loueur_profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "lp_update_own"  ON loueur_profiles FOR UPDATE USING (auth.uid() = id);

-- demandes : assisteur gère les siennes, loueurs voient toutes (pour le matching)
CREATE POLICY "demandes_select" ON demandes FOR SELECT USING (
  auth.uid() = assisteur_id
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('loueur', 'admin'))
);
CREATE POLICY "demandes_insert" ON demandes FOR INSERT WITH CHECK (
  auth.uid() = assisteur_id
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'assisteur')
);
CREATE POLICY "demandes_update" ON demandes FOR UPDATE USING (
  auth.uid() = assisteur_id
  OR auth.uid() = loueur_id
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "demandes_delete" ON demandes FOR DELETE USING (
  auth.uid() = assisteur_id AND status = 'en_attente'
);

-- reponses : loueur gère les siennes, assisteur voit celles liées à ses demandes
CREATE POLICY "reponses_select" ON reponses FOR SELECT USING (
  auth.uid() = loueur_id
  OR EXISTS (SELECT 1 FROM demandes WHERE id = demande_id AND assisteur_id = auth.uid())
);
CREATE POLICY "reponses_insert" ON reponses FOR INSERT WITH CHECK (
  auth.uid() = loueur_id
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'loueur')
);
CREATE POLICY "reponses_update" ON reponses FOR UPDATE USING (
  auth.uid() = loueur_id
);

-- ============================================================
-- INDEX pour performances
-- ============================================================

CREATE INDEX idx_demandes_assisteur     ON demandes (assisteur_id);
CREATE INDEX idx_demandes_status        ON demandes (status);
CREATE INDEX idx_demandes_location      ON demandes USING GIST (location);
CREATE INDEX idx_loueur_location        ON loueur_profiles USING GIST (location);
CREATE INDEX idx_reponses_demande       ON reponses (demande_id);
CREATE INDEX idx_reponses_loueur        ON reponses (loueur_id);
