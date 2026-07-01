-- R3 : appliquer is_active dans la RLS. Jusqu'ici un compte désactivé
-- (is_active=false) gardait l'accès aux dossiers (is_active n'était vérifié que
-- dans quelques guards de routes, pas dans la RLS ni au login).
--
-- Côté assisteur/admin : les helpers renvoient NULL si le compte est inactif →
-- toutes les policies qui en dépendent échouent automatiquement.
-- Côté loueur : les policies utilisent owner_id = auth.uid() directement (sans
-- passer par ces helpers) → on ajoute un helper is_user_active() dans leur gate.

CREATE OR REPLACE FUNCTION "public"."get_user_role"() RETURNS user_role
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
  AS $$ SELECT role FROM public.profiles WHERE id = auth.uid() AND is_active; $$;

CREATE OR REPLACE FUNCTION "public"."get_user_org_id"() RETURNS uuid
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
  AS $$ SELECT org_id FROM public.profiles WHERE id = auth.uid() AND is_active; $$;

CREATE OR REPLACE FUNCTION "public"."is_user_active"() RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
  AS $$ SELECT COALESCE((SELECT is_active FROM public.profiles WHERE id = auth.uid()), false); $$;
GRANT ALL ON FUNCTION "public"."is_user_active"() TO anon, authenticated, service_role;

-- Réécriture des 2 policies loueur avec le gate is_user_active() (logique métier
-- inchangée par ailleurs : matching par ra.id, sans external_id — cf. 021/025).
DROP POLICY IF EXISTS "ar_loueur_select" ON "public"."assistance_requests";
CREATE POLICY "ar_loueur_select" ON "public"."assistance_requests" FOR SELECT USING (
  is_user_active() AND EXISTS (
    SELECT 1 FROM public.rental_agencies ra
    WHERE ra.owner_id = auth.uid()
      AND ( (ra.id)::text = assistance_requests.assigned_agency_id
         OR ( assistance_requests.assigned_agency_ids IS NOT NULL
              AND (ra.id)::text = ANY (assistance_requests.assigned_agency_ids) ) )
  )
);

DROP POLICY IF EXISTS "ar_loueur_update" ON "public"."assistance_requests";
CREATE POLICY "ar_loueur_update" ON "public"."assistance_requests" FOR UPDATE USING (
  is_user_active() AND EXISTS (
    SELECT 1 FROM public.rental_agencies ra
    WHERE ra.owner_id = auth.uid()
      AND ( (ra.id)::text = assistance_requests.assigned_agency_id
         OR ( assistance_requests.assigned_agency_ids IS NOT NULL
              AND (ra.id)::text = ANY (assistance_requests.assigned_agency_ids) ) )
  )
) WITH CHECK (
  is_user_active() AND EXISTS (
    SELECT 1 FROM public.rental_agencies ra
    WHERE ra.owner_id = auth.uid()
      AND ( (ra.id)::text = assistance_requests.assigned_agency_id
         OR ( assistance_requests.assigned_agency_ids IS NOT NULL
              AND (ra.id)::text = ANY (assistance_requests.assigned_agency_ids) ) )
  )
);
