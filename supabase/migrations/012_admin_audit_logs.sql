-- ── 012 — Admin audit logs ───────────────────────────────────────────────────
-- Journal immuable de toutes les actions admin sensibles.
-- Règle : pas d'UPDATE, pas de DELETE — ni admin ni service role ne doit purger.
-- Les politiques RLS n'autorisent que SELECT + INSERT pour les admins.

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   timestamptz NOT NULL    DEFAULT now(),
  admin_id     uuid        NOT NULL,   -- profiles.id de l'admin auteur
  action       text        NOT NULL,   -- 'note_saved' | 'flags_updated' | ...
  target_type  text        NOT NULL,   -- 'request' | 'user' | 'agency' | 'access_request'
  target_id    text        NOT NULL,   -- ID de l'entité affectée
  before_json  jsonb,                  -- état avant l'action (null pour création)
  after_json   jsonb,                  -- état après l'action (null pour suppression)
  metadata     jsonb                   -- contexte libre (reason, session…)
);

-- Lookup : tous les logs d'une entité donnée
CREATE INDEX IF NOT EXISTS admin_audit_logs_target_idx
  ON admin_audit_logs (target_type, target_id);

-- Lookup : toutes les actions d'un admin donné
CREATE INDEX IF NOT EXISTS admin_audit_logs_admin_idx
  ON admin_audit_logs (admin_id);

-- Tri chronologique inverse (requête la plus fréquente)
CREATE INDEX IF NOT EXISTS admin_audit_logs_created_at_idx
  ON admin_audit_logs (created_at DESC);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- SELECT : admins uniquement
CREATE POLICY "admin_audit_logs_select" ON admin_audit_logs
  FOR SELECT TO authenticated
  USING (public.get_user_role() = 'admin');

-- INSERT : admins uniquement + admin_id doit correspondre à l'utilisateur connecté
-- (empêche l'usurpation d'identité dans les logs)
CREATE POLICY "admin_audit_logs_insert" ON admin_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_role() = 'admin'
    AND admin_id = auth.uid()
  );

-- Pas de politique UPDATE → UPDATE bloqué pour tout le monde
-- Pas de politique DELETE → DELETE bloqué pour tout le monde
