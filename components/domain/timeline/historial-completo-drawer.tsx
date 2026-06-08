'use client'

import * as React from 'react'
import { useState, useEffect, useRef, useCallback } from 'react'
import { listarTimelineAction } from '@/app/(app)/seguimiento/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Clock, Loader2 } from 'lucide-react'
import { iconoEvento } from './evento-icono'
import { LedgerCargoRow } from './ledger-cargo-row'
import { esEventoCargo, computeSaldosResultantes } from '@/lib/utils/ledger'

type Evento = {
  id: string
  tipo: string
  titulo: string
  descripcion: string | null
  fecha_evento: string
  metadata?: Record<string, any> | null
  actor_nombre?: string | null
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  personaId: string
  iniciales: Evento[]
  /** Saldo vivo del alumno; ancla del cálculo de saldo resultante del ledger. */
  saldoActual: number
}

const PAGE_SIZE = 20

export function HistorialCompletoDrawer({ open, onOpenChange, personaId, iniciales, saldoActual }: Props) {
  const [eventos, setEventos] = useState<Evento[]>(iniciales)
  const [hasMore, setHasMore] = useState(iniciales.length >= PAGE_SIZE)
  const [loading, setLoading] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Reset cuando se reabre
  useEffect(() => {
    if (open) {
      setEventos(iniciales)
      setHasMore(iniciales.length >= PAGE_SIZE)
    }
  }, [open, iniciales])

  const cargarMas = useCallback(async () => {
    if (loading || !hasMore) return
    setLoading(true)
    const { eventos: nuevos, hasMore: mas } = await listarTimelineAction(personaId, eventos.length, PAGE_SIZE)
    setEventos(prev => [...prev, ...(nuevos as Evento[])])
    setHasMore(mas)
    setLoading(false)
  }, [loading, hasMore, eventos.length, personaId])

  useEffect(() => {
    if (!open) return
    const target = sentinelRef.current
    if (!target) return
    const obs = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) cargarMas()
      },
      { root: containerRef.current, rootMargin: '120px' },
    )
    obs.observe(target)
    return () => obs.disconnect()
  }, [open, cargarMas])

  // Saldo resultante por evento (recalculado sobre el array completo en cada render,
  // que crece al paginar hacia atrás). Anclado al saldo vivo del alumno.
  const saldos = computeSaldosResultantes(eventos, saldoActual)

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[85vh]">
        <div className="mx-auto w-full max-w-md flex flex-col h-full">
          <DrawerHeader className="text-left">
            <DrawerTitle className="flex items-center text-foreground">
              <Clock className="mr-2 h-5 w-5 text-muted-foreground" /> Historial completo
            </DrawerTitle>
          </DrawerHeader>

          <div ref={containerRef} className="flex-1 overflow-y-auto px-4 pb-4">
            <div className="relative border-l-2 border-border ml-3 space-y-6">
              {eventos.map(ev => (
                <EventoItem key={ev.id} evento={ev} saldoResultante={saldos.get(ev.id)} />
              ))}

              {hasMore && (
                <div ref={sentinelRef} className="pl-6 py-4 flex justify-center">
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : (
                    <span className="text-xs text-muted-foreground">Carga más al hacer scroll</span>
                  )}
                </div>
              )}

              {!hasMore && eventos.length > 0 && (
                <div className="pl-6 py-3 text-center text-xs text-muted-foreground">
                  Fin del historial
                </div>
              )}

              {eventos.length === 0 && (
                <div className="pl-6 text-sm text-muted-foreground">
                  No hay eventos registrados.
                </div>
              )}
            </div>
          </div>

          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline" className="h-11">Cerrar</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

function EventoItem({ evento, saldoResultante }: { evento: Evento; saldoResultante?: number }) {
  // Cargos → fila ultra-compacta del ledger (con año, vista histórica completa).
  if (esEventoCargo(evento.tipo)) {
    return <LedgerCargoRow evento={evento} saldoResultante={saldoResultante} withYear />
  }

  const { Icon, color, bg } = iconoEvento(evento.tipo)
  const isAnulacion = evento.tipo === 'pago_anulado' || evento.tipo === 'cargo_anulado'

  return (
    <div className="relative pl-6">
      <div className={`absolute -left-[13px] top-1 h-6 w-6 rounded-full border-4 border-background flex items-center justify-center ${bg}`}>
        <Icon className={`h-3 w-3 ${color}`} />
      </div>

      <Card className={`overflow-hidden shadow-sm ${isAnulacion ? 'border-destructive/20 bg-destructive/5' : 'border-border'}`}>
        <CardContent className="p-3">
          <div className="flex justify-between items-start mb-1 gap-2">
            <h3 className={`text-sm font-bold ${isAnulacion ? 'text-destructive' : 'text-foreground'}`}>
              {evento.titulo}
            </h3>
            <span className="text-[10px] text-muted-foreground/80 font-medium whitespace-nowrap">
              {new Date(evento.fecha_evento).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
          {evento.descripcion && (
            <p className={`text-xs ${isAnulacion ? 'text-destructive/90' : 'text-muted-foreground'}`}>
              {evento.descripcion}
            </p>
          )}
          {evento.actor_nombre && (
            <p className="text-[10px] text-muted-foreground/60 mt-1">Por: {evento.actor_nombre}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
