# Cadrage — Risques liés à localStorage

> Statut : cadrage (pas encore corrigé). Décision de correction à prendre ensuite.
> Contexte : audit localStorage du 2026-07-01. La session appli et des données métier
> transitent par localStorage. Rappel rassurant : **aucune route serveur ne fait
> confiance à la session localStorage** (autz = JWT cookie + RLS), et le **JWT est en
> cookies** (`@supabase/ssr`), pas en localStorage. Ces 4 risques sont donc réels mais
> aucun n'est une brèche d'accès directe.

**Légende effort** : S (petit, < 1 h) · M (moyen, ½ j) · L (large)

---

## R3 — La désactivation (`is_active=false`) n'est quasi pas appliquée ⚠️ (le plus sérieux)

**Problème.** `is_active` n'est vérifié **ni au login** (`authService.signIn` lit role/account_type/org_id/team_role mais pas is_active), **ni dans la RLS** (`get_user_role()` / `get_user_org_id()` ne filtrent pas is_active). Seuls quelques guards de routes admin (`requireAdmin`, `requireAssisteurOrgAdmin`) le vérifient.

**Impact.** Un assisteur/loueur suspendu (`is_active=false`) : (a) peut encore **se connecter**, (b) garde sa session localStorage, (c) peut encore **lire/écrire ses dossiers via la RLS**. La désactivation ne « débranche » réellement que la gestion d'équipe et quelques actions admin. Un compte viré reste opérationnel sur le cœur métier.

**Options de correction :**
| Option | Ce que ça fait | Effort | Portée |
|---|---|---|---|
| **A — Login seulement** | `signIn` rejette si `!is_active` + `refreshSession` déconnecte | S | Bloque les *nouvelles* connexions ; un JWT déjà émis reste valide jusqu'à expiration |
| **B — RLS (recommandé)** | Ajouter `is_active` à la barrière RLS (helper `is_user_active()` dans les policies, ou `get_user_role()`/`get_user_org_id()` renvoient NULL si inactif) | M | Bloque **immédiatement** tout accès, même avec un JWT actif |
| **A+B** | Les deux (défense en profondeur) | M | Le plus robuste |

**Décision à trancher** : A (rapide, imparfait), B (propre, touche la RLS cœur), ou A+B.
**MEP** : 🔴 recommandé.

---

## R1 — Fallback prod silencieux vers localStorage

**Problème.** Si `NEXT_PUBLIC_SUPABASE_URL` est mal configuré en prod (placeholder / `http://`), `USE_SUPABASE=false` → l'app lit/écrit **les dossiers dans localStorage** au lieu de Supabase, **sans aucune erreur**.

**Impact.** Panne de données silencieuse en prod (dossiers perdus / invisibles), très difficile à diagnostiquer.

**Correction proposée.** Garde de démarrage : en `NODE_ENV=production`, si `!USE_SUPABASE` → `throw` explicite (ou bandeau d'erreur bloquant) au lieu du fallback muet. Un seul point : la condition `USE_SUPABASE` (dupliquée dans plusieurs services → à centraliser dans un helper partagé au passage).

**Décision à trancher** : throw dur (build/boot) vs bandeau d'erreur runtime. Centraliser `USE_SUPABASE` en un seul helper (oui/non).
**Effort** : S · **MEP** : 🟠 recommandé.

---

## R2 — PII dans localStorage (RGPD / poste partagé)

**Problème.** `formDraft` (`driveson:draft:nouvelle-demande:v1`) garde nom/tél/email du **sinistré** ; le fallback `driveson:requests:v3` garde des dossiers complets. Persistance sans expiration, lisible par tout script, subsiste sur un poste partagé/kiosque.

**Correction proposée.**
- Vider le brouillon à la **soumission** de la demande **et à la déconnexion** (`signOut` purge les clés `driveson:*` sensibles).
- Optionnel : TTL sur le brouillon (déjà « expiré si dateNeeded dépassée » — étendre à une date de création).
- Note RGPD : documenter les données stockées côté client.

**Décision à trancher** : purge à la déconnexion de quelles clés exactement (toutes `driveson:*` sauf `sidebar` ?).
**Effort** : S · **MEP** : 🟡 souhaitable.

---

## R4 — Session périmée (fenêtre d'incohérence UI)

**Problème.** Un changement serveur (rôle, `team_role`, org révoqués) reste caché jusqu'au prochain `refreshSession` (montage de layout). Le serveur applique la vérité (pas de brèche), mais l'UI peut afficher un état obsolète.

**Correction proposée (légère).** Rafraîchir la session sur `window` focus / à intervalle, ou invalider le cache sur erreur 401/403. Lié à R3 (une désactivation devrait déconnecter au prochain refresh).

**Décision à trancher** : vaut-il l'effort maintenant, ou on l'absorbe via R3 (le refresh gère la désactivation) ?
**Effort** : S · **MEP** : ⚪ optionnel.

---

## Synthèse & ordre proposé
1. **R3** (désactivation) — le vrai trou. Décider A / B / A+B.
2. **R1** (garde anti-fallback prod) — trivial, évite une panne silencieuse.
3. **R2** (purge PII à la déconnexion/soumission).
4. **R4** — à absorber avec R3 ou laisser.

> Aucun de ces points n'est encore corrigé. Correction à décider point par point.
