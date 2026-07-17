'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ShieldAlert, LogOut, MessageCircle } from 'lucide-react'

type Props = {
  academiaNombre: string
}

export function SuspendedLock({ academiaNombre }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    setLoading(true)
    try {
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    } catch (err) {
      console.error('Error logging out:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-red-500/20 bg-slate-900/60 p-8 text-center shadow-2xl backdrop-blur-md">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-400 mb-6">
          <ShieldAlert className="h-8 w-8" />
        </div>
        
        <h2 className="text-xl font-bold text-white tracking-tight mb-2">
          Suscripción Suspendida
        </h2>
        
        <p className="text-sm text-slate-400 mb-2 font-semibold">
          {academiaNombre}
        </p>

        <p className="text-sm text-slate-400 mb-8 leading-relaxed">
          Suscripción vencida. Renueba con soporte técnico para restablecer el acceso a tu academia.
        </p>

        <div className="space-y-4">
          <a
            href="https://wa.me/5216691234567?text=Hola,%20nuestra%20academia%20se%20encuentra%20suspendida.%20Requiero%20soporte%20para%20renovación."
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-emerald-500 shadow-lg shadow-emerald-950/20"
          >
            <MessageCircle className="h-4 w-4" />
            Contactar Soporte Técnico
          </a>
          
          <button
            onClick={handleLogout}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-2.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" />
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  )
}
