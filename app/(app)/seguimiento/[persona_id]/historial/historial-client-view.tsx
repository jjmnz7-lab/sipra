'use client'

import * as React from 'react'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { PageSubheader } from '@/components/layout/page-subheader'
import { listarTimelineAction } from '@/app/(app)/seguimiento/actions'
import { EventoRow } from '@/components/domain/timeline/evento-row'
import { AnularEventoDrawer, type AnularTarget } from '@/components/domain/timeline/anular-evento-drawer'
import {
  claveMes,
  etiquetaMes,
  type EventoTimeline,
  type AccionAnulable,
} from '@/components/domain/timeline/evento-config'
import { Clock, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { WhatsappLinkIcon } from '@/components/ui/whatsapp-link-icon'
import { EnviarEnlaceHistorialSheet } from '@/components/domain/envio/enviar-enlace-historial-sheet'

type Categoria = 'FINANZAS' | 'OPERATIVO' | 'COMUNICACION' | null

// COMUNICACION queda oculto en V1 (sin productores de mensajes automáticos).
const FILTROS: { label: string; value: Categoria }[] = [
  { label: 'Todos', value: null },
  { label: 'Finanzas', value: 'FINANZAS' },
  { label: 'Operativos', value: 'OPERATIVO' },
]

function SeparadorMes({
  fechaIso,
}: {
  fechaIso: string
}) {
  return (
    <div className="flex items-center py-2" aria-hidden="true">
      <div className="relative w-6 flex-shrink-0 self-stretch" />
      <div className="flex-1 min-w-0 ml-3 flex items-center gap-2">
        <div className="flex-1 flex justify-end min-w-0">
          <div className="h-px w-3/4 bg-border/50" />
        </div>
        <span className="text-[10px] font-medium text-muted-foreground/60 shrink-0">
          {etiquetaMes(fechaIso)}
        </span>
        <div className="flex-1 flex justify-start min-w-0">
          <div className="h-px w-3/4 bg-border/50" />
        </div>
      </div>
    </div>
  )
}

export function HistorialClientView({
  persona,
  eventosIniciales,
  hasMoreInicial,
  pageSize,
}: {
  persona: { id: string; nombre: string; apellido: string | null; estado_registro: string; share_token: string; telefono_whatsapp: string | null }
  eventosIniciales: EventoTimeline[]
  hasMoreInicial: boolean
  pageSize: number
}) {
  const router = useRouter()
  const [isExiting, setIsExiting] = useState(false)
  const [isEnviarEnlaceOpen, setIsEnviarEnlaceOpen] = useState(false)
  const [filtro, setFiltro] = useState<Categoria>(null)
  const [eventos, setEventos] = useState<EventoTimeline[]>(eventosIniciales)
  const [hasMore, setHasMore] = useState(hasMoreInicial)
  const [loading, setLoading] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const [anularTarget, setAnularTarget] = useState<AnularTarget | null>(null)
  const [isAnularOpen, setIsAnularOpen] = useState(false)

  // Generación de petición vigente: descarta respuestas de filtros viejos.
  const fetchGen = useRef(0)

  const handleBack = () => {
    setIsExiting(true)
    setTimeout(() => router.back(), 200)
  }

  const cargarPagina = useCallback(
    async (offset: number, categoria: Categoria, reemplazar: boolean) => {
      const gen = ++fetchGen.current
      setLoading(true)
      const { eventos: nuevos, hasMore: mas } = await listarTimelineAction(
        persona.id,
        offset,
        pageSize,
        categoria,
      )
      if (gen !== fetchGen.current) return
      setEventos(prev => (reemplazar ? (nuevos as EventoTimeline[]) : [...prev, ...(nuevos as EventoTimeline[])]))
      setHasMore(mas)
      setLoading(false)
    },
    [persona.id, pageSize],
  )

  const cambiarFiltro = (categoria: Categoria) => {
    if (categoria === filtro) return
    setFiltro(categoria)
    setEventos([])
    setHasMore(true)
    void cargarPagina(0, categoria, true)
  }

  // Infinite scroll: cargar el siguiente bloque al acercarse al fondo.
  useEffect(() => {
    const target = sentinelRef.current
    if (!target || !hasMore) return
    const obs = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting && !loading) {
          void cargarPagina(eventos.length, filtro, false)
        }
      },
      { rootMargin: '200px' },
    )
    obs.observe(target)
    return () => obs.disconnect()
  }, [hasMore, loading, eventos.length, filtro, cargarPagina])

  const handleAnular = (accion: NonNullable<AccionAnulable>, evento: EventoTimeline) => {
    if (accion.kind === 'pago') {
      setAnularTarget({ kind: 'pago', movimientoId: accion.movimientoId, monto: evento.monto })
    } else {
      setAnularTarget({
        kind: 'cargo',
        cargoId: accion.cargoId,
        monto: evento.monto,
        concepto: evento.descripcion || evento.titulo,
      })
    }
    setIsAnularOpen(true)
  }

  const handleAnularSuccess = () => {
    // La anulación inserta un evento nuevo y puede invalidar otros: recargar desde cero.
    void cargarPagina(0, filtro, true)
    router.refresh()
  }

  const nombreCompleto = `${persona.nombre} ${persona.apellido ?? ''}`.trim()
  const isSuspendido = persona.estado_registro !== 'activo'
  const hayEventos = eventos.length > 0

  return (
    <div
      className={`flex flex-col h-full min-h-screen bg-background pb-24 transition-all duration-200 ${
        isExiting ? 'animate-out slide-out-to-right fade-out' : 'animate-in slide-in-from-right'
      }`}
    >
      <PageSubheader
        title={
          <div className="min-w-0">
            <span className={cn("block truncate", isSuspendido && "text-[#9aa4b3]")}>{nombreCompleto}</span>
            <span className="block text-xs font-medium text-muted-foreground truncate -mt-0.5">
              Historial completo
            </span>
          </div>
        }
        onBack={handleBack}
        actions={
          !isSuspendido ? (
            <button
              type="button"
              onClick={() => setIsEnviarEnlaceOpen(true)}
              className="flex items-center gap-2 text-[11px] font-semibold text-[#22887c] hover:underline leading-tight text-left"
            >
              <WhatsappLinkIcon className="flex-shrink-0" />
              <span className="flex flex-col">
                <span>Enviar enlace</span>
                <span>a historial</span>
              </span>
            </button>
          ) : undefined
        }
      />

      {/* Barra de chips de filtro (mismo estilo que Inicio, sin contador, centrados) */}
      <div className="sticky top-[112px] z-20 bg-background/95 backdrop-blur-sm border-b border-border px-2 py-1.5 flex items-center justify-center gap-1">
        {FILTROS.map(f => {
          const selected = filtro === f.value
          return (
            <button
              key={f.label}
              type="button"
              onClick={() => cambiarFiltro(f.value)}
              className={cn(
                'flex items-center justify-center rounded-full h-8 px-4 text-[10px] font-semibold border transition-colors',
                selected
                  ? 'bg-[#15435a] text-white border-transparent'
                  : 'bg-secondary text-muted-foreground border-transparent hover:bg-accent',
              )}
            >
              <span className="truncate">{f.label}</span>
            </button>
          )
        })}
      </div>

      {/* Lista de eventos con separador sutil por mes */}
      <div className="px-4 pt-1">
        {hayEventos && <SeparadorMes fechaIso={eventos[0]!.fecha_evento} />}

        {eventos.map((evento, i) => {
          const next = eventos[i + 1]
          const cambiaMesHaciaSiguiente =
            next != null && claveMes(next.fecha_evento) !== claveMes(evento.fecha_evento)
          const esUltimo = next == null && !hasMore

          return (
            <React.Fragment key={evento.id}>
              <EventoRow
                evento={evento}
                isLast={esUltimo}
                onAnular={handleAnular}
              />
              {cambiaMesHaciaSiguiente && (
                <SeparadorMes fechaIso={next!.fecha_evento} />
              )}
            </React.Fragment>
          )
        })}

        {eventos.length === 0 && !loading && (
          <div className="text-center py-12 px-4">
            <Clock className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {filtro ? 'No hay movimientos de esta categoría.' : 'No hay eventos registrados.'}
            </p>
          </div>
        )}

        {hasMore && (
          <div ref={sentinelRef} className="py-4 flex justify-center">
            {loading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
          </div>
        )}

        {!hasMore && eventos.length > 0 && (
          <p className="py-4 text-center text-[10px] font-medium text-muted-foreground/60">
            Fin del historial
          </p>
        )}
      </div>

      <AnularEventoDrawer
        open={isAnularOpen}
        onOpenChange={setIsAnularOpen}
        target={anularTarget}
        onSuccess={handleAnularSuccess}
      />

      <EnviarEnlaceHistorialSheet
        open={isEnviarEnlaceOpen}
        onOpenChange={setIsEnviarEnlaceOpen}
        alumnoNombre={nombreCompleto}
        telefono={persona.telefono_whatsapp}
        shareToken={persona.share_token}
      />
    </div>
  )
}
