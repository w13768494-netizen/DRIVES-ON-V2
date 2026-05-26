// ── Reset mot de passe ────────────────────────────────────────────────────────

export function buildResetEmailHtml({
  fullName,
  resetLink,
}: {
  fullName:  string
  resetLink: string
}): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;padding:32px 16px">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px">

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
          <td style="background:linear-gradient(135deg,#2B45D4,#6B5DD3);padding:30px 32px 28px">
            <p style="margin:0 0 6px;color:rgba(255,255,255,.55);font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase">Accès sécurisé</p>
            <p style="margin:0;color:#ffffff;font-size:26px;font-weight:800;line-height:1.2">Définissez votre<br>mot de passe</p>
          </td>
        </tr>
      </table>

      <!-- Body -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding:28px 32px">

            <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.7">
              Bonjour${fullName ? ` <strong style="color:#0f172a">${fullName}</strong>` : ''},<br>
              Cliquez sur le bouton ci-dessous pour définir votre mot de passe et accéder à votre espace DRIVES ON.
            </p>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" style="padding-bottom:14px">
                  <a href="${resetLink}"
                     style="display:inline-block;background:linear-gradient(135deg,#2B45D4,#6B5DD3);color:#ffffff;padding:16px 44px;border-radius:50px;text-decoration:none;font-weight:800;font-size:15px;letter-spacing:.01em;box-shadow:0 8px 24px rgba(43,69,212,0.25)">
                    Définir mon mot de passe &nbsp;→
                  </a>
                </td>
              </tr>
              <tr>
                <td align="center">
                  <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6">
                    Ce lien est valable <strong>24 heures</strong>. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.
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
      <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.8">
        DRIVES ON — Plateforme d'assistance sinistres<br>
        © ${new Date().getFullYear()} Drives On — Tous droits réservés
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>

</body>
</html>`
}

export function buildResetEmailText({
  fullName,
  resetLink,
}: {
  fullName:  string
  resetLink: string
}): string {
  return [
    'Accédez à votre espace Drives On',
    '',
    `Bonjour${fullName ? ` ${fullName}` : ''},`,
    '',
    'Cliquez sur le lien ci-dessous pour définir votre mot de passe et accéder à votre espace Drives On.',
    '',
    resetLink,
    '',
    'Ce lien est valable 24 heures.',
    "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.",
    '',
    `© ${new Date().getFullYear()} Drives On`,
  ].join('\n')
}

// ── Invitation nouveau partenaire ─────────────────────────────────────────────

export function buildInviteEmailHtml({
  fullName,
  role,
  inviteLink,
}: {
  fullName:   string
  role:       'loueur' | 'assisteur'
  inviteLink: string
}): string {
  const roleLabel    = role === 'loueur' ? 'Loueur' : 'Assisteur'
  const roleSubtitle = role === 'loueur' ? 'Espace Loueur indépendant' : 'Espace Professionnel demandeur'

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;padding:32px 16px">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px">

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
          <td style="background:linear-gradient(135deg,#2B45D4,#6B5DD3);padding:30px 32px 28px">
            <p style="margin:0 0 6px;color:rgba(255,255,255,.55);font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase">${roleSubtitle}</p>
            <p style="margin:0;color:#ffffff;font-size:26px;font-weight:800;line-height:1.2">Votre accès<br>est prêt</p>
          </td>
        </tr>
      </table>

      <!-- Body -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding:28px 32px">

            <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.7">
              Bonjour <strong style="color:#0f172a">${fullName}</strong>,<br>
              L'équipe DRIVES ON a validé votre demande de partenariat. Cliquez sur le bouton ci-dessous pour définir votre mot de passe et accéder à votre espace <strong style="color:#2B45D4">${roleLabel}</strong>.
            </p>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" style="padding-bottom:14px">
                  <a href="${inviteLink}"
                     style="display:inline-block;background:linear-gradient(135deg,#2B45D4,#6B5DD3);color:#ffffff;padding:16px 44px;border-radius:50px;text-decoration:none;font-weight:800;font-size:15px;letter-spacing:.01em;box-shadow:0 8px 24px rgba(43,69,212,0.25)">
                    Accéder à mon espace &nbsp;→
                  </a>
                </td>
              </tr>
              <tr>
                <td align="center">
                  <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6">
                    Ce lien est valable <strong>24 heures</strong>. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.
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
      <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.8">
        DRIVES ON — Plateforme d'assistance sinistres<br>
        © ${new Date().getFullYear()} Drives On — Tous droits réservés
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>

</body>
</html>`
}

export function buildInviteEmailText({
  fullName,
  role,
  inviteLink,
}: {
  fullName:   string
  role:       'loueur' | 'assisteur'
  inviteLink: string
}): string {
  const roleLabel = role === 'loueur' ? 'Loueur' : 'Assisteur'

  return [
    `Votre accès Drives On est prêt — ${roleLabel}`,
    '',
    `Bonjour ${fullName},`,
    '',
    "L'équipe Drives On a validé votre demande de partenariat.",
    `Cliquez sur le lien ci-dessous pour définir votre mot de passe et accéder à votre espace ${roleLabel}.`,
    '',
    inviteLink,
    '',
    'Ce lien est valable 24 heures.',
    "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.",
    '',
    `© ${new Date().getFullYear()} Drives On`,
  ].join('\n')
}
