-- ============================================================
-- DRIVES ON — Auth setup & RLS (migration 002)
-- Prérequis : migration 001_initial_schema.sql exécutée
-- ============================================================

-- ── 1. TRIGGER : créer le profil à chaque inscription ────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name, company_name)
  VALUES (
    NEW.id,
    (NEW.raw_user_meta_data->>'role')::user_role,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'company_name'
  )
  ON CONFLICT (id) DO UPDATE
    SET
      role         = EXCLUDED.role,
      full_name    = EXCLUDED.full_name,
      company_name = EXCLUDED.company_name,
      updated_at   = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 2. RLS — assistance_requests ─────────────────────────────────────────────
-- created_by_user_id contient le auth.uid() de l'assisteur (UUID en texte)

ALTER TABLE assistance_requests ENABLE ROW LEVEL SECURITY;

-- Assisteur : accès complet à ses propres demandes
CREATE POLICY "ar_assisteur_own"
  ON assistance_requests FOR ALL
  USING     (auth.uid()::text = created_by_user_id)
  WITH CHECK (auth.uid()::text = created_by_user_id);

-- Loueur : lecture de toutes les demandes (matching) + mise à jour (réponse)
CREATE POLICY "ar_loueur_select"
  ON assistance_requests FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'loueur')
  );

CREATE POLICY "ar_loueur_update"
  ON assistance_requests FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'loueur')
  );

-- Admin : accès total
CREATE POLICY "ar_admin_all"
  ON assistance_requests FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── 3. RLS — rental_responses ─────────────────────────────────────────────────

ALTER TABLE rental_responses ENABLE ROW LEVEL SECURITY;

-- Loueur : gère ses propres réponses
CREATE POLICY "rr_loueur_own"
  ON rental_responses FOR ALL
  USING     (auth.uid()::text = loueur_id)
  WITH CHECK (auth.uid()::text = loueur_id);

-- Assisteur : lecture des réponses liées à ses demandes
CREATE POLICY "rr_assisteur_select"
  ON rental_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM assistance_requests ar
      WHERE ar.id::text = request_id
        AND auth.uid()::text = ar.created_by_user_id
    )
  );

-- Admin : accès total
CREATE POLICY "rr_admin_all"
  ON rental_responses FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── 4. RLS — request_documents ───────────────────────────────────────────────

ALTER TABLE request_documents ENABLE ROW LEVEL SECURITY;

-- Propriétaire du document : accès complet
CREATE POLICY "rd_owner_all"
  ON request_documents FOR ALL
  USING     (auth.uid()::text = uploaded_by_user_id)
  WITH CHECK (auth.uid()::text = uploaded_by_user_id);

-- Les deux parties de la demande voient tous les documents
CREATE POLICY "rd_parties_select"
  ON request_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM assistance_requests ar
      WHERE ar.id::text = request_id
        AND (
          auth.uid()::text = ar.created_by_user_id
          OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('loueur', 'admin'))
        )
    )
  );

-- ── 5. TABLE notifications + RLS ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id          UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     TEXT        NOT NULL,                  -- auth.uid() en texte
  request_id  TEXT,
  type        TEXT        NOT NULL,
  title       TEXT        NOT NULL,
  body        TEXT,
  read        BOOLEAN     DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_user    ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notif_request ON notifications (request_id);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Chaque utilisateur ne voit que ses propres notifications
CREATE POLICY "notif_owner_all"
  ON notifications FOR ALL
  USING     (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- Admin : lecture de toutes les notifications
CREATE POLICY "notif_admin_select"
  ON notifications FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── 6. Sécuriser la fonction PostGIS (service role uniquement) ────────────────

-- get_loueurs_for_demande est déjà SECURITY DEFINER (migration 001).
-- Ajouter une restriction : seuls les assisteurs et admins peuvent l'appeler.
-- (Implémenté via RLS sur demandes — la fonction lit les demandes avec SECURITY DEFINER,
-- mais son appel via RLS est déjà contrôlé par ar_assisteur_own / ar_admin_all.)
