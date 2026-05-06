interface Props {
  variant?:  'dark' | 'light'
  size?:     'sm' | 'md' | 'lg'
  iconOnly?: boolean
}

export function DrivesOnLogo({ variant = 'dark', size = 'md', iconOnly = false }: Props) {
  const iconPx = { sm: 32, md: 42, lg: 58 }[size]
  const textPx = { sm: 17, md: 22, lg: 30 }[size]
  const gapPx  = { sm: 8,  md: 10, lg: 14 }[size]
  const color  = variant === 'dark' ? '#ffffff' : '#1e293b'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: gapPx, flexShrink: 0 }}>
      <CarIcon size={iconPx} />
      {!iconOnly && (
        <span style={{
          color,
          fontSize:      textPx,
          fontWeight:    700,
          letterSpacing: '-0.025em',
          lineHeight:    1,
          fontFamily:    'inherit',
          whiteSpace:    'nowrap',
        }}>
          Drives On
        </span>
      )}
    </div>
  )
}

function CarIcon({ size }: { size: number }) {
  /*
    Construit géométriquement d'après le prompt original :

    Fond : dégradé diagonal bleu foncé → violet clair

    Voiture (contour blanc épais, intérieur transparent) :
      ┌─ TOIT : bezier symétrique, arche large de (11,22) à (29,22) ─┐
      │  pic à (20,13) — forme douce, pas trop pointue               │
      ├─ ÉPAULES : s'élargissent à (5,22)–(35,22)                    ┤
      │  CARROSSERIE : rectangle, y=22→27, coins arrondis             │
      ├─ PASSAGES DE ROUE :                                          ┤
      │  Droit : arc de (35,27) à (26,27) r=4.5 passant par y=31.5  │
      │  Gauche : arc de (14,27) à (5,27)  r=4.5 passant par y=31.5 │
      └─ Sous-caisse plate : (26,27)→(14,27) ──────────────────────-─┘

    Tous les arcs : sweep-flag=0 (sens anti-horaire) → bombent vers le BAS
  */
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="driveson-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#2B45D4" />
          <stop offset="100%" stopColor="#9B89F9" />
        </linearGradient>
      </defs>

      {/* Fond carré arrondi, dégradé bleu→violet */}
      <rect width="40" height="40" rx="10" fill="url(#driveson-grad)" />

      {/* Silhouette voiture */}
      <path
        d={[
          'M 11 22',
          // Toit : arche bezier symétrique, pic à (20,13)
          'C 11 13 29 13 29 22',
          // Épaule droite
          'L 34 22',
          // Coin sup-droit arrondi
          'Q 35 22 35 23',
          // Carrosserie droite
          'L 35 27',
          // Passage de roue DROIT : de (35,27) à (26,27), r=4.5, bombe vers le bas (sweep=0)
          'A 4.5 4.5 0 0 0 26 27',
          // Sous-caisse
          'L 14 27',
          // Passage de roue GAUCHE : de (14,27) à (5,27), r=4.5, bombe vers le bas (sweep=0)
          'A 4.5 4.5 0 0 0 5 27',
          // Carrosserie gauche
          'L 5 23',
          // Coin sup-gauche arrondi
          'Q 5 22 6 22',
          'Z',
        ].join(' ')}
        stroke="white"
        strokeWidth="2.8"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}
