import { DrivesOnLogo } from '@/components/shared/DrivesOnLogo'
import { LoginForm }    from '@/components/auth/LoginForm'
import { CheckCircle2 } from 'lucide-react'

const FEATURES = [
  'Mise en relation instantanée assureur / loueur',
  'Suivi en temps réel des demandes de véhicules',
  'Gestion des prolongations et des documents',
]

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">

      {/* ── Panneau gauche — brand (desktop uniquement) ── */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-2/5 bg-slate-950 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-20 w-80 h-80 bg-brand-600/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,107,53,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,107,53,0.03)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />

        <div className="relative">
          <DrivesOnLogo variant="dark" size="md" />
        </div>

        <div className="relative space-y-8">
          <div className="space-y-3">
            <h1 className="text-3xl font-black text-white leading-tight">
              La plateforme qui connecte<br />
              <span className="text-brand-400">assureurs et loueurs</span>
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
              Gérez vos demandes de véhicules de remplacement en temps réel, de la création à la clôture.
            </p>
          </div>

          <ul className="space-y-3.5">
            {FEATURES.map(f => (
              <li key={f} className="flex items-start gap-3">
                <CheckCircle2 className="w-4.5 h-4.5 text-brand-400 shrink-0 mt-0.5" strokeWidth={2.5} />
                <span className="text-sm text-slate-300 leading-snug">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-slate-700">© {new Date().getFullYear()} Drives On</p>
      </div>

      {/* ── Panneau droit — formulaire ── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-white p-8">
        <div className="lg:hidden mb-10">
          <DrivesOnLogo variant="light" size="md" />
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-black text-slate-900">Connexion</h2>
            <p className="text-sm text-slate-500 mt-1.5">
              Entrez votre email et mot de passe pour accéder à votre espace.
            </p>
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  )
}
