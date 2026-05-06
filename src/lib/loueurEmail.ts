const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

const COVERAGE_LABELS: Record<string, string> = {
  full:    'Prise en charge totale',
  partial: 'Prise en charge partielle',
  client:  'À la charge du client',
}

const COVERAGE_COLORS: Record<string, string> = {
  full:    '#16a34a',
  partial: '#d97706',
  client:  '#64748b',
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function formatTime(date: Date | string): string {
  const d = new Date(date)
  return `${String(d.getHours()).padStart(2, '0')}h${String(d.getMinutes()).padStart(2, '0')}`
}

function addDays(date: Date | string, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function row(label: string, value: string, shaded = false): string {
  const bg = shaded ? 'background:#fafaf8;' : ''
  return `
    <tr>
      <td style="${bg}padding:12px 18px;color:#78716c;font-size:13px;border-bottom:1px solid #f0ebe5;width:44%">${label}</td>
      <td style="${bg}padding:12px 18px;text-align:right;color:#1c1917;font-size:13px;font-weight:600;border-bottom:1px solid #f0ebe5">${value}</td>
    </tr>`
}

export interface LoueurEmailParams {
  agencyName:       string
  dossierNumber:    string
  address:          string
  vehicleLabel:     string
  durationDays:     number
  dateNeeded:       Date | string
  maxExtensionDays?: number
  coverageType:     string
  requestType:      string
  targetPrice?:     number
  agencyCount:      number
  requestUrl:       string
}

export function buildLoueurEmailHtml(p: LoueurEmailParams): string {
  const isImmediate   = p.requestType === 'immediate'
  const isMulti       = p.agencyCount > 1
  const coverageColor = COVERAGE_COLORS[p.coverageType] ?? '#64748b'
  const coverageLabel = COVERAGE_LABELS[p.coverageType]  ?? p.coverageType
  const dateEnd       = addDays(p.dateNeeded, p.durationDays)
  const earnings      = p.targetPrice ? p.targetPrice * p.durationDays : null

  const urgencyBadge = isImmediate ? `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px">
      <tr>
        <td>
          <span style="display:inline-block;background:#fef2f2;border:1.5px solid #fecaca;color:#dc2626;font-size:11px;font-weight:800;padding:5px 12px;border-radius:20px;letter-spacing:.04em;text-transform:uppercase">
            ⚡ Demande immédiate
          </span>
        </td>
      </tr>
    </table>` : ''

  const multiAlert = isMulti ? `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px">
      <tr>
        <td style="background:#fff7ed;border:1.5px solid #fed7aa;border-radius:12px;padding:12px 16px">
          <p style="margin:0;color:#c2410c;font-size:13px;font-weight:700">
            🏁 ${p.agencyCount} loueurs contactés — premier répondant retenu
          </p>
        </td>
      </tr>
    </table>` : ''

  const earningsBlock = earnings !== null ? `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px">
      <tr>
        <td style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:16px;padding:20px 22px">
          <p style="margin:0 0 14px;color:#15803d;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.1em">
            Gain si vous acceptez
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td>
                <span style="color:#14532d;font-size:40px;font-weight:900;line-height:1;letter-spacing:-.02em">${earnings}&nbsp;€</span>
              </td>
              <td style="vertical-align:bottom;padding-bottom:4px;padding-left:10px">
                <span style="color:#16a34a;font-size:13px;font-weight:600">au total</span>
              </td>
            </tr>
          </table>
          <p style="margin:10px 0 0;color:#16a34a;font-size:12px;font-weight:500;border-top:1px solid #bbf7d0;padding-top:10px">
            ${p.targetPrice}&nbsp;€/j × ${p.durationDays}&nbsp;jour${p.durationDays > 1 ? 's' : ''}${p.maxExtensionDays ? `&ensp;·&ensp;<span style="color:#7c3aed">+${p.maxExtensionDays}j prolongation possible</span>` : ''}
          </p>
        </td>
      </tr>
    </table>` : ''

  const extensionRow = p.maxExtensionDays
    ? row('📆 Prolongation possible', `<span style="color:#7c3aed;font-weight:700">jusqu'à +${p.maxExtensionDays}j</span>`)
    : ''

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ede8e3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ede8e3;padding:32px 16px">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">

  <!-- Brand pill -->
  <tr>
    <td align="center" style="padding-bottom:18px">
      <span style="display:inline-block;background:#2B45D4;color:#fff;font-size:10px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;padding:6px 16px;border-radius:20px">
        DRIVES ON
      </span>
    </td>
  </tr>

  <!-- Card -->
  <tr>
    <td style="background:#ffffff;border-radius:20px;overflow:hidden">

      <!-- Header -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="background:#2B45D4;padding:30px 32px 28px">
            <p style="margin:0 0 6px;color:rgba(255,255,255,.55);font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase">Nouvelle demande assignée</p>
            <p style="margin:0;color:#ffffff;font-size:26px;font-weight:800;line-height:1.2">Véhicule de<br>remplacement</p>
          </td>
        </tr>
      </table>

      <!-- Body -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding:28px 32px">

            <!-- Greeting -->
            <p style="margin:0 0 24px;font-size:15px;color:#44403c;line-height:1.7">
              Bonjour <strong style="color:#1c1917">${p.agencyName}</strong>,<br>
              une demande vous a été assignée. Répondez dès que possible pour la prendre en charge.
            </p>

            ${urgencyBadge}
            ${multiAlert}
            ${earningsBlock}

            <!-- Section title -->
            <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:#a8a29e;text-transform:uppercase;letter-spacing:.1em">Détails de la mission</p>

            <!-- Details table -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1.5px solid #e7e2dd;border-radius:14px;overflow:hidden;margin-bottom:28px">
              ${row('<span style="font-family:monospace;font-size:11px;color:#a8a29e">N°</span> Dossier', `<span style="font-family:monospace;font-weight:700;color:#1c1917">${p.dossierNumber}</span>`, true)}
              ${row('📍 Lieu du sinistre', p.address)}
              ${row('🚗 Catégorie véhicule', p.vehicleLabel, true)}
              ${row('📅 Prise en charge', `${formatDate(p.dateNeeded)} à ${formatTime(p.dateNeeded)}`)}
              ${row('🔄 Retour prévu', `${formatDate(dateEnd)} à ${formatTime(dateEnd)}`, true)}
              ${extensionRow}
              ${row('🛡 Prise en charge', `<span style="color:${coverageColor};font-weight:700">${coverageLabel}</span>`)}
            </table>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" style="padding-bottom:14px">
                  <a href="${p.requestUrl}"
                     style="display:inline-block;background:#ea580c;color:#ffffff;padding:16px 44px;border-radius:50px;text-decoration:none;font-weight:800;font-size:15px;letter-spacing:.01em">
                    Voir la demande &nbsp;→
                  </a>
                </td>
              </tr>
              <tr>
                <td align="center">
                  <p style="margin:0;font-size:12px;color:#a8a29e">
                    Acceptez ou refusez depuis votre espace DRIVES ON.
                  </p>
                </td>
              </tr>
            </table>

          </td>
        </tr>
      </table>

    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td align="center" style="padding-top:22px">
      <p style="margin:0;font-size:11px;color:#a8a29e;line-height:1.8">
        DRIVES ON — Plateforme d'assistance sinistres<br>
        <a href="${APP_URL}" style="color:#a8a29e;text-decoration:none">${APP_URL}</a>
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>

</body>
</html>`
}
