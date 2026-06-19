-- Fix 1: Drop overpermissive public_all policy on request_documents
-- The role-scoped policies (rd_admin_all, rd_assisteur_all, rd_loueur_select) already cover all legitimate access
DROP POLICY IF EXISTS "public_all" ON "public"."request_documents";

-- Fix 2: Remove external_id branches from ar_loueur_select and ar_loueur_update
-- external_id is user-writable, allowing IDOR via attacker-controlled join key
DROP POLICY IF EXISTS "ar_loueur_select" ON "public"."assistance_requests";
DROP POLICY IF EXISTS "ar_loueur_update" ON "public"."assistance_requests";

CREATE POLICY "ar_loueur_select" ON "public"."assistance_requests"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "public"."rental_agencies" "ra"
      WHERE "ra"."owner_id" = "auth"."uid"()
        AND (
          ("ra"."id")::text = "assistance_requests"."assigned_agency_id"
          OR (
            "assistance_requests"."assigned_agency_ids" IS NOT NULL
            AND ("ra"."id")::text = ANY ("assistance_requests"."assigned_agency_ids")
          )
        )
    )
  );

CREATE POLICY "ar_loueur_update" ON "public"."assistance_requests"
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM "public"."rental_agencies" "ra"
      WHERE "ra"."owner_id" = "auth"."uid"()
        AND (
          ("ra"."id")::text = "assistance_requests"."assigned_agency_id"
          OR (
            "assistance_requests"."assigned_agency_ids" IS NOT NULL
            AND ("ra"."id")::text = ANY ("assistance_requests"."assigned_agency_ids")
          )
        )
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM "public"."rental_agencies" "ra"
      WHERE "ra"."owner_id" = "auth"."uid"()
        AND (
          ("ra"."id")::text = "assistance_requests"."assigned_agency_id"
          OR (
            "assistance_requests"."assigned_agency_ids" IS NOT NULL
            AND ("ra"."id")::text = ANY ("assistance_requests"."assigned_agency_ids")
          )
        )
    )
  );
