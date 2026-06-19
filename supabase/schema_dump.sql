


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."user_role" AS ENUM (
    'assisteur',
    'loueur',
    'admin'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_role"() RETURNS "public"."user_role"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
  $$;


ALTER FUNCTION "public"."get_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_role_escalation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role AND auth.uid() IS NOT NULL THEN
      RAISE EXCEPTION 'Modification du rôle interdite. Contactez un administrateur.';
    END IF;
    RETURN NEW;
  END;
  $$;


ALTER FUNCTION "public"."prevent_role_escalation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
  BEGIN NEW.updated_at = now(); RETURN NEW; END;
  $$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_profiles_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
  BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
  $$;


ALTER FUNCTION "public"."touch_profiles_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."access_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text" NOT NULL,
    "company_name" "text",
    "role" "public"."user_role" NOT NULL,
    "phone" "text",
    "message" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "account_type" "text",
    "contact_function" "text",
    "siret" "text",
    "address" "text",
    "city" "text",
    "postal_code" "text",
    "intervention_zone" "text",
    "monthly_requests_estimate" integer,
    "extra_fields" "jsonb",
    CONSTRAINT "access_requests_account_type_check" CHECK (("account_type" = ANY (ARRAY['assistance'::"text", 'insurance_agent'::"text", 'garage'::"text"]))),
    CONSTRAINT "access_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."access_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "admin_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "target_type" "text" NOT NULL,
    "target_id" "text" NOT NULL,
    "before_json" "jsonb",
    "after_json" "jsonb",
    "metadata" "jsonb"
);


ALTER TABLE "public"."admin_audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agency_services" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agency_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "label" "text",
    "available" boolean DEFAULT true NOT NULL,
    "price_type" "text" DEFAULT 'inclus'::"text" NOT NULL,
    "price" numeric(10,2),
    "comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."agency_services" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agency_vehicle_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agency_id" "uuid" NOT NULL,
    "category" "text" NOT NULL,
    "group_type" "text" NOT NULL,
    "available" boolean DEFAULT true NOT NULL,
    "stock_estimate" integer DEFAULT 0 NOT NULL,
    "daily_rate" numeric(10,2) DEFAULT 0 NOT NULL,
    "deposit" numeric(10,2) DEFAULT 0 NOT NULL,
    "included_km_per_day" integer DEFAULT 0 NOT NULL,
    "extra_km_price" numeric(10,2) DEFAULT 0 NOT NULL,
    "packages" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "modele_equivalent" "text",
    "tarif_1_4" numeric,
    "tarif_5_7" numeric,
    "tarif_8_14" numeric,
    "tarif_15_21" numeric,
    "tarif_22_29" numeric,
    "forfait_30_jours" numeric,
    "actif" boolean DEFAULT true NOT NULL,
    "fuel_type" "text",
    "transmission" "text",
    "stock_live" integer
);


ALTER TABLE "public"."agency_vehicle_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assistance_requests" (
    "id" "text" NOT NULL,
    "status" "text" DEFAULT 'envoyee'::"text" NOT NULL,
    "request_type" "text" DEFAULT 'immediate'::"text" NOT NULL,
    "dossier_number" "text" NOT NULL,
    "reference_number" "text",
    "sinistre" "jsonb" NOT NULL,
    "location" "jsonb" NOT NULL,
    "coverage" "jsonb" NOT NULL,
    "loueur_response" "jsonb",
    "transfers" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "timeline" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "extensions" "jsonb",
    "vehicle_group" "text",
    "vehicle_category" "text" NOT NULL,
    "duration_days" integer NOT NULL,
    "max_extension_days" integer,
    "date_needed" timestamp with time zone NOT NULL,
    "target_price_per_day" numeric,
    "notes" "text",
    "requested_services" "text"[] DEFAULT '{}'::"text"[],
    "assigned_agency_id" "text",
    "assigned_agency_ids" "text"[],
    "confirmed_agency_id" "text",
    "confirmed_agency_name" "text",
    "counter_offer_price" numeric,
    "counter_offer_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "confirmed_at" timestamp with time zone,
    "returned_at" timestamp with time zone,
    "created_by_user_id" "text",
    "created_by_name" "text",
    "coverage_type" "text" DEFAULT 'none'::"text",
    "requester_account_type" "text",
    "admin_notes" "text",
    "admin_flags" "text"[] DEFAULT '{}'::"text"[],
    "admin_updated_at" timestamp with time zone,
    "admin_updated_by" "text",
    "confirmed_price_per_day" numeric(10,2),
    "confirmed_duration_days" integer,
    "commission_rate" numeric(5,4) DEFAULT 0.15 NOT NULL,
    "commission_amount" numeric(10,2),
    "total_amount_ht" numeric(10,2),
    "amount_due_to_loueur" numeric(10,2),
    "payment_status" "text" DEFAULT 'non_applicable'::"text" NOT NULL,
    "payment_validated_at" timestamp with time zone,
    "payment_validated_by" "uuid",
    "city_id" "text",
    "has_damage_claim" boolean DEFAULT false NOT NULL,
    "overdue_at" timestamp with time zone,
    "damage_description" "text",
    CONSTRAINT "assistance_requests_coverage_type_check" CHECK (("coverage_type" = ANY (ARRAY['none'::"text", 'partial'::"text", 'full'::"text"]))),
    CONSTRAINT "chk_payment_status" CHECK (("payment_status" = ANY (ARRAY['non_applicable'::"text", 'en_attente'::"text", 'pret_a_payer'::"text", 'paye'::"text", 'litigieux'::"text"])))
);


ALTER TABLE "public"."assistance_requests" OWNER TO "postgres";


COMMENT ON COLUMN "public"."assistance_requests"."has_damage_claim" IS 'true quand le loueur a déclaré un sinistre (dégât véhicule) sur ce dossier. Rend etat_depart et etat_retour obligatoires pour la clôture côté assisteur.';



COMMENT ON COLUMN "public"."assistance_requests"."overdue_at" IS 'Timestamp UTC du basculement en statut overdue (détecté par le cron check-overdue). NULL si le dossier n''a jamais été overdue.';



COMMENT ON COLUMN "public"."assistance_requests"."damage_description" IS 'Description libre du sinistre saisie par le loueur lors de la déclaration de dégât. Renseigné uniquement quand has_damage_claim = true.';



CREATE TABLE IF NOT EXISTS "public"."deployment_cities" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "department" "text" NOT NULL,
    "department_code" "text" NOT NULL,
    "region" "text" NOT NULL,
    "status" "text" DEFAULT 'planned'::"text" NOT NULL,
    "latitude" double precision NOT NULL,
    "longitude" double precision NOT NULL,
    "cover_radius_km" integer DEFAULT 30 NOT NULL,
    "vehicle_types" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "loueur_count" integer DEFAULT 0 NOT NULL,
    "activated_at" timestamp with time zone,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "deployment_cities_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'deploying'::"text", 'planned'::"text", 'inactive'::"text"])))
);


ALTER TABLE "public"."deployment_cities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "text" DEFAULT "gen_random_uuid"() NOT NULL,
    "agency_id" "text",
    "type" "text" DEFAULT 'new_request'::"text" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "request_id" "text",
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid",
    "read" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


COMMENT ON COLUMN "public"."notifications"."agency_id" IS 'NULL pour les notifications adressées aux partenaires (assisteurs, assureurs, garages) qui n''ont pas d''agence de location.';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "role" "public"."user_role" NOT NULL,
    "full_name" "text" NOT NULL,
    "company_name" "text",
    "phone" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true NOT NULL,
    "account_type" "text",
    CONSTRAINT "profiles_account_type_check" CHECK (("account_type" = ANY (ARRAY['assistance'::"text", 'insurance_agent'::"text", 'garage'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rental_agencies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "company_name" "text",
    "agency_name" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "address" "text",
    "city" "text",
    "postal_code" "text",
    "lat" double precision,
    "lng" double precision,
    "service_radius_km" integer,
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "contact_name" "text",
    "is_available" boolean DEFAULT true NOT NULL,
    "opening_hours_weekdays" "text",
    "opening_hours_saturday" "text",
    "opening_hours_sunday" "text",
    "external_id" "text",
    "score_total" integer,
    "score_reactivity" integer,
    "score_response_rate" integer,
    "score_reliability" integer,
    "total_received" integer,
    "total_confirmed" integer,
    "avg_response_min" numeric(6,1),
    "score_updated_at" timestamp with time zone
);


ALTER TABLE "public"."rental_agencies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rental_responses" (
    "id" "text" NOT NULL,
    "request_id" "text" NOT NULL,
    "agency_id" "text" NOT NULL,
    "status" "text" DEFAULT 'en_attente'::"text" NOT NULL,
    "price_per_day" numeric,
    "vehicle_model" "text",
    "message" "text",
    "counter_price" numeric,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "responded_at" timestamp with time zone
);


ALTER TABLE "public"."rental_responses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."request_documents" (
    "id" "text" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "text" NOT NULL,
    "type" "text" NOT NULL,
    "owner" "text" NOT NULL,
    "file_name" "text",
    "url" "text",
    "data_url" "text",
    "comment" "text",
    "size_kb" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "storage_path" "text",
    "mime_type" "text",
    "size_bytes" bigint,
    "uploaded_by_user_id" "text"
);


ALTER TABLE "public"."request_documents" OWNER TO "postgres";


ALTER TABLE ONLY "public"."access_requests"
    ADD CONSTRAINT "access_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_audit_logs"
    ADD CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agency_services"
    ADD CONSTRAINT "agency_services_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agency_vehicle_categories"
    ADD CONSTRAINT "agency_vehicle_categories_agency_id_category_key" UNIQUE ("agency_id", "category");



ALTER TABLE ONLY "public"."agency_vehicle_categories"
    ADD CONSTRAINT "agency_vehicle_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assistance_requests"
    ADD CONSTRAINT "assistance_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."deployment_cities"
    ADD CONSTRAINT "deployment_cities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."deployment_cities"
    ADD CONSTRAINT "deployment_cities_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rental_agencies"
    ADD CONSTRAINT "rental_agencies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rental_responses"
    ADD CONSTRAINT "rental_responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rental_responses"
    ADD CONSTRAINT "rental_responses_request_id_agency_id_key" UNIQUE ("request_id", "agency_id");



ALTER TABLE ONLY "public"."request_documents"
    ADD CONSTRAINT "request_documents_pkey" PRIMARY KEY ("id");



CREATE INDEX "admin_audit_logs_admin_idx" ON "public"."admin_audit_logs" USING "btree" ("admin_id");



CREATE INDEX "admin_audit_logs_created_at_idx" ON "public"."admin_audit_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "admin_audit_logs_target_idx" ON "public"."admin_audit_logs" USING "btree" ("target_type", "target_id");



CREATE INDEX "assistance_requests_assigned_agency_id_idx" ON "public"."assistance_requests" USING "btree" ("assigned_agency_id");



CREATE INDEX "assistance_requests_assigned_agency_ids_idx" ON "public"."assistance_requests" USING "gin" ("assigned_agency_ids");



CREATE INDEX "assistance_requests_created_at_idx" ON "public"."assistance_requests" USING "btree" ("created_at" DESC);



CREATE INDEX "assistance_requests_status_idx" ON "public"."assistance_requests" USING "btree" ("status");



CREATE INDEX "idx_assistance_requests_city_id" ON "public"."assistance_requests" USING "btree" ("city_id");



CREATE INDEX "idx_notif_agency" ON "public"."notifications" USING "btree" ("agency_id") WHERE ("agency_id" IS NOT NULL);



CREATE INDEX "idx_rental_agencies_owner" ON "public"."rental_agencies" USING "btree" ("owner_id");



CREATE INDEX "notifications_agency_id_read_at_idx" ON "public"."notifications" USING "btree" ("agency_id", "read_at");



CREATE INDEX "notifications_created_at_idx" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE UNIQUE INDEX "rental_agencies_external_id_key" ON "public"."rental_agencies" USING "btree" ("external_id") WHERE ("external_id" IS NOT NULL);



CREATE INDEX "rental_responses_request_id_idx" ON "public"."rental_responses" USING "btree" ("request_id");



CREATE INDEX "request_documents_request_id_idx" ON "public"."request_documents" USING "btree" ("request_id");



CREATE UNIQUE INDEX "uq_avc_variant" ON "public"."agency_vehicle_categories" USING "btree" ("agency_id", "category", "fuel_type", "transmission") NULLS NOT DISTINCT;



CREATE OR REPLACE TRIGGER "deployment_cities_updated_at" BEFORE UPDATE ON "public"."deployment_cities" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_prevent_role_escalation" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_role_escalation"();



CREATE OR REPLACE TRIGGER "trg_profiles_updated" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."touch_profiles_updated_at"();



ALTER TABLE ONLY "public"."access_requests"
    ADD CONSTRAINT "access_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."agency_services"
    ADD CONSTRAINT "agency_services_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "public"."rental_agencies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agency_vehicle_categories"
    ADD CONSTRAINT "agency_vehicle_categories_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "public"."rental_agencies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assistance_requests"
    ADD CONSTRAINT "assistance_requests_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "public"."deployment_cities"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."assistance_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rental_agencies"
    ADD CONSTRAINT "rental_agencies_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rental_responses"
    ADD CONSTRAINT "rental_responses_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."assistance_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."request_documents"
    ADD CONSTRAINT "request_documents_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."assistance_requests"("id") ON DELETE CASCADE;



CREATE POLICY "access_req_admin_all" ON "public"."access_requests" USING (("public"."get_user_role"() = 'admin'::"public"."user_role"));



CREATE POLICY "access_req_public_insert" ON "public"."access_requests" FOR INSERT WITH CHECK (true);



ALTER TABLE "public"."access_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_all_notifications" ON "public"."notifications" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "admin_all_requests" ON "public"."assistance_requests" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



ALTER TABLE "public"."admin_audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_audit_logs_insert" ON "public"."admin_audit_logs" FOR INSERT TO "authenticated" WITH CHECK ((("public"."get_user_role"() = 'admin'::"public"."user_role") AND ("admin_id" = "auth"."uid"())));



CREATE POLICY "admin_audit_logs_select" ON "public"."admin_audit_logs" FOR SELECT TO "authenticated" USING (("public"."get_user_role"() = 'admin'::"public"."user_role"));



ALTER TABLE "public"."agency_services" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "agency_services_owner_all" ON "public"."agency_services" USING ((EXISTS ( SELECT 1
   FROM "public"."rental_agencies" "a"
  WHERE (("a"."id" = "agency_services"."agency_id") AND ("a"."owner_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."rental_agencies" "a"
  WHERE (("a"."id" = "agency_services"."agency_id") AND ("a"."owner_id" = "auth"."uid"())))));



ALTER TABLE "public"."agency_vehicle_categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "agency_vehicle_categories_owner_all" ON "public"."agency_vehicle_categories" USING ((EXISTS ( SELECT 1
   FROM "public"."rental_agencies" "a"
  WHERE (("a"."id" = "agency_vehicle_categories"."agency_id") AND ("a"."owner_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."rental_agencies" "a"
  WHERE (("a"."id" = "agency_vehicle_categories"."agency_id") AND ("a"."owner_id" = "auth"."uid"())))));



CREATE POLICY "ar_admin_all" ON "public"."assistance_requests" USING (("public"."get_user_role"() = 'admin'::"public"."user_role"));



CREATE POLICY "ar_assisteur_delete" ON "public"."assistance_requests" FOR DELETE USING (((("auth"."uid"())::"text" = "created_by_user_id") AND ("public"."get_user_role"() = 'assisteur'::"public"."user_role") AND ("status" = ANY (ARRAY['brouillon'::"text", 'envoyee'::"text"]))));



CREATE POLICY "ar_assisteur_insert" ON "public"."assistance_requests" FOR INSERT WITH CHECK (((("auth"."uid"())::"text" = "created_by_user_id") AND ("public"."get_user_role"() = 'assisteur'::"public"."user_role")));



CREATE POLICY "ar_assisteur_select" ON "public"."assistance_requests" FOR SELECT USING (((("auth"."uid"())::"text" = "created_by_user_id") AND ("public"."get_user_role"() = 'assisteur'::"public"."user_role")));



CREATE POLICY "ar_assisteur_update" ON "public"."assistance_requests" FOR UPDATE USING (((("auth"."uid"())::"text" = "created_by_user_id") AND ("public"."get_user_role"() = 'assisteur'::"public"."user_role"))) WITH CHECK (((("auth"."uid"())::"text" = "created_by_user_id") AND ("public"."get_user_role"() = 'assisteur'::"public"."user_role")));



CREATE POLICY "ar_loueur_select" ON "public"."assistance_requests" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."rental_agencies" "ra"
  WHERE (("ra"."owner_id" = "auth"."uid"()) AND ((("ra"."id")::"text" = "assistance_requests"."assigned_agency_id") OR (("assistance_requests"."assigned_agency_ids" IS NOT NULL) AND (("ra"."id")::"text" = ANY ("assistance_requests"."assigned_agency_ids"))) OR (("ra"."external_id" IS NOT NULL) AND ("ra"."external_id" = "assistance_requests"."assigned_agency_id")) OR (("ra"."external_id" IS NOT NULL) AND ("assistance_requests"."assigned_agency_ids" IS NOT NULL) AND ("ra"."external_id" = ANY ("assistance_requests"."assigned_agency_ids"))))))));



CREATE POLICY "ar_loueur_update" ON "public"."assistance_requests" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."rental_agencies" "ra"
  WHERE (("ra"."owner_id" = "auth"."uid"()) AND ((("ra"."id")::"text" = "assistance_requests"."assigned_agency_id") OR (("assistance_requests"."assigned_agency_ids" IS NOT NULL) AND (("ra"."id")::"text" = ANY ("assistance_requests"."assigned_agency_ids"))) OR (("ra"."external_id" IS NOT NULL) AND ("ra"."external_id" = "assistance_requests"."assigned_agency_id")) OR (("ra"."external_id" IS NOT NULL) AND ("assistance_requests"."assigned_agency_ids" IS NOT NULL) AND ("ra"."external_id" = ANY ("assistance_requests"."assigned_agency_ids")))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."rental_agencies" "ra"
  WHERE (("ra"."owner_id" = "auth"."uid"()) AND ((("ra"."id")::"text" = "assistance_requests"."assigned_agency_id") OR (("assistance_requests"."assigned_agency_ids" IS NOT NULL) AND (("ra"."id")::"text" = ANY ("assistance_requests"."assigned_agency_ids"))) OR (("ra"."external_id" IS NOT NULL) AND ("ra"."external_id" = "assistance_requests"."assigned_agency_id")) OR (("ra"."external_id" IS NOT NULL) AND ("assistance_requests"."assigned_agency_ids" IS NOT NULL) AND ("ra"."external_id" = ANY ("assistance_requests"."assigned_agency_ids"))))))));



ALTER TABLE "public"."assistance_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "assisteur_own_requests" ON "public"."assistance_requests" TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'assisteur'::"public"."user_role")))) AND ("created_by_user_id" = ("auth"."uid"())::"text"))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'assisteur'::"public"."user_role")))) AND ("created_by_user_id" = ("auth"."uid"())::"text")));



CREATE POLICY "assisteur_read_active_agencies" ON "public"."rental_agencies" FOR SELECT TO "authenticated" USING ((("active" = true) AND ("is_available" = true) AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['assisteur'::"public"."user_role", 'admin'::"public"."user_role"])))))));



CREATE POLICY "assisteur_read_active_categories" ON "public"."agency_vehicle_categories" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['assisteur'::"public"."user_role", 'admin'::"public"."user_role"]))))) AND (EXISTS ( SELECT 1
   FROM "public"."rental_agencies" "ra"
  WHERE (("ra"."id" = "agency_vehicle_categories"."agency_id") AND ("ra"."active" = true) AND ("ra"."is_available" = true))))));



ALTER TABLE "public"."deployment_cities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "loueur_own_notifications" ON "public"."notifications" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "loueur_read_assigned_requests" ON "public"."assistance_requests" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."rental_agencies" "ra"
  WHERE (("ra"."owner_id" = "auth"."uid"()) AND ("ra"."active" = true) AND ((("ra"."id")::"text" = ANY ("assistance_requests"."assigned_agency_ids")) OR (("ra"."external_id" IS NOT NULL) AND ("ra"."external_id" = ANY ("assistance_requests"."assigned_agency_ids"))) OR (("ra"."id")::"text" = "assistance_requests"."assigned_agency_id") OR (("ra"."external_id" IS NOT NULL) AND ("ra"."external_id" = "assistance_requests"."assigned_agency_id")))))));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_insert_own" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "profiles_select_admin" ON "public"."profiles" FOR SELECT USING (("public"."get_user_role"() = 'admin'::"public"."user_role"));



CREATE POLICY "profiles_select_loueurs_for_matching" ON "public"."profiles" FOR SELECT USING ((("role" = 'loueur'::"public"."user_role") AND ("public"."get_user_role"() = ANY (ARRAY['assisteur'::"public"."user_role", 'admin'::"public"."user_role"]))));



CREATE POLICY "profiles_select_own" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "public_all" ON "public"."request_documents" USING (true) WITH CHECK (true);



CREATE POLICY "rd_admin_all" ON "public"."request_documents" USING (("public"."get_user_role"() = 'admin'::"public"."user_role"));



CREATE POLICY "rd_assisteur_all" ON "public"."request_documents" USING ((EXISTS ( SELECT 1
   FROM "public"."assistance_requests" "ar"
  WHERE (("ar"."id" = "request_documents"."request_id") AND (("auth"."uid"())::"text" = "ar"."created_by_user_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."assistance_requests" "ar"
  WHERE (("ar"."id" = "request_documents"."request_id") AND (("auth"."uid"())::"text" = "ar"."created_by_user_id")))));



CREATE POLICY "rd_loueur_select" ON "public"."request_documents" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."assistance_requests" "ar"
  WHERE (("ar"."id" = "request_documents"."request_id") AND (EXISTS ( SELECT 1
           FROM "public"."rental_agencies" "ra"
          WHERE (("ra"."owner_id" = "auth"."uid"()) AND ((("ra"."id")::"text" = "ar"."assigned_agency_id") OR (("ar"."assigned_agency_ids" IS NOT NULL) AND (("ra"."id")::"text" = ANY ("ar"."assigned_agency_ids"))) OR (("ra"."external_id" IS NOT NULL) AND ("ra"."external_id" = "ar"."assigned_agency_id")) OR (("ra"."external_id" IS NOT NULL) AND ("ar"."assigned_agency_ids" IS NOT NULL) AND ("ra"."external_id" = ANY ("ar"."assigned_agency_ids")))))))))));



CREATE POLICY "read_all" ON "public"."deployment_cities" FOR SELECT USING (true);



ALTER TABLE "public"."rental_agencies" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rental_agencies_admin_all" ON "public"."rental_agencies" USING (("public"."get_user_role"() = 'admin'::"public"."user_role"));



CREATE POLICY "rental_agencies_owner_all" ON "public"."rental_agencies" USING (("owner_id" = "auth"."uid"())) WITH CHECK (("owner_id" = "auth"."uid"()));



ALTER TABLE "public"."rental_responses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."request_documents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rr_admin_all" ON "public"."rental_responses" USING (("public"."get_user_role"() = 'admin'::"public"."user_role"));



CREATE POLICY "rr_assisteur_select" ON "public"."rental_responses" FOR SELECT USING ((("public"."get_user_role"() = 'assisteur'::"public"."user_role") AND (EXISTS ( SELECT 1
   FROM "public"."assistance_requests" "ar"
  WHERE (("ar"."id" = "rental_responses"."request_id") AND (("auth"."uid"())::"text" = "ar"."created_by_user_id"))))));



CREATE POLICY "rr_loueur_all" ON "public"."rental_responses" USING (("public"."get_user_role"() = 'loueur'::"public"."user_role")) WITH CHECK (("public"."get_user_role"() = 'loueur'::"public"."user_role"));



CREATE POLICY "write_service_role" ON "public"."deployment_cities" USING (("auth"."role"() = 'service_role'::"text"));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."get_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_role_escalation"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_role_escalation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_role_escalation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_profiles_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."touch_profiles_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_profiles_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."access_requests" TO "anon";
GRANT ALL ON TABLE "public"."access_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."access_requests" TO "service_role";



GRANT ALL ON TABLE "public"."admin_audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."admin_audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."agency_services" TO "anon";
GRANT ALL ON TABLE "public"."agency_services" TO "authenticated";
GRANT ALL ON TABLE "public"."agency_services" TO "service_role";



GRANT ALL ON TABLE "public"."agency_vehicle_categories" TO "anon";
GRANT ALL ON TABLE "public"."agency_vehicle_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."agency_vehicle_categories" TO "service_role";



GRANT ALL ON TABLE "public"."assistance_requests" TO "anon";
GRANT ALL ON TABLE "public"."assistance_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."assistance_requests" TO "service_role";



GRANT ALL ON TABLE "public"."deployment_cities" TO "anon";
GRANT ALL ON TABLE "public"."deployment_cities" TO "authenticated";
GRANT ALL ON TABLE "public"."deployment_cities" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."rental_agencies" TO "anon";
GRANT ALL ON TABLE "public"."rental_agencies" TO "authenticated";
GRANT ALL ON TABLE "public"."rental_agencies" TO "service_role";



GRANT ALL ON TABLE "public"."rental_responses" TO "anon";
GRANT ALL ON TABLE "public"."rental_responses" TO "authenticated";
GRANT ALL ON TABLE "public"."rental_responses" TO "service_role";



GRANT ALL ON TABLE "public"."request_documents" TO "anon";
GRANT ALL ON TABLE "public"."request_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."request_documents" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































