import { BottomTabBar } from '@/components/layout/BottomTabBar'
import { DesktopSidebar } from '@/components/layout/DesktopSidebar'
import { GlobalHeader } from '@/components/layout/global-header'
import { AcademiaProvider } from '@/lib/contexts/academia-context'
import { PagoConfirmacionProvider } from '@/components/domain/cargo/pago-confirmacion-provider'
import { computeAlertasOperativas } from '@/lib/alertas/operativas'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

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
  if (academiaId) {
    const { data: academia } = await supabase
      .from('academia')
      .select('nombre, metadata')
      .eq('id', academiaId)
      .single() as any
    if (academia?.nombre) {
      academiaNombre = academia.nombre
    }
    if (academia?.metadata?.logo_url) {
      academiaLogoUrl = academia.metadata.logo_url
    }
  }

  const alertas = await computeAlertasOperativas(supabase, academiaId)

  return (
    <AcademiaProvider academiaNombre={academiaNombre} academiaLogoUrl={academiaLogoUrl}>
      <PagoConfirmacionProvider>
        <div className="min-h-screen bg-background flex">
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
      </PagoConfirmacionProvider>
    </AcademiaProvider>
  )
}

