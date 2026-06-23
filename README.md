# DRIVES ON — V2

Plateforme de mise en relation entre assisteurs/assureurs et loueurs de véhicules de remplacement, dans le cadre de la gestion de sinistres automobiles.

## Stack

- **Next.js 16** (App Router) + **TypeScript**
- **Supabase** (Auth, PostgreSQL, RLS, Storage)
- **Tailwind CSS** + **Framer Motion**
- **React Hook Form** + **Zod**
- **Sentry** (monitoring erreurs)

## Rôles

| Rôle | Accès | Description |
|------|-------|-------------|
| `admin` | `/admin` | Supervision globale, finance, déploiement, gestion utilisateurs |
| `assisteur` | `/assisteur` | Création et suivi des demandes de véhicule de remplacement |
| `loueur` | `/loueur` | Réception des demandes, réponses, gestion du parc et des tarifs |

## Démarrage local

### Prérequis

- Node.js 20+
- Docker Desktop
- Supabase CLI (`brew install supabase/tap/supabase`)

### Installation

```bash
npm install
```

### Base de données

```bash
# Démarrer l'instance Supabase locale
supabase start

# Réinitialiser (applique migrations + seed)
supabase db reset
```

### Application

```bash
npm run dev
# → http://localhost:3001
```

## Variables d'environnement

Copier `.env.local.example` en `.env.local` :

```bash
cp .env.local.example .env.local
```

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL de l'instance Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service Supabase (serveur uniquement) |
| `NEXT_PUBLIC_APP_URL` | URL publique de l'app |
| `POSTMARK_API_KEY` | Clé API Postmark (emails) |
| `NOTIFY_FROM_EMAIL` | Adresse expéditeur des emails |
| `NEXT_PUBLIC_SENTRY_DSN` | DSN Sentry (optionnel) |

Les valeurs locales (instance Supabase locale) sont déjà renseignées dans `.env.local`.

## Comptes de test

Voir `COMPTES_LOCAL.md` — mot de passe universel : `Test1234!`

## Migrations

Les migrations sont dans `supabase/migrations/` :

| Fichier | Description |
|---------|-------------|
| `000_baseline.sql` | Schéma complet (baseline depuis prod) |
| `021_security_fixes.sql` | Correctifs RLS (CVE public_all + IDOR external_id) |

Pour pousser en production : `supabase db push`

## Accès locaux

| Service | URL |
|---------|-----|
| Application | http://localhost:3001 |
| Supabase Studio | http://127.0.0.1:54323 |
| Base de données | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| Mailpit (emails) | http://127.0.0.1:54324 |

## Scripts

```bash
npm run dev          # Serveur de développement
npm run build        # Build de production
npm run type-check   # Vérification TypeScript
npm run lint         # Lint ESLint
```
