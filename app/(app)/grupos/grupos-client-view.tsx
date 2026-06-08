'use client'

import { useMemo, useRef, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Search, X, Filter, ChevronRight, Users, CalendarDays, ChevronDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { colorPorSlug } from '@/lib/constants/grupo-apariencia'
import { formatearDiasSemanaCorto, formatearHorario } from '@/lib/constants/dias-semana'
import { CrearPersonaDrawer } from '@/components/domain/persona/crear-persona-drawer'
import { clasificarAlumno, type EstadoFinancieroAlumno } from '@/lib/constants/alumno-finanzas'
import { CrearGrupoDrawer } from '@/components/domain/grupo/crear-grupo-drawer'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'

type Props = {
  grupos: any[]
  planes: any[]
  modoProrrateo: 'proporcional' | 'completo'
  multiPlanEnabled: boolean
  montoInscripcionDefault?: number
  cobrarInscripcionDefault?: boolean
  timezone?: string
}

function normalizar(s: string | null | undefined) {
  return (s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

function darkenHex(hex: string, factor: number = 0.55) {
  const cleanHex = hex.replace('#', '')
  let r = parseInt(cleanHex.substring(0, 2), 16)
  let g = parseInt(cleanHex.substring(2, 4), 16)
  let b = parseInt(cleanHex.substring(4, 6), 16)

  r = Math.floor(r * factor)
  g = Math.floor(g * factor)
  b = Math.floor(b * factor)

  const rs = r.toString(16).padStart(2, '0')
  const gs = g.toString(16).padStart(2, '0')
  const bs = b.toString(16).padStart(2, '0')

  return `#${rs}${gs}${bs}`
}

function formatTallerDate(dateStr: string | null) {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.split('-').map(Number)
  if (!year || !month || !day) return dateStr
  const date = new Date(year, month - 1, day)
  const formatted = date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
  return formatted.replace(/\.$/, '')
}

export function GruposClientView({
  grupos,
  planes,
  modoProrrateo,
  multiPlanEnabled,
  montoInscripcionDefault = 0,
  cobrarInscripcionDefault = false,
  timezone = 'America/Mexico_City',
}: Props) {
  // Search state
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus()
  }, [searchOpen])

  // Filters state
  const searchParams = useSearchParams()
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'grupos' | 'talleres'>('todos')
  const [incluirArchivados, setIncluirArchivados] = useState(false)
  const [incluirArchivadosTalleres, setIncluirArchivadosTalleres] = useState(false)
  const [filtrosOpen, setFiltrosOpen] = useState(false)

  // Aplica filtro desde URL si existe
  useEffect(() => {
    const filtro = searchParams.get('filtro')
    if (filtro === 'archivados') {
      setFiltroTipo('talleres')
      setIncluirArchivadosTalleres(true)
    }
  }, [searchParams])

  // Safeguard: clear invalid situation options if type changes
  useEffect(() => {
    if (filtroTipo === 'grupos') {
      setIncluirArchivadosTalleres(false)
    } else if (filtroTipo === 'talleres') {
      setIncluirArchivados(false)
    }
  }, [filtroTipo])

  const cleanQuery = useMemo(() => normalizar(query.trim()), [query])
  const hayBusqueda = cleanQuery.length > 0

  const filtroTipoActivo = filtroTipo !== 'todos'
  const incluirArchivadosActivo = incluirArchivados
  const incluirArchivadosTalleresActivo = incluirArchivadosTalleres
  const hayCambios = filtroTipoActivo || incluirArchivadosActivo || incluirArchivadosTalleresActivo

  // Lists matching query and filters
  const { dentroFiltro, fueraFiltro } = useMemo(() => {
    const matchesQuery = (g: any) => {
      if (!hayBusqueda) return true
      return normalizar(g.nombre).includes(cleanQuery)
    }

    const matchesFilters = (g: any) => {
      // Tipo Filter
      if (filtroTipo === 'grupos' && g.es_temporal) return false
      if (filtroTipo === 'talleres' && !g.es_temporal) return false

      // Situación Filter
      if (!g.es_temporal) {
        if (g.estado === 'archivado' && !incluirArchivados) return false
      } else {
        if (g.estado === 'archivado' && !incluirArchivadosTalleres) return false
      }

      return true
    }

    const dentro: any[] = []
    const fuera: any[] = []

    for (const g of grupos) {
      if (!matchesQuery(g)) continue
      if (matchesFilters(g)) {
        dentro.push(g)
      } else if (hayBusqueda) {
        fuera.push(g)
      }
    }

    return { dentroFiltro: dentro, fueraFiltro: fuera }
  }, [grupos, hayBusqueda, cleanQuery, filtroTipo, incluirArchivados, incluirArchivadosTalleres])

  const visibleGrupos = dentroFiltro.filter((g) => !g.es_temporal).length
  const visibleTalleres = dentroFiltro.filter((g) => g.es_temporal).length

  const renderContador = () => {
    if (visibleTalleres === 0) {
      return `(${visibleGrupos})`
    }
    const gruposText = `${visibleGrupos} ${visibleGrupos === 1 ? 'grupo' : 'grupos'}`
    const talleresText = `${visibleTalleres} ${visibleTalleres === 1 ? 'taller' : 'talleres'}`
    return `(${gruposText} / ${talleresText})`
  }

  const limpiarTodo = () => {
    setFiltroTipo('todos')
    setIncluirArchivados(false)
    setIncluirArchivadosTalleres(false)
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
              placeholder="Buscar por nombre de grupo..."
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
              Grupos <span className="text-muted-foreground font-medium">{renderContador()}</span>
            </h1>

            <div className="flex items-center flex-shrink-0">
              <button
                onClick={() => setSearchOpen(true)}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-colors"
                aria-label="Buscar grupo"
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
                aria-label="Filtrar grupos"
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
              {filtroTipo !== 'todos' && (
                <ResumenChip
                  label={filtroTipo === 'grupos' ? 'Solo grupos' : 'Solo talleres'}
                  color={filtroTipo === 'grupos' ? '#15435a' : '#22887c'}
                  icon={
                    filtroTipo === 'grupos' ? (
                      <Users className="h-3 w-3 text-primary" />
                    ) : (
                      <CalendarDays className="h-3 w-3 text-[#22887c]" />
                    )
                  }
                  onRemove={() => setFiltroTipo('todos')}
                />
              )}
              {incluirArchivados && (
                <ResumenChip
                  label="Grupos archivados"
                  color="#9CA3AF"
                  icon={<Users className="h-3 w-3 text-muted-foreground" />}
                  onRemove={() => setIncluirArchivados(false)}
                />
              )}
              {incluirArchivadosTalleres && (
                <ResumenChip
                  label="Talleres archivados"
                  color="#9CA3AF"
                  icon={<CalendarDays className="h-3 w-3 text-muted-foreground" />}
                  onRemove={() => setIncluirArchivadosTalleres(false)}
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
      <FiltrosGruposBottomSheet
        open={filtrosOpen}
        onOpenChange={setFiltrosOpen}
        filtroTipo={filtroTipo}
        incluirArchivados={incluirArchivados}
        incluirArchivadosTalleres={incluirArchivadosTalleres}
        onApply={(next) => {
          setFiltroTipo(next.tipo)
          setIncluirArchivados(next.incluirArchivados)
          setIncluirArchivadosTalleres(next.incluirArchivadosTalleres)
        }}
      />

      {/* Lista de tarjetas */}
      <div className="p-4 space-y-2.5">
        {dentroFiltro.map((g) => (
          <GrupoCard key={g.id} grupo={g} />
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
            {fueraFiltro.map((g) => (
              <GrupoCard key={g.id} grupo={g} />
            ))}
          </>
        )}

        {dentroFiltro.length === 0 && fueraFiltro.length === 0 && (
          <div className="text-center py-16 px-4 border border-dashed border-border rounded-xl bg-muted/20">
            <p className="text-sm text-muted-foreground">
              {hayBusqueda
                ? 'No hay grupos o talleres que coincidan con tu búsqueda.'
                : 'No hay grupos o talleres para mostrar con los filtros aplicados.'}
            </p>
          </div>
        )}
      </div>

      {/* Drawers */}
      <CrearPersonaDrawer
        grupos={grupos as any}
        planes={planes as any}
        modoProrrateo={modoProrrateo}
        multiPlanEnabled={multiPlanEnabled}
        montoInscripcionDefault={montoInscripcionDefault}
        cobrarInscripcionDefault={cobrarInscripcionDefault}
        hideTrigger={true}
      />

      <CrearGrupoDrawer
        planes={planes as any}
        timezone={timezone}
      />
    </div>
  )
}

function GrupoCard({ grupo }: { grupo: any }) {
  const members = (grupo.persona_grupo || []).filter((m: any) => m.estado === 'activo' && m.persona?.estado_registro === 'activo')
  const totalAlumnos = members.length

  // Días/horario reales del grupo. Si no hay nada configurado, se oculta la línea.
  const diasLabel = formatearDiasSemanaCorto(grupo.dias_semana ?? null)
  const horaLabel = formatearHorario(grupo.hora_inicio ?? null, grupo.hora_fin ?? null)
  const horarioCard = [diasLabel, horaLabel].filter(Boolean).join(' • ') || null

  const now = useMemo(() => new Date(), [])

  // Classify each member's financial state
  const memberStates = useMemo(() => {
    return members.map((m: any) => {
      const p = m.persona
      if (!p) return 'al_dia'
      const cargosPendientes = (p.cargo || []).filter((c: any) =>
        ['pendiente', 'parcial', 'vencido'].includes(c.estado_financiero),
      )
      return clasificarAlumno(cargosPendientes, now)
    })
  }, [members, now])

  const alDia = memberStates.filter((s: EstadoFinancieroAlumno) => s === 'al_dia').length
  const pendientes = memberStates.filter((s: EstadoFinancieroAlumno) => s === 'pendiente').length
  const atrasados = memberStates.filter((s: EstadoFinancieroAlumno) => s === 'atrasado').length
  const urgentes = memberStates.filter((s: EstadoFinancieroAlumno) => s === 'urgente').length

  const pctAlDia = totalAlumnos > 0 ? (alDia / totalAlumnos) * 100 : 0
  const pctPendientes = totalAlumnos > 0 ? (pendientes / totalAlumnos) * 100 : 0
  const pctAtrasados = totalAlumnos > 0 ? (atrasados / totalAlumnos) * 100 : 0
  const pctUrgentes = totalAlumnos > 0 ? (urgentes / totalAlumnos) * 100 : 0

  const colorGrupo = colorPorSlug(grupo.color)
  
  const isFinalizado = useMemo(() => {
    if (!grupo.fecha_fin) return false
    const [y, m, d] = String(grupo.fecha_fin).split('-').map(Number)
    if (!y || !m || !d) return false
    const finDate = new Date(y, m - 1, d)
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    return finDate <= hoy
  }, [grupo.fecha_fin])

  return (
    <Link href={`/grupos/${grupo.id}`} className="block">
      <Card className="relative overflow-hidden bg-card border-border hover:border-primary/50 transition-[transform,border-color,box-shadow,background-color] duration-150 active:scale-[0.985] active:border-[#22887c]/60 active:shadow-[0_0_0_1px_rgba(34,136,124,0.18),0_10px_24px_rgba(34,136,124,0.08)] flex flex-col justify-between">
        <CardContent className="py-1.5 px-3 flex justify-between items-center min-h-[42px] relative z-10 gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Círculo con emoji y halo de color */}
            <div className="relative flex-shrink-0">
              <div
                className="h-9 w-9 rounded-full flex items-center justify-center text-base"
                style={{ border: `3px solid ${colorGrupo.hex}`, backgroundColor: 'transparent' }}
              >
                {grupo.emoji || ''}
              </div>
              {/* Icono pequeño en el lateral derecho centrado */}
              <span className="absolute top-1/2 -translate-y-1/2 -right-1 bg-card border border-border rounded-full p-0.5 shadow-sm flex items-center justify-center h-4 w-4 z-10">
                {grupo.es_temporal ? (
                  <CalendarDays className="h-2.5 w-2.5 text-[#22887c]" />
                ) : (
                  <Users className="h-2.5 w-2.5 text-primary" />
                )}
              </span>
            </div>

            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <div className="flex items-center justify-between gap-1.5 min-w-0 w-full">
                <h3 className="font-bold text-sm text-foreground truncate min-w-0 flex-1">{grupo.nombre}</h3>
                
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {/* Solo talleres tienen el badge finaliza */}
                  {grupo.es_temporal && (
                    <span className={cn(
                      "inline-flex items-center text-[10px] font-semibold px-2 py-[3px] rounded-full border border-border bg-card whitespace-nowrap",
                      isFinalizado ? "text-muted-foreground bg-muted/30" : "text-foreground/85"
                    )}>
                      <span>{isFinalizado ? 'finalizó' : 'finaliza'}: {formatTallerDate(grupo.fecha_fin)}</span>
                    </span>
                  )}

                  {grupo.estado === 'archivado' && (
                    <span className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-gray-300 bg-gray-100 text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
                      Archivado
                    </span>
                  )}
                </div>
              </div>

              {/* Conteo de alumnos y horario en líneas separadas.
                  La línea de horario se oculta si el grupo aún no tiene días/horario configurados. */}
              <div className="flex items-end justify-between gap-2 w-full mt-0.5">
                <div className="flex flex-col text-xs text-muted-foreground min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span>
                      {totalAlumnos === 0 ? 'Sin alumnos' : `${totalAlumnos} ${totalAlumnos === 1 ? 'alumno' : 'alumnos'}`}
                    </span>
                    {grupo.cupo_maximo != null && totalAlumnos >= grupo.cupo_maximo && (
                      <span className="inline-flex items-center text-[9px] font-bold px-1.5 py-[1.5px] rounded-full border border-[#c6bab5] bg-[#ffffff] text-amber-600 dark:text-amber-500 lowercase">
                        lleno
                      </span>
                    )}
                  </div>
                  {horarioCard && (
                    <div className="text-[11px] text-muted-foreground/75 mt-0.5">
                      {diasLabel && <span className="text-[10px]">{diasLabel}</span>}
                      {diasLabel && horaLabel && <span className="text-[11px]"> • </span>}
                      {horaLabel && <span className="text-[11px]">{horaLabel}</span>}
                    </div>
                  )}
                </div>

                {/* Sección de Health Stick (4 Estados de alumno-finanzas.ts) */}
                {totalAlumnos > 0 && (
                  <div className="flex-shrink-0 pb-0.5 select-none">
                    <div className="w-[51px] h-[3.5px] rounded-full flex overflow-hidden bg-muted/40">
                      {pctAlDia > 0 && (
                        <div
                          className="h-full transition-all duration-300"
                          style={{ width: `${pctAlDia}%`, backgroundColor: '#5C8F78' }}
                        />
                      )}
                      {pctPendientes > 0 && (
                        <div
                          className="h-full transition-all duration-300"
                          style={{ width: `${pctPendientes}%`, backgroundColor: '#D2A45C' }}
                        />
                      )}
                      {pctAtrasados > 0 && (
                        <div
                          className="h-full transition-all duration-300"
                          style={{ width: `${pctAtrasados}%`, backgroundColor: '#B85C50' }}
                        />
                      )}
                      {pctUrgentes > 0 && (
                        <div
                          className="h-full transition-all duration-300"
                          style={{ width: `${pctUrgentes}%`, backgroundColor: '#7A2F38' }}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-1" />
        </CardContent>
      </Card>
    </Link>
  )
}

function ResumenChip({
  label,
  color,
  icon,
  onRemove,
}: {
  label: string
  color: string
  icon?: React.ReactNode
  onRemove: () => void
}) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary rounded-full text-[11px] font-semibold pl-2 pr-1.5 py-0.5 border border-primary/20 whitespace-nowrap flex-shrink-0">
      {icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : (
        <span
          className="inline-block h-2 w-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
      )}
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

interface FiltrosProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  filtroTipo: 'todos' | 'grupos' | 'talleres'
  incluirArchivados: boolean
  incluirArchivadosTalleres: boolean
  onApply: (next: {
    tipo: 'todos' | 'grupos' | 'talleres'
    incluirArchivados: boolean
    incluirArchivadosTalleres: boolean
  }) => void
}

function OptionRow({
  label,
  selected,
  indicator = 'check',
  icon,
  onClick,
}: {
  label: string
  selected: boolean
  indicator?: 'check' | 'radio'
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
      {selected && indicator === 'check' && (
        <span className="text-primary flex-shrink-0 text-sm font-bold">✓</span>
      )}
      {selected && indicator === 'radio' && (
        <span
          className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border border-primary"
          aria-hidden="true"
        >
          <span className="h-2 w-2 rounded-full bg-primary" />
        </span>
      )}
    </button>
  )
}

function CollapsibleSection({
  title,
  summary,
  expanded,
  onExpand,
  children,
}: {
  title: string
  summary: string
  expanded: boolean
  onExpand: () => void
  children: React.ReactNode
}) {
  return (
    <section className="border border-border rounded-lg overflow-hidden bg-card">
      <button
        type="button"
        onClick={onExpand}
        className={cn(
          'w-full flex items-center justify-between px-4 py-3 text-left transition-colors',
          expanded ? 'bg-accent/30' : 'hover:bg-accent/20',
        )}
      >
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold text-foreground">{title}</span>
          {!expanded && (
            <span className="text-xs text-muted-foreground mt-0.5 truncate max-w-[260px]">
              {summary}
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
          {children}
        </div>
      )}
    </section>
  )
}

function FiltrosGruposBottomSheet({
  open,
  onOpenChange,
  filtroTipo,
  incluirArchivados,
  incluirArchivadosTalleres,
  onApply,
}: FiltrosProps) {
  const [pTipo, setPTipo] = useState<'todos' | 'grupos' | 'talleres'>(filtroTipo)
  const [pArchivados, setPArchivados] = useState(incluirArchivados)
  const [pArchivadosTalleres, setPArchivadosTalleres] = useState(incluirArchivadosTalleres)
  const [expanded, setExpanded] = useState<'tipo' | 'situacion' | null>('tipo')

  useEffect(() => {
    if (open) {
      setPTipo(filtroTipo)
      setPArchivados(incluirArchivados)
      setPArchivadosTalleres(incluirArchivadosTalleres)
      setExpanded('tipo')
    }
  }, [open, filtroTipo, incluirArchivados, incluirArchivadosTalleres])

  const hasChanges =
    pTipo !== filtroTipo ||
    pArchivados !== incluirArchivados ||
    pArchivadosTalleres !== incluirArchivadosTalleres

  const handlePTipoChange = (type: 'todos' | 'grupos' | 'talleres') => {
    setPTipo(type)
    if (type === 'grupos') {
      setPArchivadosTalleres(false)
    } else if (type === 'talleres') {
      setPArchivados(false)
    }
  }

  const handleLimpiar = () => {
    setPTipo('todos')
    setPArchivados(false)
    setPArchivadosTalleres(false)
  }

  const handleAplicar = () => {
    onApply({
      tipo: pTipo,
      incluirArchivados: pArchivados,
      incluirArchivadosTalleres: pArchivadosTalleres,
    })
    onOpenChange(false)
  }

  const resumenTipo = pTipo === 'todos' ? 'Grupos y talleres' : pTipo === 'grupos' ? 'Solo grupos' : 'Solo talleres'

  const resumenSituacion = useMemo(() => {
    const items: string[] = []
    if (pTipo === 'todos' || pTipo === 'grupos') {
      if (pArchivados) items.push('Con archivados')
    }
    if (pTipo === 'todos' || pTipo === 'talleres') {
      if (pArchivadosTalleres) items.push('Con archivados')
    }
    if (items.length === 0) return 'Ninguno'
    return items.join(', ')
  }, [pTipo, pArchivados, pArchivadosTalleres])

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[75vh] pt-2">
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
            {/* Sección Tipo */}
            <CollapsibleSection
              title="Tipo"
              expanded={expanded === 'tipo'}
              summary={resumenTipo}
              onExpand={() => setExpanded(current => current === 'tipo' ? null : 'tipo')}
            >
              <OptionRow
                label="Grupos y talleres"
                selected={pTipo === 'todos'}
                indicator="radio"
                icon={
                  <div className="relative w-4 h-4 flex-shrink-0">
                    <Users className="h-3 w-3 absolute -top-0.5 left-0 text-primary/80" />
                    <CalendarDays className="h-3 w-3 absolute -bottom-0.5 right-0 text-[#22887c]/80" />
                  </div>
                }
                onClick={() => handlePTipoChange('todos')}
              />
              <OptionRow
                label="Solo grupos"
                selected={pTipo === 'grupos'}
                indicator="radio"
                icon={<Users className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
                onClick={() => handlePTipoChange('grupos')}
              />
              <OptionRow
                label="Solo talleres"
                selected={pTipo === 'talleres'}
                indicator="radio"
                icon={<CalendarDays className="h-3.5 w-3.5 text-[#22887c] flex-shrink-0" />}
                onClick={() => handlePTipoChange('talleres')}
              />
            </CollapsibleSection>

            {/* Sección Situación */}
            <CollapsibleSection
              title="Situación"
              expanded={expanded === 'situacion'}
              summary={resumenSituacion}
              onExpand={() => setExpanded(current => current === 'situacion' ? null : 'situacion')}
            >
              {(pTipo === 'todos' || pTipo === 'grupos') && (
                <OptionRow
                  label="Incluir grupos archivados"
                  selected={pArchivados}
                  indicator="check"
                  icon={<Users className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />}
                  onClick={() => setPArchivados(!pArchivados)}
                />
              )}
              {(pTipo === 'todos' || pTipo === 'talleres') && (
                <OptionRow
                  label="Incluir talleres archivados"
                  selected={pArchivadosTalleres}
                  indicator="check"
                  icon={<CalendarDays className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />}
                  onClick={() => setPArchivadosTalleres(!pArchivadosTalleres)}
                />
              )}
            </CollapsibleSection>
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
