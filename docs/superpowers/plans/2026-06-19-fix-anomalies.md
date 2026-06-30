# Fix Anomalies Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corriger les 8 anomalies identifiées lors de l'audit de la structure du projet (hors tests).

**Architecture:** Corrections indépendantes les unes des autres — chaque tâche est autonome. Pas de refactoring d'architecture, uniquement des fixes ciblés.

**Tech Stack:** Next.js 16, TypeScript, Supabase, Tailwind CSS

## Global Constraints

- Ne pas casser le build TypeScript (`npm run type-check` doit passer)
- Ne pas modifier le comportement fonctionnel — corrections uniquement
- Chaque tâche se termine par une vérification de build

---

### Task 1 : CRON_SECRET manquant dans `.env.local.example`

**Files:**
- Modify: `.env.local.example`
- Modify: `.env.local`

**Interfaces:**
- Consumes: rien
- Produces: variable `CRON_SECRET` disponible pour les routes cron

- [ ] **Step 1 : Ajouter CRON_SECRET dans `.env.local.example`**

Ouvrir `.env.local.example` et ajouter après la section Sentry :

```
# ── CRON — Sécurisation des endpoints automatiques ────────────────────────────
# Secret partagé entre Vercel Cron Jobs (ou autre scheduler) et les routes /api/cron/*
# Générer avec : openssl rand -hex 32
# ⚠ Sensible — ne jamais exposer côté client
CRON_SECRET=VOTRE_CRON_SECRET
```

- [ ] **Step 2 : Ajouter une valeur locale dans `.env.local`**

Ajouter à la fin de `.env.local` :

```
CRON_SECRET=local-cron-secret-dev-only
```

- [ ] **Step 3 : Vérifier le build**

```bash
npm run type-check
```
Attendu : aucune erreur TypeScript.

---

### Task 2 : Condition `USE_SUPABASE` bloque l'instance locale

**Files:**
- Modify: `src/services/requestService.ts:20-23`
- Modify: `src/services/assistanceUserService.ts` (même pattern)
- Modify: `src/services/candidatureService.ts` (même pattern)

**Contexte :** La condition actuelle exige `https://` — ce qui exclut l'instance locale `http://127.0.0.1:54321`. Résultat : toutes les pages utilisent les mocks en local au lieu de Supabase.

**Interfaces:**
- Consumes: `NEXT_PUBLIC_SUPABASE_URL`
- Produces: `USE_SUPABASE = true` pour toute URL valide (http ou https) non-placeholder

- [ ] **Step 1 : Corriger `requestService.ts`**

Remplacer (lignes 20-23) :
```ts
const USE_SUPABASE =
  typeof process.env.NEXT_PUBLIC_SUPABASE_URL === 'string' &&
  process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('https://') &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('VOTRE')
```
Par :
```ts
const USE_SUPABASE =
  typeof process.env.NEXT_PUBLIC_SUPABASE_URL === 'string' &&
  (
    process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('https://') ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http://')
  ) &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('VOTRE')
```

- [ ] **Step 2 : Appliquer le même fix dans `assistanceUserService.ts`**

Chercher la même condition `USE_SUPABASE` et appliquer la même correction.

- [ ] **Step 3 : Appliquer le même fix dans `candidatureService.ts`**

Chercher la même condition `USE_SUPABASE` et appliquer la même correction.

- [ ] **Step 4 : Vérifier**

```bash
npm run type-check
```
Attendu : aucune erreur.

---

### Task 3 : Supprimer `loueurAccountService.ts` (service mort)

**Files:**
- Delete: `src/services/loueurAccountService.ts`

**Contexte :** Aucun fichier n'importe ce service. C'est du code mort.

**Interfaces:**
- Consumes: rien
- Produces: rien

- [ ] **Step 1 : Confirmer l'absence d'imports**

```bash
grep -rn "loueurAccountService" /Applications/ServBay/www/DRIVES-ON-GROUP/DRIVES-ON-V2/src
```
Attendu : 0 résultat en dehors du fichier lui-même.

- [ ] **Step 2 : Supprimer le fichier**

```bash
rm /Applications/ServBay/www/DRIVES-ON-GROUP/DRIVES-ON-V2/src/services/loueurAccountService.ts
```

- [ ] **Step 3 : Vérifier le build**

```bash
npm run type-check
```
Attendu : aucune erreur.

---

### Task 4 : CSP — `'unsafe-inline'` uniquement en dev

**Files:**
- Modify: `next.config.ts:8`

**Contexte :** `script-src 'unsafe-inline'` est actif en production. Il doit être restreint au dev.

**Interfaces:**
- Consumes: `isDev`
- Produces: CSP sans `'unsafe-inline'` en prod

- [ ] **Step 1 : Modifier la ligne `script-src` dans `next.config.ts`**

Remplacer :
```ts
`script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
```
Par :
```ts
`script-src 'self'${isDev ? " 'unsafe-inline' 'unsafe-eval'" : ''}`,
```

- [ ] **Step 2 : Vérifier le build**

```bash
npm run build 2>&1 | tail -20
```
Attendu : build réussi sans erreur.

- [ ] **Step 3 : Vérifier en dev que le rendu fonctionne**

```bash
npm run dev
```
Ouvrir http://localhost:3001 — aucune erreur CSP dans la console navigateur.

---

### Task 5 : Remplacer `console.*` par un logger conditionnel

**Files:**
- Create: `src/lib/logger.ts`
- Modify: `src/app/api/cron/check-sla/route.ts`
- Modify: `src/app/api/cron/check-overdue/route.ts`
- Modify: `src/app/api/notify-assisteur/route.ts`
- Modify: `src/app/api/notify-loueur/route.ts`
- Modify: `src/app/api/assisteur/requests/[id]/relance/route.ts`
- Modify: `src/app/api/admin/deployment-cities/[id]/route.ts`
- Modify: `src/app/api/admin/requests/[id]/status/route.ts`
- Modify: `src/app/api/admin/requests/[id]/relance/route.ts`
- Modify: `src/app/api/admin/requests/[id]/finance/route.ts`
- Modify: `src/app/api/admin/documents/[id]/validate/route.ts`
- Modify: `src/app/api/documents/[id]/route.ts`

**Interfaces:**
- Consumes: `NODE_ENV`
- Produces: `logger.info()`, `logger.warn()`, `logger.error()` — silencieux en prod, actifs en dev

- [ ] **Step 1 : Créer `src/lib/logger.ts`**

```ts
const isDev = process.env.NODE_ENV !== 'production'

export const logger = {
  info:  (...args: unknown[]) => { if (isDev) console.log(...args) },
  warn:  (...args: unknown[]) => { if (isDev) console.warn(...args) },
  error: (...args: unknown[]) => { if (isDev) console.error(...args) },
}
```

- [ ] **Step 2 : Remplacer dans chaque fichier API**

Pour chaque fichier listé, ajouter l'import :
```ts
import { logger } from '@/lib/logger'
```
Puis remplacer :
- `console.log(` → `logger.info(`
- `console.warn(` → `logger.warn(`
- `console.error(` → `logger.error(`

- [ ] **Step 3 : Vérifier le build**

```bash
npm run type-check
```
Attendu : aucune erreur.

---

### Task 6 : Ajouter `error.tsx` aux groupes de routes principaux

**Files:**
- Create: `src/app/admin/error.tsx`
- Create: `src/app/assisteur/error.tsx`
- Create: `src/app/loueur/error.tsx`

**Contexte :** Sans `error.tsx` local, toute erreur remonte au `global-error.tsx` — pas de récupération gracieuse par section.

**Interfaces:**
- Consumes: props Next.js `{ error: Error, reset: () => void }`
- Produces: UI d'erreur par section avec bouton "Réessayer"

- [ ] **Step 1 : Créer `src/app/admin/error.tsx`**

```tsx
'use client'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <h2 className="text-xl font-semibold text-gray-800">Une erreur est survenue</h2>
      <p className="text-gray-500 text-sm max-w-md">{error.message}</p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
      >
        Réessayer
      </button>
    </div>
  )
}
```

- [ ] **Step 2 : Créer `src/app/assisteur/error.tsx`**

Contenu identique à `admin/error.tsx`.

- [ ] **Step 3 : Créer `src/app/loueur/error.tsx`**

Contenu identique à `admin/error.tsx`.

- [ ] **Step 4 : Vérifier le build**

```bash
npm run type-check
```
Attendu : aucune erreur.

---

### Task 7 : `npm dedupe`

**Files:**
- Modify: `package-lock.json` (automatique)

**Contexte :** Dépendance fantôme `@emnapi/runtime@1.10.0` non déclarée.

- [ ] **Step 1 : Lancer npm dedupe**

```bash
npm dedupe
```

- [ ] **Step 2 : Vérifier**

```bash
npm run type-check
npm run build 2>&1 | tail -10
```
Attendu : build réussi.

---

## Récapitulatif des fichiers touchés

| Fichier | Action |
|---------|--------|
| `.env.local.example` | Ajout `CRON_SECRET` |
| `.env.local` | Ajout valeur locale `CRON_SECRET` |
| `src/services/requestService.ts` | Fix `USE_SUPABASE` |
| `src/services/assistanceUserService.ts` | Fix `USE_SUPABASE` |
| `src/services/candidatureService.ts` | Fix `USE_SUPABASE` |
| `src/services/loueurAccountService.ts` | Suppression (code mort) |
| `next.config.ts` | CSP `unsafe-inline` dev-only |
| `src/lib/logger.ts` | Création |
| 11 routes API | Remplacement `console.*` → `logger` |
| `src/app/admin/error.tsx` | Création |
| `src/app/assisteur/error.tsx` | Création |
| `src/app/loueur/error.tsx` | Création |
| `package-lock.json` | `npm dedupe` |
