'use client'

import { useMemo, useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, X, Filter, ChevronRight, Users, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { colorPorSlug } from '@/lib/constants/grupo-apariencia'
import { formatearDiasSemanaCorto, formatearHorario } from '@/lib/constants/dias-semana'
import { CrearPersonaDrawer } from '@/components/domain/persona/crear-persona-drawer'
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

export function GruposClientView({
  grupos,
  planes,
  modoProrrateo,
  multiPlanEnabled,
  montoInscripcionDefault = 0,
  cobrarInscripcionDefault = false,
}: Props) {
  // Search state
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus()
  }, [searchOpen])

  // Filters state
  const [incluirArchivados, setIncluirArchivados] = useState(false)
  const [filtrosOpen, setFiltrosOpen] = useState(false)

  const cleanQuery = useMemo(() => normalizar(query.trim()), [query])
  const hayBusqueda = cleanQuery.length > 0
  const hayCambios = incluirArchivados

  // Lists matching query and filters
  const { dentroFiltro, fueraFiltro } = useMemo(() => {
    const matchesQuery = (g: any) => {
      if (!hayBusqueda) return true
      return normalizar(g.nombre).includes(cleanQuery)
    }

    const matchesFilters = (g: any) => {
      if (g.estado === 'archivado' && !incluirArchivados) return false
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
  }, [grupos, hayBusqueda, cleanQuery, incluirArchivados])

  const limpiarTodo = () => {
    setIncluirArchivados(false)
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
              Grupos <span className="text-muted-foreground font-medium">({dentroFiltro.length})</span>
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
              {incluirArchivados && (
                <ResumenChip
                  label="Grupos archivados"
                  icon={<Users className="h-3 w-3 text-muted-foreground" />}
                  onRemove={() => setIncluirArchivados(false)}
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
        incluirArchivados={incluirArchivados}
        onApply={(next) => {
          setIncluirArchivados(next.incluirArchivados)
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
                ? 'No hay grupos que coincidan con tu búsqueda.'
                : 'No hay grupos para mostrar con los filtros aplicados.'}
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

      <CrearGrupoDrawer planes={planes as any} />
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

  const colorGrupo = colorPorSlug(grupo.color)

  return (
    <Link href={`/grupos/${grupo.id}`} className="block">
      <div className="relative overflow-hidden border rounded-lg hover:border-primary/50 transition-[transform,border-color,box-shadow,background-color] duration-150 active:scale-[0.985] active:border-[#22887c]/60 active:shadow-[0_0_0_1px_rgba(34,136,124,0.18),0_8px_20px_rgba(34,136,124,0.08)] bg-card border-border flex flex-col justify-between">
        {/* Indicator strip */}
        <div
          className="absolute left-0 top-0 bottom-0 w-[6px]"
          style={{ backgroundColor: colorGrupo.hex }}
        />
        <div className="py-3 pr-8 pl-5 flex items-center min-h-[76px] relative z-10 gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Círculo con emoji y halo de color */}
            <div
              className="h-9 w-9 rounded-full flex items-center justify-center text-base flex-shrink-0"
              style={{ border: `3px solid ${colorGrupo.hex}`, backgroundColor: 'transparent' }}
            >
              {grupo.emoji || ''}
            </div>

            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <div className="flex items-center gap-1.5 min-w-0 w-full">
                <h3 className="font-bold text-sm text-foreground truncate min-w-0 flex-1">{grupo.nombre}</h3>
              </div>

              {/* Conteo de alumnos y horario en líneas separadas.
                  La línea de horario se oculta si el grupo aún no tiene días/horario configurados. */}
              <div className="flex flex-col text-xs text-muted-foreground min-w-0 w-full mt-0.5">
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

          {/* Badge de archivado en la esquina inferior derecha */}
          {grupo.estado === 'archivado' && (
            <div className="absolute right-8 bottom-3 flex items-center gap-1">
              <span className="inline-flex items-center text-[9px] font-bold px-1.5 py-[1.5px] rounded-full border border-gray-300 bg-gray-100 text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
                Archivado
              </span>
            </div>
          )}

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

interface FiltrosProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  incluirArchivados: boolean
  onApply: (next: { incluirArchivados: boolean }) => void
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

function FiltrosGruposBottomSheet({
  open,
  onOpenChange,
  incluirArchivados,
  onApply,
}: FiltrosProps) {
  const [pArchivados, setPArchivados] = useState(incluirArchivados)
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    if (open) {
      setPArchivados(incluirArchivados)
      setExpanded(true)
    }
  }, [open, incluirArchivados])

  const hasChanges = pArchivados !== incluirArchivados

  const handleLimpiar = () => {
    setPArchivados(false)
  }

  const handleAplicar = () => {
    onApply({ incluirArchivados: pArchivados })
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
                      {pArchivados ? 'Con archivados' : 'Ninguno'}
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
                    label="Incluir grupos archivados"
                    selected={pArchivados}
                    icon={<Users className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />}
                    onClick={() => setPArchivados(!pArchivados)}
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
