'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ListTodo, Users, MessageSquareText, Settings, LogOut, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navItems = [
  { name: 'Pendientes', href: '/pendientes', icon: ListTodo },
  { name: 'Grupos', href: '/grupos', icon: Users },
]

export function DesktopSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen bg-slate-900 text-slate-300 fixed left-0 top-0 border-r border-slate-800">
      <div className="p-6 flex items-center space-x-3 text-white">
        <div className="bg-indigo-600 p-2 rounded-lg">
          <Wallet className="h-6 w-6" />
        </div>
        <span className="text-xl font-bold tracking-tight">SIPRA</span>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors",
                isActive 
                  ? "bg-indigo-600/10 text-indigo-400 font-medium" 
                  : "hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button 
          onClick={handleLogout}
          className="flex items-center space-x-3 w-full px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  )
}
