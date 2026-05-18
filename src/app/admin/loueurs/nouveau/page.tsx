'use client'

import { useState }   from 'react'
import { useRouter }  from 'next/navigation'
import {
  ArrowLeft, Loader2, Truck, CheckCircle2,
  AlertTriangle, MapPin, Send,
} from 'lucide-react'

const inputCls = 'w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 transition-all placeholder:text-slate-400'
const labelCls = 'text-xs font-semibold text-slate-500 block mb-1.5'

interface CreationResult {
  success?:  boolean
  partial?:  boolean
  userId:    string
  agencyId?: string
  step?:     string
  error?:    string
  action?:   string
}

export default function NouveauLoueurPage() {
  const router = useRouter()

  const [firstName,     setFirstName]     = useState('')
  const [lastName,      setLastName]      = useState('')
  const [email,         setEmail]         = useState('')
  const [phone,         setPhone]         = useState('')
  const [companyName,   setCompanyName]   = useState('')
  const [agencyName,    setAgencyName]    = useState('')
  const [address,       setAddress]       = useState('')
  const [city,          setCity]          = useState('')
  const [postalCode,    setPostalCode]    = useState('')
  const [serviceRadius, setServiceRadius] = useState('')

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [result,  setResult]  = useState<CreationResult | null>(null)

  function resetForm() {
    setFirstName(''); setLastName(''); setEmail(''); setPhone('')
    setCompanyName(''); setAgencyName(''); setAddress('')
    setCity(''); setPostalCode(''); setServiceRadius('')
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await fetch('/api/admin/create-loueur', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        email:             email.trim(),
        full_name:         `${firstName.trim()} ${lastName.trim()}`.trim(),
        company_name:      companyName.trim() || null,
        phone:             phone.trim() || null,
        agency_name:       agencyName.trim() || companyName.trim(),
        address:           address.trim() || null,
        city:              city.trim() || null,
        postal_code:       postalCode.trim() || null,
        service_radius_km: serviceRadius ? Number(serviceRadius) : null,
      }),
    })

    const json = await res.json()
    setLoading(false)

    if (res.status === 409) {
      setError('Ce compte existe déjà. Utilisez "Inviter un partenaire" pour renvoyer un lien de connexion.')
      return
    }
    if (!res.ok && res.status !== 207) {
      setError(json.error ?? 'Erreur lors de la création.')
      return
    }
    setResult(json as CreationResult)
  }

  // ── Écran résultat ────────────────────────────────────────────────────────

  if (result) {
    const isPartial = result.partial === true

    return (
      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-6 py-10 gap-5">

        {/* Statut principal */}
        <div className={`rounded-2xl border p-6 flex flex-col gap-4 ${
          isPartial
            ? 'bg-amber-50 border-amber-200'
            : 'bg-green-50 border-green-200'
        }`}>
          <div className="flex items-center gap-3">
            {isPartial
              ? <AlertTriangle className="w-7 h-7 text-amber-500 shrink-0" />
              : <CheckCircle2  className="w-7 h-7 text-green-600 shrink-0" />
            }
            <div>
              <p className={`text-base font-black ${isPartial ? 'text-amber-900' : 'text-green-900'}`}>
                {isPartial ? 'Création partielle' : 'Loueur créé avec succès'}
              </p>
              <p className={`text-xs mt-0.5 ${isPartial ? 'text-amber-700' : 'text-green-700'}`}>
                {isPartial
                  ? `Échec à l'étape : ${result.step}`
                  : 'Compte, agence et email d\'invitation envoyés.'
                }
              </p>
            </div>
          </div>

          {/* IDs créés */}
          <div className="space-y-1 text-xs font-mono bg-white/70 rounded-xl p-3 border border-black/5">
            <p>
              <span className="text-slate-400 select-none">user_id   : </span>
              <span className="text-slate-800 select-all">{result.userId}</span>
            </p>
            {result.agencyId && (
              <p>
                <span className="text-slate-400 select-none">agency_id : </span>
                <span className="text-slate-800 select-all">{result.agencyId}</span>
              </p>
            )}
          </div>

          {/* Action requise si partiel */}
          {isPartial && result.action && (
            <div className="bg-amber-100 rounded-xl px-3 py-2.5 text-xs text-amber-900 leading-relaxed">
              <strong>Action requise :</strong> {result.action}
            </div>
          )}
        </div>

        {/* Warning géolocalisation */}
        <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-700">
          <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-blue-400" />
          <span>
            Aucune coordonnée GPS enregistrée. Le loueur devra compléter sa localisation
            depuis son espace pour apparaître dans le matching géographique.
          </span>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => { setResult(null); resetForm() }}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Créer un autre loueur
          </button>
          <button
            onClick={() => router.push('/admin/utilisateurs')}
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
          >
            Retour aux utilisateurs
          </button>
        </div>
      </div>
    )
  }

  // ── Formulaire ────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-6 py-10 gap-6">

      <button
        onClick={() => router.push('/admin/utilisateurs')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors w-fit"
      >
        <ArrowLeft className="w-4 h-4" /> Retour
      </button>

      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 rounded-xl bg-brand-500/10 flex items-center justify-center shrink-0">
            <Truck className="w-4 h-4 text-brand-500" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">Créer un loueur</h1>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Crée le compte, l'agence et envoie l'invitation en une seule action.
        </p>
      </div>

      {/* Warning géo — permanent */}
      <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-700">
        <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-blue-400" />
        <span>
          La géolocalisation GPS n'est pas configurée ici. Le loueur devra la renseigner
          depuis son espace pour apparaître dans le matching géographique des demandes.
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">

        {/* ── Section contact ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Contact</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Prénom *</label>
              <input
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="Jean"
                className={inputCls}
                required
              />
            </div>
            <div>
              <label className={labelCls}>Nom *</label>
              <input
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder="Dupont"
                className={inputCls}
                required
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Email professionnel *</label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(null) }}
              placeholder="jean@auto-loc.fr"
              className={inputCls}
              autoComplete="off"
              required
            />
          </div>

          <div>
            <label className={labelCls}>Téléphone</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="06 00 00 00 00"
              className={inputCls}
            />
          </div>
        </div>

        {/* ── Section agence ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Société & agence</p>

          <div>
            <label className={labelCls}>Nom de la société *</label>
            <input
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              placeholder="Auto-Loc Paris SARL"
              className={inputCls}
              required
            />
          </div>

          <div>
            <label className={labelCls}>
              Nom de l'agence
              <span className="font-normal text-slate-400 ml-1">— si différent de la société</span>
            </label>
            <input
              value={agencyName}
              onChange={e => setAgencyName(e.target.value)}
              placeholder="Agence Nation"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Adresse</label>
            <input
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="12 rue de la Paix"
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Code postal</label>
              <input
                value={postalCode}
                onChange={e => setPostalCode(e.target.value)}
                placeholder="75011"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Ville</label>
              <input
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="Paris"
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Rayon d'intervention (km)</label>
            <input
              type="number"
              min={1}
              max={500}
              value={serviceRadius}
              onChange={e => setServiceRadius(e.target.value)}
              placeholder="50"
              className={inputCls}
            />
          </div>
        </div>

        {/* Erreur globale */}
        {error && (
          <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!email || !firstName || !lastName || !companyName || loading}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold text-sm transition-colors"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" />Création en cours…</>
            : <><Send className="w-4 h-4" />Créer le loueur et envoyer l'invitation</>
          }
        </button>

        <p className="text-center text-xs text-slate-400">
          Le loueur recevra un email pour définir son mot de passe.
          Son agence sera visible dans le matching une fois la localisation renseignée.
        </p>
      </form>
    </div>
  )
}
