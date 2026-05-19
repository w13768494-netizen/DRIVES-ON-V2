import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ROUTE_ROLES: [prefix: string, role: string][] = [
  ['/admin',     'admin'],
  ['/loueur',    'loueur'],
  ['/assisteur', 'assisteur'],
]

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options?: object }[]) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()

  const path    = request.nextUrl.pathname
  const isApi   = path.startsWith('/api/')
  const match   = ROUTE_ROLES.find(([prefix]) => path.startsWith(prefix))
    ?? ROUTE_ROLES.find(([prefix]) => path.startsWith(`/api${prefix}`))

  // Pour les routes API : le token est déjà rafraîchi ci-dessus — l'auth réelle
  // est vérifiée par requireAdmin() dans chaque handler. On retourne juste la response.
  if (isApi) return response

  if (match) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single()

    const [, requiredRole] = match
    if (!profile || profile.role !== requiredRole) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (profile.is_active === false) {
      return NextResponse.redirect(new URL('/login?error=suspended', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/loueur/:path*',
    '/assisteur/:path*',
    '/admin/:path*',
    '/api/admin/:path*',
    '/api/loueur/:path*',
    '/api/assisteur/:path*',
    '/api/requests/:path*',
  ],
}
