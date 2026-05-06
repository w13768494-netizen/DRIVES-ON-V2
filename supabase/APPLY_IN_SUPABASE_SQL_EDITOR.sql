-- ============================================================
-- DRIVES ON — Bootstrap complet auth + RLS
-- À coller et exécuter dans Supabase Dashboard → SQL Editor
-- Tables assistance_requests / rental_responses / request_documents
-- / notifications supposées déjà créées (✅ vérifiées le 2026-05-06)
-- ============================================================

-- ── 0. Type énuméré user_role ─────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('assisteur', 'loueur', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 1. Table profiles ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id           UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role         user_role   NOT NULL,
  full_name    TEXT        NOT NULL,
  company_name TEXT,
  phone        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.touch_profiles_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_profiles_updated ON public.profiles;
CREATE TRIGGER trg_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_profiles_updated_at();

-- ── 2. Fonction helper (SECURITY DEFINER — évite récursion RLS) ───────────────
-- Lit profiles.role sans appliquer RLS. STABLE = mise en cache par transaction.

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- ── 3. Trigger : créer le profil à l'inscription ─────────────────────────────
-- Bloque l'auto-promotion admin : tout rôle 'admin' demandé à l'inscription
-- est silencieusement remplacé par 'assisteur'.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_role user_role;
BEGIN
  BEGIN
    v_role := (NEW.raw_user_meta_data->>'role')::user_role;
  EXCEPTION WHEN invalid_text_representation THEN
    v_role := 'assisteur';
  END;
  IF v_role = 'admin' THEN v_role := 'assisteur'; END IF;

  INSERT INTO public.profiles (id, role, full_name, company_name)
  VALUES (
    NEW.id,
    v_role,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'company_name'
  )
  ON CONFLICT (id) DO UPDATE
    SET full_name    = EXCLUDED.full_name,
        company_name = EXCLUDED.company_name,
        updated_at   = NOW();
  -- role intentionnellement exclu du DO UPDATE
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 4. Trigger : empêcher le changement de rôle par l'utilisateur ────────────
-- auth.uid() IS NULL quand le service_role est utilisé → promotion admin
-- possible uniquement via le dashboard ou l'API service role.

CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'Modification du rôle interdite. Contactez un administrateur.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();

-- ── 5. RLS — profiles ─────────────────────────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_all"                  ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own"                  ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_loueurs_for_matching" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin"                ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own"                  ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"                  ON public.profiles;

-- Chaque utilisateur lit son propre profil
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Assisteurs et admins voient les loueurs (matching)
CREATE POLICY "profiles_select_loueurs_for_matching"
  ON public.profiles FOR SELECT
  USING (role = 'loueur' AND public.get_user_role() IN ('assisteur', 'admin'));

-- Admin voit tout
CREATE POLICY "profiles_select_admin"
  ON public.profiles FOR SELECT
  USING (public.get_user_role() = 'admin');

-- Insertion uniquement par le trigger handle_new_user (SECURITY DEFINER)
-- Le user peut mettre à jour son profil mais PAS son rôle (trigger)
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ── 6. RLS — assistance_requests ─────────────────────────────────────────────

ALTER TABLE public.assistance_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ar_assisteur_own"       ON public.assistance_requests;
DROP POLICY IF EXISTS "ar_assisteur_select"    ON public.assistance_requests;
DROP POLICY IF EXISTS "ar_assisteur_insert"    ON public.assistance_requests;
DROP POLICY IF EXISTS "ar_assisteur_update"    ON public.assistance_requests;
DROP POLICY IF EXISTS "ar_assisteur_delete"    ON public.assistance_requests;
DROP POLICY IF EXISTS "ar_assisteur_read_write" ON public.assistance_requests;
DROP POLICY IF EXISTS "ar_loueur_select"       ON public.assistance_requests;
DROP POLICY IF EXISTS "ar_loueur_update"       ON public.assistance_requests;
DROP POLICY IF EXISTS "ar_admin_all"           ON public.assistance_requests;

CREATE POLICY "ar_assisteur_select"
  ON public.assistance_requests FOR SELECT
  USING (auth.uid()::text = created_by_user_id);

CREATE POLICY "ar_assisteur_insert"
  ON public.assistance_requests FOR INSERT
  WITH CHECK (
    auth.uid()::text = created_by_user_id
    AND public.get_user_role() = 'assisteur'
  );

CREATE POLICY "ar_assisteur_update"
  ON public.assistance_requests FOR UPDATE
  USING  (auth.uid()::text = created_by_user_id)
  WITH CHECK (auth.uid()::text = created_by_user_id);

-- Suppression réservée aux demandes brouillon/envoyée
CREATE POLICY "ar_assisteur_delete"
  ON public.assistance_requests FOR DELETE
  USING (
    auth.uid()::text = created_by_user_id
    AND status IN ('brouillon', 'envoyee')
  );

-- Loueur : lecture pour matching géographique
CREATE POLICY "ar_loueur_select"
  ON public.assistance_requests FOR SELECT
  USING (public.get_user_role() = 'loueur');

-- Loueur : mise à jour des demandes assignées
CREATE POLICY "ar_loueur_update"
  ON public.assistance_requests FOR UPDATE
  USING  (public.get_user_role() = 'loueur')
  WITH CHECK (public.get_user_role() = 'loueur');

CREATE POLICY "ar_admin_all"
  ON public.assistance_requests FOR ALL
  USING (public.get_user_role() = 'admin');

-- ── 7. RLS — rental_responses ─────────────────────────────────────────────────
-- Note : agency_id est encore un ID mock (ex: 'ag-001'), pas un UUID auth.
-- → accès loueur via get_user_role() jusqu'à migration vers vrais UUID auth.

ALTER TABLE public.rental_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rr_loueur_own"       ON public.rental_responses;
DROP POLICY IF EXISTS "rr_loueur_all"       ON public.rental_responses;
DROP POLICY IF EXISTS "rr_assisteur_select" ON public.rental_responses;
DROP POLICY IF EXISTS "rr_admin_all"        ON public.rental_responses;

-- Loueur gère ses réponses (agency_id = mock → contrôle par rôle pour l'instant)
CREATE POLICY "rr_loueur_all"
  ON public.rental_responses FOR ALL
  USING     (public.get_user_role() = 'loueur')
  WITH CHECK (public.get_user_role() = 'loueur');

-- Assisteur voit les réponses de SES demandes uniquement
CREATE POLICY "rr_assisteur_select"
  ON public.rental_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.assistance_requests ar
      WHERE ar.id::text = request_id
        AND auth.uid()::text = ar.created_by_user_id
    )
  );

CREATE POLICY "rr_admin_all"
  ON public.rental_responses FOR ALL
  USING (public.get_user_role() = 'admin');

-- ── 8. RLS — request_documents ───────────────────────────────────────────────
-- Note : pas de colonne user_id — accès via request_id → assistance_requests.

ALTER TABLE public.request_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rd_owner_all"        ON public.request_documents;
DROP POLICY IF EXISTS "rd_assisteur_select" ON public.request_documents;
DROP POLICY IF EXISTS "rd_assisteur_all"    ON public.request_documents;
DROP POLICY IF EXISTS "rd_loueur_select"    ON public.request_documents;
DROP POLICY IF EXISTS "rd_parties_select"   ON public.request_documents;
DROP POLICY IF EXISTS "rd_admin_all"        ON public.request_documents;

-- Assisteur gère les docs de ses demandes
CREATE POLICY "rd_assisteur_all"
  ON public.request_documents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.assistance_requests ar
      WHERE ar.id::text = request_id
        AND auth.uid()::text = ar.created_by_user_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assistance_requests ar
      WHERE ar.id::text = request_id
        AND auth.uid()::text = ar.created_by_user_id
    )
  );

-- Loueur voit tous les docs des demandes (matching)
CREATE POLICY "rd_loueur_select"
  ON public.request_documents FOR SELECT
  USING (public.get_user_role() = 'loueur');

CREATE POLICY "rd_admin_all"
  ON public.request_documents FOR ALL
  USING (public.get_user_role() = 'admin');

-- ── 9. RLS — notifications ────────────────────────────────────────────────────
-- Note : agency_id est encore un ID mock, pas un UUID auth.
-- → accès loueur via get_user_role() jusqu'à migration vers vrais UUID auth.

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_owner_all"    ON public.notifications;
DROP POLICY IF EXISTS "notif_loueur_all"   ON public.notifications;
DROP POLICY IF EXISTS "notif_admin_select" ON public.notifications;
DROP POLICY IF EXISTS "notif_admin_all"    ON public.notifications;

-- Loueur voit et gère ses notifications (agency_id = mock → contrôle par rôle)
CREATE POLICY "notif_loueur_all"
  ON public.notifications FOR ALL
  USING     (public.get_user_role() = 'loueur')
  WITH CHECK (public.get_user_role() = 'loueur');

CREATE POLICY "notif_admin_all"
  ON public.notifications FOR ALL
  USING (public.get_user_role() = 'admin');

-- ── 10. Désactiver la confirmation email (dev uniquement) ─────────────────────
-- À faire dans le dashboard : Authentication → Settings →
-- désactiver "Enable email confirmations"
-- OU cocher "Auto Confirm Users" selon la version du dashboard.

-- ── FIN ── Vérifier avec : SELECT * FROM public.profiles LIMIT 5;
