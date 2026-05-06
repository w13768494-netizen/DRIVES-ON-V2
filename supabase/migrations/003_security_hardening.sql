-- ============================================================
-- DRIVES ON — Durcissement sécurité (migration 003)
-- Prérequis : 001 + 002 exécutés
-- ============================================================

-- ── 0. Fonction helper get_user_role() ───────────────────────────────────────
--
-- SECURITY DEFINER : lit profiles sans appliquer RLS.
-- Évite la récursion quand des policies sur profiles font elles-mêmes
-- un subquery sur profiles pour vérifier le rôle courant.
-- STABLE : PostgreSQL met en cache le résultat dans la même transaction
-- → un seul accès DB par requête, pas par ligne.

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- ── 1. Empêcher l'auto-promotion admin via user_metadata ─────────────────────
--
-- FAILLE : handle_new_user (002) acceptait role='admin' depuis raw_user_meta_data.
-- Un attaquant pouvant appeler l'API Supabase directement avec { role: 'admin' }
-- obtenait un profil admin dans profiles.
-- FIX : tout rôle 'admin' demandé à l'inscription est silencieusement rabaissé
-- à 'assisteur'. Les comptes admin sont créés manuellement (voir §8).
--
-- ON CONFLICT: le role n'est jamais mis à jour (intentionnel — empêche l'escalade
-- si le trigger était déclenché une seconde fois).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role;
BEGIN
  BEGIN
    v_role := (NEW.raw_user_meta_data->>'role')::user_role;
  EXCEPTION WHEN invalid_text_representation THEN
    v_role := 'assisteur';
  END;

  IF v_role = 'admin' THEN
    v_role := 'assisteur';   -- auto-promotion admin silencieusement bloquée
  END IF;

  INSERT INTO public.profiles (id, role, full_name, company_name)
  VALUES (
    NEW.id,
    v_role,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'company_name'
  )
  ON CONFLICT (id) DO UPDATE
    SET
      -- role intentionnellement exclu du DO UPDATE
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

-- ── 2. Empêcher le changement de rôle par l'utilisateur lui-même ─────────────
--
-- FAILLE : profiles_update_own (001) couvrait tous les champs y compris role.
-- Un utilisateur pouvait faire supabase.from('profiles').update({ role: 'admin' })
-- et bypasser toutes les RLS qui s'appuient sur profiles.role.
-- FIX : trigger BEFORE UPDATE qui bloque toute modification du champ role
-- si auth.uid() IS NOT NULL (= requête d'un utilisateur authentifié).
-- auth.uid() IS NULL quand le service_role est utilisé → admin peut changer les rôles
-- via le dashboard Supabase ou l'API service role.

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

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON profiles;
CREATE TRIGGER trg_prevent_role_escalation
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_escalation();

-- ── 3. profiles — policies SELECT sans récursion ─────────────────────────────
--
-- PROBLÈME : les policies profiles_select_loueurs / profiles_select_admin (003 v1)
-- utilisaient EXISTS (SELECT 1 FROM profiles ...) dans leur clause USING, créant
-- une récursion RLS infinie.
-- FIX : on utilise get_user_role() SECURITY DEFINER — lit profiles sans RLS.
--
-- profiles_select_all (001) : supprimée car trop permissive (tout le monde lisait
-- tous les profils y compris les données personnelles).

DROP POLICY IF EXISTS "profiles_select_all"    ON profiles;
DROP POLICY IF EXISTS "profiles_select_own"    ON profiles;
DROP POLICY IF EXISTS "profiles_select_loueurs" ON profiles;
DROP POLICY IF EXISTS "profiles_select_admin"  ON profiles;

-- Chaque utilisateur lit son propre profil (couverture pour middleware + UI)
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Assisteurs et admins voient les profils loueurs (nécessaire pour le matching)
CREATE POLICY "profiles_select_loueurs_for_matching"
  ON profiles FOR SELECT
  USING (
    role = 'loueur'
    AND public.get_user_role() IN ('assisteur', 'admin')
  );

-- Admin voit tous les profils
CREATE POLICY "profiles_select_admin"
  ON profiles FOR SELECT
  USING (public.get_user_role() = 'admin');

-- ── 4. assistance_requests — réécriture complète ──────────────────────────────
--
-- FAILLE ar_assisteur_own FOR ALL : suppression possible à tout statut.
-- FAILLE ar_loueur_update : tout loueur pouvait modifier toute demande.
-- FIX : séparation SELECT/INSERT/UPDATE/DELETE explicites + get_user_role().

DROP POLICY IF EXISTS "ar_assisteur_own"    ON assistance_requests;
DROP POLICY IF EXISTS "ar_loueur_select"    ON assistance_requests;
DROP POLICY IF EXISTS "ar_loueur_update"    ON assistance_requests;
DROP POLICY IF EXISTS "ar_admin_all"        ON assistance_requests;
-- policies éventuellement créées dans 003 v1 :
DROP POLICY IF EXISTS "ar_assisteur_read_write" ON assistance_requests;
DROP POLICY IF EXISTS "ar_assisteur_insert"     ON assistance_requests;
DROP POLICY IF EXISTS "ar_assisteur_update"     ON assistance_requests;
DROP POLICY IF EXISTS "ar_assisteur_delete"     ON assistance_requests;

-- Assisteur : lit ses propres demandes
CREATE POLICY "ar_assisteur_select"
  ON assistance_requests FOR SELECT
  USING (auth.uid()::text = created_by_user_id);

-- Assisteur : crée des demandes en son nom
CREATE POLICY "ar_assisteur_insert"
  ON assistance_requests FOR INSERT
  WITH CHECK (
    auth.uid()::text = created_by_user_id
    AND public.get_user_role() = 'assisteur'
  );

-- Assisteur : met à jour ses propres demandes
CREATE POLICY "ar_assisteur_update"
  ON assistance_requests FOR UPDATE
  USING  (auth.uid()::text = created_by_user_id)
  WITH CHECK (auth.uid()::text = created_by_user_id);

-- Assisteur : supprime uniquement les demandes brouillon/envoyée
CREATE POLICY "ar_assisteur_delete"
  ON assistance_requests FOR DELETE
  USING (
    auth.uid()::text = created_by_user_id
    AND status IN ('brouillon', 'envoyee')
  );

-- Loueur : lit toutes les demandes (matching géographique)
-- TODO après migration des IDs : restreindre aux demandes dans le rayon du loueur
CREATE POLICY "ar_loueur_select"
  ON assistance_requests FOR SELECT
  USING (public.get_user_role() = 'loueur');

-- Loueur : met à jour les demandes qui lui sont assignées
-- LIMITATION : assigned_agency_id contient encore les IDs mock (ag-001).
-- La restriction sera effective une fois ces IDs migrés vers auth.uid().
CREATE POLICY "ar_loueur_update"
  ON assistance_requests FOR UPDATE
  USING (public.get_user_role() = 'loueur')
  WITH CHECK (public.get_user_role() = 'loueur');

-- Admin : accès total
CREATE POLICY "ar_admin_all"
  ON assistance_requests FOR ALL
  USING (public.get_user_role() = 'admin');

-- ── 5. rental_responses — réécriture avec get_user_role() ────────────────────

DROP POLICY IF EXISTS "rr_loueur_own"       ON rental_responses;
DROP POLICY IF EXISTS "rr_assisteur_select" ON rental_responses;
DROP POLICY IF EXISTS "rr_admin_all"        ON rental_responses;

-- Loueur : gère ses propres réponses (toutes opérations)
CREATE POLICY "rr_loueur_own"
  ON rental_responses FOR ALL
  USING     (auth.uid()::text = loueur_id)
  WITH CHECK (auth.uid()::text = loueur_id);

-- Assisteur : lit les réponses liées à ses propres demandes uniquement
-- (subquery sur assistance_requests — pas sur profiles → pas de récursion)
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
  USING (public.get_user_role() = 'admin');

-- ── 6. request_documents — réécriture avec périmètre correct ─────────────────
--
-- FAILLE rd_parties_select : tout loueur pouvait lire les documents de toutes
-- les demandes (pas seulement les siennes).

DROP POLICY IF EXISTS "rd_owner_all"       ON request_documents;
DROP POLICY IF EXISTS "rd_parties_select"  ON request_documents;

-- Propriétaire du document : toutes opérations
CREATE POLICY "rd_owner_all"
  ON request_documents FOR ALL
  USING     (auth.uid()::text = uploaded_by_user_id)
  WITH CHECK (auth.uid()::text = uploaded_by_user_id);

-- Assisteur : lit les documents de ses propres demandes
CREATE POLICY "rd_assisteur_select"
  ON request_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM assistance_requests ar
      WHERE ar.id::text = request_id
        AND auth.uid()::text = ar.created_by_user_id
    )
  );

-- Loueur : lit les documents des demandes qui lui sont assignées
-- LIMITATION : même contrainte sur assigned_agency_id que ar_loueur_update
CREATE POLICY "rd_loueur_select"
  ON request_documents FOR SELECT
  USING (
    public.get_user_role() = 'loueur'
    AND EXISTS (
      SELECT 1 FROM assistance_requests ar
      WHERE ar.id::text = request_id
    )
  );

-- Admin : accès total
CREATE POLICY "rd_admin_all"
  ON request_documents FOR ALL
  USING (public.get_user_role() = 'admin');

-- ── 7. notifications — admin accès total + get_user_role() ───────────────────

DROP POLICY IF EXISTS "notif_owner_all"    ON notifications;
DROP POLICY IF EXISTS "notif_admin_select" ON notifications;
DROP POLICY IF EXISTS "notif_admin_all"    ON notifications;

CREATE POLICY "notif_owner_all"
  ON notifications FOR ALL
  USING     (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "notif_admin_all"
  ON notifications FOR ALL
  USING (public.get_user_role() = 'admin');

-- ── 8. demandes/reponses (001) — mettre à jour les subqueries profiles ───────
--
-- Les policies sur demandes et reponses utilisent EXISTS (SELECT 1 FROM profiles...)
-- Ce pattern est safe tant que profiles a profiles_select_own (auth.uid() = id).
-- La requête WHERE id = auth.uid() est couverte par profiles_select_own → pas de récursion.
-- Aucune modification nécessaire pour ces tables.

-- ── 9. Procédure de création d'un compte admin ───────────────────────────────
--
-- /register ne permet PAS de créer un compte admin (handle_new_user bloque).
-- Procédure manuelle via service role :
--
-- Étape 1 — Créer l'utilisateur dans Supabase Dashboard
--   Authentication → Users → "Add user" ou "Invite user"
--   Email : admin@drives-on.fr, mot de passe fort
--
-- Étape 2 — Promouvoir en admin via SQL Editor (service role)
--   UPDATE public.profiles
--   SET role = 'admin'
--   WHERE id = (
--     SELECT id FROM auth.users WHERE email = 'admin@drives-on.fr'
--   );
--
-- Le trigger trg_prevent_role_escalation autorise ce UPDATE car
-- auth.uid() IS NULL quand exécuté via service role.
