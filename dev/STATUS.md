# DRIVES ON V2 — Statut de développement

> Dernière mise à jour : 2026-07-01
> Marketplace B2B sinistre (assisteurs/assureurs ↔ loueurs). Stack : Next.js 16 + Supabase (RLS).

**Légende** : ✅ Fait · ⏳ Reporté (décision prise) · 🔲 À faire (roadmap, non démarré) · ➖ Clôturé/N-A

---

## 0. Synthèse — les 12 points identifiés (« que manque-t-il à la V2 »)

Numérotation d'origine de l'analyse, avec statut vérifié dans le code au 2026-07-01.

### Incohérences déjà présentes (à corriger avant d'ajouter quoi que ce soit) — **toutes traitées**
| # | Point | Statut | Preuve / réf |
|---|---|---|---|
| 1 | `deployment_cities` inutilisé (matching = rayon 50 km fixe) | ✅ | gate géo `matchingService.ts:192` — migration + `565054b` |
| 2 | Colonnes validation docs fantômes (`validation_status`…) — schéma ≠ code | ✅ | colonne présente en base — migration `022` |
| 3 | Scores loueurs calculés mais ignorés (réactivité hardcodée 5) | ✅ | `agency.score_total` utilisé `matchingService.ts:132` — `9863d35` |
| 4 | Rôles d'équipe assisteur en `localStorage` (fausse permission) | ✅ | 0 `localStorage` dans le service — feature org (migration `023`) |

### Manques métier structurants 🟠 — **roadmap, non démarrés**
| # | Point | Statut |
|---|---|---|
| 5 | Aucune traçabilité financière réelle (pièce comptable loueur : facture/avoir, relevé, n° de pièce) | 🔲 |
| 6 | Pas de disponibilité dans le temps (calendrier anti-chevauchement ; risque double-attribution) | 🔲 |
| 7 | Sinistre/litige s'arrête à la déclaration (pas de chiffrage, pas de workflow assurance) | 🔲 |
| 8 | Pas de SLA contractuel loueur (relances sans conséquence : ni pénalité ni désactivation auto) | 🔲 |
| 9 | Communication client sinistré inexistante (le bénéficiaire final est passif) | 🔲 |

### Robustesse / plateforme 🟡
| # | Point | Statut |
|---|---|---|
| 10 | 0 test (state-machine 13 états, verrous optimistes, crons concurrents, finance) | ⏳ reporté (consigne : process avant tests) |
| 11 | Logique métier critique côté client (`requestService.ts`, 832 l. + localStorage/mocks) | 🔲 (inchangé, confirmé) |
| 12 | Pas de reporting / KPI métier (délai mise en relation, taux accept./loueur, taux litige, CA/ville) | 🔲 |

### Priorisation — état actuel
1. ~~Trancher les incohérences 1-4~~ → **✅ FAIT** (les 4 corrigées + sécurisées)
2. **#5 pièce comptable loueur** — le plus exposé juridiquement/financièrement → **prochain candidat n°1**
3. **#6 dispo calendaire anti-chevauchement** — risque opérationnel direct → candidat n°2
4. **#10 tests** sur state-machine + finance
5. Reste roadmap produit : #7 litige assurance, #8 SLA, #9 comm. sinistré, #11 durcissement serveur, #12 reporting

---

## A. Corrections livrées

### A.1 — Sécurité (RLS / IDOR)
| # | Point | Statut | Réf |
|---|---|---|---|
| S1 | `public_all` sur `request_documents` (IDOR / RLS bypass) | ✅ | migration `021` |
| S2 | IDOR `external_id` sur `ar_loueur_select` / `ar_loueur_update` | ✅ | `021` |
| S3 | Jumelle `loueur_read_assigned_requests` (IDOR `external_id` survivant, manqué par 021) | ✅ | migration `025` |
| S4 | Confiance aux métadonnées client dans `handle_new_user` (escalade au signup) | ✅ | gate `invited_at` (migration `023`) |
| S5 | Trigger `on_auth_user_created` non versionné (gate non reproductible depuis les migrations) | ✅ | migration `024` |

### A.2 — Anomalies de structure
| # | Point | Sévérité | Statut | Réf |
|---|---|---|---|---|
| A1 | `CRON_SECRET` manquant dans `.env.local.example` | Critique | ✅ | `35eb334` |
| A2 | `localStorage` dans `loueurAccountService` (crash SSR) | Haute | ✅ code mort supprimé | `bdc9439` |
| A3 | Dépendance fantôme `@emnapi/runtime` | Haute | ➖ faux positif (dep légitime sharp/rollup) | — |
| A4 | CSP `unsafe-inline` en production | Moyenne | ✅ (+ correctif régression hydratation) | `e7a8da0`, `0877ef6` |
| A5 | `console.*` non filtrés en prod (routes API) | Moyenne | ✅ logger conditionnel | `280b69c` |
| A6 | 8 services avec fallback mock | Moyenne | ✅ garde `USE_SUPABASE` OK + bug `http://` local corrigé | `e6b94d5` |
| A7 | Pas de `error.tsx` par section | Basse | ✅ | `74075d3` |
| A8 | Pas d'optimisation `next/image` | Basse | ⏳ | — |
| A9 | Aucun test automatisé | Basse | ⏳ (consigne : process avant tests) | — |

### A.3 — Incohérences internes
| # | Point | Statut | Réf |
|---|---|---|---|
| I1 | `deployment_cities` non appliqué au matching | ✅ gate géographique | `565054b` |
| I2 | Colonnes `validation_status` fantômes (validation docs cassée en prod) | ✅ | migration `022` (+ `05a8e34`) |
| I3 | Scores loueurs calculés mais jamais lus | ✅ réputation câblée | `9863d35` |
| I4 | Rôles d'équipe assisteur en `localStorage` (fausse sécurité) | ✅ **feature org multi-utilisateurs** | migration `023` + 10 commits |

---

## B. Différés techniques (robustesse / qualité — pas de faille connue)
| # | Point | Statut | Note |
|---|---|---|---|
| B1 | Infra de test (0 test) | ⏳ | inclut `test-rls.mjs` à refaire pour le modèle org |
| B2 | Race TOCTOU garde « dernier admin » (PATCH team) | ⏳ | fix = RPC atomique |
| B3 | Messages d'erreur Supabase bruts exposés (routes team) | ⏳ | normaliser en message générique |
| B4 | Validation format email / UUID sur routes team | ⏳ | — |
| B5 | `listUsers({ perPage: 1000 })` — scalabilité | ⏳ | OK volume actuel |
| B6 | Logger actif en `NODE_ENV=test` | ⏳ | à ajuster si tests ajoutés |
| B7 | Logique métier lourde côté client (`requestService.ts`, 832 l.) | 🔲 | transitions sensibles à passer en routes serveur/RPC |

---

## C. Manques métier V2 (roadmap produit — non démarrés)

> Analyse « que manque-t-il à la V2 » — classés par criticité métier. Aucun n'est démarré.

| # | Manque | Criticité | Statut |
|---|---|---|---|
| C1 | **Traçabilité financière réelle** : pièce comptable loueur (facture/relevé, n° de pièce), pas juste `payment_status='paye'` + audit log | 🟠 Haute | 🔲 |
| C2 | **Disponibilité dans le temps** : calendrier de dispo anti-chevauchement (V1 avait `AvailabilityDay` + contrainte unique) ; risque d'attribuer 2× le même véhicule | 🟠 Haute | 🔲 |
| C3 | **Workflow sinistre complet** : `litige_degat` s'arrête à la déclaration — pas de chiffrage du dommage, pas de prise en charge assurance structurée | 🟠 Haute | 🔲 |
| C4 | **SLA contractuel côté loueur** : relances existent (`check-sla`) mais sans conséquence (pénalité, désactivation auto, exploitation du taux de réponse) | 🟡 Moyenne | 🔲 |
| C5 | **Communication client sinistré** : le bénéficiaire final (`sinistre.*`) est passif — aucun SMS/email « véhicule confirmé chez X » | 🟡 Moyenne | 🔲 |
| C6 | **Reporting / KPI métier** : délai moyen de mise en relation, taux d'acceptation/loueur, taux de litige, CA par ville | 🟡 Moyenne | 🔲 |

**Priorisation recommandée** : C1 (exposition juridique/financière) → C2 (risque opérationnel direct) → B1 tests sur state-machine + finance → reste roadmap.

---

## D. Invariants V1 ↔ V2 (implémentés différemment)

Les seuls points métier communs aux deux versions — mais chacun codé différemment (pas de réutilisation) :

| Invariant | V1 (broker B2C) | V2 (marketplace B2B) |
|---|---|---|
| **Commission 15 %** | `supplierNet = base × 0.85` (retenue sur net, refacturée au client via +5 %) | `COMMISSION_RATE = 0.15` retenue sur le virement loueur, pas refacturée |
| **Géoloc Haversine** | recherche temps réel sur stock + dispo calendaire | `matchingService` : Haversine rayon 50 km + score 100 pts |
| **Extension de durée** | `RentalExtension` validé par le loueur via token email | l'assisteur demande, le loueur répond ; snapshot tarif forfait/journalier (`extensionPricing`) |

---

## E. Checklist mise en production (non-code)
- [ ] `supabase db push` — applique les migrations `022` → `025` en prod
- [ ] Confirmer que le trigger `on_auth_user_created` existe en prod (sinon les invitations ne créent pas de profil) — désormais garanti par migration `024`
- [ ] Confirmer `enable_signup = false` côté dashboard Supabase (défense en profondeur ; le gate SQL `invited_at` reste la vraie barrière)

---

## Références
- Specs / plans : `docs/superpowers/specs/` et `docs/superpowers/plans/`
- Migrations : `supabase/migrations/` (`021` → `025`)
- Comptes de test locaux : `COMPTES_LOCAL.md`
