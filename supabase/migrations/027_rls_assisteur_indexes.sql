-- Index de performance pour les policies RLS assisteur sur assistance_requests.
-- Ces colonnes sont filtrées par TOUTES les policies ar_assisteur_* mais n'avaient
-- pas d'index (une FK ne crée pas d'index en Postgres) → seq scan à l'échelle.
--   - org_id            : superviseur/admin voient toute l'org (org_id = get_user_org_id())
--   - created_by_user_id: le charge_assistance ne voit que ses dossiers
-- Le côté loueur est déjà couvert (owner_id, assigned_agency_id btree, assigned_agency_ids GIN).
-- Idempotent. Table petite au lancement → CREATE INDEX simple suffit (pas besoin de
-- CONCURRENTLY ; à envisager si la table devient volumineuse et écrite en continu).
CREATE INDEX IF NOT EXISTS "idx_assistance_requests_org_id"
  ON "public"."assistance_requests" ("org_id");

CREATE INDEX IF NOT EXISTS "idx_assistance_requests_created_by_user_id"
  ON "public"."assistance_requests" ("created_by_user_id");
