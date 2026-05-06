'use client'

import { RotateCcw } from 'lucide-react'

export function ResetDataButton() {
  function handleReset() {
    if (!confirm('Réinitialiser toutes les données de démo ?')) return
    localStorage.removeItem('driveson:requests:v2')
    localStorage.removeItem('driveson:documents:v2')
    localStorage.removeItem('driveson:assistance-users')
    // Garde la session active — le reset ne déconnecte pas
    window.location.reload()
  }

  return (
    <button
      onClick={handleReset}
      title="Réinitialiser les données"
      className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
    >
      <RotateCcw className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">Reset</span>
    </button>
  )
}
