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
    color:    'text-blue-400',
    bg:       'bg-blue-500/10',
    border:   'border-blue-500/20 hover:border-blue-500/50',
    glow:     'group-hover:bg-blue-600/5',
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
    color:    'text-violet-400',
    bg:       'bg-violet-500/10',
    border:   'border-violet-500/20 hover:border-violet-500/50',
    glow:     'group-hover:bg-violet-600/5',
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
    color:    'text-orange-400',
    bg:       'bg-orange-500/10',
    border:   'border-orange-500/20 hover:border-orange-500/50',
    glow:     'group-hover:bg-orange-600/5',
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
    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 text-center">
      {children}
    </p>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-slate-950 flex flex-col overflow-x-hidden">

      {/* ── Background décoratif ── */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />
        <div className="absolute -top-60 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-brand-500/8 rounded-full blur-3xl" />
        <div className="absolute top-[40vh] -left-32 w-80 h-80 bg-blue-600/8 rounded-full blur-3xl" />
        <div className="absolute top-[70vh] -right-32 w-80 h-80 bg-violet-600/8 rounded-full blur-3xl" />
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          NAV
      ══════════════════════════════════════════════════════════════════════ */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-6xl mx-auto w-full">
        <DrivesOnLogo variant="dark" size="sm" />
        <div className="flex items-center gap-3">
          <Link
            href="/demande-acces"
            className="text-sm font-medium text-slate-400 hover:text-white transition-colors hidden sm:block"
          >
            Devenir partenaire
          </Link>
          <Link
            href="/login"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold transition-colors"
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
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand-500/30 bg-brand-500/10">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
            <span className="text-xs font-semibold text-brand-400">Plateforme B2B · Véhicules de remplacement</span>
          </div>

          {/* Headline */}
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.08] tracking-tight">
              Un véhicule de remplacement<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-orange-400 to-amber-300">
                pour votre client en 2 min
              </span>
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed max-w-xl mx-auto">
              DRIVES ON connecte les professionnels — assistances, agents d'assurance et garages —
              avec un réseau de loueurs indépendants disponibles près de leur client.
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Link
              href="/login"
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-base transition-all shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30 hover:-translate-y-px"
            >
              Accéder à mon espace
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/demande-acces"
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-semibold text-base transition-all"
            >
              Demander un accès
            </Link>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-0 mt-4 divide-x divide-slate-800">
            {STATS.map(s => (
              <div key={s.label} className="flex flex-col items-center px-6 py-2">
                <span className="text-2xl font-black text-white tabular-nums">{s.value}</span>
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
            <h2 className="text-2xl sm:text-3xl font-black text-white text-center">
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
                className={`group relative flex flex-col gap-5 p-6 rounded-2xl border bg-slate-900/40 transition-all duration-200 overflow-hidden ${border}`}
              >
                <div className={`absolute inset-0 transition-colors duration-200 ${glow}`} />
                <div className="relative">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${bg}`}>
                    <Icon className={`w-5 h-5 ${color}`} strokeWidth={2} />
                  </div>
                </div>
                <div className="relative flex flex-col gap-2">
                  <p className={`text-xs font-bold uppercase tracking-wide ${color}`}>{label}</p>
                  <p className="text-base font-black text-white leading-snug">{tagline}</p>
                </div>
                <ul className="relative flex flex-col gap-2">
                  {perks.map(p => (
                    <li key={p} className="flex items-start gap-2 text-xs text-slate-400">
                      <CheckCircle2 className={`w-3.5 h-3.5 ${color} shrink-0 mt-0.5`} />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Loueur — card horizontale pleine largeur */}
          <div className="group relative flex flex-col sm:flex-row items-center gap-6 p-6 rounded-2xl border border-brand-500/20 hover:border-brand-500/50 bg-slate-900/40 overflow-hidden transition-all duration-200">
            <div className="absolute inset-0 group-hover:bg-brand-600/5 transition-colors duration-200" />
            <div className="relative w-11 h-11 rounded-xl flex items-center justify-center bg-brand-500/10 shrink-0">
              <Truck className="w-5 h-5 text-brand-400" strokeWidth={2} />
            </div>
            <div className="relative flex-1 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-wide text-brand-400">Loueurs indépendants</p>
                <p className="text-base font-black text-white mt-1">Développez votre activité sans démarchage</p>
                <p className="text-xs text-slate-400 mt-1">Recevez des demandes qualifiées, gérez vos tarifs et votre flotte depuis un seul espace.</p>
              </div>
              <Link
                href="/login"
                className="relative shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold transition-colors"
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
            <h2 className="text-2xl sm:text-3xl font-black text-white text-center">
              Simple des deux côtés
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">

            {/* Côté pro */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <p className="text-sm font-bold text-slate-300">Côté professionnel demandeur</p>
              </div>
              {HOW_STEPS_PRO.map((step, i) => (
                <div key={step.n} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-black text-blue-400">{step.n}</span>
                    </div>
                    {i < HOW_STEPS_PRO.length - 1 && (
                      <div className="w-0.5 flex-1 min-h-[24px] bg-slate-800 mt-1" />
                    )}
                  </div>
                  <div className="pb-4">
                    <p className="text-sm font-bold text-slate-200">{step.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Côté loueur */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-brand-500/15 flex items-center justify-center">
                  <Truck className="w-3.5 h-3.5 text-brand-400" />
                </div>
                <p className="text-sm font-bold text-slate-300">Côté loueur indépendant</p>
              </div>
              {HOW_STEPS_LOUEUR.map((step, i) => (
                <div key={step.n} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-brand-500/15 border border-brand-500/30 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-black text-brand-400">{step.n}</span>
                    </div>
                    {i < HOW_STEPS_LOUEUR.length - 1 && (
                      <div className="w-0.5 flex-1 min-h-[24px] bg-slate-800 mt-1" />
                    )}
                  </div>
                  <div className="pb-4">
                    <p className="text-sm font-bold text-slate-200">{step.title}</p>
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
            <h2 className="text-2xl sm:text-3xl font-black text-white text-center">
              Tout ce dont vous avez besoin
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="flex flex-col gap-3 p-5 rounded-2xl border border-slate-800 bg-slate-900/30 hover:border-slate-700 hover:bg-slate-900/60 transition-all duration-200"
              >
                <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-200">{title}</p>
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
            <h2 className="text-2xl sm:text-3xl font-black text-white text-center">
              Accédez à votre espace
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/login"
              className="group relative flex flex-col gap-5 p-7 rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-600/10 to-indigo-600/5 hover:border-blue-500/60 transition-all duration-200 overflow-hidden"
            >
              <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-white/[0.03] to-transparent" />
              <div className="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-blue-400" strokeWidth={2} />
              </div>
              <div className="space-y-1.5">
                <p className="font-black text-white text-lg">Espace Pro</p>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Assistance, agent d'assurance ou garage — créez une demande en 2 minutes pour votre client.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 group-hover:text-blue-400 transition-colors">
                Accéder
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>

            <Link
              href="/login"
              className="group relative flex flex-col gap-5 p-7 rounded-2xl border border-brand-500/30 bg-gradient-to-br from-brand-500/10 to-orange-600/5 hover:border-brand-500/60 transition-all duration-200 overflow-hidden"
            >
              <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-white/[0.03] to-transparent" />
              <div className="w-12 h-12 rounded-xl bg-brand-500/15 flex items-center justify-center">
                <Truck className="w-5 h-5 text-brand-400" strokeWidth={2} />
              </div>
              <div className="space-y-1.5">
                <p className="font-black text-white text-lg">Espace Loueur</p>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Recevez des demandes qualifiées proches de vous, gérez votre flotte et vos tarifs.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 group-hover:text-brand-400 transition-colors">
                Accéder
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          </div>

          {/* Devenir partenaire */}
          <div className="flex flex-col items-center gap-4 py-8 border-t border-slate-800/60">
            <p className="text-sm text-slate-500 text-center">
              Pas encore partenaire ? Rejoignez le réseau DRIVES ON.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Link
                href="/demande-acces"
                className="group flex items-center gap-2.5 px-5 py-3 rounded-xl border border-slate-700 hover:border-blue-500/50 bg-slate-900/60 hover:bg-blue-600/5 transition-all duration-200"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-300">Professionnel demandeur</p>
                  <p className="text-[11px] text-slate-500">Assistance, assurance ou garage</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-blue-400 transition-colors ml-1" />
              </Link>
              <Link
                href="/demande-acces"
                className="group flex items-center gap-2.5 px-5 py-3 rounded-xl border border-slate-700 hover:border-brand-500/50 bg-slate-900/60 hover:bg-brand-500/5 transition-all duration-200"
              >
                <div className="w-7 h-7 rounded-lg bg-brand-500/10 flex items-center justify-center">
                  <Truck className="w-3.5 h-3.5 text-brand-400" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-300">Loueur indépendant</p>
                  <p className="text-[11px] text-slate-500">Rejoindre le réseau DRIVES ON</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-brand-400 transition-colors ml-1" />
              </Link>
            </div>
          </div>
        </section>

      </main>

      {/* ══════════════════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════════════════ */}
      <footer className="relative border-t border-slate-800/60 px-6 py-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <DrivesOnLogo variant="dark" size="sm" />
          <div className="flex items-center gap-6 text-xs text-slate-600">
            <span>© {new Date().getFullYear()} Drives On</span>
            <span>Version démo — données simulées</span>
            <Link href="/admin" className="hover:text-slate-400 transition-colors">Admin</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
