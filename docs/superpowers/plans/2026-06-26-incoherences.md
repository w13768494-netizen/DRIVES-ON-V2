# Correction des incohérences V2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corriger 3 des 4 incohérences structurelles de V2 (#2 colonnes validation fantômes, #1 deployment_cities non câblé, #3 scores loueurs ignorés). Le #4 (rôles équipe localStorage) est volontairement reporté.

**Architecture:** 3 corrections indépendantes. #2 est un correctif SQL (bug prod actif). #1 et #3 sont des modifications localisées du matching Supabase.

**Tech Stack:** Next.js 16, TypeScript, Supabase (PostgreSQL + RLS)

## Global Constraints

- `npm run type-check` doit passer sans erreur après chaque tâche
- `npm run build` doit passer après les tâches touchant le code applicatif
- Aucune régression du chemin mock du matching (`getMatchingResultsMock`)
- Approche #1 = **gate géographique sur la demande** (pas de city_id sur les agences)

---

### Task 1 : #2 — Migration des colonnes de validation de documents

**Files:**
- Create: `supabase/migrations/022_document_validation_status.sql`

**Contexte :** La route `src/app/api/admin/documents/[id]/validate/route.ts` lit/écrit `validation_status`, `validated_at`, `validated_by`, `validation_note` sur `request_documents`, et la garde de clôture `honoree→cloturee` (`src/app/api/admin/requests/[id]/status/route.ts`) lit `validation_status`. Ces colonnes sont **absentes de la base** → la validation de documents échoue en prod. Valeurs utilisées par le code : `'pending' | 'valid' | 'rejected'`, défaut `'pending'`.

**Interfaces:**
- Consumes: rien
- Produces: 4 colonnes sur `request_documents` ; les routes validate + status closure fonctionnent

- [ ] **Step 1 : Créer la migration**

Créer `supabase/migrations/022_document_validation_status.sql` :

```sql
-- Colonnes de validation des documents (référencées par le code mais absentes du schéma)
-- Route : src/app/api/admin/documents/[id]/validate/route.ts
-- Garde de clôture : src/app/api/admin/requests/[id]/status/route.ts
ALTER TABLE "public"."request_documents"
  ADD COLUMN IF NOT EXISTS "validation_status" text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS "validated_at"      timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "validated_by"      uuid,
  ADD COLUMN IF NOT EXISTS "validation_note"   text;

ALTER TABLE "public"."request_documents"
  ADD CONSTRAINT "request_documents_validation_status_check"
  CHECK ("validation_status" IN ('pending', 'valid', 'rejected'));
```

- [ ] **Step 2 : Appliquer en local**

Run: `supabase db reset`
Expected: les migrations 000, 021, 022 s'appliquent + le seed se charge sans erreur.

- [ ] **Step 3 : Vérifier les colonnes**

Run:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name='request_documents' AND column_name LIKE 'valid%' ORDER BY column_name;"
```
Expected : 4 lignes — `validated_at`, `validated_by`, `validation_note`, `validation_status` (default `'pending'`).

- [ ] **Step 4 : Vérifier la contrainte CHECK**

Run:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "INSERT INTO request_documents (id, request_id, type, owner, validation_status) VALUES ('test-vs', 'x', 'autre', 'admin', 'bogus');" 2>&1 | grep -i "violates check\|check constraint" && echo "CHECK_OK"
```
Expected : l'insertion est rejetée (CHECK_OK affiché). Aucune ligne test ne persiste.

- [ ] **Step 5 : Commit**

```bash
git add supabase/migrations/022_document_validation_status.sql
git commit -m "fix(db): add document validation_status columns referenced by validate route"
```

---

### Task 2 : #1 — Gate géographique de déploiement dans le matching

**Files:**
- Modify: `src/services/deploymentService.ts`
- Modify: `src/services/matchingService.ts`

**Contexte :** `deployment_cities` (lat/lng/`cover_radius_km`/`status`) n'est pas utilisé dans le chemin Supabase du matching. On ajoute un gate : une demande hors du rayon de toute ville `active` ne retourne aucun loueur. Garde-fou : zéro ville active → pas de gate (sinon plateforme vide).

**Interfaces:**
- Consumes: `computeDistance(lat1,lng1,lat2,lng2)` (déjà exporté dans matchingService)
- Produces: `getActiveDeploymentZones(): Promise<DeploymentZone[] | null>`

- [ ] **Step 1 : Ajouter `getActiveDeploymentZones` dans `deploymentService.ts`**

Ajouter le type et la fonction (après `getActiveCityIds`) :

```ts
export type DeploymentZone = { latitude: number; longitude: number; radiusKm: number }

/**
 * Zones de couverture des villes actives, pour le gate géographique du matching.
 * Retourne null si Supabase non configuré OU aucune ville active (pas de gate appliqué).
 */
export async function getActiveDeploymentZones(): Promise<DeploymentZone[] | null> {
  if (!USE_SUPABASE) return null

  const { data, error } = await supabase
    .from('deployment_cities')
    .select('latitude, longitude, cover_radius_km')
    .eq('status', 'active')

  if (error) {
    console.error('[deploymentService] getActiveDeploymentZones:', error.message)
    return null
  }
  if (!data || data.length === 0) return null

  return data.map((c: { latitude: number; longitude: number; cover_radius_km: number }) => ({
    latitude:  c.latitude,
    longitude: c.longitude,
    radiusKm:  c.cover_radius_km,
  }))
}
```

- [ ] **Step 2 : Importer la fonction dans `matchingService.ts`**

Modifier la ligne d'import existante :
```ts
import { getActiveCityIds }              from '@/services/deploymentService'
```
en :
```ts
import { getActiveCityIds, getActiveDeploymentZones } from '@/services/deploymentService'
```

- [ ] **Step 3 : Ajouter le gate au début de `getMatchingResultsSupabase`**

Dans `getMatchingResultsSupabase`, juste après la ligne de déstructuration des params :
```ts
  const { latitude, longitude, vehicleCategory, radiusKm = 50, durationDays } = params
```
insérer :
```ts
  // Gate de déploiement : hors zone d'une ville active → aucun loueur servi.
  // Garde-fou : aucune ville active (zones === null) → pas de gate.
  const zones = await getActiveDeploymentZones()
  if (zones !== null &&
      !zones.some(z => computeDistance(latitude, longitude, z.latitude, z.longitude) <= z.radiusKm)) {
    return []
  }
```

- [ ] **Step 4 : type-check**

Run: `npm run type-check`
Expected: aucune erreur.

- [ ] **Step 5 : Vérifier le comportement du gate (local)**

Run:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "SELECT name, status, latitude, longitude, cover_radius_km FROM deployment_cities ORDER BY status;"
```
Noter les villes `active`. Le gate doit laisser passer une demande dans leur rayon et bloquer hors rayon. (Vérification logique sur les données ; pas de test auto à ce stade.)

- [ ] **Step 6 : Commit**

```bash
git add src/services/deploymentService.ts src/services/matchingService.ts
git commit -m "feat(matching): gate requests by active deployment city coverage"
```

---

### Task 3 : #3 — Câbler les vrais scores loueurs dans le matching

**Files:**
- Modify: `src/services/rentalAgencyService.ts` (ajout `score_total` au type)
- Modify: `src/types/matching.ts` (rename `reactivity` → `reputation`)
- Modify: `src/services/matchingService.ts` (utiliser le score réel)

**Contexte :** `computeScoreFromRow` hardcode `reactivityScore = 5`. Les colonnes `score_*` de `rental_agencies` (calculées par `/api/admin/agencies/refresh-scores`, échelle `score_total` 0–100) ne sont jamais lues. On remplace le 5 hardcodé par la réputation réelle : `score_total` (0–100) ramené sur le slot 0–10, fallback 5 si pas d'historique (`score_total` null). Le champ `ScoreBreakdown.reactivity` n'a aucun consommateur UI → renommé `reputation`.

**Interfaces:**
- Consumes: `RentalAgencyRow.score_total: number | null`
- Produces: `ScoreBreakdown.reputation` alimenté par la donnée réelle dans le chemin Supabase

- [ ] **Step 1 : Ajouter `score_total` à `RentalAgencyRow`**

Dans `src/services/rentalAgencyService.ts`, ajouter dans l'interface `RentalAgencyRow` (après `external_id`) :
```ts
  score_total:              number | null
```

- [ ] **Step 2 : Renommer `reactivity` → `reputation` dans `ScoreBreakdown`**

Dans `src/types/matching.ts`, remplacer :
```ts
  reactivity: number  // 0–10
```
par :
```ts
  reputation: number  // 0–10 — dérivé du score_total agence (0–100), fallback 5 sans historique
```

- [ ] **Step 3 : Mettre à jour `computeScoreFromRow` (chemin Supabase)**

Dans `src/services/matchingService.ts`, changer la signature et le corps de `computeScoreFromRow` pour recevoir l'agence et lire son `score_total` :

Remplacer :
```ts
function computeScoreFromRow(
  avc:        AgencyVehicleCategoryRow,
  distanceKm: number,
  radiusKm:   number,
): ScoreBreakdown {
  const distanceScore   = Math.round(Math.max(0, 40 * (1 - distanceKm / radiusKm)))
  const effectiveStock  = avc.stock_live ?? avc.stock_estimate
  const available       = avc.available && (avc.actif ?? true) && effectiveStock > 0
  const stockScore      = !available ? 0 : effectiveStock >= 5 ? 30 : effectiveStock >= 3 ? 22 : effectiveStock >= 1 ? 12 : 0
  const categoryScore   = 20
  const reactivityScore = 5
  return {
    total:      distanceScore + stockScore + categoryScore + reactivityScore,
    distance:   distanceScore,
    stock:      stockScore,
    category:   categoryScore,
    reactivity: reactivityScore,
  }
}
```
par :
```ts
function computeScoreFromRow(
  agency:     RentalAgencyRow,
  avc:        AgencyVehicleCategoryRow,
  distanceKm: number,
  radiusKm:   number,
): ScoreBreakdown {
  const distanceScore   = Math.round(Math.max(0, 40 * (1 - distanceKm / radiusKm)))
  const effectiveStock  = avc.stock_live ?? avc.stock_estimate
  const available       = avc.available && (avc.actif ?? true) && effectiveStock > 0
  const stockScore      = !available ? 0 : effectiveStock >= 5 ? 30 : effectiveStock >= 3 ? 22 : effectiveStock >= 1 ? 12 : 0
  const categoryScore   = 20
  // Réputation réelle : score_total agence (0–100) → slot 0–10. Sans historique → 5 (neutre).
  const reputationScore = agency.score_total != null
    ? Math.round(Math.min(100, Math.max(0, agency.score_total)) / 10)
    : 5
  return {
    total:      distanceScore + stockScore + categoryScore + reputationScore,
    distance:   distanceScore,
    stock:      stockScore,
    category:   categoryScore,
    reputation: reputationScore,
  }
}
```

- [ ] **Step 4 : Mettre à jour l'appel à `computeScoreFromRow`**

Dans `getMatchingResultsSupabase`, remplacer :
```ts
        score:            computeScoreFromRow(avc, distanceKm, radiusKm),
```
par :
```ts
        score:            computeScoreFromRow(agency, avc, distanceKm, radiusKm),
```

- [ ] **Step 5 : Mettre à jour le chemin mock `computeMatchingScore`**

Dans `src/services/matchingService.ts`, dans `computeMatchingScore`, remplacer le bloc de retour :
```ts
  const reactivityScore = MOCK_REACTIVITY[company.id] ?? 5
  const total = distanceScore + stockScore + categoryScore + reactivityScore
  return { total, distance: distanceScore, stock: stockScore, category: categoryScore, reactivity: reactivityScore }
```
par :
```ts
  const reputationScore = MOCK_REACTIVITY[company.id] ?? 5
  const total = distanceScore + stockScore + categoryScore + reputationScore
  return { total, distance: distanceScore, stock: stockScore, category: categoryScore, reputation: reputationScore }
```

- [ ] **Step 6 : type-check + build**

Run: `npm run type-check && npm run build`
Expected: aucune erreur TS, build réussi. (Cherche notamment d'éventuels usages résiduels de `.reactivity` signalés par le compilateur.)

- [ ] **Step 7 : Commit**

```bash
git add src/services/rentalAgencyService.ts src/types/matching.ts src/services/matchingService.ts
git commit -m "feat(matching): use real agency reputation score instead of hardcoded value"
```

---

## Récapitulatif des fichiers touchés

| Fichier | Tâche | Action |
|---------|-------|--------|
| `supabase/migrations/022_document_validation_status.sql` | 1 | Création |
| `src/services/deploymentService.ts` | 2 | + `getActiveDeploymentZones` |
| `src/services/matchingService.ts` | 2, 3 | Gate géo + score réel |
| `src/services/rentalAgencyService.ts` | 3 | + `score_total` au type |
| `src/types/matching.ts` | 3 | `reactivity` → `reputation` |

## Note de suivi

Le **#4** (rôles d'équipe assisteur en localStorage) reste **non traité** — à rappeler à l'utilisateur en fin d'exécution pour décider : supprimer (Option B) ou construire le vrai multi-sièges (Option A).
