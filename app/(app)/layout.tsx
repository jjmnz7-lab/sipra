import { BottomTabBar } from '@/components/layout/BottomTabBar'
import { DesktopSidebar } from '@/components/layout/DesktopSidebar'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

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

  // Aquí opcionalmente podríamos precargar el rol o estado de la academia
  // const role = user.app_metadata.rol
  // const academiaId = user.app_metadata.academia_id

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar para pantallas grandes (Desktop-graceful) */}
      <DesktopSidebar />

      {/* Contenido principal */}
      <main className="flex-1 w-full lg:pl-64 pb-16 lg:pb-0">
        <div className="max-w-4xl mx-auto w-full">
          {children}
        </div>
      </main>

      {/* Navegación para móviles (Mobile-first) */}
      <BottomTabBar />
    </div>
  )
}
