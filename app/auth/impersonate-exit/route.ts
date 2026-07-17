import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const cookieStore = request.cookies
  const impersonateToken = cookieStore.get('sipra_impersonation')?.value

  const supabaseAdmin = createAdminClient()
  const supabaseServer = await createClient()

  let redirectAcademiaId = ''
  
  if (impersonateToken) {
    try {
      // 1. Buscar token en DB para obtener admin_id y academia_id
      const { data: tokenRecord } = await supabaseAdmin
        .from('hq_impersonation_tokens' as any)
        .select('*')
        .eq('token', impersonateToken)
        .single() as any

      if (tokenRecord) {
        redirectAcademiaId = tokenRecord.academia_id

        // 2. Registrar fin de impersonación en hq_audit_logs
        await supabaseAdmin
          .from('hq_audit_logs' as any)
          .insert({
            admin_id: tokenRecord.admin_id,
            academia_id: tokenRecord.academia_id,
            action: 'impersonation_end',
            detail: { token: impersonateToken }
          })
      }
    } catch (err) {
      console.error('Error logging impersonation end:', err)
    }
  }

  // 3. Cerrar sesión en Supabase
  await supabaseServer.auth.signOut()

  // 4. Redirigir a HQ
  const domainHQ = process.env.NEXT_PUBLIC_HQ_DOMAIN || 'https://sipra-hq.vercel.app'
  const targetRedirect = redirectAcademiaId ? `${domainHQ}/academias/${redirectAcademiaId}` : `${domainHQ}/academias`
  
  const response = NextResponse.redirect(targetRedirect)

  // 5. Borrar la cookie
  response.cookies.delete('sipra_impersonation')

  return response
}
