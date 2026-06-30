# Organisations multi-utilisateurs assisteur — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer la couche localStorage des rôles d'équipe assisteur par un vrai multi-utilisateurs persisté en base (organisations + membres) sécurisé par RLS.

**Architecture:** Table `organizations` + colonnes `org_id`/`team_role` sur `profiles` (1 membre = 1 org). `org_id` dénormalisé sur `assistance_requests` pour une RLS org-scoped simple. Routes API service-role pour la gestion des membres (admin org). Réutilise l'infra d'invitation Supabase existante (`generateLink` + trigger `handle_new_user` + `/auth/set-password`).

**Tech Stack:** Next.js 16 (App Router), Supabase (PostgreSQL + RLS + Auth), TypeScript.

**Spec de référence:** `docs/superpowers/specs/2026-06-29-assistance-organizations-design.md`

## Global Constraints

- `npm run type-check` ET `npm run build` doivent passer après chaque tâche.
- **Pas d'infra de test** dans le projet (décision utilisateur : « process avant tests »). La vérification = type-check + build + requêtes psql ciblées. Les tests RLS automatisés sont reportés.
- `account_type` autorisés : `assistance`, `insurance_agent`, `garage`.
- `team_role` autorisés : `admin`, `superviseur`, `charge_assistance`.
- Clé session localStorage : `driveson:session`. Type session : `AppSession` (`src/types/session.ts`), qui a déjà `companyRole?: AssistanceUserRole` — on le réutilise pour le team_role.
- Les policies **loueur** et **admin** sur `assistance_requests` (patchées au #021) restent strictement inchangées.
- Migration idempotente : `DROP ... IF EXISTS` avant chaque policy/constraint/trigger ; `ADD COLUMN IF NOT EXISTS`. Appliquée local via `supabase db reset`, poussée à la MEP via `supabase db push`.
- URL DB locale : `postgresql://postgres:postgres@127.0.0.1:54322/postgres`.

---

### Task 1 : Migration `023` — schéma, fonctions, backfill, triggers, RLS

**Files:**
- Create: `supabase/migrations/023_assistance_organizations.sql`

**Interfaces:**
- Consumes: fonctions existantes `get_user_role()`, trigger `handle_new_user()`, `prevent_role_escalation()`
- Produces (utilisés par les tâches suivantes) :
  - Table `organizations(id uuid, name text, account_type text, is_active bool, created_at)`
  - `profiles.org_id uuid`, `profiles.team_role text`
  - `assistance_requests.org_id uuid`
  - Fonctions SQL `get_user_org_id() → uuid`, `get_user_team_role() → text`
  - Métadonnées d'invitation reconnues par `handle_new_user` : `org_id`, `team_role`

- [ ] **Step 1 : Créer le fichier de migration**

Créer `supabase/migrations/023_assistance_organizations.sql` avec EXACTEMENT ce contenu :

```sql
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
```

- [ ] **Step 2 : Appliquer la migration**

Run: `supabase db reset`
Expected: migrations 000, 021, 022, 023 appliquées + seed chargé, sans erreur.

- [ ] **Step 3 : Vérifier schéma + backfill**

Run:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "SELECT count(*) AS orgs FROM organizations; SELECT id, org_id, team_role FROM profiles WHERE role='assisteur'; SELECT count(*) AS req_with_org FROM assistance_requests WHERE org_id IS NOT NULL;"
```
Expected : autant d'`organizations` que de profils assisteur ; chaque profil assisteur a un `org_id` non nul + `team_role='admin'` ; au moins les demandes des assisteurs migrés ont un `org_id`.

- [ ] **Step 4 : Vérifier RLS par contexte (chargé vs superviseur)**

Run:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "SELECT proname FROM pg_proc WHERE proname IN ('get_user_org_id','get_user_team_role');"
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "SELECT polname FROM pg_policy WHERE polrelid='public.assistance_requests'::regclass AND polname LIKE 'ar_assisteur%' ORDER BY polname;"
```
Expected : 2 fonctions présentes ; 4 policies `ar_assisteur_{select,update,insert,delete}` présentes, `assisteur_own_requests` absente.

- [ ] **Step 5 : Vérifier l'idempotence (ré-exécuter le fichier)**

Run:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/migrations/023_assistance_organizations.sql 2>&1 | grep -iE "error|already exists" && echo "NON_IDEMPOTENT" || echo "IDEMPOTENT_OK"
```
Expected : `IDEMPOTENT_OK` (le DO-block de backfill ne recrée rien car `org_id IS NULL` filtre les déjà-migrés).

- [ ] **Step 6 : Commit**

```bash
git add supabase/migrations/023_assistance_organizations.sql
git commit -m "feat(db): assistance organizations — schema, backfill, RLS, triggers"
```

---

### Task 2 : Helper `requireAssisteurOrgAdmin` + route `GET /api/assisteur/team`

**Files:**
- Create: `src/lib/requireAssisteurOrgAdmin.ts`
- Create: `src/app/api/assisteur/team/route.ts`

**Interfaces:**
- Consumes: `createClient` (`@/lib/supabase/server`), `supabaseAdmin` (`@/lib/supabase/admin`), colonnes `org_id`/`team_role` (Task 1)
- Produces: `requireAssisteurOrgAdmin(): Promise<{ ok: true; userId: string; orgId: string } | { ok: false; response: NextResponse }>` ; endpoint listant les membres `{ id, full_name, email, team_role, is_active }[]`

- [ ] **Step 1 : Créer le helper** `src/lib/requireAssisteurOrgAdmin.ts`

```ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse }  from 'next/server'

type Ok   = { ok: true;  userId: string; orgId: string }
type Fail = { ok: false; response: NextResponse }

/**
 * Vérifie que l'appelant est un assisteur avec team_role='admin' et une org.
 * Renvoie son userId + orgId. À appeler en tête des routes /api/assisteur/team/*.
 */
export async function requireAssisteurOrgAdmin(): Promise<Ok | Fail> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, team_role, org_id, is_active')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'assisteur' || profile.team_role !== 'admin' || !profile.org_id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Accès réservé à l'admin de l'organisation" }, { status: 403 }),
    }
  }
  if (!profile.is_active) {
    return { ok: false, response: NextResponse.json({ error: 'Compte suspendu' }, { status: 403 }) }
  }

  return { ok: true, userId: user.id, orgId: profile.org_id as string }
}
```

- [ ] **Step 2 : Créer la route** `src/app/api/assisteur/team/route.ts`

```ts
import { NextResponse }              from 'next/server'
import { supabaseAdmin }             from '@/lib/supabase/admin'
import { requireAssisteurOrgAdmin }  from '@/lib/requireAssisteurOrgAdmin'

// GET /api/assisteur/team — liste les membres de l'organisation de l'appelant
export async function GET() {
  const auth = await requireAssisteurOrgAdmin()
  if (!auth.ok) return auth.response

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, team_role, is_active')
    .eq('org_id', auth.orgId)
    .order('full_name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Emails depuis auth (non stockés dans profiles)
  const { data: usersPage } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const emailById = new Map((usersPage?.users ?? []).map(u => [u.id, u.email ?? '']))

  const members = (data ?? []).map(p => ({
    id:        p.id,
    fullName:  p.full_name,
    email:     emailById.get(p.id) ?? '',
    teamRole:  p.team_role,
    isActive:  p.is_active,
  }))

  return NextResponse.json({ members })
}
```

- [ ] **Step 3 : type-check**

Run: `npm run type-check`
Expected: aucune erreur.

- [ ] **Step 4 : Commit**

```bash
git add src/lib/requireAssisteurOrgAdmin.ts src/app/api/assisteur/team/route.ts
git commit -m "feat(team): org-admin guard + GET team members endpoint"
```

---

### Task 3 : Route `POST /api/assisteur/team/invite`

**Files:**
- Modify: `src/app/api/assisteur/team/route.ts` (ajouter le handler POST)

**Interfaces:**
- Consumes: `requireAssisteurOrgAdmin` (Task 2), pattern `generateLink` (`src/app/api/admin/invite-user/route.ts`), `sendEmail` (`@/lib/email`), `buildInviteEmailHtml/Text` (`@/lib/inviteEmail`), `getAppUrl` (`@/lib/appUrl`)
- Produces: invitation d'un membre avec `org_id` + `team_role` injectés dans les métadonnées (consommées par `handle_new_user`, Task 1)

- [ ] **Step 1 : Ajouter le handler POST dans** `src/app/api/assisteur/team/route.ts`

Ajouter les imports en tête du fichier :
```ts
import type { NextRequest }                          from 'next/server'
import { sendEmail }                                 from '@/lib/email'
import { buildInviteEmailHtml, buildInviteEmailText } from '@/lib/inviteEmail'
import { getAppUrl }                                 from '@/lib/appUrl'
```

Ajouter ce handler à la fin du fichier :
```ts
const TEAM_ROLES = ['admin', 'superviseur', 'charge_assistance'] as const

// POST /api/assisteur/team/invite n'existe pas comme sous-route : on poste sur /api/assisteur/team
export async function POST(request: NextRequest) {
  const auth = await requireAssisteurOrgAdmin()
  if (!auth.ok) return auth.response

  const { email, full_name, team_role } = await request.json() as {
    email?: string; full_name?: string; team_role?: string
  }

  if (!email || !full_name || !team_role) {
    return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
  }
  if (!TEAM_ROLES.includes(team_role as typeof TEAM_ROLES[number])) {
    return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 })
  }

  // L'org définit account_type + nom (company_name) hérités par le membre
  const { data: org } = await supabaseAdmin
    .from('organizations').select('name, account_type').eq('id', auth.orgId).single()

  const appUrl = getAppUrl()
  const meta = {
    role:         'assisteur',
    full_name,
    company_name: org?.name ?? '',
    account_type: org?.account_type ?? null,
    org_id:       auth.orgId,
    team_role,
  }

  let { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'invite', email,
    options: { data: meta, redirectTo: `${appUrl}/auth/set-password` },
  })

  if (error) {
    if (error.message.toLowerCase().includes('already been registered')) {
      const { data: usersPage } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
      const existing = usersPage?.users.find(u => u.email === email)
      if (existing?.email_confirmed_at) {
        return NextResponse.json({ error: 'USER_ALREADY_EXISTS' }, { status: 409 })
      }
      if (existing?.invited_at) {
        const elapsed = Date.now() - new Date(existing.invited_at).getTime()
        if (elapsed < 5 * 60 * 1000) {
          return NextResponse.json({ error: 'Invitation déjà envoyée très récemment.' }, { status: 429 })
        }
        await supabaseAdmin.auth.admin.deleteUser(existing.id)
      }
      const retry = await supabaseAdmin.auth.admin.generateLink({
        type: 'invite', email,
        options: { data: meta, redirectTo: `${appUrl}/auth/set-password` },
      })
      if (retry.error) return NextResponse.json({ error: retry.error.message }, { status: 400 })
      data = retry.data
    } else {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
  }

  if (!data?.properties?.hashed_token) {
    return NextResponse.json({ error: 'Token introuvable' }, { status: 500 })
  }

  const inviteLink =
    `${appUrl}/auth/callback?token_hash=${encodeURIComponent(data.properties.hashed_token)}` +
    `&type=invite&next=/auth/set-password`

  const emailResult = await sendEmail({
    to: email,
    subject: 'Votre accès Drives On est prêt',
    html: buildInviteEmailHtml({ fullName: full_name, role: 'assisteur', inviteLink }),
    text: buildInviteEmailText({ fullName: full_name, role: 'assisteur', inviteLink }),
  })
  if (!emailResult.ok) {
    return NextResponse.json({ error: `Email non envoyé : ${emailResult.error}` }, { status: 500 })
  }

  return NextResponse.json({ success: true, userId: data.user?.id })
}
```

- [ ] **Step 2 : type-check**

Run: `npm run type-check`
Expected: aucune erreur. (Vérifier que la signature de `buildInviteEmailHtml` accepte `role: 'assisteur'`.)

- [ ] **Step 3 : Commit**

```bash
git add src/app/api/assisteur/team/route.ts
git commit -m "feat(team): invite member endpoint (email + role -> Supabase invite)"
```

---

### Task 4 : Route `PATCH /api/assisteur/team/[memberId]`

**Files:**
- Create: `src/app/api/assisteur/team/[memberId]/route.ts`

**Interfaces:**
- Consumes: `requireAssisteurOrgAdmin` (Task 2)
- Produces: changement de `team_role` ou `is_active` d'un membre de la même org, avec garde « dernier admin »

- [ ] **Step 1 : Créer** `src/app/api/assisteur/team/[memberId]/route.ts`

```ts
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseAdmin }                  from '@/lib/supabase/admin'
import { requireAssisteurOrgAdmin }       from '@/lib/requireAssisteurOrgAdmin'

const TEAM_ROLES = ['admin', 'superviseur', 'charge_assistance'] as const

// PATCH /api/assisteur/team/[memberId] — body: { team_role?, is_active? }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> },
) {
  const auth = await requireAssisteurOrgAdmin()
  if (!auth.ok) return auth.response

  const { memberId } = await params
  const { team_role, is_active } = await request.json() as {
    team_role?: string; is_active?: boolean
  }

  if (team_role === undefined && is_active === undefined) {
    return NextResponse.json({ error: 'Rien à modifier' }, { status: 400 })
  }
  if (team_role !== undefined && !TEAM_ROLES.includes(team_role as typeof TEAM_ROLES[number])) {
    return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 })
  }

  // La cible doit appartenir à la même org
  const { data: target } = await supabaseAdmin
    .from('profiles').select('id, org_id, team_role, is_active')
    .eq('id', memberId).single()

  if (!target || target.org_id !== auth.orgId) {
    return NextResponse.json({ error: 'Membre introuvable dans votre organisation' }, { status: 404 })
  }

  // Garde « dernier admin » : on ne peut pas retirer/désactiver le seul admin
  const losesAdmin =
    (team_role !== undefined && target.team_role === 'admin' && team_role !== 'admin') ||
    (is_active === false && target.team_role === 'admin')
  if (losesAdmin) {
    const { count } = await supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', auth.orgId).eq('team_role', 'admin').eq('is_active', true)
    if ((count ?? 0) <= 1) {
      return NextResponse.json({ error: 'Impossible : dernier administrateur actif de l\'organisation' }, { status: 422 })
    }
  }

  const patch: Record<string, unknown> = {}
  if (team_role !== undefined) patch.team_role = team_role
  if (is_active !== undefined) patch.is_active = is_active

  const { error } = await supabaseAdmin.from('profiles').update(patch).eq('id', memberId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2 : type-check**

Run: `npm run type-check`
Expected: aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add "src/app/api/assisteur/team/[memberId]/route.ts"
git commit -m "feat(team): PATCH member role/active with last-admin guard"
```

---

### Task 5 : Session — exposer `orgId` + `companyRole` depuis le profil

**Files:**
- Modify: `src/types/session.ts`
- Modify: `src/services/authService.ts`

**Interfaces:**
- Consumes: colonnes `org_id`/`team_role` (Task 1)
- Produces: `AppSession.orgId?: string` + `AppSession.companyRole` (déjà présent) alimentés depuis `profiles` à la connexion et au refresh

- [ ] **Step 1 : Ajouter `orgId` à `AppSession`** dans `src/types/session.ts`

Dans l'interface `AppSession`, ajouter après `company: string` :
```ts
  orgId?:       string
```

- [ ] **Step 2 : Alimenter `orgId` + `companyRole` dans `authService.ts`**

Dans `signIn` ET `refreshSession`, remplacer le `.select('role, account_type')` par :
```ts
    .select('role, account_type, org_id, team_role')
```
puis, dans la construction de l'objet `session: AppSession` des DEUX fonctions, ajouter ces deux champs :
```ts
    orgId:       (profile.org_id as string) ?? undefined,
    companyRole: (profile.team_role as AssistanceUserRole | null) ?? undefined,
```
Ajouter l'import de type en tête si absent :
```ts
import type { AssistanceUserRole } from '@/types/assistanceUser'
```

- [ ] **Step 3 : type-check + build**

Run: `npm run type-check && npm run build`
Expected: aucune erreur, build 53/53.

- [ ] **Step 4 : Commit**

```bash
git add src/types/session.ts src/services/authService.ts
git commit -m "feat(session): expose orgId + team role from profile"
```

---

### Task 6 : Service `assistanceUserService` → client API + types

**Files:**
- Modify: `src/types/assistanceUser.ts`
- Modify: `src/services/assistanceUserService.ts`
- Delete: `src/data/mockAssistanceUsers.ts`

**Interfaces:**
- Consumes: endpoints `/api/assisteur/team` (GET, POST) + `/api/assisteur/team/[memberId]` (PATCH) (Tasks 2-4)
- Produces : nouvelle API du service (async, sans localStorage) consommée par l'UI (Task 7) :
  - `type TeamMember = { id: string; fullName: string; email: string; teamRole: AssistanceUserRole; isActive: boolean }`
  - `getTeamMembers(): Promise<TeamMember[]>`
  - `inviteMember(input: { email: string; fullName: string; teamRole: AssistanceUserRole }): Promise<{ ok: boolean; error?: string }>`
  - `updateMember(id: string, patch: { teamRole?: AssistanceUserRole; isActive?: boolean }): Promise<{ ok: boolean; error?: string }>`

- [ ] **Step 1 : Réécrire `src/types/assistanceUser.ts`**

Garder `AssistanceUserRole`, `ASSISTANCE_USER_ROLE_LABELS`, `ASSISTANCE_USER_ROLE_COLORS` et `UserStats` à l'identique. Remplacer l'interface `AssistanceUser` et supprimer `AssistanceCompany` par :
```ts
export interface TeamMember {
  id:        string
  fullName:  string
  email:     string
  teamRole:  AssistanceUserRole
  isActive:  boolean
}
```

- [ ] **Step 2 : Réécrire `src/services/assistanceUserService.ts`**

Remplacer tout le contenu par :
```ts
import type { AssistanceUserRole, TeamMember, UserStats } from '@/types/assistanceUser'
import type { AssistanceRequest } from '@/types/request'

export async function getTeamMembers(): Promise<TeamMember[]> {
  const res = await fetch('/api/assisteur/team')
  if (!res.ok) return []
  const body = await res.json() as { members: TeamMember[] }
  return body.members ?? []
}

export async function inviteMember(
  input: { email: string; fullName: string; teamRole: AssistanceUserRole },
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch('/api/assisteur/team', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: input.email, full_name: input.fullName, team_role: input.teamRole }),
  })
  if (res.ok) return { ok: true }
  const body = await res.json().catch(() => ({})) as { error?: string }
  return { ok: false, error: body.error ?? 'Erreur serveur' }
}

export async function updateMember(
  id: string,
  patch: { teamRole?: AssistanceUserRole; isActive?: boolean },
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`/api/assisteur/team/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ team_role: patch.teamRole, is_active: patch.isActive }),
  })
  if (res.ok) return { ok: true }
  const body = await res.json().catch(() => ({})) as { error?: string }
  return { ok: false, error: body.error ?? 'Erreur serveur' }
}

// Stats par membre, calculées côté client sur les demandes déjà chargées.
export function getUserStats(requests: AssistanceRequest[], userId: string): UserStats {
  const mine = requests.filter(r => r.createdByUserId === userId)
  const responseTimes: number[] = []
  for (const r of mine) {
    const evt = r.timeline.find(e => e.type === 'confirmation' || e.type === 'refus')
    if (evt) {
      const atMs = evt.at instanceof Date ? evt.at.getTime() : new Date(evt.at as string).getTime()
      const createdMs = r.createdAt instanceof Date ? r.createdAt.getTime() : new Date(r.createdAt as string).getTime()
      responseTimes.push(atMs - createdMs)
    }
  }
  return {
    created:    mine.length,
    confirmee:  mine.filter(r => ['confirmee', 'honoree', 'cloturee'].includes(r.status)).length,
    refusee:    mine.filter(r => r.status === 'refusee').length,
    transferee: mine.filter(r => ['transferee', 'transfert_valide'].includes(r.status)).length,
    avgResponseMs: responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : null,
  }
}
```

- [ ] **Step 3 : Supprimer le mock**

```bash
git rm src/data/mockAssistanceUsers.ts
```

- [ ] **Step 4 : type-check (échouera sur l'UI — attendu)**

Run: `npm run type-check`
Expected: erreurs UNIQUEMENT dans les fichiers UI consommateurs (Task 7) — `AssistanceUsersManager`, `AssistanceUserForm`, `AssistanceUserCard`, et tout usage de `getAllUsers/createUser/updateUser/filterRequestsForUser`. Ces fichiers sont corrigés en Task 7. NE PAS committer tant que Task 7 n'est pas faite.

> Note : Tasks 6 et 7 forment un seul deliverable compilable. Le commit se fait à la fin de la Task 7.

---

### Task 7 : UI équipe + suppression du login par code d'accès

**Files:**
- Modify: `src/components/assisteur/AssistanceUsersManager.tsx`
- Modify: `src/components/assisteur/AssistanceUserForm.tsx`
- Modify: `src/components/assisteur/AssistanceUserCard.tsx`
- Modify: `src/app/assisteur/page.tsx` (retrait `filterRequestsForUser`)
- Modify: `src/app/assisteur/pipeline/page.tsx` (retrait `filterRequestsForUser`)
- Modify: `src/components/auth/SessionNavItem.tsx` et `src/components/shared/SidebarShell.tsx` (si usage `getAllUsers`/accessCode)

**Interfaces:**
- Consumes: nouvelle API service (Task 6) `getTeamMembers / inviteMember / updateMember / getUserStats` ; `session.companyRole` + `session.orgId` (Task 5)

- [ ] **Step 1 : Recâbler `AssistanceUsersManager.tsx`**

Remplacer l'import service par :
```ts
import { getTeamMembers, inviteMember, updateMember, getUserStats } from '@/services/assistanceUserService'
import type { TeamMember } from '@/types/assistanceUser'
```
Remplacer l'état `users: AssistanceUser[]` par `members: TeamMember[]`. Dans le `useEffect`, charger via `getTeamMembers()` (async) au lieu de `getAllUsers()`. Remplacer :
- `handleSave` (création) → appelle `await inviteMember({ email, fullName, teamRole })` puis recharge `getTeamMembers()`.
- `handleToggleActive(user)` → `await updateMember(user.id, { isActive: !user.isActive })` puis recharge.
- Ajouter un `handleChangeRole(id, teamRole)` → `await updateMember(id, { teamRole })` puis recharge.
- `refresh()` devient `async () => setMembers(await getTeamMembers())`.
- La garde `isAdmin = session?.companyRole === 'admin'` reste : masquer les actions d'écriture si non-admin.

- [ ] **Step 2 : Recâbler `AssistanceUserForm.tsx`**

Le formulaire devient « inviter un membre » : champs `email`, `fullName`, `teamRole` (select sur `AssistanceUserRole`). Retirer tout champ `username`/`accessCode`/`generateAccessCode`. La soumission renvoie `{ email, fullName, teamRole }` au parent.

- [ ] **Step 3 : Recâbler `AssistanceUserCard.tsx`**

Adapter aux champs `TeamMember` (`fullName`, `email`, `teamRole`, `isActive`). Afficher un badge « invitation en attente » si pertinent (optionnel : basé sur l'absence de `lastLoginAt` — non bloquant, peut être omis). Retirer toute référence à `accessCode`/`username`.

- [ ] **Step 4 : Retirer `filterRequestsForUser` des pages**

Dans `src/app/assisteur/page.tsx` et `src/app/assisteur/pipeline/page.tsx` : supprimer l'import et les appels à `filterRequestsForUser` (la visibilité est désormais imposée par la RLS). Conserver le toggle « Mes dossiers / Toute l'équipe » s'il existe, mais le filtre « Mes dossiers » se fait côté client sur `createdByUserId === session.userId` ; le masquer si `session.companyRole === 'charge_assistance'`.

- [ ] **Step 5 : Nettoyer les usages résiduels du login par code**

Run:
```bash
grep -rn "getUserByCredentials\|getAllUsers\|getUserByUsername\|accessCode\|filterRequestsForUser\|generateAccessCode" src/
```
Expected attendu APRÈS corrections : 0 résultat. Corriger chaque fichier restant (notamment `SessionNavItem.tsx`, `SidebarShell.tsx`).

- [ ] **Step 6 : type-check + build**

Run: `npm run type-check && npm run build`
Expected: aucune erreur, build 53/53.

- [ ] **Step 7 : Commit (Tasks 6+7 ensemble)**

```bash
git add -A
git commit -m "feat(team): real multi-user team UI backed by API, remove access-code login"
```

---

## Récapitulatif des fichiers

| Fichier | Tâche | Action |
|---|---|---|
| `supabase/migrations/023_assistance_organizations.sql` | 1 | Création |
| `src/lib/requireAssisteurOrgAdmin.ts` | 2 | Création |
| `src/app/api/assisteur/team/route.ts` | 2,3 | Création (GET) + POST |
| `src/app/api/assisteur/team/[memberId]/route.ts` | 4 | Création (PATCH) |
| `src/types/session.ts` | 5 | + `orgId` |
| `src/services/authService.ts` | 5 | lecture org_id/team_role |
| `src/types/assistanceUser.ts` | 6 | `AssistanceUser`→`TeamMember` |
| `src/services/assistanceUserService.ts` | 6 | client API (sans localStorage) |
| `src/data/mockAssistanceUsers.ts` | 6 | Suppression |
| `src/components/assisteur/AssistanceUsersManager.tsx` | 7 | Recâblage |
| `src/components/assisteur/AssistanceUserForm.tsx` | 7 | Formulaire invitation |
| `src/components/assisteur/AssistanceUserCard.tsx` | 7 | Champs TeamMember |
| `src/app/assisteur/page.tsx`, `pipeline/page.tsx` | 7 | Retrait filterRequestsForUser |
| `src/components/auth/SessionNavItem.tsx`, `shared/SidebarShell.tsx` | 7 | Nettoyage usages |

## Vérification finale (après Task 7)
- `npm run type-check` + `npm run build` verts.
- `grep -rn "localStorage" src/services/assistanceUserService.ts` → 0 (plus de localStorage).
- Vérification RLS manuelle par psql : créer 2 orgs de test avec 1 chargé + 1 superviseur chacune, confirmer cloisonnement (chargé = ses dossiers, superviseur = toute son org, rien de l'org voisine).
- Tests automatisés RLS → futur lot tests.
