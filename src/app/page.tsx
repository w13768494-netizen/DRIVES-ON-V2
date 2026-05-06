import Link from 'next/link'
import { DrivesOnLogo } from '@/components/shared/DrivesOnLogo'
import { ArrowRight, ShieldCheck, Truck, Clock, FileCheck, Zap } from 'lucide-react'

const STATS = [
  { value: '< 2 min', label: 'Mise en relation' },
  { value: '100%',    label: 'Traçabilité' },
  { value: '24 / 7',  label: 'Disponibilité' },
]

const PORTALS = [
  {
    href:        '/login',
    icon:        ShieldCheck,
    label:       'Espace Assisteur',
    description: 'Créez et suivez vos demandes de véhicules de remplacement en temps réel.',
    gradient:    'from-blue-600/20 to-indigo-600/10',
    border:      'hover:border-blue-500/60',
    iconBg:      'bg-blue-500/15 text-blue-400',
    accent:      'group-hover:text-blue-400',
  },
  {
    href:        '/login',
    icon:        Truck,
    label:       'Espace Loueur',
    description: 'Réceptionnez et traitez les demandes, proposez des alternatives instantanément.',
    gradient:    'from-brand-500/20 to-orange-600/10',
    border:      'hover:border-brand-500/60',
    iconBg:      'bg-brand-500/15 text-brand-400',
    accent:      'group-hover:text-brand-400',
  },
]

export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-slate-950 flex flex-col overflow-hidden">

      {/* ── Background — grille + halo central ── */}
      <div className="pointer-events-none absolute inset-0">
        {/* Grille subtile */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        {/* Halo bleu centré en haut */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-600/10 rounded-full blur-3xl" />
        {/* Halo orange bas-droite */}
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-brand-500/8 rounded-full blur-3xl" />
      </div>

      {/* ── Contenu principal ── */}
      <main className="relative flex-1 flex flex-col items-center justify-center px-6 py-16 gap-14">

        {/* Hero */}
        <div className="flex flex-col items-center gap-5 text-center max-w-xl">
          <DrivesOnLogo variant="dark" size="lg" />

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight tracking-tight">
              La plateforme qui connecte<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-orange-400">
                assureurs et loueurs
              </span>
            </h1>
            <p className="text-slate-400 text-base leading-relaxed max-w-sm mx-auto">
              Gérez vos demandes de véhicules de remplacement en temps réel, de la création à la clôture.
            </p>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 mt-2 divide-x divide-slate-800">
            {STATS.map(s => (
              <div key={s.label} className="flex flex-col items-center px-4 first:pl-0 last:pr-0">
                <span className="text-xl font-black text-white">{s.value}</span>
                <span className="text-xs text-slate-500 mt-0.5 whitespace-nowrap">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Portails */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
          {PORTALS.map(({ href, icon: Icon, label, description, gradient, border, iconBg, accent }) => (
            <Link
              key={label}
              href={href}
              className={`group relative flex flex-col gap-5 p-6 rounded-2xl border border-slate-800 bg-gradient-to-br ${gradient} ${border} transition-all duration-200 overflow-hidden`}
            >
              {/* Shimmer on hover */}
              <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-white/[0.03] to-transparent rounded-2xl" />

              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconBg} shrink-0`}>
                <Icon className="w-5 h-5" strokeWidth={2} aria-hidden="true" />
              </div>

              <div className="space-y-1.5 flex-1">
                <p className="font-bold text-white text-base leading-snug">{label}</p>
                <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
              </div>

              <div className={`flex items-center gap-1.5 text-xs font-semibold text-slate-500 ${accent} transition-colors duration-200`}>
                Accéder
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
              </div>
            </Link>
          ))}
        </div>

        {/* Rejoindre */}
        <div className="w-full max-w-lg space-y-3">
          <p className="text-xs font-semibold text-slate-600 text-center uppercase tracking-widest">Pas encore partenaire ?</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href="/rejoindre/assisteur"
              className="group flex items-center gap-3 px-4 py-3.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-blue-500/50 hover:bg-blue-600/5 transition-all duration-200"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-300">Compagnie d'assurance</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Déposer une candidature</p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all duration-200 shrink-0" />
            </Link>
            <Link
              href="/rejoindre/loueur"
              className="group flex items-center gap-3 px-4 py-3.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-brand-500/50 hover:bg-brand-500/5 transition-all duration-200"
            >
              <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center shrink-0">
                <Truck className="w-4 h-4 text-brand-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-300">Loueur de véhicules</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Déposer une candidature</p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-brand-400 group-hover:translate-x-0.5 transition-all duration-200 shrink-0" />
            </Link>
          </div>
        </div>

        {/* Feature strip */}
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-3">
          {[
            { icon: Zap,       text: 'Mise en relation instantanée' },
            { icon: Clock,     text: 'Suivi en temps réel' },
            { icon: FileCheck, text: 'Gestion des documents' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2 text-slate-500 text-xs">
              <Icon className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
              {text}
            </div>
          ))}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="relative text-center pb-6 flex flex-col items-center gap-2">
        <p className="text-xs text-slate-700">Version démo — données simulées</p>
        <Link href="/admin/candidatures" className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors">
          Admin
        </Link>
      </footer>
    </div>
  )
}
