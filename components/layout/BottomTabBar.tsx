'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ListTodo, Users, MessageSquareText, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { name: 'Resumen', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Cobranza', href: '/pendientes', icon: ListTodo },
  { name: 'Alumnos', href: '/grupos', icon: Users },
  { name: 'Avisos', href: '/recordatorios', icon: MessageSquareText },
  { name: 'Ajustes', href: '/configuracion', icon: Settings },
]

export function BottomTabBar() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 w-full bg-white border-t border-slate-200 pb-safe lg:hidden z-50">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1 text-slate-500 hover:text-slate-900 transition-colors",
                isActive && "text-indigo-600 font-medium"
              )}
            >
              <Icon className={cn("h-6 w-6", isActive && "text-indigo-600")} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px]">{item.name}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
