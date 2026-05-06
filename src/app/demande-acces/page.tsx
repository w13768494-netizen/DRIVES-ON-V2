import { DrivesOnLogo }       from '@/components/shared/DrivesOnLogo'
import { AccessRequestForm }  from '@/components/auth/RegisterForm'

export default function DemandeAccesPage() {
  return (
    <div className="min-h-screen flex">

      {/* ── Panneau gauche — brand ── */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-2/5 bg-slate-950 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-20 w-80 h-80 bg-brand-600/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,107,53,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,107,53,0.03)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />

        <div className="relative">
          <DrivesOnLogo variant="dark" size="md" />
        </div>

        <div className="relative space-y-4">
          <h1 className="text-3xl font-black text-white leading-tight">
            Devenir<br />
            <span className="text-brand-400">partenaire</span>
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
            Soumettez votre demande. Notre équipe vérifie chaque partenaire et vous envoie
            un lien d'accès personnalisé sous 24 h.
          </p>
          <ul className="space-y-2 pt-2">
            {['Vérification du dossier', 'Invitation par email', 'Accès sécurisé à votre espace'].map(step => (
              <li key={step} className="flex items-center gap-2 text-xs text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />
                {step}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-slate-700">© {new Date().getFullYear()} Drives On</p>
      </div>

      {/* ── Panneau droit — formulaire ── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-white p-8 overflow-y-auto">
        <div className="lg:hidden mb-10">
          <DrivesOnLogo variant="light" size="md" />
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-black text-slate-900">Demander un accès</h2>
            <p className="text-sm text-slate-500 mt-1.5">
              L'accès est réservé aux partenaires vérifiés par Drives On.
            </p>
          </div>

          <AccessRequestForm />
        </div>
      </div>
    </div>
  )
}
