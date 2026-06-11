'use client'

import { useMemo, useRef, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Search, X, Filter, ChevronRight, CalendarDays, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatearDiasSemanaCorto, formatearHorario } from '@/lib/constants/dias-semana'
import { CrearActividadDrawer } from '@/components/domain/actividad/crear-actividad-drawer'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'

type Props = {
  actividades: any[]
  timezone?: string
}

function normalizar(s: string | null | undefined) {
  return (s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

function formatFechaCorta(dateStr: string | null) {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.split('-').map(Number)
  if (!year || !month || !day) return dateStr
  const date = new Date(year, month - 1, day)
  const formatted = date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
  return formatted.replace(/\.$/, '')
}

function parseFecha(dateStr: string | null): Date | null {
  if (!dateStr) return null
  const [y, m, d] = String(dateStr).split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

export function ActividadesClientView({ actividades, timezone = 'America/Mexico_City' }: Props) {
  // Search state
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus()
  }, [searchOpen])

  // Filters state
  const searchParams = useSearchParams()
  const [incluirArchivadas, setIncluirArchivadas] = useState(false)
  const [soloVencidas, setSoloVencidas] = useState(false)
  const [filtrosOpen, setFiltrosOpen] = useState(false)

  // Aplica filtro desde URL si existe (link del centro de alertas)
  useEffect(() => {
    const filtro = searchParams.get('filtro')
    if (filtro === 'vencidas') {
      setSoloVencidas(true)
      setIncluirArchivadas(false)
    }
  }, [searchParams])

  // Helper para detectar si una actividad ya pasó su fecha de fin
  const esVencida = (a: any) => {
    const fin = parseFecha(a.fecha_fin)
    if (!fin) return false
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    return fin < hoy
  }

  const cleanQuery = useMemo(() => normalizar(query.trim()), [query])
  const hayBusqueda = cleanQuery.length > 0
  const hayCambios = incluirArchivadas || soloVencidas

  // Lists matching query and filters
  const { dentroFiltro, fueraFiltro } = useMemo(() => {
    const matchesQuery = (a: any) => {
      if (!hayBusqueda) return true
      return normalizar(a.nombre).includes(cleanQuery)
    }

    const matchesFilters = (a: any) => {
      // Si está activo el filtro de vencidas, solo mostrar vencidas activas
      if (soloVencidas) {
        if (a.estado !== 'activo') return false
        return esVencida(a)
      }
      if (a.estado === 'archivado' && !incluirArchivadas) return false
      return true
    }

    const dentro: any[] = []
    const fuera: any[] = []

    for (const a of actividades) {
      if (!matchesQuery(a)) continue
      if (matchesFilters(a)) {
        dentro.push(a)
      } else if (hayBusqueda) {
        fuera.push(a)
      }
    }

    return { dentroFiltro: dentro, fueraFiltro: fuera }
  }, [actividades, hayBusqueda, cleanQuery, incluirArchivadas, soloVencidas])

  const limpiarTodo = () => {
    setIncluirArchivadas(false)
    setSoloVencidas(false)
  }

  return (
    <div className="flex flex-col h-full min-h-screen bg-background pb-24">
      {/* Subheader */}
      <div className="sticky top-[56px] z-30 bg-card/95 backdrop-blur-sm border-b border-border h-14 px-4 flex items-center w-full">
        {searchOpen ? (
          <div className="flex items-center w-full gap-2">
            <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar por nombre de actividad..."
              className="flex-1 bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground"
            />
            <button
              onClick={() => { setQuery(''); setSearchOpen(false) }}
              className="p-2 -mr-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-colors"
              aria-label="Cerrar búsqueda"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full gap-3">
            <h1 className="text-xl font-bold tracking-tight text-foreground truncate">
              Actividades <span className="text-muted-foreground font-medium">({dentroFiltro.length})</span>
            </h1>

            <div className="flex items-center flex-shrink-0">
              <button
                onClick={() => setSearchOpen(true)}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-colors"
                aria-label="Buscar actividad"
              >
                <Search className="h-5 w-5" />
              </button>
              <button
                onClick={() => setFiltrosOpen(true)}
                className={`p-2 -mr-2 rounded-full transition-colors ${
                  hayCambios
                    ? 'text-[#22887c] hover:bg-[#22887c]/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
                aria-label="Filtrar actividades"
              >
                <Filter className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Listón de filtros activos */}
      {hayCambios && (
        <div className="sticky top-[112px] z-20 bg-background/95 backdrop-blur-sm border-b border-border px-3 py-1.5 flex items-center justify-between gap-3">
          <div className="flex-1 overflow-hidden flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar scroll-smooth pb-0.5">
              {incluirArchivadas && (
                <ResumenChip
                  label="Actividades archivadas"
                  icon={<CalendarDays className="h-3 w-3 text-muted-foreground" />}
                  onRemove={() => setIncluirArchivadas(false)}
                />
              )}
              {soloVencidas && (
                <ResumenChip
                  label="Actividades vencidas"
                  icon={<CalendarDays className="h-3 w-3 text-amber-500" />}
                  onRemove={() => setSoloVencidas(false)}
                />
              )}
            </div>
          </div>
          <button
            onClick={limpiarTodo}
            className="text-[11px] text-muted-foreground hover:text-foreground font-semibold underline-offset-2 hover:underline whitespace-nowrap flex-shrink-0 px-1 border-l border-border pl-2"
          >
            Limpiar
          </button>
        </div>
      )}

      {/* Filtros Bottom Sheet */}
      <FiltrosActividadesBottomSheet
        open={filtrosOpen}
        onOpenChange={setFiltrosOpen}
        incluirArchivadas={incluirArchivadas}
        onApply={(next) => {
          setIncluirArchivadas(next.incluirArchivadas)
        }}
      />

      {/* Lista de tarjetas */}
      <div className="p-4 space-y-2.5">
        {dentroFiltro.map((a) => (
          <ActividadCard key={a.id} actividad={a} />
        ))}

        {hayBusqueda && fueraFiltro.length > 0 && (
          <>
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-[1px] bg-slate-100 dark:bg-slate-900/30" />
              <span className="text-[10px] font-bold text-slate-100 dark:text-slate-900/30 tracking-wider uppercase whitespace-nowrap">
                Coincidencias fuera del filtro
              </span>
              <div className="flex-1 h-[1px] bg-slate-100 dark:bg-slate-900/30" />
            </div>
            {fueraFiltro.map((a) => (
              <ActividadCard key={a.id} actividad={a} />
            ))}
          </>
        )}

        {dentroFiltro.length === 0 && fueraFiltro.length === 0 && (
          <div className="text-center py-16 px-4 border border-dashed border-border rounded-xl bg-muted/20">
            <p className="text-sm text-muted-foreground">
              {hayBusqueda
                ? 'No hay actividades que coincidan con tu búsqueda.'
                : 'No hay actividades para mostrar. Toca el botón + para crear la primera.'}
            </p>
          </div>
        )}
      </div>

      {/* FAB + drawer de creación */}
      <CrearActividadDrawer timezone={timezone} />
    </div>
  )
}

function ActividadCard({ actividad }: { actividad: any }) {
  const members = (actividad.persona_grupo || []).filter((m: any) => m.estado === 'activo' && m.persona?.estado_registro === 'activo')
  const totalAlumnos = members.length

  // Días/horario reales. Si no hay nada configurado, se oculta la línea.
  const diasLabel = formatearDiasSemanaCorto(actividad.dias_semana ?? null)
  const horaLabel = formatearHorario(actividad.hora_inicio ?? null, actividad.hora_fin ?? null)
  const horarioCard = [diasLabel, horaLabel].filter(Boolean).join(' • ') || null

  const hoy = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const inicio = parseFecha(actividad.fecha_inicio)
  const fin = parseFecha(actividad.fecha_fin)
  const yaInicio = !!inicio && inicio <= hoy
  const yaFinalizo = !!fin && fin < hoy
  const esUnDia = !!actividad.fecha_inicio && actividad.fecha_inicio === actividad.fecha_fin

  return (
    <Link href={`/actividades/${actividad.id}`} className="block">
      <div className="relative overflow-hidden border rounded-lg hover:border-primary/50 transition-[transform,border-color,box-shadow,background-color] duration-150 active:scale-[0.985] active:border-[#22887c]/60 active:shadow-[0_0_0_1px_rgba(34,136,124,0.18),0_8px_20px_rgba(34,136,124,0.08)] bg-card border-border flex flex-col justify-between">
        <div className="py-3 pr-8 pl-4 flex items-center min-h-[76px] relative z-10 gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Círculo con emoji y borde neutro (las actividades no llevan color) */}
            <div
              className="h-9 w-9 rounded-full flex items-center justify-center text-base border-[3px] border-border bg-transparent flex-shrink-0"
              aria-hidden="true"
            >
              {actividad.emoji || ''}
            </div>

            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <div className="flex items-center gap-1.5 min-w-0 w-full">
                <h3 className="font-bold text-sm text-foreground truncate min-w-0 flex-1">{actividad.nombre}</h3>
              </div>

              <div className="flex flex-col text-xs text-muted-foreground min-w-0 w-full mt-0.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span>
                    {totalAlumnos === 0 ? 'Sin alumnos' : `${totalAlumnos} ${totalAlumnos === 1 ? 'alumno' : 'alumnos'}`}
                  </span>
                  {actividad.cupo_maximo != null && totalAlumnos >= actividad.cupo_maximo && (
                    <span className="inline-flex items-center text-[9px] font-bold px-1.5 py-[1.5px] rounded-full border border-[#c6bab5] bg-[#ffffff] text-amber-600 dark:text-amber-500 lowercase">
                      lleno
                    </span>
                  )}
                </div>
                {horarioCard ? (
                  <div className="text-[11px] text-muted-foreground/75 mt-0.5">
                    {diasLabel && <span className="text-[10px]">{diasLabel}</span>}
                    {diasLabel && horaLabel && <span className="text-[11px]"> • </span>}
                    {horaLabel && <span className="text-[11px]">{horaLabel}</span>}
                  </div>
                ) : (
                  <div className="text-[11px] select-none text-transparent mt-0.5" aria-hidden="true">
                    &nbsp;
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Badges de fechas y estado en la esquina inferior derecha */}
          <div className="absolute right-8 bottom-3 flex items-center gap-1">
            {esUnDia ? (
              <span className={cn(
                "inline-flex items-center text-[9px] font-semibold px-1.5 py-[1.5px] rounded-full border border-border bg-card whitespace-nowrap",
                yaFinalizo ? "text-muted-foreground bg-muted/30" : "text-foreground/85"
              )}>
                <span>{yaFinalizo ? 'fue el' : 'el'} {formatFechaCorta(actividad.fecha_inicio)}</span>
              </span>
            ) : (
              <>
                {actividad.fecha_inicio && (
                  <span className={cn(
                    "inline-flex items-center text-[9px] font-semibold px-1.5 py-[1.5px] rounded-full border border-border bg-card whitespace-nowrap",
                    yaFinalizo ? "text-muted-foreground bg-muted/30" : "text-foreground/85"
                  )}>
                    <span>{yaInicio ? 'inició' : 'inicia'}: {formatFechaCorta(actividad.fecha_inicio)}</span>
                  </span>
                )}
                {actividad.fecha_fin && (
                  <span className={cn(
                    "inline-flex items-center text-[9px] font-semibold px-1.5 py-[1.5px] rounded-full border border-border bg-card whitespace-nowrap",
                    yaFinalizo ? "text-muted-foreground bg-muted/30" : "text-foreground/85"
                  )}>
                    <span>{yaFinalizo ? 'finalizó' : 'finaliza'}: {formatFechaCorta(actividad.fecha_fin)}</span>
                  </span>
                )}
              </>
            )}

            {actividad.estado === 'archivado' && (
              <span className="inline-flex items-center text-[9px] font-bold px-1.5 py-[1.5px] rounded-full border border-gray-300 bg-gray-100 text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
                Archivada
              </span>
            )}
          </div>

          <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </Link>
  )
}

function ResumenChip({
  label,
  icon,
  onRemove,
}: {
  label: string
  icon?: React.ReactNode
  onRemove: () => void
}) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary rounded-full text-[11px] font-semibold pl-2 pr-1.5 py-0.5 border border-primary/20 whitespace-nowrap flex-shrink-0">
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span className="truncate max-w-[140px]">{label}</span>
      <button
        onClick={onRemove}
        className="p-0.5 rounded-full hover:bg-primary/15 transition-colors ml-0.5"
        aria-label={`Quitar filtro ${label}`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}

function OptionRow({
  label,
  selected,
  icon,
  onClick,
}: {
  label: string
  selected: boolean
  icon?: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
        selected ? 'bg-primary/5' : 'hover:bg-accent',
      )}
    >
      <span className="flex items-center gap-2.5 min-w-0">
        {icon && <span className="flex-shrink-0">{icon}</span>}
        <span
          className={cn(
            'text-sm truncate',
            selected ? 'text-foreground font-medium' : 'text-foreground/90',
          )}
        >
          {label}
        </span>
      </span>
      {selected && (
        <span className="text-primary flex-shrink-0 text-sm font-bold">✓</span>
      )}
    </button>
  )
}

interface FiltrosProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  incluirArchivadas: boolean
  onApply: (next: { incluirArchivadas: boolean }) => void
}

function FiltrosActividadesBottomSheet({
  open,
  onOpenChange,
  incluirArchivadas,
  onApply,
}: FiltrosProps) {
  const [pArchivadas, setPArchivadas] = useState(incluirArchivadas)
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    if (open) {
      setPArchivadas(incluirArchivadas)
      setExpanded(true)
    }
  }, [open, incluirArchivadas])

  const hasChanges = pArchivadas !== incluirArchivadas

  const handleLimpiar = () => {
    setPArchivadas(false)
  }

  const handleAplicar = () => {
    onApply({ incluirArchivadas: pArchivadas })
    onOpenChange(false)
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[75vh] pt-2">
        <div className="mx-auto w-full max-w-md flex flex-col h-full overflow-hidden">
          <DrawerHeader className="text-left flex flex-row items-center justify-between gap-2">
            <DrawerTitle className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Filtrar
            </DrawerTitle>
            <button
              onClick={handleLimpiar}
              className="text-xs font-semibold text-primary hover:underline px-2 py-1"
            >
              Limpiar
            </button>
          </DrawerHeader>

          {/* Cuerpo scrolleable */}
          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
            <section className="border border-border rounded-lg overflow-hidden bg-card">
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-3 text-left transition-colors',
                  expanded ? 'bg-accent/30' : 'hover:bg-accent/20',
                )}
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-foreground">Situación</span>
                  {!expanded && (
                    <span className="text-xs text-muted-foreground mt-0.5 truncate max-w-[260px]">
                      {pArchivadas ? 'Con archivadas' : 'Ninguno'}
                    </span>
                  )}
                </div>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-muted-foreground transition-transform flex-shrink-0',
                    expanded && 'rotate-180',
                  )}
                />
              </button>
              {expanded && (
                <div className="border-t border-border px-2 py-2 space-y-0.5">
                  <OptionRow
                    label="Incluir actividades archivadas"
                    selected={pArchivadas}
                    icon={<CalendarDays className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />}
                    onClick={() => setPArchivadas(!pArchivadas)}
                  />
                </div>
              )}
            </section>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border space-y-2">
            <Button
              onClick={handleAplicar}
              disabled={!hasChanges}
              className="w-full h-11"
            >
              Aplicar filtros
            </Button>
            <Button
              onClick={() => onOpenChange(false)}
              variant="ghost"
              className="w-full h-11 text-muted-foreground"
            >
              Cerrar
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
