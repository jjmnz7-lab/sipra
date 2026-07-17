import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // refrescar session si ha caducado
  const { data: { user } } = await supabase.auth.getUser()

  const isAuthRoute = request.nextUrl.pathname.startsWith('/login')

  // Enlace público de historial y registro: accesible sin sesión (token en la URL).
  // Ojo: el historial autenticado vive en /seguimiento/[id]/historial, así que
  // este prefijo sólo matchea la vista pública por token.
  const isPublicRoute =
    request.nextUrl.pathname.startsWith('/historial') ||
    request.nextUrl.pathname.startsWith('/registro') ||
    request.nextUrl.pathname.startsWith('/auth/')

  if (!user && !isAuthRoute && !isPublicRoute && request.nextUrl.pathname !== '/') {
    // Si no hay usuario y no es login/ruta pública, mandar a login
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isAuthRoute) {
    // Si hay usuario y está en login, mandar a inicio
    const url = request.nextUrl.clone()
    url.pathname = '/inicio'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
