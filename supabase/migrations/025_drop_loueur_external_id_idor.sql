-- IDOR résiduel : la policy jumelle `loueur_read_assigned_requests` contenait
-- encore les branches `external_id` (un loueur peut fixer ra.external_id =
-- assigned_agency_id d'une demande tierce pour la lire). Le correctif #021 avait
-- retiré ces branches de `ar_loueur_select`/`ar_loueur_update`, mais avait manqué
-- cette policy SELECT parallèle → l'IDOR survivait via elle (policies en OR).
--
-- `ar_loueur_select` couvre déjà la lecture légitime (par ra.id, les assignations
-- utilisant des UUID d'agence, jamais external_id). On supprime donc la jumelle
-- vulnérable. Idempotent.
DROP POLICY IF EXISTS "loueur_read_assigned_requests" ON "public"."assistance_requests";
