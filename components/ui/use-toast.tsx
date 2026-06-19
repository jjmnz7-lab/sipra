'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Toast sutil reutilizable (mismo estilo verde/teal que el resto de la app).
 *
 * Uso:
 *   const { showToast, toast } = useToast()
 *   // ...al final del árbol del componente:
 *   {toast}
 *   // ...al completar una acción:
 *   showToast('Cargos generados con éxito.')
 */
export function useToast(defaultDuration = 2500) {
  const [message, setMessage] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback(
    (msg: string, duration = defaultDuration) => {
      setMessage(msg)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setMessage(null), duration)
    },
    [defaultDuration],
  )

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const toast = message ? (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] max-w-[90vw] text-center',
        'bg-[#22887c]/90 backdrop-blur-sm text-white text-xs px-3.5 py-2 rounded-lg shadow-md',
        'animate-in fade-in slide-in-from-bottom-2 duration-150',
      )}
    >
      {message}
    </div>
  ) : null

  return { showToast, toast }
}
