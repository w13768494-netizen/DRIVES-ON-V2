-- ─────────────────────────────────────────────────────────────────────────────
-- Organisations multi-utilisateurs côté assisteur (#4 option A)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Table organizations
CREATE TABLE IF NOT EXISTS "public"."organizations" (
  "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"         text NOT NULL,
  "account_type" text,
  "is_active"    boolean NOT NULL DEFAULT true,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE "public"."organizations" DROP CONSTRAINT IF EXISTS "organizations_account_type_check";
ALTER TABLE "public"."organizations" ADD CONSTRAINT "organizations_account_type_check"
  CHECK ("account_type" IS NULL OR "account_type" IN ('assistance','insurance_agent','garage'));

-- 2. Colonnes profiles
ALTER TABLE "public"."profiles"
  ADD COLUMN IF NOT EXISTS "org_id"    uuid REFERENCES "public"."organizations"("id"),
  ADD COLUMN IF NOT EXISTS "team_role" text;
ALTER TABLE "public"."profiles" DROP CONSTRAINT IF EXISTS "profiles_team_role_check";
ALTER TABLE "public"."profiles" ADD CONSTRAINT "profiles_team_role_check"
  CHECK ("team_role" IS NULL OR "team_role" IN ('admin','superviseur','charge_assistance'));

-- 3. Colonne dénormalisée sur assistance_requests
ALTER TABLE "public"."assistance_requests"
  ADD COLUMN IF NOT EXISTS "org_id" uuid REFERENCES "public"."organizations"("id");

-- 4. Fonctions helper (modèle get_user_role)
CREATE OR REPLACE FUNCTION "public"."get_user_org_id"() RETURNS uuid
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
  AS $$ SELECT org_id FROM public.profiles WHERE id = auth.uid(); $$;

CREATE OR REPLACE FUNCTION "public"."get_user_team_role"() RETURNS text
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
  AS $$ SELECT team_role FROM public.profiles WHERE id = auth.uid(); $$;

GRANT ALL ON FUNCTION "public"."get_user_org_id"()    TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION "public"."get_user_team_role"() TO anon, authenticated, service_role;

-- 5. Backfill : chaque profil assisteur sans org -> 1 organisation, lui = admin
DO $$
DECLARE p RECORD; new_org uuid;
BEGIN
  FOR p IN
    SELECT id, company_name, full_name, account_type
    FROM public.profiles WHERE role = 'assisteur' AND org_id IS NULL
  LOOP
    INSERT INTO public.organizations (name, account_type)
      VALUES (COALESCE(NULLIF(p.company_name, ''), p.full_name, 'Organisation'), p.account_type)
      RETURNING id INTO new_org;
    UPDATE public.profiles SET org_id = new_org, team_role = 'admin' WHERE id = p.id;
  END LOOP;
END $$;

-- 6. Backfill assistance_requests.org_id depuis l'org du créateur (garde cast uuid)
UPDATE public.assistance_requests ar
  SET org_id = pr.org_id
  FROM public.profiles pr
  WHERE ar.org_id IS NULL
    AND ar.created_by_user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND pr.id = ar.created_by_user_id::uuid;

-- 7. Trigger : org_id auto à l'INSERT d'une demande
CREATE OR REPLACE FUNCTION "public"."set_request_org_id"() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
  AS $$
  BEGIN
    IF NEW.org_id IS NULL
       AND NEW.created_by_user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      SELECT org_id INTO NEW.org_id FROM public.profiles WHERE id = NEW.created_by_user_id::uuid;
    END IF;
    RETURN NEW;
  END;
  $$;
DROP TRIGGER IF EXISTS "trg_set_request_org_id" ON "public"."assistance_requests";
CREATE TRIGGER "trg_set_request_org_id" BEFORE INSERT ON "public"."assistance_requests"
  FOR EACH ROW EXECUTE FUNCTION "public"."set_request_org_id"();

-- 8. handle_new_user étendu : copie org_id + team_role des métadonnées
CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
  AS $$
  BEGIN
    -- Invite-only : seuls les utilisateurs créés par un flux admin (generateLink,
    -- qui pose invited_at) obtiennent un profil. Un signup public (invited_at NULL)
    -- ne peut pas s'auto-attribuer role/org_id/team_role -> fail closed.
    IF NEW.invited_at IS NULL THEN
      RETURN NEW;
    END IF;
    INSERT INTO public.profiles (id, role, full_name, company_name, account_type, org_id, team_role)
    VALUES (
      NEW.id,
      (NEW.raw_user_meta_data->>'role')::user_role,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      NEW.raw_user_meta_data->>'company_name',
      NEW.raw_user_meta_data->>'account_type',
      NULLIF(NEW.raw_user_meta_data->>'org_id', '')::uuid,
      NEW.raw_user_meta_data->>'team_role'
    )
    ON CONFLICT (id) DO UPDATE SET
      role         = EXCLUDED.role,
      full_name    = EXCLUDED.full_name,
      company_name = COALESCE(EXCLUDED.company_name, profiles.company_name),
      account_type = COALESCE(EXCLUDED.account_type, profiles.account_type),
      org_id       = COALESCE(EXCLUDED.org_id,       profiles.org_id),
      team_role    = COALESCE(EXCLUDED.team_role,    profiles.team_role),
      updated_at   = NOW();
    RETURN NEW;
  END;
  $$;

-- 9. Anti-auto-promotion : team_role + org_id non modifiables par soi-même
CREATE OR REPLACE FUNCTION "public"."prevent_role_escalation"() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
  AS $$
  BEGIN
    IF auth.uid() IS NOT NULL AND (
         NEW.role      IS DISTINCT FROM OLD.role
      OR NEW.team_role IS DISTINCT FROM OLD.team_role
      OR NEW.org_id    IS DISTINCT FROM OLD.org_id
    ) THEN
      RAISE EXCEPTION 'Modification du rôle interdite. Contactez un administrateur.';
    END IF;
    RETURN NEW;
  END;
  $$;

-- 10. RLS : réécriture des policies assisteur sur assistance_requests
DROP POLICY IF EXISTS "ar_assisteur_select"   ON "public"."assistance_requests";
DROP POLICY IF EXISTS "ar_assisteur_update"   ON "public"."assistance_requests";
DROP POLICY IF EXISTS "ar_assisteur_insert"   ON "public"."assistance_requests";
DROP POLICY IF EXISTS "ar_assisteur_delete"   ON "public"."assistance_requests";
DROP POLICY IF EXISTS "assisteur_own_requests" ON "public"."assistance_requests";

CREATE POLICY "ar_assisteur_select" ON "public"."assistance_requests" FOR SELECT USING (
  get_user_role() = 'assisteur'::user_role
  AND org_id = get_user_org_id()
  AND (get_user_team_role() IN ('admin','superviseur') OR created_by_user_id = (auth.uid())::text)
);

CREATE POLICY "ar_assisteur_update" ON "public"."assistance_requests" FOR UPDATE USING (
  get_user_role() = 'assisteur'::user_role
  AND org_id = get_user_org_id()
  AND (get_user_team_role() IN ('admin','superviseur') OR created_by_user_id = (auth.uid())::text)
) WITH CHECK (
  get_user_role() = 'assisteur'::user_role
  AND org_id = get_user_org_id()
  AND (get_user_team_role() IN ('admin','superviseur') OR created_by_user_id = (auth.uid())::text)
);

CREATE POLICY "ar_assisteur_insert" ON "public"."assistance_requests" FOR INSERT WITH CHECK (
  get_user_role() = 'assisteur'::user_role
  AND created_by_user_id = (auth.uid())::text
  AND org_id = get_user_org_id()
);

CREATE POLICY "ar_assisteur_delete" ON "public"."assistance_requests" FOR DELETE USING (
  get_user_role() = 'assisteur'::user_role
  AND org_id = get_user_org_id()
  AND (get_user_team_role() IN ('admin','superviseur') OR created_by_user_id = (auth.uid())::text)
  AND status = ANY (ARRAY['brouillon'::text, 'envoyee'::text])
);

-- 11. RLS organizations
ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_select_member_or_admin" ON "public"."organizations";
CREATE POLICY "org_select_member_or_admin" ON "public"."organizations" FOR SELECT USING (
  id = get_user_org_id() OR get_user_role() = 'admin'::user_role
);
