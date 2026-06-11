'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { ListTodo, Users, User, CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { key: 'inicio', name: 'Inicio', href: '/inicio', icon: ListTodo },
  { key: 'alumnos', name: 'Alumnos', href: '/alumnos', icon: User },
  { key: 'grupos', name: 'Grupos', href: '/grupos', icon: Users },
  { key: 'actividades', name: 'Actividades', href: '/actividades', icon: CalendarDays },
] as const

export function BottomTabBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // En la ficha de un alumno (/seguimiento/...) se resalta el ícono del menú
  // desde donde se llegó: ?from=inicio | grupos | actividades (default: alumnos).
  const enSeguimiento = pathname.startsWith('/seguimiento')
  const from = searchParams.get('from')
  const origen = from === 'inicio' || from === 'grupos' || from === 'actividades' ? from : 'alumnos'

  const esActivo = (key: string, href: string) =>
    enSeguimiento ? key === origen : pathname === href || pathname.startsWith(href + '/')

  return (
    <nav className="fixed bottom-0 w-full bg-card border-t border-border pb-safe lg:hidden z-50">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = esActivo(item.key, item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1 rounded-none transition-[transform,background-color,color,box-shadow] duration-150 active:scale-[0.98] active:bg-[#22887c]/10 active:shadow-[inset_0_0_0_1px_rgba(34,136,124,0.18)]",
                isActive
                  ? "text-[#22887c] font-semibold"
                  : "text-muted-foreground/50 hover:text-foreground hover:bg-accent"
              )}
            >
              <Icon className="h-6 w-6" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px]">{item.name}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
