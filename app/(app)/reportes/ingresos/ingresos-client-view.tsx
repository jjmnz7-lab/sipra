'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { PageSubheader } from '@/components/layout/page-subheader'
import { formatCurrency } from '@/lib/utils/currency'
import { cn } from '@/lib/utils'
import { listarMovimientosIngresosAction, type MovimientoIngreso } from '../actions'

export function IngresosClientView({
  movimientosIniciales,
  hasMoreInicial,
  timezone,
}: {
  movimientosIniciales: MovimientoIngreso[]
  hasMoreInicial: boolean
  timezone: string
}) {
  const router = useRouter()

  const [isExiting, setIsExiting] = useState(false)
  const [movimientos, setMovimientos] = useState<MovimientoIngreso[]>(movimientosIniciales)
  const [hasMoreMovimientos, setHasMoreMovimientos] = useState(hasMoreInicial)
  const [loadingMovimientos, setLoadingMovimientos] = useState(false)
  const sentinelMovimientosRef = useRef<HTMLDivElement | null>(null)

  const handleBack = () => {
    setIsExiting(true)
    setTimeout(() => router.back(), 200)
  }

  const cargarMovimientos = useCallback(async (currentOffset: number) => {
    setLoadingMovimientos(true)
    try {
      const { movimientos: nuevos, hasMore } = await listarMovimientosIngresosAction(currentOffset, 20)
      setMovimientos(prev => [...prev, ...nuevos])
      setHasMoreMovimientos(hasMore)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingMovimientos(false)
    }
  }, [])

  // Infinite scroll
  useEffect(() => {
    const target = sentinelMovimientosRef.current
    if (!target || !hasMoreMovimientos) return
    const obs = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting && !loadingMovimientos) {
          void cargarMovimientos(movimientos.length)
        }
      },
      { rootMargin: '200px' }
    )
    obs.observe(target)
    return () => obs.disconnect()
  }, [hasMoreMovimientos, loadingMovimientos, movimientos.length, cargarMovimientos])

  const movimientosAgrupados = useMemo(() => {
    const groups: Record<string, MovimientoIngreso[]> = {}
    for (const m of movimientos) {
      let dateKey = 'sin-fecha'
      if (m.fecha_pago) {
        try {
          const date = new Date(m.fecha_pago)
          const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          })
          const parts = formatter.formatToParts(date)
          const year = parts.find((p) => p.type === 'year')?.value
          const month = parts.find((p) => p.type === 'month')?.value
          const day = parts.find((p) => p.type === 'day')?.value
          if (year && month && day) {
            dateKey = `${year}-${month}-${day}`
          } else {
            dateKey = m.fecha_pago.split('T')[0] || 'sin-fecha'
          }
        } catch {
          dateKey = m.fecha_pago.split('T')[0] || 'sin-fecha'
        }
      }
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(m)
    }
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
  }, [movimientos, timezone])

  const formatGrupoFecha = (dateStr: string) => {
    if (dateStr === 'sin-fecha') return 'Sin fecha'
    const parts = dateStr.split('-')
    const year = Number(parts[0])
    const month = Number(parts[1]) - 1
    const day = Number(parts[2])
    const date = new Date(Date.UTC(year, month, day))
    const weekday = date.toLocaleDateString('es-MX', { weekday: 'long', timeZone: 'UTC' })
    const monthName = date.toLocaleDateString('es-MX', { month: 'long', timeZone: 'UTC' })
    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
    return `${cap(weekday)}, ${day} de ${cap(monthName)} de ${year}`
  }

  const formatMovimientoHora = (fechaIso: string) => {
    if (!fechaIso) return ''
    const date = new Date(fechaIso)
    return date.toLocaleTimeString('es-MX', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  return (
    <div
      className={cn(
        "flex flex-col h-full min-h-screen bg-background pb-20 transition-all duration-200",
        isExiting ? "animate-out slide-out-to-right fade-out" : "animate-in slide-in-from-right"
      )}
    >
      <PageSubheader title="Ingresos" onBack={handleBack} />

      <div className="divide-y divide-border/30">
        {movimientos.length === 0 && !loadingMovimientos && (
          <div className="text-center py-12 px-4">
            <p className="text-sm text-muted-foreground">No se encontraron movimientos de pago.</p>
          </div>
        )}

        {movimientosAgrupados.map(([dateKey, items]) => (
          <div key={dateKey} className="bg-background/25">
            <div className="bg-background px-4 py-2 sticky top-[112px] z-10 border-y border-border/20 text-center">
              <span className="text-[10px] font-bold tracking-wider text-[#22887c] uppercase">
                {formatGrupoFecha(dateKey)}
              </span>
            </div>
            <div className="divide-y divide-border/20">
              {items.map((m) => (
                <div 
                  key={m.id} 
                  className={cn(
                    "flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors", 
                    m.estado === 'anulado' && "line-through text-muted-foreground/60 bg-red-50/10"
                  )}
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "font-semibold text-sm truncate text-primary",
                        m.estado === 'anulado' && "text-muted-foreground/60"
                      )}>
                        {`${m.alumno.nombre} ${m.alumno.apellido ?? ''}`.trim()}
                      </span>
                      {m.estado === 'anulado' && (
                        <span className="text-[9px] bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded-full font-medium leading-none flex-shrink-0">
                          Anulado
                        </span>
                      )}
                    </div>
                    <span className="block text-xs text-muted-foreground truncate mt-0.5">
                      {m.concepto}
                    </span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={cn(
                      "block text-sm font-bold text-primary",
                      m.estado === 'anulado' && "text-muted-foreground/60"
                    )}>
                      {formatCurrency(m.monto_total)}
                    </span>
                    <span className="block text-[10px] text-muted-foreground mt-0.5">
                      {m.metodo_pago} • {formatMovimientoHora(m.fecha_pago)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Sentinel for Infinite Scroll */}
        {hasMoreMovimientos && (
          <div ref={sentinelMovimientosRef} className="py-6 flex justify-center border-t-0">
            {loadingMovimientos && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
          </div>
        )}

        {!hasMoreMovimientos && movimientos.length > 0 && (
          <p className="py-6 text-center text-[10px] font-medium text-muted-foreground/50 border-t-0">
            Fin del listado de ingresos
          </p>
        )}
      </div>
    </div>
  )
}
