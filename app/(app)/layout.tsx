import { BottomTabBar } from '@/components/layout/BottomTabBar'
import { DesktopSidebar } from '@/components/layout/DesktopSidebar'
import { GlobalHeader } from '@/components/layout/global-header'
import { AcademiaProvider } from '@/lib/contexts/academia-context'
import { PagoConfirmacionProvider } from '@/components/domain/cargo/pago-confirmacion-provider'
import { computeAlertasOperativas } from '@/lib/alertas/operativas'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { SuspendedLock } from '@/components/auth/SuspendedLock'

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  let academiaNombre = ''
  const academiaId = user?.app_metadata?.academia_id
  if (academiaId) {
    const { data } = await supabase
      .from('academia')
      .select('nombre')
      .eq('id', academiaId)
      .single() as any
      
    if (data?.nombre) {
      academiaNombre = data.nombre
    }
  }

  const titleSuffix = academiaNombre ? ` • ${academiaNombre}` : ''

  return {
    title: {
      default: `SIPRA${titleSuffix}`,
      template: `%s | SIPRA${titleSuffix}`,
    },
  }
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const academiaId = user.app_metadata?.academia_id as string | undefined

  let academiaNombre = 'Mi Academia'
  let academiaLogoUrl: string | null = null
  let estadoTenant: string | null = null

  if (academiaId) {
    const { data: academia } = await supabase
      .from('academia')
      .select('nombre, metadata, estado_tenant')
      .eq('id', academiaId)
      .single() as any
    if (academia?.nombre) {
      academiaNombre = academia.nombre
    }
    if (academia?.metadata?.logo_url) {
      academiaLogoUrl = academia.metadata.logo_url
    }
    if (academia?.estado_tenant) {
      estadoTenant = academia.estado_tenant
    }
  }

  const alertas = await computeAlertasOperativas(supabase, academiaId)

  const cookieStore = await cookies()
  const impersonating = cookieStore.has('sipra_impersonation')

  // Si la academia está suspendida y no estamos en modo impersonación por HQ, bloquear accesos
  if (estadoTenant === 'suspendida' && !impersonating) {
    return <SuspendedLock academiaNombre={academiaNombre} />
  }

  return (
    <AcademiaProvider academiaNombre={academiaNombre} academiaLogoUrl={academiaLogoUrl}>
      <PagoConfirmacionProvider>
        <div className="min-h-screen bg-background flex flex-col">
          {/* Barra de Impersonación */}
          {impersonating && (
            <div className="bg-red-600 text-white text-xs md:text-sm font-bold px-4 py-2.5 flex items-center justify-between z-[9999] shrink-0 sticky top-0 h-[40px] shadow-md">
              <span className="flex items-center gap-2">
                <span className="animate-pulse">🚨</span>
                <span>MODO ADMINISTRADOR — Estás utilizando la cuenta de: <strong className="underline">{academiaNombre}</strong></span>
              </span>
              <a
                href="/auth/impersonate-exit"
                className="rounded bg-black/40 hover:bg-black/60 px-3 py-1 text-white font-bold transition-colors text-xs"
              >
                Salir
              </a>
            </div>
          )}

          <div className="flex-1 flex min-h-0">
            {/* Sidebar para pantallas grandes (Desktop-graceful) */}
            <DesktopSidebar />

            {/* Contenido principal */}
            <main className="flex-1 w-full lg:pl-64 pb-16 lg:pb-0 flex flex-col">
              <GlobalHeader alertas={alertas} />
              <div className="max-w-4xl mx-auto w-full flex-1">
                {children}
              </div>
            </main>

            {/* Navegación para móviles (Mobile-first) */}
            <BottomTabBar />
          </div>
        </div>
      </PagoConfirmacionProvider>
    </AcademiaProvider>
  )
}
