-- Versionne le trigger qui invoque handle_new_user (gate invite-only de la
-- migration 023). Jusqu'ici ce trigger n'existait dans AUCUNE migration : il
-- était appliqué manuellement en prod (APPLY_IN_SUPABASE_SQL_EDITOR.sql). Une
-- reconstruction depuis les migrations n'avait donc ni le gate ni la création
-- automatique de profils à l'invitation. On le rend reproductible et versionné.
--
-- Idempotent. Le seed local charge avec session_replication_role=replica, donc
-- ce trigger ne se déclenche pas pendant le seed (pas de conflit de PK profiles).
DROP TRIGGER IF EXISTS "on_auth_user_created" ON "auth"."users";
CREATE TRIGGER "on_auth_user_created"
  AFTER INSERT ON "auth"."users"
  FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user"();
