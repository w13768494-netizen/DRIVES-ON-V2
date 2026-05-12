import { type CookieOptions, createServerClient } from '@supabase/ssr'
import { NextResponse }     from 'next/server'
import { cookies }          from 'next/headers'
import type { NextRequest } from 'next/server'
import * as Sentry          from '@sentry/nextjs'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code       = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type       = searchParams.get('type')
  const rawNext    = searchParams.get('next') ?? '/'
  // N'accepte que les chemins relatifs (commence par / mais pas //)
  const next       = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/'

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options: CookieOptions }[]) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        },
      },
    },
  )

  // Flux PKCE (OAuth, magic link)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}`)
    Sentry.captureEvent({
      message: '[auth/callback] exchangeCodeForSession failed',
      level:   'warning',
      extra:   { errorMsg: error.message },
    })
  }

  // Flux invitation email (token_hash + type=invite)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'invite' | 'email' | 'recovery' | 'email_change',
    })
    if (!error) return NextResponse.redirect(`${origin}${next}`)
    Sentry.captureEvent({
      message: '[auth/callback] verifyOtp failed',
      level:   'warning',
      extra:   { type, errorMsg: error.message },
    })
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
