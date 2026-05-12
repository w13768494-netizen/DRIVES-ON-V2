// Server-side only — ne pas importer depuis des composants client

const POSTMARK_KEY = process.env.POSTMARK_API_KEY
const FROM_EMAIL   = process.env.NOTIFY_FROM_EMAIL ?? 'notifications@drives-on.fr'

export async function sendEmail(params: {
  to:       string
  subject:  string
  html:     string
  text?:    string
  replyTo?: string
}): Promise<{ ok: boolean; error?: string }> {
  if (!POSTMARK_KEY) return { ok: false, error: 'POSTMARK_API_KEY non configurée' }

  try {
    const res = await fetch('https://api.postmarkapp.com/email', {
      method:  'POST',
      headers: {
        'Accept':                  'application/json',
        'Content-Type':            'application/json',
        'X-Postmark-Server-Token': POSTMARK_KEY,
      },
      body: JSON.stringify({
        From:          FROM_EMAIL,
        To:            params.to,
        Subject:       params.subject,
        HtmlBody:      params.html,
        ...(params.text    && { TextBody: params.text }),
        ...(params.replyTo && { ReplyTo:  params.replyTo }),
        MessageStream: 'outbound',
      }),
    })
    if (!res.ok) {
      const body = await res.text()
      console.error('[email] Postmark error', res.status)
      return { ok: false, error: `Postmark ${res.status}: ${body}` }
    }
    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[email] Failed to send:', msg)
    return { ok: false, error: msg }
  }
}
