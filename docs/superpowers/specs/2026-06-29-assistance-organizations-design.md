# Organisations multi-utilisateurs côté assisteur — Design

> Statut : validé (brainstorming). Prochaine étape : plan d'implémentation (writing-plans).
> Contexte : incohérence #4 — les rôles d'équipe assisteur vivaient uniquement en localStorage (non sécurisés). Option A retenue : vrai multi-utilisateurs persisté en base + RLS.

## Objectif

Permettre à une société d'assistance d'avoir **plusieurs comptes de connexion** (membres), cloisonnés par rôle, à la place de la couche localStorage actuelle (`assistanceUserService`) qui simulait des sous-utilisateurs sans persistance ni sécurité.

## Décisions de cadrage

1. **Périmètre** : assisteurs uniquement (les 3 `account_type` : `assistance`, `insurance_agent`, `garage`). Loueurs et admin plateforme **inchangés**.
2. **Migration** : 1 compte assisteur existant → 1 organisation, ce compte en devient l'**admin**.
3. **Visibilité** : `charge_assistance` = ses propres dossiers ; `superviseur`/`admin` = tous les dossiers de l'org (lecture **et** action).
4. **Gestion des membres** : **admin d'organisation uniquement**.
5. **Invitation** : self-service — l'admin org saisit email + rôle → lien d'invitation Supabase (réutilise `generateInviteLink` + `/auth/set-password`).
6. **Cycle de vie membre** : inviter + désactiver/réactiver + changer de rôle. **Pas de suppression dure** (préserve `created_by_user_id`).

## Contexte existant (rappel)

- `profiles` (table partagée tous rôles) : `id` (=`auth.users.id`), `role` (enum assisteur/loueur/admin), `full_name`, `company_name`, `phone`, `account_type`, `is_active`.
- `assistance_requests.created_by_user_id` (**text**) porte l'`auth.uid()` du créateur. RLS assisteur actuelle : `created_by_user_id = auth.uid()`.
- Les **loueurs** ont un modèle distinct, non touché : 1 `profiles` (role=loueur) → N `rental_agencies` via `owner_id`. Ils gardent `org_id = NULL`.
- Fonction `get_user_role()` (SECURITY DEFINER STABLE) = source de vérité RLS existante. Trigger `prevent_role_escalation` (BEFORE UPDATE profiles) protège déjà `role`.
- Couche localStorage à remplacer : `src/types/assistanceUser.ts`, `src/services/assistanceUserService.ts`, `src/data/mockAssistanceUsers.ts`, et 8 fichiers UI consommateurs.

## Architecture retenue (Approche A)

Table `organizations` dédiée + colonnes `org_id`/`team_role` sur `profiles` (un membre = une seule org). `org_id` **dénormalisé** sur `assistance_requests` pour une RLS simple et performante.

---

## 1. Modèle de données

### Table `organizations`
| Colonne | Type | Note |
|---|---|---|
| `id` | uuid PK DEFAULT gen_random_uuid() | |
| `name` | text NOT NULL | repris de `company_name` (fallback `full_name`) |
| `account_type` | text | CHECK IN (`assistance`,`insurance_agent`,`garage`) |
| `is_active` | boolean NOT NULL DEFAULT true | |
| `created_at` | timestamptz NOT NULL DEFAULT now() | |

### `profiles` — 2 colonnes ajoutées
- `org_id uuid REFERENCES organizations(id)`
- `team_role text CHECK (team_role IN ('admin','superviseur','charge_assistance'))`

### `assistance_requests` — 1 colonne ajoutée
- `org_id uuid REFERENCES organizations(id)` — dénormalisée, remplie à la création par trigger

### Fonctions SQL (SECURITY DEFINER STABLE, modèle `get_user_role()`)
- `get_user_org_id() → uuid`
- `get_user_team_role() → text`

---

## 2. Sécurité (RLS)

### Réécriture des policies assisteur sur `assistance_requests`
| Policy | Condition |
|---|---|
| `ar_assisteur_select` | `org_id = get_user_org_id() AND (get_user_team_role() IN ('admin','superviseur') OR created_by_user_id = auth.uid())` |
| `ar_assisteur_update` | idem |
| `ar_assisteur_insert` | WITH CHECK : `created_by_user_id = auth.uid() AND org_id = get_user_org_id()` |
| `ar_assisteur_delete` | condition select **+** `status IN ('brouillon','envoyee')` |
| `assisteur_own_requests` | **supprimée** (redondante) |

Les policies **loueur** et **admin** sur `assistance_requests` (patchées au #021) restent strictement inchangées.

### RLS table `organizations`
- SELECT : `id = get_user_org_id()` OU `get_user_role() = 'admin'`
- INSERT/UPDATE/DELETE : aucune policy utilisateur — géré en service-role par les routes API.

### Anti-auto-promotion
- Extension de `prevent_role_escalation` (ou trigger jumeau) : bloque toute modification de `team_role` **et** `org_id` sur sa propre ligne par un utilisateur normal. Seules les routes service-role (admin org) les modifient.
- Raison : la policy `profiles_update_own` (USING `auth.uid() = id`) autorise l'auto-update sans restriction de colonnes.

---

## 3. API, frontend & session

### Routes API (service-role, gardées par `requireAssisteurOrgAdmin()` → vérifie `role=assisteur` + `team_role=admin`, renvoie `org_id`)
| Route | Action |
|---|---|
| `GET /api/assisteur/team` | Liste les membres de l'org + stats |
| `POST /api/assisteur/team/invite` | email + `team_role` → `generateInviteLink` → crée `profiles` (org_id, team_role, account_type de l'org) → email |
| `PATCH /api/assisteur/team/[memberId]` | Change `team_role` ou `is_active`. Gardes : dernier admin protégé ; cible dans la même org |

### Frontend
- `assistanceUserService.ts` → client léger appelant `/api/assisteur/team` (sans localStorage ni mocks).
- `types/assistanceUser.ts` → modèle réel : `id` (uuid profil), `orgId`, `teamRole`, `email`, `fullName`, `isActive`, `lastLoginAt`. Supprimés : `accessCode`, `username`.
- Pages `utilisateurs/`, `AssistanceUsersManager`, `AssistanceUserForm`, `AssistanceUserCard` → vraies données ; formulaire = « inviter par email + rôle ».
- `filterRequestsForUser` → supprimé (visibilité imposée par RLS). Toggle « Mes dossiers / Toute l'équipe » conservé pour admin/superviseur, masqué pour le chargé.

### Session / auth
- `authService` lit `org_id` + `team_role` à la connexion → session (`currentSessionService`, clé `driveson:session:v2`).
- Type session : + `orgId`, `teamRole`.
- Membres invités : mot de passe via `/auth/set-password` existant.

### Suppression login par code d'accès
- Chemin `getUserByCredentials` / `accessCode` retiré (remplacé par l'auth Supabase réelle).

---

## 4. Migration, vérification & risques

### Migration `023_assistance_organizations.sql`
Ordre : tables → colonnes → fonctions → backfill données → triggers → réécriture RLS. Idempotente (DROP IF EXISTS, ADD COLUMN IF NOT EXISTS). Appliquée local via `db reset`, poussée à la MEP via `db push`.

**Backfill** :
1. Pour chaque `profiles` `role='assisteur'` : créer une `organizations` (name = company_name ?? full_name, account_type du profil), puis set `profiles.org_id` + `team_role='admin'`.
2. `assistance_requests.org_id` rempli depuis l'org du créateur (`created_by_user_id::uuid → profiles.org_id`), avec garde sur les valeurs non-uuid / utilisateurs inconnus (→ NULL).
3. Trigger `BEFORE INSERT` sur `assistance_requests` : remplit `org_id` depuis le profil du créateur.

### Vérification (pas d'infra de test — cohérent avec « process avant tests »)
- `type-check` + `build` verts.
- Vérification RLS manuelle par psql en simulant 3 contextes JWT (admin / superviseur / charge d'une même org + un membre d'une autre org) : le chargé ne voit que ses dossiers ; superviseur/admin voient toute l'org ; aucun ne voit l'org voisine.
- Test du garde « dernier admin » et de l'anti-auto-promotion.
- Tests RLS automatisés → reportés au futur lot tests.

### Risques / cas limites
- `account_type` de l'org = celui du profil migré ; membres invités héritent de l'`account_type` de l'org.
- `created_by_user_id` text → backfill avec cast gardé ; orphelins → `org_id` NULL (visible admin plateforme seulement). À signaler dans le rapport de migration.
- Membre invité sans mot de passe défini → `is_active=true`, compte « pending » côté auth, badge « invitation en attente » dans la liste.
- Garde dernier admin : impossible de rétrograder/désactiver le seul admin d'une org.

### Hors périmètre (YAGNI)
Multi-org par membre ; équipes côté loueur ; suppression dure de membre ; refonte du login par code (juste retiré).
