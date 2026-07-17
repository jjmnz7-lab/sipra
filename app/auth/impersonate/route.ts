import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  const domainHQ = process.env.NEXT_PUBLIC_HQ_DOMAIN || 'https://sipra-hq.vercel.app'

  if (!token) {
    return NextResponse.redirect(`${request.nextUrl.origin}/login?error=Token de impersonación requerido.`)
  }

  const supabaseAdmin = createAdminClient()
  const supabaseServer = await createClient()

  try {
    // 1. Validar token
    const { data: tokenRecord, error: errToken } = await supabaseAdmin
      .from('hq_impersonation_tokens' as any)
      .select('*')
      .eq('token', token)
      .single() as any

    if (errToken || !tokenRecord) {
      console.error('Impersonate error (token not found):', errToken?.message)
      return NextResponse.redirect(`${request.nextUrl.origin}/login?error=Token de impersonación inválido.`)
    }

    if (tokenRecord.used) {
      return NextResponse.redirect(`${request.nextUrl.origin}/login?error=El token ya ha sido utilizado.`)
    }

    const now = new Date()
    const expiresAt = new Date(tokenRecord.expires_at)
    if (now > expiresAt) {
      return NextResponse.redirect(`${request.nextUrl.origin}/login?error=El token de impersonación ha expirado.`)
    }

    // 2. Obtener email del usuario destino
    const { data: { user: targetUser }, error: errUser } = await supabaseAdmin.auth.admin.getUserById(
      tokenRecord.target_user_id
    )

    if (errUser || !targetUser || !targetUser.email) {
      console.error('Impersonate error (user fetch):', errUser?.message)
      return NextResponse.redirect(`${request.nextUrl.origin}/login?error=Error al recuperar el usuario destino.`)
    }

    // 3. Generar enlace de magiclink
    const { data: linkData, error: errLink } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: targetUser.email,
    })

    if (errLink || !linkData?.properties?.action_link) {
      console.error('Impersonate error (generateLink):', errLink?.message)
      return NextResponse.redirect(`${request.nextUrl.origin}/login?error=Error al generar enlace de inicio de sesión.`)
    }

    // Extraer token_hash de action_link
    const actionUrl = new URL(linkData.properties.action_link)
    const token_hash = actionUrl.searchParams.get('token_hash')

    if (!token_hash) {
      console.error('Impersonate error (token_hash not found in action_link)')
      return NextResponse.redirect(`${request.nextUrl.origin}/login?error=Error en enlace de inicio de sesión.`)
    }

    // 4. Redimir link del lado del servidor (inicia sesión en supabaseServer client)
    const { error: verifyErr } = await supabaseServer.auth.verifyOtp({
      token_hash,
      type: 'magiclink',
    })

    if (verifyErr) {
      console.error('Impersonate error (verifyOtp):', verifyErr.message)
      return NextResponse.redirect(`${request.nextUrl.origin}/login?error=Error al iniciar sesión impersonada.`)
    }

    // 5. Marcar token como utilizado
    await supabaseAdmin
      .from('hq_impersonation_tokens' as any)
      .update({ used: true })
      .eq('token', token)

    // 6. Preparar respuesta de redirección y setear cookie
    const response = NextResponse.redirect(`${request.nextUrl.origin}/inicio`)
    
    // Cookie httpOnly, segura, path=/
    response.cookies.set('sipra_impersonation', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 2, // 2 horas de sesión impersonada
    })

    return response

  } catch (err: any) {
    console.error('Impersonate unexpected error:', err)
    return NextResponse.redirect(`${request.nextUrl.origin}/login?error=Error inesperado de impersonación.`)
  }
}
