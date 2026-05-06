import { type CookieOptions, createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ROLE_HOME: Record<string, string> = {
  assisteur: '/assisteur',
  loueur:    '/loueur/dashboard',
  admin:     '/admin',
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options: CookieOptions }[]) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // ── 1. Valider la session côté serveur ─────────────────────────────────────
  // getUser() vérifie le JWT auprès de Supabase Auth — jamais getSession()
  // qui lit le cookie sans validation serveur.
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  // ── 2. Lire le rôle depuis profiles (source de vérité) ────────────────────
  // INTENTIONNEL : on ne lit PAS user_metadata.role qui est contrôlable par
  // l'utilisateur via supabase.auth.updateUser(). Le rôle dans profiles.role
  // est protégé par le trigger prevent_role_escalation (migration 003).
  let role: string | null = null

  if (user && !authError) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // Si la table profiles n'existe pas encore ou est inaccessible,
    // on refuse l'accès aux routes protégées par sécurité.
    if (!profileError && profile?.role) {
      role = profile.role as string
    }
  }

  const { pathname } = request.nextUrl
  const isAuthenticated = !!user && role !== null

  // ── 3. Rediriger les utilisateurs déjà authentifiés ───────────────────────
  if (isAuthenticated && (pathname === '/login' || pathname === '/register')) {
    const dest = ROLE_HOME[role!] ?? '/login'
    return NextResponse.redirect(new URL(dest, request.url))
  }

  // ── 4. Protéger les routes par rôle ───────────────────────────────────────
  // Double vérification : utilisateur non authentifié OU mauvais rôle.
  if (pathname.startsWith('/assisteur') && role !== 'assisteur') {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (pathname.startsWith('/loueur') && role !== 'loueur') {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (pathname.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Exclure les ressources statiques Next.js et les fichiers d'assets
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
