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
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

        <!-- Logo -->
        <tr><td style="padding-bottom:32px;text-align:center;">
          <span style="font-size:22px;font-weight:900;color:#0f172a;letter-spacing:-0.5px;">Drives<span style="color:#ff6b35;">On</span></span>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;padding:40px 36px;">

          <h1 style="margin:0 0 16px;font-size:22px;font-weight:900;color:#0f172a;line-height:1.3;">
            Accédez à votre espace
          </h1>
          <p style="margin:0 0 28px;font-size:15px;color:#64748b;line-height:1.6;">
            Bonjour${fullName ? ` ${fullName}` : ''},<br><br>
            Cliquez sur le bouton ci-dessous pour définir votre mot de passe et accéder à votre espace Drives On.
          </p>

          <!-- CTA -->
          <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
            <tr><td align="center" style="background:#ff6b35;border-radius:12px;">
              <a href="${resetLink}"
                 style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:-0.2px;">
                Définir mon mot de passe →
              </a>
            </td></tr>
          </table>

          <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;line-height:1.6;">
            Ce lien est valable <strong>24 heures</strong>. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.
          </p>

        </td></tr>

        <!-- Footer -->
        <tr><td style="padding-top:24px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#94a3b8;">© ${new Date().getFullYear()} Drives On — Tous droits réservés</p>
        </td></tr>

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
  const roleLabel = role === 'loueur' ? 'Loueur' : 'Assisteur'

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

        <!-- Logo -->
        <tr><td style="padding-bottom:32px;text-align:center;">
          <span style="font-size:22px;font-weight:900;color:#0f172a;letter-spacing:-0.5px;">Drives<span style="color:#ff6b35;">On</span></span>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;padding:40px 36px;">

          <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#ff6b35;text-transform:uppercase;letter-spacing:1px;">${roleLabel}</p>
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:900;color:#0f172a;line-height:1.3;">
            Votre accès Drives On est prêt
          </h1>
          <p style="margin:0 0 28px;font-size:15px;color:#64748b;line-height:1.6;">
            Bonjour ${fullName},<br><br>
            L'équipe Drives On a validé votre demande de partenariat. Cliquez sur le bouton ci-dessous pour définir votre mot de passe et accéder à votre espace <strong>${roleLabel}</strong>.
          </p>

          <!-- CTA -->
          <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
            <tr><td align="center" style="background:#ff6b35;border-radius:12px;">
              <a href="${inviteLink}"
                 style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:-0.2px;">
                Accéder à mon espace →
              </a>
            </td></tr>
          </table>

          <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;line-height:1.6;">
            Ce lien est valable <strong>24 heures</strong>. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.
          </p>

        </td></tr>

        <!-- Footer -->
        <tr><td style="padding-top:24px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#94a3b8;">© ${new Date().getFullYear()} Drives On — Tous droits réservés</p>
        </td></tr>

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
