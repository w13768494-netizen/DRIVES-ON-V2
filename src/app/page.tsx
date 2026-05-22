import Link from 'next/link'
import { DrivesOnLogo } from '@/components/shared/DrivesOnLogo'
import {
  ArrowRight, ShieldCheck, Truck, Clock, FileCheck, Zap,
  Building2, Wrench, MapPin, CheckCircle2, ChevronRight,
  Users, BarChart2,
} from 'lucide-react'

// ── Data ──────────────────────────────────────────────────────────────────────

const STATS = [
  { value: '< 2 min',  label: 'Mise en relation' },
  { value: '98 %',     label: 'Taux de couverture' },
  { value: '24 / 7',   label: 'Disponibilité' },
  { value: '350 +',    label: 'Loueurs partenaires' },
]

const PROFILES = [
  {
    icon:     ShieldCheck,
    label:    'Assistances & assurances',
    tagline:  'Gérez vos sinistres sereinement',
    perks:    [
      'Prise en charge partielle ou totale',
      'Traçabilité complète du dossier',
      'Documents centralisés et validés',
    ],
    color:    'text-blue-700',
    bg:       'bg-blue-50',
    border:   'border-blue-100 hover:border-blue-300',
    glow:     'group-hover:bg-blue-50/60',
  },
  {
    icon:     Building2,
    label:    'Agents d\'assurance',
    tagline:  'Servez vos clients assurés en 2 min',
    perks:    [
      'Selon les termes du contrat',
      'Historique par client et par dossier',
      'Facturation simplifiée',
    ],
    color:    'text-violet-600',
    bg:       'bg-violet-50',
    border:   'border-violet-100 hover:border-violet-300',
    glow:     'group-hover:bg-violet-50/60',
  },
  {
    icon:     Wrench,
    label:    'Garages & réparateurs',
    tagline:  'Zéro véhicule de courtoisie ? Zéro problème.',
    perks:    [
      'Loueur partenaire en quelques clics',
      'Aucun stock à gérer',
      'Aucune PEC obligatoire',
    ],
    color:    'text-orange-600',
    bg:       'bg-orange-50',
    border:   'border-orange-100 hover:border-orange-300',
    glow:     'group-hover:bg-orange-50/60',
  },
]

const HOW_STEPS_PRO = [
  { n: '01', title: 'Créez la demande',   body: 'Saisissez les infos du client, le lieu de panne et le type de véhicule souhaité. Moins de 2 minutes.' },
  { n: '02', title: 'Recevez les offres', body: 'Les loueurs disponibles proches du client répondent en temps réel avec leur tarif et leur modèle.' },
  { n: '03', title: 'Confirmez & suivez', body: "Validez l'offre, suivez l'état du dossier et récupérez tous les documents en un seul endroit." },
]

const HOW_STEPS_LOUEUR = [
  { n: '01', title: 'Recevez la demande', body: "Notification instantanée dès qu'une demande correspond à votre zone et votre flotte disponible." },
  { n: '02', title: 'Répondez en 1 clic', body: 'Proposez votre tarif, sélectionnez le modèle et confirmez la disponibilité en quelques secondes.' },
  { n: '03', title: 'Gérez & facturez',   body: 'Contrats, états des lieux, retour et facture — tout est centralisé dans votre espace loueur.' },
]

const FEATURES = [
  { icon: Zap,         title: 'Mise en relation ultra-rapide', body: "Moins de 2 minutes entre la demande et la première réponse d'un loueur partenaire." },
  { icon: MapPin,      title: 'Géolocalisation intelligente',  body: 'Seuls les loueurs réellement proches du lieu de panne reçoivent la demande.' },
  { icon: FileCheck,   title: 'Documents centralisés',         body: 'PEC, contrat, états des lieux, facture — tout dans un seul dossier numérique.' },
  { icon: Clock,       title: 'Suivi en temps réel',           body: 'Timeline du dossier mise à jour à chaque étape, des deux côtés.' },
  { icon: BarChart2,   title: 'Tableau de bord complet',       body: 'KPIs, historique, exports — visibilité totale sur votre activité.' },
  { icon: Users,       title: 'Multi-utilisateurs',            body: 'Gérez plusieurs agences ou collaborateurs depuis un seul compte.' },
]


// ── Composants internes ───────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700 text-center">
      {children}
    </p>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-slate-50 flex flex-col overflow-x-hidden">

      {/* ── Background décoratif ── */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(0,0,0,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,1) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />
        {/* Blob bleu logo au-dessus */}
        <div
          className="absolute -top-60 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full blur-3xl opacity-[0.12]"
          style={{ background: 'linear-gradient(135deg, #2B45D4, #9B89F9)' }}
        />
        <div className="absolute top-[40vh] -left-32 w-80 h-80 bg-blue-600/6 rounded-full blur-3xl" />
        <div className="absolute top-[70vh] -right-32 w-80 h-80 bg-violet-500/6 rounded-full blur-3xl" />
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          NAV
      ══════════════════════════════════════════════════════════════════════ */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-6xl mx-auto w-full">
        <DrivesOnLogo variant="light" size="sm" />
        <div className="flex items-center gap-3">
          <Link
            href="/demande-acces"
            className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors hidden sm:block"
          >
            Devenir partenaire
          </Link>
          <Link
            href="/login"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-bold transition-all hover:-translate-y-px"
            style={{ background: 'linear-gradient(135deg, #2B45D4, #6B5DD3)' }}
          >
            Se connecter
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════════════════ */}
      <main className="relative flex-1 flex flex-col items-center">

        <section className="w-full max-w-4xl mx-auto px-6 pt-16 pb-20 flex flex-col items-center gap-8 text-center">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-200 bg-blue-50">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            <span className="text-xs font-semibold text-blue-700">Plateforme B2B · Véhicules de remplacement</span>
          </div>

          {/* Headline */}
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 leading-[1.08] tracking-tight">
              Un véhicule de remplacement<br />
              <span
                className="text-transparent bg-clip-text"
                style={{ backgroundImage: 'linear-gradient(135deg, #2B45D4 0%, #7B6FE8 50%, #9B89F9 100%)' }}
              >
                pour votre client en 2 min
              </span>
            </h1>
            <p className="text-slate-600 text-lg leading-relaxed max-w-xl mx-auto">
              DRIVES ON connecte les professionnels — assistances, agents d'assurance et garages —
              avec un réseau de loueurs indépendants disponibles près de leur client.
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Link
              href="/login"
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl text-white font-bold text-base transition-all shadow-lg hover:shadow-xl hover:-translate-y-px"
              style={{ background: 'linear-gradient(135deg, #2B45D4, #6B5DD3)', boxShadow: '0 8px 24px rgba(43,69,212,0.25)' }}
            >
              Accéder à mon espace
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/demande-acces"
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl border border-slate-300 hover:border-blue-300 text-slate-700 hover:text-blue-700 font-semibold text-base transition-all"
            >
              Demander un accès
            </Link>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-0 mt-4 divide-x divide-slate-200">
            {STATS.map(s => (
              <div key={s.label} className="flex flex-col items-center px-6 py-2">
                <span className="text-2xl font-black text-slate-900 tabular-nums">{s.value}</span>
                <span className="text-xs text-slate-500 mt-0.5 whitespace-nowrap">{s.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            POUR QUI ?
        ══════════════════════════════════════════════════════════════════ */}
        <section className="w-full max-w-5xl mx-auto px-6 py-16 flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <SectionLabel>Pour qui ?</SectionLabel>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 text-center">
              Fait pour les professionnels du terrain
            </h2>
            <p className="text-slate-500 text-sm text-center max-w-lg mx-auto">
              Quel que soit votre métier, DRIVES ON s'adapte à votre flux de travail.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {PROFILES.map(({ icon: Icon, label, tagline, perks, color, bg, border, glow }) => (
              <div
                key={label}
                className={`group relative flex flex-col gap-5 p-6 rounded-2xl border bg-white shadow-sm transition-all duration-200 overflow-hidden ${border}`}
              >
                <div className={`absolute inset-0 transition-colors duration-200 ${glow}`} />
                <div className="relative">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${bg}`}>
                    <Icon className={`w-5 h-5 ${color}`} strokeWidth={2} />
                  </div>
                </div>
                <div className="relative flex flex-col gap-2">
                  <p className={`text-xs font-bold uppercase tracking-wide ${color}`}>{label}</p>
                  <p className="text-base font-black text-slate-900 leading-snug">{tagline}</p>
                </div>
                <ul className="relative flex flex-col gap-2">
                  {perks.map(p => (
                    <li key={p} className="flex items-start gap-2 text-xs text-slate-600">
                      <CheckCircle2 className={`w-3.5 h-3.5 ${color} shrink-0 mt-0.5`} />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Loueur — card horizontale pleine largeur */}
          <div className="group relative flex flex-col sm:flex-row items-center gap-6 p-6 rounded-2xl border border-emerald-100 hover:border-emerald-300 bg-white shadow-sm overflow-hidden transition-all duration-200">
            <div className="absolute inset-0 group-hover:bg-emerald-50/30 transition-colors duration-200" />
            <div className="relative w-11 h-11 rounded-xl flex items-center justify-center bg-emerald-50 shrink-0">
              <Truck className="w-5 h-5 text-emerald-600" strokeWidth={2} />
            </div>
            <div className="relative flex-1 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">Loueurs indépendants</p>
                <p className="text-base font-black text-slate-900 mt-1">Développez votre activité sans démarchage</p>
                <p className="text-xs text-slate-500 mt-1">Recevez des demandes qualifiées, gérez vos tarifs et votre flotte depuis un seul espace.</p>
              </div>
              <Link
                href="/login"
                className="relative shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold transition-all hover:-translate-y-px"
                style={{ background: 'linear-gradient(135deg, #2B45D4, #6B5DD3)' }}
              >
                Espace Loueur
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            COMMENT ÇA MARCHE ?
        ══════════════════════════════════════════════════════════════════ */}
        <section className="w-full max-w-5xl mx-auto px-6 py-16 flex flex-col gap-12">
          <div className="flex flex-col gap-2">
            <SectionLabel>Comment ça marche ?</SectionLabel>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 text-center">
              Simple des deux côtés
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">

            {/* Côté pro */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
                </div>
                <p className="text-sm font-bold text-slate-700">Côté professionnel demandeur</p>
              </div>
              {HOW_STEPS_PRO.map((step, i) => (
                <div key={step.n} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-black text-blue-700">{step.n}</span>
                    </div>
                    {i < HOW_STEPS_PRO.length - 1 && (
                      <div className="w-0.5 flex-1 min-h-[24px] bg-slate-200 mt-1" />
                    )}
                  </div>
                  <div className="pb-4">
                    <p className="text-sm font-bold text-slate-900">{step.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Côté loueur */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
                  <Truck className="w-3.5 h-3.5 text-violet-600" />
                </div>
                <p className="text-sm font-bold text-slate-700">Côté loueur indépendant</p>
              </div>
              {HOW_STEPS_LOUEUR.map((step, i) => (
                <div key={step.n} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-violet-50 border border-violet-200 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-black text-violet-600">{step.n}</span>
                    </div>
                    {i < HOW_STEPS_LOUEUR.length - 1 && (
                      <div className="w-0.5 flex-1 min-h-[24px] bg-slate-200 mt-1" />
                    )}
                  </div>
                  <div className="pb-4">
                    <p className="text-sm font-bold text-slate-900">{step.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            FONCTIONNALITÉS
        ══════════════════════════════════════════════════════════════════ */}
        <section className="w-full max-w-5xl mx-auto px-6 py-16 flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <SectionLabel>Fonctionnalités</SectionLabel>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 text-center">
              Tout ce dont vous avez besoin
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="flex flex-col gap-3 p-5 rounded-2xl border border-slate-200 bg-white shadow-sm hover:border-blue-200 hover:shadow-md transition-all duration-200"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-blue-700" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{title}</p>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            CTA FINAL
        ══════════════════════════════════════════════════════════════════ */}
        <section className="w-full max-w-4xl mx-auto px-6 py-16 flex flex-col gap-10">

          {/* Portails principaux */}
          <div className="flex flex-col items-center gap-4">
            <SectionLabel>Prêt à commencer ?</SectionLabel>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 text-center">
              Accédez à votre espace
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Espace Pro — bleu */}
            <Link
              href="/login"
              className="group relative flex flex-col gap-5 p-7 rounded-2xl border border-blue-200 bg-blue-50/40 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 overflow-hidden"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-blue-700" strokeWidth={2} />
              </div>
              <div className="space-y-1.5">
                <p className="font-black text-slate-900 text-lg">Espace Pro</p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Assistance, agent d'assurance ou garage — créez une demande en 2 minutes pour votre client.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 group-hover:text-blue-700 transition-colors">
                Accéder
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>

            {/* Espace Loueur — violet (fin du dégradé logo) */}
            <Link
              href="/login"
              className="group relative flex flex-col gap-5 p-7 rounded-2xl border border-violet-200 bg-violet-50/40 hover:border-violet-300 hover:bg-violet-50 transition-all duration-200 overflow-hidden"
            >
              <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center">
                <Truck className="w-5 h-5 text-violet-600" strokeWidth={2} />
              </div>
              <div className="space-y-1.5">
                <p className="font-black text-slate-900 text-lg">Espace Loueur</p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Recevez des demandes qualifiées proches de vous, gérez votre flotte et vos tarifs.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 group-hover:text-violet-600 transition-colors">
                Accéder
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          </div>

          {/* Devenir partenaire */}
          <div className="flex flex-col items-center gap-4 py-8 border-t border-slate-200">
            <p className="text-sm text-slate-500 text-center">
              Pas encore partenaire ? Rejoignez le réseau DRIVES ON.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Link
                href="/demande-acces"
                className="group flex items-center gap-2.5 px-5 py-3 rounded-xl border border-slate-200 hover:border-blue-300 bg-white hover:bg-blue-50 transition-all duration-200"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-700">Professionnel demandeur</p>
                  <p className="text-[11px] text-slate-500">Assistance, assurance ou garage</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-700 transition-colors ml-1" />
              </Link>
              <Link
                href="/demande-acces"
                className="group flex items-center gap-2.5 px-5 py-3 rounded-xl border border-slate-200 hover:border-violet-300 bg-white hover:bg-violet-50 transition-all duration-200"
              >
                <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
                  <Truck className="w-3.5 h-3.5 text-violet-600" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-700">Loueur indépendant</p>
                  <p className="text-[11px] text-slate-500">Rejoindre le réseau DRIVES ON</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-violet-600 transition-colors ml-1" />
              </Link>
            </div>
          </div>
        </section>

      </main>

      {/* ══════════════════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════════════════ */}
      <footer className="relative border-t border-slate-200 bg-white px-6 py-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <DrivesOnLogo variant="light" size="sm" />
          <div className="flex items-center gap-6 text-xs text-slate-400">
            <span>© {new Date().getFullYear()} Drives On</span>
            <span>Version démo — données simulées</span>
            <Link href="/admin" className="hover:text-slate-600 transition-colors">Admin</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
