'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Search, X, SlidersHorizontal, CheckCircle2,
  UserCheck, UserX, ArrowDownWideNarrow, ArrowUpNarrowWide, ArrowDownAZ,
} from 'lucide-react'
import { SwipeableCargoCard } from '@/components/domain/cargo/swipeable-cargo-card'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { cn } from '@/lib/utils'

export type AlumnoConDeuda = {
  persona_id: string
  persona: {
    nombre: string
    apellido: string
    telefono_whatsapp: string | null
    codigo_pais?: string | null
    estado_registro: string
    grupo_nombre: string
    grupo: { id: string; nombre: string; color: string | null; emoji: string | null } | null
  }
  email: string | null
  planIds: string[]
  cargos: any[]
  totalAdeudado: number
  cargosCount: number
  estado: string
  estadoFinanciero: 'al_dia' | 'pendiente' | 'atrasado' | 'urgente'
}

export type GrupoEditar = { id: string; nombre: string; plan_sugerido_id?: string | null }
export type PlanEditar = { id: string; nombre: string; monto: number; frecuencia: string }

type Props = {
  alumnos: AlumnoConDeuda[]
  allowPartial: boolean
  allowOverpayment: boolean
  gruposEditar: GrupoEditar[]
  planesEditar: PlanEditar[]
  multiPlanEnabled: boolean
}

type ChipKey = 'todos' | 'urgente' | 'atrasado' | 'pendiente'
type SortKey = 'deuda_desc' | 'deuda_asc' | 'alfabetico'

const STORAGE_KEY = 'sipra_inicio_show_suspended'

// Semáforo financiero (mismos hex que ESTADOS_FINANCIEROS).
const CHIPS: { key: ChipKey; label: string; hex?: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'urgente', label: 'Urgentes', hex: '#7A2F38' },
  { key: 'atrasado', label: 'Atrasados', hex: '#B85C50' },
  { key: 'pendiente', label: 'Pendientes', hex: '#D2A45C' },
]

const SORT_CYCLE: SortKey[] = ['deuda_desc', 'deuda_asc', 'alfabetico']

const SORT_META: Record<SortKey, { label: string; full: string; Icon: typeof ArrowDownWideNarrow }> = {
  deuda_desc: { label: 'Mayor', full: 'Mayor deuda', Icon: ArrowDownWideNarrow },
  deuda_asc: { label: 'Menor', full: 'Menor deuda', Icon: ArrowUpNarrowWide },
  alfabetico: { label: 'A–Z', full: 'Alfabético', Icon: ArrowDownAZ },
}

function normalizar(s: string | null | undefined) {
  return (s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

export function InicioClientView({
  alumnos,
  allowPartial,
  allowOverpayment,
  gruposEditar,
  planesEditar,
  multiPlanEnabled,
}: Props) {
  // Búsqueda
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)
  useEffect(() => {
    if (searchOpen) inputRef.current?.focus()
  }, [searchOpen])

  // Filtros / orden
  const [activeChip, setActiveChip] = useState<ChipKey>('todos')
  const [sort, setSort] = useState<SortKey>('deuda_desc')

  // Suspendidos (persistido en localStorage)
  const [showSuspended, setShowSuspended] = useState(false)
  const [opcionesOpen, setOpcionesOpen] = useState(false)
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lectura de localStorage en mount (SSR-safe)
      if (localStorage.getItem(STORAGE_KEY) === 'true') setShowSuspended(true)
    } catch { /* noop */ }
  }, [])
  const updateSuspended = (v: boolean) => {
    setShowSuspended(v)
    try { localStorage.setItem(STORAGE_KEY, v ? 'true' : 'false') } catch { /* noop */ }
  }

  // Población considerada: activos siempre; suspendidos solo si se incluyen.
  const poblacion = useMemo(
    () => (showSuspended ? alumnos : alumnos.filter(a => a.persona.estado_registro === 'activo')),
    [alumnos, showSuspended],
  )

  // Conteos por estado (excluye 'al_dia' por construcción: solo hay alumnos con adeudo).
  const counts = useMemo(() => {
    const c: Record<ChipKey, number> = { todos: poblacion.length, urgente: 0, atrasado: 0, pendiente: 0 }
    for (const a of poblacion) {
      if (a.estadoFinanciero === 'urgente') c.urgente++
      else if (a.estadoFinanciero === 'atrasado') c.atrasado++
      else if (a.estadoFinanciero === 'pendiente') c.pendiente++
    }
    return c
  }, [poblacion])

  // Si el chip activo queda en 0 (p.ej. al alternar suspendidos), se trata como "Todos"
  // sin necesidad de un efecto correctivo.
  const effectiveChip: ChipKey =
    activeChip !== 'todos' && counts[activeChip] === 0 ? 'todos' : activeChip

  const cleanQuery = useMemo(() => normalizar(query.trim()), [query])
  const hayBusqueda = cleanQuery.length > 0

  const lista = useMemo(() => {
    const matchesQuery = (a: AlumnoConDeuda) => {
      if (!hayBusqueda) return true
      const full = normalizar(`${a.persona.nombre} ${a.persona.apellido ?? ''}`)
      const tel = normalizar(a.persona.telefono_whatsapp)
      return full.includes(cleanQuery) || tel.includes(cleanQuery)
    }
    const matchesChip = (a: AlumnoConDeuda) =>
      effectiveChip === 'todos' ? true : a.estadoFinanciero === effectiveChip

    const sortFn = (a: AlumnoConDeuda, b: AlumnoConDeuda) => {
      if (sort === 'alfabetico') {
        return `${a.persona.nombre} ${a.persona.apellido ?? ''}`.localeCompare(
          `${b.persona.nombre} ${b.persona.apellido ?? ''}`, 'es',
        )
      }
      if (sort === 'deuda_asc') return a.totalAdeudado - b.totalAdeudado
      return b.totalAdeudado - a.totalAdeudado
    }

    // Activos y suspendidos van mezclados siguiendo el ordenamiento seleccionado.
    return poblacion.filter(a => matchesChip(a) && matchesQuery(a)).sort(sortFn)
  }, [poblacion, effectiveChip, sort, hayBusqueda, cleanQuery])

  const cerrarBusqueda = () => { setQuery(''); setSearchOpen(false) }
  const sortMeta = SORT_META[sort]
  const SortIcon = sortMeta.Icon
  const cycleSort = () => {
    const idx = SORT_CYCLE.indexOf(sort)
    setSort(SORT_CYCLE[(idx + 1) % SORT_CYCLE.length])
  }

  const sinResultados = lista.length === 0

  return (
    <div className="flex flex-col h-full min-h-screen bg-background pb-24">
      {/* Subheader (sticky) — título + acciones, o buscador */}
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
              onClick={cerrarBusqueda}
              className="p-2 -mr-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-colors"
              aria-label="Cerrar búsqueda"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full gap-3">
            <h1 className="text-xl font-bold tracking-tight text-foreground truncate">Inicio</h1>
            <div className="flex items-center flex-shrink-0">
              <button
                onClick={() => setSearchOpen(true)}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-colors"
                aria-label="Buscar alumno"
              >
                <Search className="h-5 w-5" />
              </button>
              <button
                onClick={() => setOpcionesOpen(true)}
                className={cn(
                  'p-2 -mr-2 rounded-full transition-colors',
                  showSuspended
                    ? 'text-[#22887c] hover:bg-[#22887c]/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                )}
                aria-label="Opciones de la lista"
              >
                <SlidersHorizontal className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Listón de filtros (sticky, sin scroll horizontal) */}
      <div className="sticky top-[112px] z-20 bg-background/95 backdrop-blur-sm border-b border-border px-2 py-1.5 flex items-center gap-1">
        {CHIPS.map(chip => {
          const count = counts[chip.key]
          const selected = effectiveChip === chip.key
          const disabled = chip.key !== 'todos' && count === 0

          let style: React.CSSProperties | undefined
          let className =
            'flex-1 min-w-0 flex items-center justify-center gap-1 rounded-full h-8 px-1.5 text-[10px] font-semibold border transition-colors '

          if (disabled) {
            className += 'bg-secondary text-muted-foreground/50 border-transparent opacity-40 cursor-not-allowed'
          } else if (chip.key === 'todos') {
            className += selected
              ? 'bg-[#15435a] text-white border-transparent'
              : 'bg-secondary text-muted-foreground border-transparent hover:bg-accent'
          } else if (selected && chip.hex) {
            className += 'font-bold'
            style = { color: chip.hex, borderColor: `${chip.hex}80`, backgroundColor: `${chip.hex}1f` }
          } else {
            className += 'bg-secondary text-muted-foreground border-transparent hover:bg-accent'
          }

          return (
            <button
              key={chip.key}
              type="button"
              disabled={disabled}
              onClick={() => setActiveChip(chip.key)}
              className={className}
              style={style}
              title={`${chip.label} (${count})`}
            >
              <span className="truncate">{chip.label}</span>
              <span className="flex-shrink-0 tabular-nums">({count})</span>
            </button>
          )
        })}

        {/* Botón de acción: rota el orden de la lista (diferenciado de los chips).
            En móvil: solo ícono, ancho fijo fácilmente tapeable. */}
        <button
          type="button"
          onClick={cycleSort}
          title={`Orden: ${sortMeta.full} (toca para cambiar)`}
          aria-label={`Ordenar. Actual: ${sortMeta.full}`}
          className="flex-shrink-0 flex items-center justify-center gap-1 rounded-lg h-8 w-11 sm:w-auto sm:px-2 border border-border bg-card shadow-sm hover:bg-accent active:scale-95 transition-all"
        >
          <SortIcon className="h-4 w-4 text-[#15435a]" />
          <span className="hidden sm:inline text-[10px] font-bold text-foreground">{sortMeta.label}</span>
        </button>
      </div>

      {/* Lista de alumnos con adeudo (activos y suspendidos mezclados por orden) */}
      <div className="p-4 space-y-3">
        {lista.map(alumno => (
          <SwipeableCargoCard
            key={alumno.persona_id}
            alumno={alumno}
            allowPartial={allowPartial}
            allowOverpayment={allowOverpayment}
            grupos={gruposEditar}
            planes={planesEditar}
            multiPlanEnabled={multiPlanEnabled}
          />
        ))}

        {sinResultados && (
          <div className="text-center py-16 px-4">
            <div className="bg-[#22887c]/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-[#22887c]" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">
              {hayBusqueda ? 'Sin coincidencias' : 'Todo al corriente'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {hayBusqueda
                ? 'Ningún alumno coincide con tu búsqueda.'
                : 'No hay alumnos con deudas en este filtro.'}
            </p>
          </div>
        )}
      </div>

      {/* Bottom sheet de opciones (incluir / excluir suspendidos) */}
      <OpcionesSheet
        open={opcionesOpen}
        onOpenChange={setOpcionesOpen}
        showSuspended={showSuspended}
        onChange={(v) => { updateSuspended(v); setOpcionesOpen(false) }}
      />
    </div>
  )
}

function OpcionesSheet({
  open,
  onOpenChange,
  showSuspended,
  onChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  showSuspended: boolean
  onChange: (showSuspended: boolean) => void
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md pb-6">
          <DrawerHeader className="text-left">
            <DrawerTitle className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Mostrar en la lista
            </DrawerTitle>
          </DrawerHeader>

          <div className="px-4 space-y-2">
            <OpcionRow
              icon={<UserCheck className="h-5 w-5" />}
              label="Solo alumnos activos con adeudo"
              selected={!showSuspended}
              onClick={() => onChange(false)}
            />
            <OpcionRow
              icon={<UserX className="h-5 w-5" />}
              label="Incluir alumnos suspendidos con adeudo"
              selected={showSuspended}
              onClick={() => onChange(true)}
            />
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

function OpcionRow({
  icon,
  label,
  selected,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-3 rounded-xl border text-left transition-colors',
        selected ? 'border-primary/40 bg-primary/5' : 'border-border hover:bg-accent',
      )}
    >
      <span className={cn('flex-shrink-0', selected ? 'text-primary' : 'text-muted-foreground')}>
        {icon}
      </span>
      <span className={cn('flex-1 text-sm', selected ? 'font-semibold text-foreground' : 'text-foreground/90')}>
        {label}
      </span>
      <span
        className={cn(
          'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border',
          selected ? 'border-primary' : 'border-muted-foreground/40',
        )}
        aria-hidden="true"
      >
        {selected && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
      </span>
    </button>
  )
}
