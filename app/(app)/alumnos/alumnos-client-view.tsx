'use client'

import { useMemo, useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Search, X, Filter, ArrowUpDown, Tag, AlertTriangle, RefreshCw, Users, GraduationCap } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  ESTADOS_FINANCIEROS,
  colorEstado,
  descuentoEspecialBadge,
  type EstadoFinancieroDef,
} from '@/lib/constants/alumno-finanzas'
import { colorPorSlug } from '@/lib/constants/grupo-apariencia'
import { CrearPersonaDrawer } from '@/components/domain/persona/crear-persona-drawer'
import { FiltrosBottomSheet } from '@/components/domain/alumno/filtros-bottom-sheet'
import type { AlumnoListItem, GrupoFiltro, PlanCobroItem } from './page'

type Props = {
  alumnos: AlumnoListItem[]
  grupos: GrupoFiltro[]
  planes: PlanCobroItem[]
  modoProrrateo: 'proporcional' | 'completo'
  multiPlanEnabled: boolean
  montoInscripcionDefault?: number
  cobrarInscripcionDefault?: boolean
}

const SORT_DEFAULT = 'nombre'

const ORDEN_LABEL: Record<string, string> = {
  nombre: 'Nombre A-Z',
  fecha: 'Fecha de registro',
  grupo: 'Grupo',
}

function normalizar(s: string | null | undefined) {
  return (s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

export function AlumnosClientView({ alumnos, grupos, planes, modoProrrateo, multiPlanEnabled, montoInscripcionDefault = 0, cobrarInscripcionDefault = false }: Props) {
  // Search
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus()
  }, [searchOpen])

  // Deep-links que precargan filtros al montar: ?filtro=huerfanos (desde
  // Pendientes) y ?estado=al_dia|pendiente|atrasado|urgente (desde las KPI
  // cards de Reportes). Se leen en el inicializador — la página se monta de
  // cero en cada navegación, así que no hace falta sincronizarlos después.
  const searchParams = useSearchParams()

  // Filtros — defaults
  const [filtroEstado, setFiltroEstado] = useState<Set<string>>(() => {           // vacío = sin filtro (todos)
    const estado = searchParams.get('estado')
    return estado && ESTADOS_FINANCIEROS.some((e) => e.slug === estado)
      ? new Set([estado])
      : new Set<string>()
  })
  const [filtroGrupos, setFiltroGrupos] = useState<Set<string>>(new Set())          // vacío = todos
  const [filtroPlanes, setFiltroPlanes] = useState<Set<string>>(new Set())          // vacío = todos (solo multi-plan)
  const [filtroSituacion, setFiltroSituacion] = useState<string>('activos')         // default: activos (siempre aplica como filtro)
  const [orden, setOrden] = useState<string>(SORT_DEFAULT)
  const [soloHuerfanos, setSoloHuerfanos] = useState(                               // control de huérfanos
    () => searchParams.get('filtro') === 'huerfanos',
  )

  // Bottom sheet de filtros
  const [filtrosOpen, setFiltrosOpen] = useState(false)

  // Scroll indicator for filter chips
  const [scrollInfo, setScrollInfo] = useState({ ratio: 1, left: 0, show: false })
  const chipsContainerRef = useRef<HTMLDivElement | null>(null)

  const updateScrollInfo = () => {
    const el = chipsContainerRef.current
    if (!el) return
    const { scrollWidth, clientWidth, scrollLeft } = el
    const show = scrollWidth > clientWidth
    const ratio = show ? clientWidth / scrollWidth : 1
    const left = show ? scrollLeft / scrollWidth : 0
    setScrollInfo({ ratio, left, show })
  }

  const handleScroll = () => {
    updateScrollInfo()
  }

  useEffect(() => {
    updateScrollInfo()
    window.addEventListener('resize', updateScrollInfo)
    return () => window.removeEventListener('resize', updateScrollInfo)
  }, [filtroEstado, filtroGrupos, filtroPlanes, filtroSituacion, orden])

  const cleanQuery = useMemo(() => normalizar(query.trim()), [query])
  const hayBusqueda = cleanQuery.length > 0

  // Determinar si cada dimensión está NO-default (para el resumen/visibilidad de health strip).
  // Nota: situación SIEMPRE filtra; 'activos' es la opción default y no genera chip.
  const estadoActivo = filtroEstado.size > 0
  const gruposActivo = filtroGrupos.size > 0
  const planesActivo = filtroPlanes.size > 0
  const situacionActivo = filtroSituacion !== 'activos'
  const ordenActivo = orden !== SORT_DEFAULT
  const hayCambios = estadoActivo || gruposActivo || planesActivo || situacionActivo || ordenActivo || soloHuerfanos

  // Lookup helpers
  const grupoById = useMemo(() => {
    const m = new Map<string, GrupoFiltro>()
    for (const g of grupos) m.set(g.id, g)
    return m
  }, [grupos])
  const planById = useMemo(() => {
    const m = new Map<string, PlanCobroItem>()
    for (const p of planes) m.set(p.id, p)
    return m
  }, [planes])
  const estadoById = useMemo(() => {
    const m = new Map<string, EstadoFinancieroDef>()
    for (const e of ESTADOS_FINANCIEROS) m.set(e.slug, e)
    return m
  }, [])

  // Listas separadas: "dentro del filtro" y "fuera del filtro" (sólo cuando hay búsqueda).
  const { dentroFiltro, fueraFiltro } = useMemo(() => {
    const matchesQuery = (a: AlumnoListItem) => {
      if (!hayBusqueda) return true
      const full = normalizar(`${a.nombre} ${a.apellido ?? ''}`)
      const tel = normalizar(a.telefono_whatsapp)
      return full.includes(cleanQuery) || tel.includes(cleanQuery)
    }

    const matchesFilters = (a: AlumnoListItem) => {
      if (estadoActivo && !filtroEstado.has(a.estadoFinanciero)) return false
      if (gruposActivo) {
        const gid = a.grupo?.id ?? '__sin__'
        if (!filtroGrupos.has(gid)) return false
      }
      if (planesActivo) {
        const tieneAlguno = a.planes.some((p) => filtroPlanes.has(p.id))
        if (!tieneAlguno) return false
      }
      if (soloHuerfanos && !a.esHuerfano) return false
      // Situación siempre se aplica (default 'activos').
      const op = a.estado_registro === 'activo' ? 'activos' : 'suspendidos'
      if (op !== filtroSituacion) return false
      return true
    }

    const sortFn = (a: AlumnoListItem, b: AlumnoListItem) => {
      if (orden === 'fecha') return (b.created_at ?? '').localeCompare(a.created_at ?? '')
      if (orden === 'grupo') {
        const ga = a.grupo?.nombre ?? '~zzz'
        const gb = b.grupo?.nombre ?? '~zzz'
        const cmp = ga.localeCompare(gb, 'es')
        if (cmp !== 0) return cmp
      }
      return `${a.nombre} ${a.apellido ?? ''}`.localeCompare(`${b.nombre} ${b.apellido ?? ''}`, 'es')
    }

    const dentro: AlumnoListItem[] = []
    const fuera: AlumnoListItem[] = []
    for (const a of alumnos) {
      if (!matchesQuery(a)) continue
      if (matchesFilters(a)) dentro.push(a)
      else if (hayBusqueda) fuera.push(a)
    }
    dentro.sort(sortFn)
    fuera.sort(sortFn)
    return { dentroFiltro: dentro, fueraFiltro: fuera }
  }, [alumnos, hayBusqueda, cleanQuery, estadoActivo, filtroEstado, gruposActivo, filtroGrupos, planesActivo, filtroPlanes, soloHuerfanos, filtroSituacion, orden])

  // Total visible (para el contador del subheader).
  const totalVisible = dentroFiltro.length + fueraFiltro.length

  // Helpers
  const limpiarTodo = () => {
    setFiltroEstado(new Set())
    setFiltroGrupos(new Set())
    setFiltroPlanes(new Set())
    setFiltroSituacion('activos')
    setOrden(SORT_DEFAULT)
    setSoloHuerfanos(false)
  }

  const removerEstado = (slug: string) => {
    const next = new Set(filtroEstado)
    next.delete(slug)
    setFiltroEstado(next)
  }
  const removerGrupo = (id: string) => {
    const next = new Set(filtroGrupos)
    next.delete(id)
    setFiltroGrupos(next)
  }
  const removerPlan = (id: string) => {
    const next = new Set(filtroPlanes)
    next.delete(id)
    setFiltroPlanes(next)
  }
  const removerSituacion = () => setFiltroSituacion('activos')
  const removerOrden = () => setOrden(SORT_DEFAULT)

  // Texto del chip de situación (sólo se muestra si NO es el default 'activos')
  const situacionLabel = filtroSituacion === 'suspendidos' ? 'Suspendidos' : 'Activos'

  return (
    <div className="flex flex-col h-full min-h-screen bg-background pb-24">
      {/* Subheader custom (sticky) */}
      <div className="sticky top-[56px] z-30 bg-card/95 backdrop-blur-sm border-b border-border h-14 px-4 flex items-center w-full">
        {searchOpen ? (
          <div className="flex items-center w-full gap-2">
            <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar por nombre, apellidos o teléfono"
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
              Alumnos <span className="text-muted-foreground font-medium">({totalVisible})</span>
            </h1>

            <div className="flex items-center flex-shrink-0">
              <button
                onClick={() => setSearchOpen(true)}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-colors"
                aria-label="Buscar alumno"
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
                aria-label="Filtrar alumnos"
              >
                <Filter className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Listón compacto con resumen — solo si hay cambios */}
      {hayCambios && (
        <div className="sticky top-[112px] z-20 bg-background/95 backdrop-blur-sm border-b border-border px-3 py-1.5 flex items-center justify-between gap-3">
          <div className="relative flex-1 overflow-hidden flex flex-col gap-1.5">
            <div
              ref={chipsContainerRef}
              onScroll={handleScroll}
              className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar scroll-smooth pb-0.5"
            >
              {/* Chips removibles por filtro */}
              {Array.from(filtroEstado).map(slug => {
                const e = estadoById.get(slug)
                if (!e) return null
                return (
                  <ResumenChip
                    key={`est-${slug}`}
                    label={e.label}
                    color={e.hex}
                    onRemove={() => removerEstado(slug)}
                  />
                )
              })}
              {Array.from(filtroGrupos).map(id => {
                const g = id === '__sin__' ? null : grupoById.get(id)
                const label = g?.nombre ?? 'Sin grupo'
                const color = g ? colorPorSlug(g.color).border : '#FFFFFF'
                const dotClassName = g ? undefined : 'border border-gray-400 dark:border-gray-500'
                return (
                  <ResumenChip
                    key={`gru-${id}`}
                    label={label}
                    color={color}
                    dotClassName={dotClassName}
                    onRemove={() => removerGrupo(id)}
                  />
                )
              })}
              {Array.from(filtroPlanes).map(id => {
                const p = planById.get(id)
                if (!p) return null
                return (
                  <ResumenChip
                    key={`plan-${id}`}
                    label={p.nombre}
                    icon={<Tag className="h-3 w-3 text-primary" />}
                    onRemove={() => removerPlan(id)}
                  />
                )
              })}
              {soloHuerfanos && (
                <ResumenChip
                  label="Sin grupo/plan"
                  icon={<AlertTriangle className="h-3 w-3 text-amber-600" />}
                  onRemove={() => setSoloHuerfanos(false)}
                />
              )}
              {situacionActivo && (
                <ResumenChip
                  label={situacionLabel}
                  color="#9CA3AF"
                  onRemove={removerSituacion}
                />
              )}
              {ordenActivo && (
                <ResumenChip
                  label={ORDEN_LABEL[orden]}
                  icon={<ArrowUpDown className="h-3 w-3 text-primary" />}
                  onRemove={removerOrden}
                />
              )}
            </div>
            {scrollInfo.show && (
              <div className="w-full h-[2px] bg-muted/40 rounded-full relative overflow-hidden">
                <div
                  className="absolute h-full bg-primary/50 rounded-full transition-all duration-75"
                  style={{
                    width: `${scrollInfo.ratio * 100}%`,
                    left: `${scrollInfo.left * 100}%`,
                  }}
                />
              </div>
            )}
          </div>

          <button
            onClick={limpiarTodo}
            className="text-[11px] text-muted-foreground hover:text-foreground font-semibold underline-offset-2 hover:underline whitespace-nowrap flex-shrink-0 px-1 border-l border-border pl-2"
          >
            Limpiar
          </button>
        </div>
      )}

      {/* Bottom sheet de filtros */}
      <FiltrosBottomSheet
        open={filtrosOpen}
        onOpenChange={setFiltrosOpen}
        grupos={grupos}
        planes={multiPlanEnabled ? planes.map((p) => ({ id: p.id, nombre: p.nombre })) : undefined}
        currentEstado={filtroEstado}
        currentGrupos={filtroGrupos}
        currentPlanes={filtroPlanes}
        currentSituacion={filtroSituacion}
        currentOrden={orden}
        onApply={(next) => {
          setFiltroEstado(next.estado)
          setFiltroGrupos(next.grupos)
          setFiltroPlanes(next.planes)
          setFiltroSituacion(next.situacion)
          setOrden(next.orden)
        }}
      />

      {/* Lista de alumnos */}
      <div className="p-4 space-y-2.5">
        {dentroFiltro.map(a => <AlumnoCard key={a.id} a={a} multiPlanEnabled={multiPlanEnabled} />)}

        {hayBusqueda && fueraFiltro.length > 0 && (
          <>
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-[1px] bg-slate-100 dark:bg-slate-900/30" />
              <span className="text-[10px] font-bold text-slate-100 dark:text-slate-900/30 tracking-wider uppercase whitespace-nowrap">
                Coincidencias fuera del filtro
              </span>
              <div className="flex-1 h-[1px] bg-slate-100 dark:bg-slate-900/30" />
            </div>
            {fueraFiltro.map(a => <AlumnoCard key={a.id} a={a} multiPlanEnabled={multiPlanEnabled} />)}
          </>
        )}

        {dentroFiltro.length === 0 && fueraFiltro.length === 0 && (
          <div className="text-center py-16 px-4 border border-dashed border-border rounded-xl bg-muted/20">
            <p className="text-sm text-muted-foreground">
              {hayBusqueda
                ? 'No hay alumnos que coincidan con tu búsqueda.'
                : hayCambios
                  ? 'No hay alumnos que coincidan con los filtros aplicados.'
                  : 'Aún no hay alumnos registrados. Toca el botón + para agregar el primero.'}
            </p>
          </div>
        )}
      </div>

      {/* FAB - reutiliza el FAB embebido del CrearPersonaDrawer */}
      <CrearPersonaDrawer
        grupos={grupos as any}
        planes={planes as any}
        modoProrrateo={modoProrrateo}
        multiPlanEnabled={multiPlanEnabled}
        montoInscripcionDefault={montoInscripcionDefault}
        cobrarInscripcionDefault={cobrarInscripcionDefault}
      />
    </div>
  )
}

function AlumnoCard({ a, multiPlanEnabled }: { a: AlumnoListItem; multiPlanEnabled: boolean }) {
  const estado = colorEstado(a.estadoFinanciero)
  const grupoColor = a.grupo ? colorPorSlug(a.grupo.color) : null
  const suspendido = a.estado_registro !== 'activo'
  const planPrincipal = a.planes[0]
  const planesExtra = a.planes.length - 1
  const descuento = descuentoEspecialBadge(a.descuentoHermanosActivo, a.becaActiva, a.becaPorcentaje)

  return (
    <Link href={`/seguimiento/${a.id}?from=alumnos`} className="block">
      <div
        className={`relative overflow-hidden border rounded-lg py-2 pr-3 pl-5 flex flex-col sm:flex-row sm:items-center items-start gap-2 sm:gap-3 transition-[transform,border-color,box-shadow,background-color] duration-150 hover:border-primary/50 active:scale-[0.985] active:border-[#22887c]/60 active:shadow-[0_0_0_1px_rgba(34,136,124,0.18),0_8px_20px_rgba(34,136,124,0.08)] min-h-[62px] sm:min-h-[38px] ${
          suspendido ? 'bg-card/65 border-border/65' : 'bg-card border-border'
        }`}
      >
        {/* Indicator strip (6px, color del semáforo financiero) */}
        <div
          className="absolute left-0 top-0 bottom-0 w-[6px]"
          style={{ backgroundColor: estado.hex }}
        />
        <div className="flex-1 min-w-0 flex flex-col justify-center w-full">
          <div className="flex items-center gap-2 min-w-0">
            <p
              className={`text-sm font-semibold truncate ${
                suspendido ? 'text-muted-foreground/65' : 'text-foreground'
              }`}
            >
              {a.nombre} {a.apellido}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-start sm:justify-end gap-1.5 flex-shrink-0 w-full sm:w-auto">
          {/* Badge de grupo */}
          {a.grupos && a.grupos.length > 1 ? (
             <span
               className="inline-flex items-center gap-1.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border bg-white border-gray-200 dark:bg-card dark:border-border dark:text-foreground flex-shrink-0 whitespace-nowrap"
               style={{ color: '#333a4a' }}
               title={a.grupos.map((g) => g.nombre).join(', ')}
             >
               <div className="flex items-center -space-x-0.5">
                 {a.grupos.slice(0, 3).map((g, idx) => {
                   const gColor = colorPorSlug(g.color)
                   return (
                     <div
                       key={g.id}
                       className="w-2 h-2 rounded-full border border-white dark:border-card"
                       style={{ backgroundColor: gColor.border, zIndex: 10 - idx }}
                     />
                   )
                 })}
               </div>
               <span>{a.grupos[0].nombre}</span>
               <span className="flex-shrink-0">, +{a.grupos.length - 1}</span>
             </span>
          ) : a.grupo && grupoColor ? (
            <span
              className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border whitespace-nowrap"
              style={{ borderColor: grupoColor.border, color: grupoColor.textLight, backgroundColor: grupoColor.bg }}
              title={a.grupo.nombre}
            >
              {a.grupo.emoji && <span className="text-[10px]">{a.grupo.emoji}</span>}
              {a.grupo.nombre}
            </span>
          ) : (
            <span className="inline-flex items-center text-[9px] font-semibold border border-amber-200 bg-amber-50 text-amber-600 rounded-full px-1.5 py-0.5 whitespace-nowrap">
              Sin grupo
            </span>
          )}

          {/* Badge de plan */}
          {a.sinPlan ? (
             <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold bg-amber-50 text-amber-600 rounded-full px-1.5 py-0.5 flex-shrink-0 whitespace-nowrap">
               <span className="relative inline-flex items-center justify-center w-3 h-3 flex-shrink-0">
                 <RefreshCw className="h-3 w-3 absolute" />
                 <span className="absolute text-[5px] font-black leading-none">$</span>
               </span>
               Sin plan de pago
             </span>
          ) : multiPlanEnabled && planPrincipal ? (
             <span
               className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-muted/80 text-muted-foreground flex-shrink-0 whitespace-nowrap"
               title={a.planes.map((p) => p.nombre).join(', ')}
             >
               <PlanIcon />
               <span>{planPrincipal.nombre}</span>
               {planesExtra > 0 && <span className="flex-shrink-0">, +{planesExtra}</span>}
             </span>
          ) : null}

          {/* Badge de descuento especial (solo si hay uno activo). Mismos colores
              que el badge de esquema de cobro. */}
          {descuento && (
            <span
              className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-muted/80 text-muted-foreground flex-shrink-0 whitespace-nowrap"
              title={descuento.label}
            >
              {descuento.tipo === 'beca' ? (
                <GraduationCap className="h-3 w-3 flex-shrink-0" />
              ) : (
                <Users className="h-3 w-3 flex-shrink-0" />
              )}
              <span>{descuento.label}</span>
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

function ResumenChip({
  label,
  color,
  dotClassName,
  icon,
  onRemove,
}: {
  label: string
  color?: string
  dotClassName?: string
  icon?: React.ReactNode
  onRemove: () => void
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 bg-primary/10 text-primary rounded-full text-[11px] font-semibold pl-2 pr-1.5 py-0.5 border border-primary/20 whitespace-nowrap flex-shrink-0"
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {color && !icon && (
        <span
          className={cn(
            "inline-block h-2 w-2 rounded-full flex-shrink-0",
            dotClassName
          )}
          style={{ backgroundColor: color }}
          aria-hidden="true"
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

/** Ícono de plan de cobro: flechas en ciclo con signo $ superpuesto. */
function PlanIcon() {
  return (
    <span className="relative inline-flex items-center justify-center h-3 w-3 flex-shrink-0">
      <svg viewBox="0 0 14 14" fill="none" className="h-full w-full" aria-hidden="true">
        <path
          d="M2.5 7A4.5 4.5 0 0 1 7 2.5c1.2 0 2.3.47 3.1 1.24L11.5 5"
          stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"
        />
        <path d="M11.5 2.5V5H9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        <path
          d="M11.5 7A4.5 4.5 0 0 1 7 11.5c-1.2 0-2.3-.47-3.1-1.24L2.5 9"
          stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"
        />
        <path d="M2.5 11.5V9H5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        <text x="7" y="8.2" textAnchor="middle" fontSize="5.5" fontWeight="700" fill="currentColor" fontFamily="system-ui">$</text>
      </svg>
    </span>
  )
}
