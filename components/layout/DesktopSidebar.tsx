'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useSearchParams } from 'next/navigation'
import { ListTodo, Users, User, CalendarDays, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import isotipoSipra from '@/public/logos/isotipo-sipra.png'
import logotipoSipra from '@/public/logos/logotipo-sipra.png'

const navItems = [
  { key: 'inicio', name: 'Inicio', href: '/inicio', icon: ListTodo },
  { key: 'alumnos', name: 'Alumnos', href: '/alumnos', icon: User },
  { key: 'grupos', name: 'Grupos', href: '/grupos', icon: Users },
  { key: 'actividades', name: 'Actividades', href: '/actividades', icon: CalendarDays },
] as const

export function DesktopSidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()
  const [impersonating, setImpersonating] = useState(false)

  useEffect(() => {
    setImpersonating(document.cookie.includes('sipra_impersonation='))
  }, [])

  // En la ficha de un alumno se resalta el origen (?from=inicio|grupos|actividades, default alumnos).
  const enSeguimiento = pathname.startsWith('/seguimiento')
  const from = searchParams.get('from')
  const origen = from === 'inicio' || from === 'grupos' || from === 'actividades' ? from : 'alumnos'
  const esActivo = (key: string, href: string) =>
    enSeguimiento ? key === origen : pathname.startsWith(href)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className={cn(
      "hidden lg:flex flex-col w-64 bg-card text-muted-foreground fixed left-0 border-r border-border",
      impersonating ? "top-[40px] h-[calc(100vh-40px)]" : "top-0 h-screen"
    )}>
      <div className="p-6 flex items-center space-x-3 text-foreground">
        <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center">
          <Image
            src={isotipoSipra}
            alt="SIPRA"
            className="h-6 w-auto"
            priority
          />
        </div>
        <Image
          src={logotipoSipra}
          alt="SIPRA"
          className="h-6 w-auto"
          priority
        />
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        {navItems.map((item) => {
          const isActive = esActivo(item.key, item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "flex items-center space-x-3 px-4 py-3 rounded-xl transition-[transform,background-color,color,box-shadow] duration-150 active:scale-[0.98] active:bg-[#22887c]/10 active:shadow-[inset_0_0_0_1px_rgba(34,136,124,0.18)]",
                isActive
                  ? "bg-[#22887c]/10 text-[#22887c] font-semibold"
                  : "text-muted-foreground/60 hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <button 
          onClick={handleLogout}
          className="flex items-center space-x-3 w-full px-4 py-3 rounded-xl text-muted-foreground hover:bg-accent hover:text-accent-foreground active:bg-[#22887c]/10 active:text-[#22887c] active:scale-[0.98] transition-[transform,background-color,color,box-shadow] duration-150"
        >
          <LogOut className="h-5 w-5" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  )
}
