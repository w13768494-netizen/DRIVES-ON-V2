-- ============================================================
-- DRIVES ON — Migration 004 : request_documents → Supabase Storage
-- Prérequis : APPLY_IN_SUPABASE_SQL_EDITOR.sql exécuté
-- Table request_documents déjà présente avec colonnes :
--   id, request_id, type, owner, file_name, url
-- Cette migration AJOUTE les colonnes Storage sans toucher l'existant.
-- ============================================================


-- ── 1. Bucket Supabase Storage ────────────────────────────────────────────────
-- Bucket privé : aucun accès public direct.
-- Tout accès (upload, download, delete) passe par les routes API serveur
-- avec la clé service_role → RLS Storage non requise.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'request-documents',
  'request-documents',
  false,                          -- bucket privé
  10485760,                       -- 10 Mo max par fichier
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/heic',
    'image/heif'
  ]
)
ON CONFLICT (id) DO NOTHING;     -- idempotent : aucune erreur si déjà créé


-- ── 2. Nouvelles colonnes sur request_documents ───────────────────────────────
-- Toutes ajoutées avec IF NOT EXISTS → idempotent.
-- Les colonnes existantes (id, request_id, type, owner, file_name, url)
-- ne sont PAS modifiées.

ALTER TABLE public.request_documents
  ADD COLUMN IF NOT EXISTS storage_path        text,
  ADD COLUMN IF NOT EXISTS mime_type           text,
  ADD COLUMN IF NOT EXISTS size_bytes          bigint,
  ADD COLUMN IF NOT EXISTS comment             text,
  ADD COLUMN IF NOT EXISTS uploaded_by_user_id text,
  ADD COLUMN IF NOT EXISTS created_at          timestamptz DEFAULT now();

-- Note : storage_path et url sont mutuellement exclusifs.
--   • url          → document hébergé en externe (lien fourni par l'utilisateur)
--   • storage_path → fichier uploadé dans le bucket "request-documents"
-- La validation est assurée par l'API (route /api/documents/upload).
-- Pas de CHECK constraint pour éviter tout conflit avec des lignes existantes.


-- ── 3. Index ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_rd_request_id
  ON public.request_documents (request_id);

CREATE INDEX IF NOT EXISTS idx_rd_uploader
  ON public.request_documents (uploaded_by_user_id);

CREATE INDEX IF NOT EXISTS idx_rd_created_at
  ON public.request_documents (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rd_type
  ON public.request_documents (type);


-- ── 4. RLS — réécriture complète de request_documents ────────────────────────
-- Supprime toutes les policies existantes avant de les recréer.
-- Ordre : admin > assisteur > loueur (du plus au moins permissif).

DROP POLICY IF EXISTS "rd_owner_all"        ON public.request_documents;
DROP POLICY IF EXISTS "rd_assisteur_all"    ON public.request_documents;
DROP POLICY IF EXISTS "rd_assisteur_select" ON public.request_documents;
DROP POLICY IF EXISTS "rd_loueur_select"    ON public.request_documents;
DROP POLICY IF EXISTS "rd_loueur_all"       ON public.request_documents;
DROP POLICY IF EXISTS "rd_loueur_insert"    ON public.request_documents;
DROP POLICY IF EXISTS "rd_loueur_delete"    ON public.request_documents;
DROP POLICY IF EXISTS "rd_parties_select"   ON public.request_documents;
DROP POLICY IF EXISTS "rd_admin_all"        ON public.request_documents;

-- Admin : accès total (toutes opérations, toutes lignes)
CREATE POLICY "rd_admin_all"
  ON public.request_documents FOR ALL
  USING     (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- Assisteur : accès complet aux documents de SES propres demandes uniquement
-- (SELECT + INSERT + UPDATE + DELETE)
-- Jointure sur assistance_requests.created_by_user_id pour isoler le périmètre.
CREATE POLICY "rd_assisteur_all"
  ON public.request_documents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.assistance_requests ar
      WHERE ar.id::text = request_id
        AND auth.uid()::text = ar.created_by_user_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assistance_requests ar
      WHERE ar.id::text = request_id
        AND auth.uid()::text = ar.created_by_user_id
    )
  );

-- Loueur — SELECT : lit les documents des demandes assignées à ses agences.
--
-- Chaîne de vérification :
--   request_documents.request_id
--     → assistance_requests.assigned_agency_id / assigned_agency_ids
--     → rental_agencies.id  (UUID réel)
--        ou rental_agencies.external_id (bridge IDs mock type 'ag-001')
--     → rental_agencies.owner_id = auth.uid()
--
-- Ainsi un loueur ne voit que les documents des dossiers où l'une
-- de ses agences a été contactée ou assignée.
CREATE POLICY "rd_loueur_select"
  ON public.request_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM   public.assistance_requests ar
      JOIN   public.rental_agencies     ra ON (
                 ra.id::text       = ar.assigned_agency_id
              OR ra.id::text       = ANY(ar.assigned_agency_ids)
              OR ra.external_id    = ar.assigned_agency_id
              OR ra.external_id    = ANY(ar.assigned_agency_ids)
             )
      WHERE  ar.id::text   = request_id
      AND    ra.owner_id   = auth.uid()
    )
  );

-- Loueur — INSERT : peut uploader uniquement sur une demande assignée à ses agences.
-- owner = 'loueur' : un loueur ne peut pas uploader des docs côté assisteur.
CREATE POLICY "rd_loueur_insert"
  ON public.request_documents FOR INSERT
  WITH CHECK (
    owner = 'loueur'
    AND EXISTS (
      SELECT 1
      FROM   public.assistance_requests ar
      JOIN   public.rental_agencies     ra ON (
                 ra.id::text       = ar.assigned_agency_id
              OR ra.id::text       = ANY(ar.assigned_agency_ids)
              OR ra.external_id    = ar.assigned_agency_id
              OR ra.external_id    = ANY(ar.assigned_agency_ids)
             )
      WHERE  ar.id::text   = request_id
      AND    ra.owner_id   = auth.uid()
    )
  );

-- Loueur — DELETE : peut supprimer uniquement les documents qu'il a lui-même
-- uploadés (uploaded_by_user_id) ET sur une demande assignée à ses agences.
-- Double vérification : propriété du doc + périmètre de la demande.
CREATE POLICY "rd_loueur_delete"
  ON public.request_documents FOR DELETE
  USING (
    auth.uid()::text = uploaded_by_user_id
    AND EXISTS (
      SELECT 1
      FROM   public.assistance_requests ar
      JOIN   public.rental_agencies     ra ON (
                 ra.id::text       = ar.assigned_agency_id
              OR ra.id::text       = ANY(ar.assigned_agency_ids)
              OR ra.external_id    = ar.assigned_agency_id
              OR ra.external_id    = ANY(ar.assigned_agency_ids)
             )
      WHERE  ar.id::text   = request_id
      AND    ra.owner_id   = auth.uid()
    )
  );


-- ── 5. Documentation ─────────────────────────────────────────────────────────

COMMENT ON TABLE public.request_documents IS
  'Documents attachés aux demandes d''assistance. '
  'Fichiers binaires stockés dans le bucket Supabase Storage "request-documents". '
  'Chemin Storage : {request_id}/{unix_timestamp_ms}-{filename}. '
  'Colonne storage_path : chemin interne Storage (fichier uploadé via API). '
  'Colonne url : lien externe alternatif (pas de fichier stocké). '
  'RLS loueur : accès restreint aux demandes où une de ses agences (rental_agencies) est assignée. '
  'Les deux colonnes storage_path/url sont mutuellement exclusives — validé par l''API route.';

COMMENT ON COLUMN public.request_documents.storage_path IS
  'Chemin dans le bucket "request-documents". Format: {request_id}/{timestamp}-{filename}. '
  'NULL si le document est un lien externe (url non null).';

COMMENT ON COLUMN public.request_documents.url IS
  'URL externe optionnelle (document hébergé ailleurs). '
  'NULL si le document est uploadé dans Storage (storage_path non null).';

COMMENT ON COLUMN public.request_documents.uploaded_by_user_id IS
  'auth.uid()::text de l''utilisateur qui a uploadé le document. '
  'Utilisé pour la RLS loueur delete et la traçabilité.';
