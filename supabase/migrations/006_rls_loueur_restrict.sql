-- ============================================================
-- DRIVES ON — Migration 006 : RLS loueur — restriction aux demandes assignées
-- Prérequis : migrations 001–005 exécutées
--
-- Problème corrigé :
--   Les policies ar_loueur_select, ar_loueur_update et rd_loueur_select
--   autorisaient tout loueur authentifié à lire/modifier TOUTES les
--   assistance_requests et TOUS les request_documents, sans vérifier
--   que la demande lui était réellement assignée.
--
-- Règle imposée :
--   Un loueur n'accède qu'aux demandes dont une de ses agences
--   (rental_agencies.owner_id = auth.uid()) figure dans :
--     - assigned_agency_id  (texte — 1 agence primaire)
--     - assigned_agency_ids (text[] — liste multi-envoi)
--   Compatibilité hybride UUID / external_id assurée sur les 4 combinaisons.
-- ============================================================

-- ── Index de performance sur rental_agencies.owner_id ─────────────────────────
-- Le EXISTS sous-jacent des trois nouvelles policies joint rental_agencies sur
-- owner_id = auth.uid(). Sans index, chaque évaluation RLS scanne la table.
-- IF NOT EXISTS : idempotent si l'index a déjà été créé manuellement.

CREATE INDEX IF NOT EXISTS idx_rental_agencies_owner
  ON rental_agencies (owner_id);

-- ── 1. ar_loueur_select ───────────────────────────────────────────────────────
-- Avant  : get_user_role() = 'loueur'  (aucun filtre d'agence)
-- Après  : existence d'une agence du loueur dans les champs d'assignation

DROP POLICY IF EXISTS "ar_loueur_select" ON assistance_requests;

CREATE POLICY "ar_loueur_select"
  ON assistance_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM   rental_agencies ra
      WHERE  ra.owner_id = auth.uid()
        AND  (
          -- Cas 1 : UUID Supabase dans assigned_agency_id (champ texte)
          ra.id::text = assigned_agency_id
          -- Cas 2 : UUID Supabase dans assigned_agency_ids (tableau texte)
          OR (
            assigned_agency_ids IS NOT NULL
            AND ra.id::text = ANY(assigned_agency_ids)
          )
          -- Cas 3 : external_id (legacy) dans assigned_agency_id
          OR (
            ra.external_id IS NOT NULL
            AND ra.external_id = assigned_agency_id
          )
          -- Cas 4 : external_id (legacy) dans assigned_agency_ids
          OR (
            ra.external_id IS NOT NULL
            AND assigned_agency_ids IS NOT NULL
            AND ra.external_id = ANY(assigned_agency_ids)
          )
        )
    )
  );

-- ── 2. ar_loueur_update ───────────────────────────────────────────────────────
-- Avant  : get_user_role() = 'loueur'  (aucun filtre d'agence)
-- Après  : même condition que ar_loueur_select.
--
-- USING    : filtre les lignes que le loueur peut cibler (OLD row).
-- WITH CHECK : vérifie que la ligne résultante (NEW row) satisfait toujours
--              la condition. Les loueurs ne modifiant jamais assigned_agency_id /
--              assigned_agency_ids, NEW et OLD passent le même test.

DROP POLICY IF EXISTS "ar_loueur_update" ON assistance_requests;

CREATE POLICY "ar_loueur_update"
  ON assistance_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM   rental_agencies ra
      WHERE  ra.owner_id = auth.uid()
        AND  (
          ra.id::text = assigned_agency_id
          OR (
            assigned_agency_ids IS NOT NULL
            AND ra.id::text = ANY(assigned_agency_ids)
          )
          OR (
            ra.external_id IS NOT NULL
            AND ra.external_id = assigned_agency_id
          )
          OR (
            ra.external_id IS NOT NULL
            AND assigned_agency_ids IS NOT NULL
            AND ra.external_id = ANY(assigned_agency_ids)
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM   rental_agencies ra
      WHERE  ra.owner_id = auth.uid()
        AND  (
          ra.id::text = assigned_agency_id
          OR (
            assigned_agency_ids IS NOT NULL
            AND ra.id::text = ANY(assigned_agency_ids)
          )
          OR (
            ra.external_id IS NOT NULL
            AND ra.external_id = assigned_agency_id
          )
          OR (
            ra.external_id IS NOT NULL
            AND assigned_agency_ids IS NOT NULL
            AND ra.external_id = ANY(assigned_agency_ids)
          )
        )
    )
  );

-- ── 3. rd_loueur_select ───────────────────────────────────────────────────────
-- Avant  : EXISTS (SELECT 1 FROM assistance_requests WHERE id = request_id)
--          → tout loueur lisait tous les documents sans vérification d'agence.
-- Après  : double EXISTS — la demande doit exister ET une agence du loueur
--          doit y être assignée.
--
-- Note : les documents uploadés par le loueur lui-même restent accessibles
-- via la policy rd_owner_all (uploaded_by_user_id = auth.uid()) — non modifiée.

DROP POLICY IF EXISTS "rd_loueur_select" ON request_documents;

CREATE POLICY "rd_loueur_select"
  ON request_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM   assistance_requests ar
      WHERE  ar.id::text = request_id
        AND  EXISTS (
          SELECT 1
          FROM   rental_agencies ra
          WHERE  ra.owner_id = auth.uid()
            AND  (
              ra.id::text = ar.assigned_agency_id
              OR (
                ar.assigned_agency_ids IS NOT NULL
                AND ra.id::text = ANY(ar.assigned_agency_ids)
              )
              OR (
                ra.external_id IS NOT NULL
                AND ra.external_id = ar.assigned_agency_id
              )
              OR (
                ra.external_id IS NOT NULL
                AND ar.assigned_agency_ids IS NOT NULL
                AND ra.external_id = ANY(ar.assigned_agency_ids)
              )
            )
        )
    )
  );

-- ── Vérification finale ───────────────────────────────────────────────────────
-- Après exécution, les policies actives sur assistance_requests pour le rôle
-- loueur doivent être :
--   ar_loueur_select  → SELECT  filtre par agences assignées
--   ar_loueur_update  → UPDATE  filtre par agences assignées (USING + WITH CHECK)
-- Les policies assisteur et admin sont inchangées :
--   ar_assisteur_select, ar_assisteur_insert, ar_assisteur_update,
--   ar_assisteur_delete, ar_admin_all
--
-- Sur request_documents :
--   rd_loueur_select  → SELECT  filtre par agences assignées via AR
--   rd_owner_all, rd_assisteur_select, rd_admin_all  → inchangées
