import Link from 'next/link'
import { ShieldCheck, Truck, ArrowRight, CheckCircle2 } from 'lucide-react'

const ASSISTEUR_AVANTAGES = [
  'Mise en relation instantanée avec des loueurs partenaires',
  'Suivi en temps réel de chaque dossier',
  'Gestion centralisée des documents',
  'Tableaux de bord et statistiques',
]

const LOUEUR_AVANTAGES = [
  'Réception automatique des demandes de votre zone',
  'Réponse et confirmation en quelques clics',
  'Visibilité auprès de nombreuses compagnies d\'assurance',
  'Gestion simplifiée des retours et paiements',
]

export default function RejoindreChoicePage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
      <div className="text-center mb-12 max-w-xl">
        <p className="text-xs font-semibold text-brand-500 uppercase tracking-widest mb-3">
          Rejoindre Drives On
        </p>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 leading-tight">
          Vous êtes…
        </h1>
        <p className="text-slate-500 mt-3 text-sm">
          Choisissez votre profil pour accéder au formulaire de candidature adapté.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-2xl">
        {/* Assisteur */}
        <Link
          href="/rejoindre/assisteur"
          className="group bg-white rounded-2xl border border-slate-200 p-6 flex flex-col gap-5 shadow-sm hover:shadow-lg hover:border-blue-300 transition-all duration-200"
        >
          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 mb-1">
              Une compagnie d'assurance
            </h2>
            <p className="text-sm text-slate-500">
              Vous gérez des sinistres et avez besoin de véhicules de remplacement pour vos assurés.
            </p>
          </div>
          <ul className="flex flex-col gap-2">
            {ASSISTEUR_AVANTAGES.map(a => (
              <li key={a} className="flex items-start gap-2 text-xs text-slate-600">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                {a}
              </li>
            ))}
          </ul>
          <div className="mt-auto flex items-center gap-2 text-sm font-semibold text-blue-600 group-hover:text-blue-700 transition-colors">
            Déposer ma candidature
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Loueur */}
        <Link
          href="/rejoindre/loueur"
          className="group bg-white rounded-2xl border border-slate-200 p-6 flex flex-col gap-5 shadow-sm hover:shadow-lg hover:border-brand-300 transition-all duration-200"
        >
          <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center">
            <Truck className="w-6 h-6 text-brand-600" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 mb-1">
              Un loueur de véhicules
            </h2>
            <p className="text-sm text-slate-500">
              Vous disposez d'une flotte de véhicules et souhaitez proposer vos services aux assureurs.
            </p>
          </div>
          <ul className="flex flex-col gap-2">
            {LOUEUR_AVANTAGES.map(a => (
              <li key={a} className="flex items-start gap-2 text-xs text-slate-600">
                <CheckCircle2 className="w-3.5 h-3.5 text-brand-500 mt-0.5 shrink-0" />
                {a}
              </li>
            ))}
          </ul>
          <div className="mt-auto flex items-center gap-2 text-sm font-semibold text-brand-600 group-hover:text-brand-700 transition-colors">
            Déposer ma candidature
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>
    </div>
  )
}
