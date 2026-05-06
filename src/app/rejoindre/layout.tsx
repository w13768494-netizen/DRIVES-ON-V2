import Link from 'next/link'
import { DrivesOnLogo } from '@/components/shared/DrivesOnLogo'

export default function RejoindreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <DrivesOnLogo variant="light" size="sm" />
          </Link>
          <p className="text-xs text-slate-400">Déjà partenaire ?{' '}
            <Link href="/login" className="text-brand-600 font-semibold hover:underline underline-offset-2">
              Se connecter
            </Link>
          </p>
        </div>
      </header>
      <main className="flex-1 flex flex-col">
        {children}
      </main>
      <footer className="text-center py-6 text-xs text-slate-400 border-t border-slate-200 bg-white">
        © {new Date().getFullYear()} Drives On · Tous droits réservés
      </footer>
    </div>
  )
}
