'use client'

import * as React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Search, Check, ChevronDown, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { ESTADOS_FINANCIEROS } from '@/lib/constants/alumno-finanzas'
import { colorPorSlug } from '@/lib/constants/grupo-apariencia'
import { cn } from '@/lib/utils'

type GrupoLite = { id: string; nombre: string; color: string | null }
type PlanLite = { id: string; nombre: string }

type Seccion = 'estado' | 'grupos' | 'planes' | 'situacion' | 'orden'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  grupos: GrupoLite[]
  /** Catálogo de planes. Si se pasa (modo multi-plan), se muestra el filtro de Planes. */
  planes?: PlanLite[]

  // Estado actual del padre (lo que está aplicado)
  currentEstado: Set<string>
  currentGrupos: Set<string>
  currentPlanes: Set<string>
  currentSituacion: string // 'todos' | 'activos' | 'suspendidos'
  currentOrden: string

  // Callback al aplicar — commit del estado local al padre
  onApply: (next: {
    estado: Set<string>
    grupos: Set<string>
    planes: Set<string>
    situacion: string
    orden: string
  }) => void
}

const ORDENES = [
  { value: 'nombre', label: 'Nombre A-Z' },
  { value: 'fecha', label: 'Fecha de registro' },
  { value: 'grupo', label: 'Grupo' },
]

const ORDEN_LABEL: Record<string, string> = {
  nombre: 'Nombre A-Z',
  fecha: 'Fecha de registro',
  grupo: 'Grupo',
}

const SITUACION_LABEL: Record<string, string> = {
  activos: 'Activos',
  suspendidos: 'Suspendidos',
}

const DEFAULT_SITUACION = 'activos'
const DEFAULT_ORDEN = 'nombre'

function setsEqual(a: Set<string>, b: Set<string>) {
  if (a.size !== b.size) return false
  for (const v of a) if (!b.has(v)) return false
  return true
}

export function FiltrosBottomSheet({
  open,
  onOpenChange,
  grupos,
  planes,
  currentEstado,
  currentGrupos,
  currentPlanes,
  currentSituacion,
  currentOrden,
  onApply,
}: Props) {
  const showPlanes = !!planes && planes.length > 0
  // Estado local "pendiente" — solo se commitea con "Aplicar filtros"
  const [pEstado, setPEstado] = useState<Set<string>>(new Set(currentEstado))
  const [pGrupos, setPGrupos] = useState<Set<string>>(new Set(currentGrupos))
  const [pPlanes, setPPlanes] = useState<Set<string>>(new Set(currentPlanes))
  const [pSituacion, setPSituacion] = useState<string>(currentSituacion)
  const [pOrden, setPOrden] = useState<string>(currentOrden)
  const [grupoSearch, setGrupoSearch] = useState('')

  // Sección expandida: puede no haber ninguna, pero nunca más de una.
  const [expanded, setExpanded] = useState<Seccion | null>('estado')

  // Resetea estado local cada vez que el sheet se abre con el estado actual del padre.
  useEffect(() => {
    if (open) {
      setPEstado(new Set(currentEstado))
      setPGrupos(new Set(currentGrupos))
      setPPlanes(new Set(currentPlanes))
      setPSituacion(currentSituacion)
      setPOrden(currentOrden)
      setGrupoSearch('')
      setExpanded('estado')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const hasChanges =
    !setsEqual(pEstado, currentEstado) ||
    !setsEqual(pGrupos, currentGrupos) ||
    !setsEqual(pPlanes, currentPlanes) ||
    pSituacion !== currentSituacion ||
    pOrden !== currentOrden

  // ---------- Toggles ----------
  // Estado y Grupos: "Todos" = set vacío. Click en Todos vacía; click en otro lo agrega/quita.
  const toggleEstado = (value: string) => {
    if (value === 'todos') {
      setPEstado(new Set())
      return
    }
    const next = new Set(pEstado)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    setPEstado(next)
  }
  const toggleGrupo = (value: string) => {
    if (value === 'todos') {
      setPGrupos(new Set())
      return
    }
    const next = new Set(pGrupos)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    setPGrupos(next)
  }
  const togglePlan = (value: string) => {
    if (value === 'todos') {
      setPPlanes(new Set())
      return
    }
    const next = new Set(pPlanes)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    setPPlanes(next)
  }
  const resumenPlanes = (() => {
    if (!planes) return 'Todos'
    if (pPlanes.size === 0) return 'Todos'
    if (pPlanes.size <= 3) {
      return Array.from(pPlanes).map((id) => planes.find((p) => p.id === id)?.nombre ?? '').filter(Boolean).join(', ')
    }
    return `${pPlanes.size} planes`
  })()

  // ---------- Resúmenes para headers colapsados ----------
  const resumenEstado = useMemo(() => {
    const total = ESTADOS_FINANCIEROS.length
    if (pEstado.size === 0) return 'Todos'
    if (pEstado.size === total) return `Todos (${total})`
    if (pEstado.size <= 3) {
      return ESTADOS_FINANCIEROS.filter(e => pEstado.has(e.slug)).map(e => e.label).join(', ')
    }
    return `${pEstado.size} estados`
  }, [pEstado])

  const resumenGrupos = useMemo(() => {
    const total = grupos.length + 1
    if (pGrupos.size === 0) return 'Todos'
    if (pGrupos.size === total) return `Todos (${total})`
    if (pGrupos.size <= 3) {
      const items = Array.from(pGrupos).map(id => {
        if (id === '__sin__') return 'Sin grupo'
        return grupos.find(g => g.id === id)?.nombre ?? ''
      })
      return items.filter(Boolean).join(', ')
    }
    return `${pGrupos.size} grupos`
  }, [pGrupos, grupos])

  const resumenSituacion = SITUACION_LABEL[pSituacion] ?? 'Activos'
  const resumenOrden = ORDEN_LABEL[pOrden] ?? 'Nombre A-Z'

  // ---------- Grupos filtrados por búsqueda interna ----------
  const gruposFiltrados = useMemo(() => {
    const q = grupoSearch.trim().toLowerCase()
    if (!q) return grupos
    return grupos.filter(g => g.nombre.toLowerCase().includes(q))
  }, [grupos, grupoSearch])

  const needsScroll = grupos.length > 5
  const needsSearch = grupos.length > 15

  // ---------- Acciones ----------
  const handleLimpiar = () => {
    setPEstado(new Set())
    setPGrupos(new Set())
    setPPlanes(new Set())
    setPSituacion(DEFAULT_SITUACION)
    setPOrden(DEFAULT_ORDEN)
  }

  const handleAplicar = () => {
    if (!hasChanges) return
    onApply({ estado: pEstado, grupos: pGrupos, planes: pPlanes, situacion: pSituacion, orden: pOrden })
    onOpenChange(false)
  }

  const planTodosSelected = pPlanes.size === 0

  // Helpers visuales
  const grupoTodosSelected = pGrupos.size === 0
  const estadoTodosSelected = pEstado.size === 0

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[88vh] pt-2">

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
            {/* Estado financiero */}
            <CollapsibleSection
              title="Estado financiero"
              expanded={expanded === 'estado'}
              summary={resumenEstado}
              onExpand={() => setExpanded(current => current === 'estado' ? null : 'estado')}
            >
              <OptionRow
                label="Todos"
                selected={estadoTodosSelected}
                onClick={() => toggleEstado('todos')}
              />
              {ESTADOS_FINANCIEROS.map(e => (
                <OptionRow
                  key={e.slug}
                  label={e.label}
                  dotColor={e.hex}
                  selected={pEstado.has(e.slug)}
                  onClick={() => toggleEstado(e.slug)}
                />
              ))}
            </CollapsibleSection>

            {/* Grupos */}
            <CollapsibleSection
              title="Grupo"
              expanded={expanded === 'grupos'}
              summary={resumenGrupos}
              onExpand={() => setExpanded(current => current === 'grupos' ? null : 'grupos')}
            >
              {needsSearch && (
                <div className="relative mb-2 px-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    value={grupoSearch}
                    onChange={e => setGrupoSearch(e.target.value)}
                    placeholder="Buscar grupo..."
                    className="h-10 pl-10"
                  />
                </div>
              )}

              <div className={cn(needsScroll && 'max-h-[260px] overflow-y-auto pr-1')}>
                <OptionRow
                  label="Todos"
                  selected={grupoTodosSelected}
                  onClick={() => toggleGrupo('todos')}
                />
                 <OptionRow
                  label="Sin grupo"
                  dotColor="#FFFFFF"
                  dotClassName="border border-gray-400 dark:border-gray-500 bg-white"
                  selected={pGrupos.has('__sin__')}
                  onClick={() => toggleGrupo('__sin__')}
                />
                {gruposFiltrados.map(g => {
                  const c = colorPorSlug(g.color)
                  return (
                    <OptionRow
                      key={g.id}
                      label={g.nombre}
                      dotColor={c.border}
                      selected={pGrupos.has(g.id)}
                      onClick={() => toggleGrupo(g.id)}
                    />
                  )
                })}
                {gruposFiltrados.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3">
                    Sin coincidencias.
                  </p>
                )}
              </div>
            </CollapsibleSection>

            {/* Planes de cobro — solo en modo multi-plan */}
            {showPlanes && (
              <CollapsibleSection
                title="Plan de cobro"
                expanded={expanded === 'planes'}
                summary={resumenPlanes}
                onExpand={() => setExpanded((current) => (current === 'planes' ? null : 'planes'))}
              >
                <OptionRow label="Todos" selected={planTodosSelected} onClick={() => togglePlan('todos')} />
                {planes!.map((p) => (
                  <OptionRow
                    key={p.id}
                    label={p.nombre}
                    selected={pPlanes.has(p.id)}
                    onClick={() => togglePlan(p.id)}
                  />
                ))}
              </CollapsibleSection>
            )}

            {/* Situación — radio */}
            <CollapsibleSection
              title="Situación"
              expanded={expanded === 'situacion'}
              summary={resumenSituacion}
              onExpand={() => setExpanded(current => current === 'situacion' ? null : 'situacion')}
            >
              <OptionRow
                label="Activos"
                dotColor="#22887c"
                selected={pSituacion === 'activos'}
                indicator="radio"
                onClick={() => setPSituacion('activos')}
              />
              <OptionRow
                label="Suspendidos"
                dotColor="#9CA3AF"
                selected={pSituacion === 'suspendidos'}
                indicator="radio"
                onClick={() => setPSituacion('suspendidos')}
              />
            </CollapsibleSection>

            {/* Orden — radio */}
            <CollapsibleSection
              title="Ordenar por"
              expanded={expanded === 'orden'}
              summary={resumenOrden}
              onExpand={() => setExpanded(current => current === 'orden' ? null : 'orden')}
            >
              {ORDENES.map(o => (
                <OptionRow
                  key={o.value}
                  label={o.label}
                  selected={pOrden === o.value}
                  indicator="radio"
                  onClick={() => setPOrden(o.value)}
                />
              ))}
            </CollapsibleSection>
          </div>

          {/* Footer con dos botones */}
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
    <section className="border border-border rounded-xl overflow-hidden bg-card">
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

function OptionRow({
  label,
  dotColor,
  dotClassName,
  selected,
  indicator = 'check',
  onClick,
}: {
  label: string
  dotColor?: string
  dotClassName?: string
  selected: boolean
  indicator?: 'check' | 'radio'
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
        {dotColor && (
          <span
            className={cn(
              "inline-block h-2.5 w-2.5 rounded-full flex-shrink-0",
              dotClassName
            )}
            style={{ backgroundColor: dotColor }}
            aria-hidden="true"
          />
        )}
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
        <Check className="h-4 w-4 text-primary flex-shrink-0" strokeWidth={2.5} />
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
