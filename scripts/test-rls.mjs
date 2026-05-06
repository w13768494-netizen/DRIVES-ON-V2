/**
 * Drives On — Test RLS Matrix
 * Usage : node scripts/test-rls.mjs
 *
 * Schéma réel vérifié le 2026-05-06 :
 *   rental_responses  → agency_id (mock loueur ID, pas encore UUID)
 *   request_documents → accès via request_id (pas de colonne user_id)
 *   notifications     → agency_id (mock loueur ID, pas encore UUID)
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync }  from 'fs'
import { resolve }       from 'path'
import { randomUUID }    from 'crypto'

// ── Config ────────────────────────────────────────────────────────────────────

const ENV = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }),
)

const URL  = ENV.NEXT_PUBLIC_SUPABASE_URL
const ANON = ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SVC  = ENV.SUPABASE_SERVICE_ROLE_KEY

if (!URL || !ANON || !SVC) { console.error('❌ Variables manquantes dans .env.local'); process.exit(1) }

const admin = createClient(URL, SVC, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const USERS = {
  assisteur: { email: 'rls-test-assisteur@drives-on.fr', password: 'RlsTest2024!', role: 'assisteur', name: 'Test Assisteur', company: 'Mutualia Test' },
  loueur:    { email: 'rls-test-loueur@drives-on.fr',    password: 'RlsTest2024!', role: 'loueur',    name: 'Test Loueur',    company: 'AutoLoc Test'   },
  admin:     { email: 'rls-test-admin@drives-on.fr',     password: 'RlsTest2024!', role: 'admin',     name: 'Test Admin',     company: 'Drives On'      },
}

// ── Résultats ─────────────────────────────────────────────────────────────────

let passed = 0, failed = 0
const failures = []

function ok(id, desc)         { console.log(`  ✅ ${id.padEnd(4)} ${desc}`); passed++ }
function ko(id, desc, d = {}) {
  console.log(`  ❌ ${id.padEnd(4)} ${desc}`)
  const lines = []
  if (d.role    ) lines.push(`rôle     : ${d.role}`)
  if (d.query   ) lines.push(`requête  : ${d.query}`)
  if (d.expected) lines.push(`attendu  : ${d.expected}`)
  if (d.got     ) lines.push(`obtenu   : ${d.got}`)
  if (d.data !== undefined) lines.push(`data     : ${JSON.stringify(d.data)}`)
  const e = d.error
  lines.push(`err.code : ${e?.code    ?? 'null'}`)
  lines.push(`err.msg  : ${e?.message ?? 'null'}`)
  lines.push(`err.det  : ${e?.details ?? 'null'}`)
  lines.push(`err.hint : ${e?.hint    ?? 'null'}`)
  lines.forEach((l, i) => console.log(`       ${i === lines.length - 1 ? '└─' : '├─'} ${l}`))
  failed++
  failures.push({ id, desc, d })
}
function section(t) { console.log(`\n── ${t} ${'─'.repeat(Math.max(0, 52 - t.length))}`) }
function assert(id, desc, cond, detail = {}) { cond ? ok(id, desc) : ko(id, desc, typeof detail === 'string' ? { error: { message: detail } } : detail) }

// ── Helpers ───────────────────────────────────────────────────────────────────

async function signInClient(email, password) {
  const c = createClient(URL, ANON, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data, error } = await c.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`signIn(${email}): ${error.message}`)
  return c
}

async function cleanup(ids = {}) {
  // Supprimer données de test
  if (ids.requestId) {
    await admin.from('rental_responses').delete().eq('request_id', ids.requestId)
    await admin.from('request_documents').delete().eq('request_id', ids.requestId)
    await admin.from('assistance_requests').delete().eq('id', ids.requestId)
  }
  if (ids.otherRequestId) {
    await admin.from('rental_responses').delete().eq('request_id', ids.otherRequestId)
    await admin.from('assistance_requests').delete().eq('id', ids.otherRequestId)
  }
  // Supprimer comptes de test
  for (const u of Object.values(USERS)) {
    const { data } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const user = data?.users?.find(x => x.email === u.email)
    if (user) await admin.auth.admin.deleteUser(user.id)
  }
}

// ── 0. Vérifier migrations ────────────────────────────────────────────────────

async function checkMigrations() {
  section('0. Vérification des migrations')
  let allOk = true

  const { error: e1 } = await admin.from('profiles').select('id').limit(1)
  const profilesOk = !e1 || e1.code === 'PGRST116'
  assert('M1', 'Table profiles présente', profilesOk, e1?.message)
  if (!profilesOk) allOk = false

  const { error: e2 } = await admin.rpc('get_user_role')
  const fnOk = !e2 || e2.code === 'PGRST116'
  assert('M2', 'Fonction get_user_role() présente', fnOk, e2?.message)
  if (!fnOk) allOk = false

  // Vérifier que les policies RLS sont actives sur assistance_requests
  const { error: e3 } = await admin.from('assistance_requests').select('id').limit(1)
  assert('M3', 'Table assistance_requests accessible', !e3, e3?.message)

  if (!allOk) {
    console.log('\n⛔ Migrations incomplètes — relancer APPLY_IN_SUPABASE_SQL_EDITOR.sql\n')
    process.exit(1)
  }
}

// ── 1. Créer les 3 comptes de test ───────────────────────────────────────────

async function createUsers() {
  section('1. Création des comptes de test')
  const ids = {}

  for (const [key, u] of Object.entries(USERS)) {
    const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const existing = list?.users?.find(x => x.email === u.email)
    if (existing) await admin.auth.admin.deleteUser(existing.id)

    const roleForMeta = u.role === 'admin' ? 'assisteur' : u.role // trigger bloque 'admin'
    const { data, error } = await admin.auth.admin.createUser({
      email: u.email, password: u.password, email_confirm: true,
      user_metadata: { role: roleForMeta, full_name: u.name, company_name: u.company },
    })
    if (error || !data?.user) { ko('C', `Créer ${key}`, error?.message); continue }
    ids[key] = data.user.id
    ok('C', `Créer ${key} (${u.email})`)
  }

  // Promouvoir admin via service role (auth.uid() IS NULL → trigger autorise)
  if (ids.admin) {
    const { error } = await admin.from('profiles').update({ role: 'admin' }).eq('id', ids.admin)
    assert('C', 'Promouvoir admin → role=admin (service role)', !error, error?.message)
  }

  return ids
}

// ── 2. Tests RLS ──────────────────────────────────────────────────────────────

async function runTests(ids) {
  let ac, lc, admc
  try {
    ac   = await signInClient(USERS.assisteur.email, USERS.assisteur.password)
    lc   = await signInClient(USERS.loueur.email,    USERS.loueur.password)
    admc = await signInClient(USERS.admin.email,     USERS.admin.password)
  } catch (e) { console.error('❌ Connexion impossible :', e.message); return {} }

  // ── Injecter demande de test (service role bypass RLS) ──────────────────
  const { data: req, error: reqErr } = await admin
    .from('assistance_requests')
    .insert({
      id: randomUUID(),
      status: 'envoyee', request_type: 'immediate', dossier_number: 'RLS-TEST-001',
      sinistre: { firstName: 'Test', lastName: 'RLS', phone: '0600000000' },
      location: { address: '1 rue Test', city: 'Paris', postalCode: '75001', lat: 48.86, lng: 2.35 },
      vehicle_category: 'berline', duration_days: 3,
      date_needed: new Date().toISOString(),
      coverage: { type: 'full' },
      created_by_user_id: ids.assisteur,
    })
    .select('id').single()
  const requestId = req?.id
  assert('S', 'Injecter demande de test (service role)', !reqErr && !!requestId, reqErr?.message)

  // ── Demande appartenant à un autre utilisateur fictif ───────────────────
  const { data: otherReq, error: otherReqErr } = await admin
    .from('assistance_requests')
    .insert({
      id: randomUUID(),
      status: 'envoyee', request_type: 'immediate', dossier_number: 'RLS-OTHER-001',
      sinistre: {}, location: {}, vehicle_category: 'berline', duration_days: 1,
      date_needed: new Date().toISOString(), coverage: {},
      created_by_user_id: 'other-user-00000000-0000-0000-0000-000000000000',
    })
    .select('id, created_by_user_id').single()
  const otherRequestId = otherReq?.id
  if (otherReqErr) console.log(`  ⚠️  INSERT other request échoué: [${otherReqErr.code}] ${otherReqErr.message}`)
  if (otherReq) console.log(`  🔍 other row en DB: id=${otherReq.id}  created_by_user_id=${otherReq.created_by_user_id}`)

  // ── Vérifier la valeur réelle stockée en DB (confirme si trigger a écrasé) ─
  if (otherReq?.id) {
    const { data: dbRow } = await admin.from('assistance_requests').select('id, created_by_user_id').eq('id', otherReq.id).single()
    console.log(`  🔍 DB row lue avec service role: created_by_user_id=${dbRow?.created_by_user_id}`)
  }

  // ── profiles ─────────────────────────────────────────────────────────────
  section('2. profiles — isolation')

  for (const [key, client, uid] of [['assisteur', ac, ids.assisteur], ['loueur', lc, ids.loueur], ['admin', admc, ids.admin]]) {
    const { data, error } = await client.from('profiles').select('id, role').eq('id', uid).single()
    assert('T01', `${key} lit son propre profil`, !!data && data.role && !error, error?.message)
  }

  // Assisteur voit les profils loueurs (needed for matching)
  const { data: loueurProf } = await ac.from('profiles').select('id').eq('id', ids.loueur)
  assert('T02', 'Assisteur voit profil loueur (matching)', Array.isArray(loueurProf) && loueurProf.length > 0)

  // Loueur ne voit PAS le profil assisteur
  const { data: assProf } = await lc.from('profiles').select('id').eq('id', ids.assisteur)
  assert('T03', 'Loueur ne voit PAS profil assisteur', !assProf || assProf.length === 0)

  // ── assistance_requests ───────────────────────────────────────────────────
  section('3. assistance_requests — périmètre')

  // Assisteur lit sa propre demande
  if (requestId) {
    const { data, error } = await ac.from('assistance_requests').select('id').eq('id', requestId).single()
    assert('T04', 'Assisteur lit sa propre demande', !!data && !error, error?.message)
  }

  // Assisteur ne voit PAS la demande d'un autre
  if (otherRequestId) {
    const { data: t05data, error: t05err } = await ac.from('assistance_requests').select('id').eq('id', otherRequestId)
    assert('T05', 'Assisteur ne voit PAS les demandes des autres', !t05data || t05data.length === 0, {
      role:     `assisteur (uid: ${ids.assisteur})`,
      query:    `SELECT id FROM assistance_requests WHERE id = '${otherRequestId}'  (created_by='other-user-000…')`,
      expected: 'blocage — tableau vide',
      got:      t05data?.length > 0 ? `${t05data.length} ligne(s) retournée(s) — RLS ne bloque PAS` : 'vide',
      data:     t05data,
      error:    t05err,
    })
  }

  // Assisteur ne peut PAS créer avec l'ID d'un autre
  const { error: stealErr } = await ac.from('assistance_requests').insert({
    status: 'envoyee', request_type: 'immediate', dossier_number: 'STEAL-001',
    sinistre: {}, location: {}, vehicle_category: 'berline', duration_days: 1,
    date_needed: new Date().toISOString(), coverage: {},
    created_by_user_id: ids.loueur,  // usurpation
  })
  assert('T06', 'Assisteur ne peut PAS créer avec un autre user_id', !!stealErr, 'attendu: erreur RLS')

  // Loueur lit toutes les demandes (matching)
  if (requestId) {
    const { data } = await lc.from('assistance_requests').select('id').eq('id', requestId)
    assert('T07', 'Loueur lit les demandes (matching)', Array.isArray(data) && data.length > 0)
  }

  // Loueur ne peut PAS créer une demande
  const { error: loueurInsertErr } = await lc.from('assistance_requests').insert({
    status: 'envoyee', request_type: 'immediate', dossier_number: 'LOUEUR-INSERT-FAIL',
    sinistre: {}, location: {}, vehicle_category: 'berline', duration_days: 1,
    date_needed: new Date().toISOString(), coverage: {},
    created_by_user_id: ids.loueur,
  })
  assert('T08', 'Loueur ne peut PAS créer une demande', !!loueurInsertErr, 'attendu: erreur RLS ar_assisteur_insert')

  // ── rental_responses ──────────────────────────────────────────────────────
  section('4. rental_responses — isolation assisteur')

  if (requestId) {
    // Injecter réponse de test (colonnes réelles : request_id, agency_id, status)
    const { error: rrInsertErr } = await admin.from('rental_responses').insert({
      id: randomUUID(), request_id: requestId, agency_id: 'ag-test-001', status: 'en_attente',
    })
    if (rrInsertErr) console.log(`  ⚠️  INSERT rental_responses échoué: [${rrInsertErr.code}] ${rrInsertErr.message} — ${rrInsertErr.details}`)

    // Assisteur voit les réponses de SA demande
    const { data: rrOwn, error: t09err } = await ac.from('rental_responses').select('id').eq('request_id', requestId)
    assert('T09', 'Assisteur voit réponses de sa propre demande', Array.isArray(rrOwn) && rrOwn.length > 0, {
      role:     `assisteur (uid: ${ids.assisteur})`,
      query:    `SELECT id FROM rental_responses WHERE request_id = '${requestId}'`,
      expected: 'succès — au moins 1 réponse (insérée par service role)',
      got:      Array.isArray(rrOwn) ? `tableau vide — RLS bloque à tort` : 'null',
      data:     rrOwn,
      error:    t09err,
    })

    // Assisteur ne voit PAS les réponses d'une autre demande
    if (otherRequestId) {
      const { error: rrOtherErr } = await admin.from('rental_responses').insert({
        id: randomUUID(), request_id: otherRequestId, agency_id: 'ag-test-002', status: 'en_attente',
      })
      if (rrOtherErr) console.log(`  ⚠️  INSERT rental_responses (other) échoué: [${rrOtherErr.code}] ${rrOtherErr.message} — ${rrOtherErr.details}`)
      const { data: rrOther } = await ac.from('rental_responses').select('id').eq('request_id', otherRequestId)
      assert('T10', 'Assisteur ne voit PAS réponses des autres demandes', !rrOther || rrOther.length === 0)
    }
  }

  // ── request_documents ─────────────────────────────────────────────────────
  section('5. request_documents — périmètre')

  if (requestId) {
    // Injecter document de test (colonnes réelles : request_id, type, owner, file_name, url)
    const { error: rdInsertErr } = await admin.from('request_documents').insert({
      id: randomUUID(), request_id: requestId, type: 'prise_en_charge', owner: 'assisteur',
      file_name: 'test.pdf', url: 'https://example.com/test.pdf',
    })
    if (rdInsertErr) console.log(`  ⚠️  INSERT request_documents échoué: [${rdInsertErr.code}] ${rdInsertErr.message} — ${rdInsertErr.details}`)

    // Assisteur voit les docs de sa demande
    const { data: docsOwn, error: t11err } = await ac.from('request_documents').select('id').eq('request_id', requestId)
    assert('T11', 'Assisteur voit docs de sa propre demande', Array.isArray(docsOwn) && docsOwn.length > 0, {
      role:     `assisteur (uid: ${ids.assisteur})`,
      query:    `SELECT id FROM request_documents WHERE request_id = '${requestId}'`,
      expected: 'succès — au moins 1 doc (inséré par service role)',
      got:      Array.isArray(docsOwn) ? `tableau vide — RLS bloque à tort` : 'null',
      data:     docsOwn,
      error:    t11err,
    })

    // Loueur voit les docs (matching)
    const { data: docsLoueur, error: t12err } = await lc.from('request_documents').select('id').eq('request_id', requestId)
    assert('T12', 'Loueur voit docs des demandes (accès matching)', Array.isArray(docsLoueur) && docsLoueur.length > 0, {
      role:     `loueur (uid: ${ids.loueur})`,
      query:    `SELECT id FROM request_documents WHERE request_id = '${requestId}'`,
      expected: 'succès — au moins 1 doc (get_user_role()=loueur doit autoriser)',
      got:      Array.isArray(docsLoueur) ? `tableau vide — RLS bloque à tort` : 'null',
      data:     docsLoueur,
      error:    t12err,
    })
  }

  // ── Sécurité — escalade de rôle ───────────────────────────────────────────
  section('6. Sécurité — escalade de rôle')

  const { error: escErr1 } = await ac.from('profiles').update({ role: 'admin' }).eq('id', ids.assisteur)
  assert('T13', 'Assisteur ne peut PAS se promouvoir admin (trigger)', !!escErr1, escErr1 ? escErr1.message.slice(0, 80) : 'aucune erreur — FAIL')

  const { error: escErr2 } = await lc.from('profiles').update({ role: 'assisteur' }).eq('id', ids.loueur)
  assert('T14', 'Loueur ne peut PAS changer son rôle (trigger)', !!escErr2, escErr2 ? escErr2.message.slice(0, 80) : 'aucune erreur — FAIL')

  // ── Signup avec role=admin → bloqué par trigger ───────────────────────────
  section('7. Trigger handle_new_user — admin bloqué')

  const tmpEmail = 'rls-test-tmp@drives-on.fr'
  const { data: tmpData } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const tmpExisting = tmpData?.users?.find(x => x.email === tmpEmail)
  if (tmpExisting) await admin.auth.admin.deleteUser(tmpExisting.id)

  const { data: tmpUser } = await admin.auth.admin.createUser({
    email: tmpEmail, password: 'Tmp2024!', email_confirm: true,
    user_metadata: { role: 'admin', full_name: 'Tmp Admin', company_name: 'Test' },
  })
  if (tmpUser?.user) {
    const { data: tmpProf } = await admin.from('profiles').select('role').eq('id', tmpUser.user.id).single()
    assert('T15', 'Signup role=admin → profil créé comme assisteur', tmpProf?.role === 'assisteur', `role obtenu: ${tmpProf?.role}`)
    await admin.auth.admin.deleteUser(tmpUser.user.id)
  }

  // ── Admin — accès total ────────────────────────────────────────────────────
  section('8. Admin — accès total')

  const { data: allProfiles } = await admc.from('profiles').select('id')
  assert('T16', 'Admin lit tous les profils', Array.isArray(allProfiles) && allProfiles.length >= 3)

  if (requestId) {
    const { data: allReq } = await admc.from('assistance_requests').select('id').eq('id', requestId)
    assert('T17', 'Admin lit toutes les demandes', Array.isArray(allReq) && allReq.length > 0)
  }

  const { data: allResp } = await admc.from('rental_responses').select('id')
  assert('T18', 'Admin lit toutes les réponses', Array.isArray(allResp))

  return { requestId, otherRequestId }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════╗')
  console.log('║       DRIVES ON — Test RLS Matrix v2                ║')
  console.log('╚══════════════════════════════════════════════════════╝')

  await checkMigrations()
  const ids = await createUsers()

  if (!Object.values(ids).every(Boolean)) {
    console.log('\n⛔ Impossible de créer tous les comptes — abandon.')
    await cleanup(); process.exit(1)
  }

  const dataIds = await runTests(ids)

  section('9. Nettoyage')
  await cleanup({ ...ids, ...dataIds })
  ok('X', 'Comptes et données de test supprimés')

  console.log('\n╔══════════════════════════════════════════════════════╗')
  console.log(`║  RÉSULTAT : ${String(passed).padEnd(2)} passés  /  ${String(failed).padEnd(2)} échoués                 ║`)
  console.log('╚══════════════════════════════════════════════════════╝')

  if (failed > 0) {
    console.log('\n╔══════════════════════════════════════════════════════╗')
    console.log('║  DÉTAIL DES ÉCHECS                                   ║')
    console.log('╚══════════════════════════════════════════════════════╝')
    failures.forEach(({ id, desc, d }) => {
      console.log(`\n  ❌ ${id.padEnd(4)} ${desc}`)
      const lines = []
      if (d.role    ) lines.push(`rôle     : ${d.role}`)
      if (d.query   ) lines.push(`requête  : ${d.query}`)
      if (d.expected) lines.push(`attendu  : ${d.expected}`)
      if (d.got     ) lines.push(`obtenu   : ${d.got}`)
      if (d.data !== undefined) lines.push(`data     : ${JSON.stringify(d.data)}`)
      const e = d.error
      lines.push(`err.code : ${e?.code    ?? 'null'}`)
      lines.push(`err.msg  : ${e?.message ?? 'null'}`)
      lines.push(`err.det  : ${e?.details ?? 'null'}`)
      lines.push(`err.hint : ${e?.hint    ?? 'null'}`)
      lines.forEach((l, i) => console.log(`       ${i === lines.length - 1 ? '└─' : '├─'} ${l}`))
    })
    process.exit(1)
  } else {
    console.log('\n✅ Matrice RLS entièrement validée.')
  }
}

main().catch(e => {
  console.error('\n💥 Erreur fatale :', e.message)
  cleanup().finally(() => process.exit(1))
})
