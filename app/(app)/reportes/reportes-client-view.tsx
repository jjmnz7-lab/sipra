'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  CalendarArrowDown,
  CalendarArrowUp,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  Receipt,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { PageSubheader } from '@/components/layout/page-subheader'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { formatCurrency, formatCurrencyCompact } from '@/lib/utils/currency'
import { cn } from '@/lib/utils'
import type { FamiliaLote, LoteCargos } from '@/lib/reportes/cargos-grupales'

export type CobradoMes = {
  /** Nombre completo del mes en curso, capitalizado (ej. "Junio"). */
  mesLabel: string
  /** Neto del mes en curso: pagos recibidos menos anulaciones aplicadas. */
  total: number
  /** Desglose por método de pago registrado (neto del mes). */
  metodos: { label: string; monto: number }[]
  /** Cobranza neta mensual, más reciente primero (hasta 12 meses). */
  serie: { label: string; total: number }[]
}

const HEX = {
  cobrado: '#5C8F78',
  pendiente: '#D2A45C',
  atrasado: '#B85C50',
  urgente: '#7A2F38',
}

/** Azul principal: relleno de strips de progreso y barras de cobranza. */
const AZUL_PROGRESO = '#15435a'

const LEYENDA_ESTADOS: { label: string; hex: string; descripcion: string }[] = [
  {
    label: 'Al día',
    hex: HEX.cobrado,
    descripcion: 'No debe nada: todos sus cargos están pagados al corriente.',
  },
  {
    label: 'Pendiente',
    hex: HEX.pendiente,
    descripcion: 'Debe la cuota del periodo en curso, pero sigue dentro del plazo de pago permitido.',
  },
  {
    label: 'Atrasado',
    hex: HEX.atrasado,
    descripcion: 'Debe una mensualidad y el plazo de pago permitido ya venció.',
  },
  {
    label: 'Urgente',
    hex: HEX.urgente,
    descripcion: 'Acumula 2 o más mensualidades vencidas, o arrastra un cargo vencido con más de un mes de antigüedad.',
  },
]

// ── Control de cargos grupales ────────────────────────────────────────────────

const FAMILIA_ICON: Record<FamiliaLote, LucideIcon> = {
  mensualidad: CalendarClock,
  grupal: Receipt,
  actividad: Sparkles,
}

type SortLoteKey = 'reciente' | 'antiguo' | 'pct_cobrado' | 'pct_deuda'

const SORT_LOTES_CYCLE: SortLoteKey[] = ['reciente', 'antiguo', 'pct_cobrado', 'pct_deuda']

const SORT_LOTES_META: Record<SortLoteKey, { label: string; full: string; Icon: LucideIcon }> = {
  reciente: { label: 'Recientes', full: 'Más recientes primero', Icon: CalendarArrowDown },
  antiguo: { label: 'Antiguos', full: 'Más antiguos primero', Icon: CalendarArrowUp },
  pct_cobrado: { label: '% cobrado', full: 'Mayor porcentaje cobrado', Icon: ArrowDownWideNarrow },
  pct_deuda: { label: '% deuda', full: 'Mayor porcentaje de deuda', Icon: ArrowUpNarrowWide },
}

export function ReportesClientView({
  cobradoMes,
  countAlDia,
  countPendiente,
  countAtrasado,
  countUrgente,
  totalAlumnos,
  lotes,
}: {
  cobradoMes: CobradoMes
  countAlDia: number
  countPendiente: number
  countAtrasado: number
  countUrgente: number
  totalAlumnos: number
  lotes: LoteCargos[]
}) {
  const router = useRouter()

  const [leyendaOpen, setLeyendaOpen] = useState(false)
  const [historialOpen, setHistorialOpen] = useState(false)
  const [mostrarArchivados, setMostrarArchivados] = useState(false)
  const [sortLotes, setSortLotes] = useState<SortLoteKey>('reciente')

  // La gráfica ocupa exactamente la altura del bloque "cobrado este mes".
  const cobradoRef = useRef<HTMLDivElement>(null)
  const [chartHeight, setChartHeight] = useState(0)
  useEffect(() => {
    const el = cobradoRef.current
    if (!el) return
    const update = () => setChartHeight(el.offsetHeight)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Solo hay historial si existe al menos un mes anterior al actual.
  const hayHistorial = cobradoMes.serie.length > 1
  // ≤5 meses (contando el actual) → barras horizontales; más → verticales.
  const barrasHorizontales = cobradoMes.serie.length <= 5

  const segmentsAlumnos = [
    { label: 'al día', slug: 'al_dia', count: countAlDia, hex: HEX.cobrado },
    { label: 'pendiente', slug: 'pendiente', count: countPendiente, hex: HEX.pendiente },
    { label: 'atrasado', slug: 'atrasado', count: countAtrasado, hex: HEX.atrasado },
    { label: 'urgente', slug: 'urgente', count: countUrgente, hex: HEX.urgente },
  ]

  const cycleSortLotes = () => {
    const idx = SORT_LOTES_CYCLE.indexOf(sortLotes)
    setSortLotes(SORT_LOTES_CYCLE[(idx + 1) % SORT_LOTES_CYCLE.length])
  }
  const sortLotesMeta = SORT_LOTES_META[sortLotes]
  const SortLotesIcon = sortLotesMeta.Icon

  const archivadosCount = useMemo(
    () => lotes.filter((l) => l.visibilidad === 'archivado').length,
    [lotes],
  )

  const lotesVisibles = useMemo(() => {
    const arr = lotes.filter((l) => (mostrarArchivados ? true : l.visibilidad === 'visible'))
    arr.sort((a, b) => {
      switch (sortLotes) {
        case 'antiguo':
          return a.fechaLote.localeCompare(b.fechaLote)
        case 'pct_cobrado':
          return b.pct - a.pct
        case 'pct_deuda':
          return a.pct - b.pct
        default:
          return b.fechaLote.localeCompare(a.fechaLote)
      }
    })
    return arr
  }, [lotes, mostrarArchivados, sortLotes])

  return (
    <div className="flex flex-col h-full min-h-screen bg-background pb-20">
      <PageSubheader title="Reportes" onBack={() => router.back()} />

      <div className="p-4 space-y-6">
        {/* Cobrado este mes (+ historial colapsable en el mismo contenedor) */}
        <section className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cobrado en {cobradoMes.mesLabel}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div ref={cobradoRef} className="space-y-1">
                <p className="text-4xl font-bold tracking-tight text-foreground tabular-nums leading-none">
                  {formatCurrency(cobradoMes.total)}
                </p>
                {cobradoMes.metodos.length > 0 && (
                  <p className="text-[10px] text-muted-foreground tabular-nums pt-0.5">
                    {cobradoMes.metodos
                      .map((m) => `${m.label}: ${formatCurrencyCompact(m.monto)}`)
                      .join(' • ')}
                  </p>
                )}
              </div>

              {hayHistorial && (
                <div className="pt-1 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setHistorialOpen((v) => !v)}
                    className="w-full pt-2 flex items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    aria-expanded={historialOpen}
                  >
                    <span>{historialOpen ? 'Ocultar historial' : 'Mostrar historial'}</span>
                    <ChevronDown className={cn('h-4 w-4 transition-transform', historialOpen && 'rotate-180')} />
                  </button>
                  {historialOpen && (
                    <div
                      className="mt-3 animate-in fade-in slide-in-from-top-1 duration-150"
                      style={chartHeight ? { height: chartHeight } : undefined}
                    >
                      <BarrasCobranza serie={cobradoMes.serie} horizontal={barrasHorizontales} />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Estado financiero de alumnos */}
        <section className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Estado financiero de alumnos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-2xl font-bold text-foreground">
                {totalAlumnos} {totalAlumnos === 1 ? 'alumno' : 'alumnos'}
              </p>

              {/* Barra segmentada */}
              <div className="w-full h-2 rounded-full flex overflow-hidden bg-muted">
                {totalAlumnos > 0 && segmentsAlumnos.map((s) =>
                  s.count > 0 ? (
                    <div
                      key={s.label}
                      className="h-full"
                      style={{ width: `${(s.count / totalAlumnos) * 100}%`, backgroundColor: s.hex }}
                    />
                  ) : null,
                )}
              </div>

              {/* KPI Cards — con alumnos, navegan a /alumnos con el estado precargado */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                {segmentsAlumnos.map((s) => {
                  const pct = totalAlumnos > 0 ? Math.round((s.count / totalAlumnos) * 100) : 0
                  const clickable = s.count > 0
                  return (
                    <div
                      key={s.slug}
                      onClick={clickable ? () => router.push(`/alumnos?estado=${s.slug}`) : undefined}
                      role={clickable ? 'button' : undefined}
                      className={cn(
                        'p-3 rounded-lg border border-border bg-card flex flex-col justify-between min-h-[72px] transition-all',
                        clickable
                          ? 'cursor-pointer hover:bg-accent/50 active:scale-95'
                          : 'opacity-60',
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.hex }} />
                        <span className="text-xs font-medium text-muted-foreground capitalize">{s.label}</span>
                      </div>
                      <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-lg font-normal text-foreground">{s.count} {s.count === 1 ? 'alumno' : 'alumnos'}</span>
                        <span className="text-xs text-muted-foreground">({pct}%)</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Leyenda explicativa de estados (colapsable) */}
              <div className="pt-1 border-t border-border">
                <button
                  type="button"
                  onClick={() => setLeyendaOpen((v) => !v)}
                  className="w-full pt-2 flex items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  aria-expanded={leyendaOpen}
                >
                  <span>¿Qué significa cada estado?</span>
                  <ChevronDown className={cn('h-4 w-4 transition-transform', leyendaOpen && 'rotate-180')} />
                </button>
                {leyendaOpen && (
                  <ul className="mt-2 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
                    {LEYENDA_ESTADOS.map((e) => (
                      <li key={e.label} className="flex items-start gap-2">
                        <span
                          className="h-2 w-2 rounded-full flex-shrink-0 mt-[5px]"
                          style={{ backgroundColor: e.hex }}
                        />
                        <p className="text-xs text-muted-foreground leading-snug">
                          <span className="font-semibold text-foreground">{e.label}.</span>{' '}
                          {e.descripcion}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Control de cargos grupales */}
        <section className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Control de cargos grupales/masivos</CardTitle>
              <CardAction>
                <button
                  type="button"
                  onClick={cycleSortLotes}
                  title={`Orden: ${sortLotesMeta.full} (toca para cambiar)`}
                  aria-label={`Ordenar lotes. Actual: ${sortLotesMeta.full}`}
                  className="flex items-center justify-center gap-1 rounded-lg h-8 w-11 sm:w-auto sm:px-2 border border-border bg-card shadow-sm hover:bg-accent active:scale-95 transition-all"
                >
                  <SortLotesIcon className="h-4 w-4 text-[#15435a]" />
                  <span className="hidden sm:inline text-[10px] font-bold text-foreground">{sortLotesMeta.label}</span>
                </button>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-2">
              {lotesVisibles.length > 0 ? (
                lotesVisibles.map((lote) => <LoteRow key={lote.clave} lote={lote} />)
              ) : (
                <div className="text-center py-8 px-4">
                  <p className="text-sm text-muted-foreground">
                    {lotes.length === 0
                      ? 'Aún no hay cargos grupales generados. Aquí verás el avance de cobranza de mensualidades, cargos a grupos e inscripciones a actividades.'
                      : 'No hay cargos activos en este momento. Activa "Mostrar archivados" para ver los anteriores.'}
                  </p>
                </div>
              )}

              {/* Toggle de archivados */}
              <div className="pt-2 border-t border-border flex items-center justify-between">
                <label className="flex items-center gap-2 py-1 cursor-pointer select-none">
                  <Checkbox
                    checked={mostrarArchivados}
                    onCheckedChange={(checked) => setMostrarArchivados(checked === true)}
                  />
                  <span className="text-xs font-medium text-muted-foreground">Mostrar archivados</span>
                </label>
                <span className="text-[10px] text-muted-foreground/70 tabular-nums">
                  {archivadosCount} {archivadosCount === 1 ? 'archivado' : 'archivados'}
                </span>
              </div>
            </CardContent>
          </Card>
        </section>

      </div>
    </div>
  )
}

/**
 * Barras de cobranza neta por mes (más reciente primero). Strips delgados sin
 * track de fondo para que no parezcan barras de progreso. Horizontales cuando
 * hay pocos meses (≤5) y verticales cuando hay muchos. Ocupa exactamente la
 * altura que se le asigne desde el contenedor.
 */
function BarrasCobranza({
  serie,
  horizontal,
}: {
  serie: { label: string; total: number }[]
  horizontal: boolean
}) {
  const max = Math.max(...serie.map((s) => s.total), 1)

  if (horizontal) {
    return (
      <div className="flex flex-col h-full justify-center gap-2.5">
        {serie.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <span className="w-12 text-[10px] font-medium text-muted-foreground flex-shrink-0">{s.label}</span>
            <div className="flex-1 flex items-center">
              <div
                className="h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.max(s.total > 0 ? 1 : 0, (s.total / max) * 100)}%`,
                  backgroundColor: AZUL_PROGRESO,
                }}
              />
            </div>
            <span className="w-16 text-right text-[10px] font-medium text-muted-foreground tabular-nums flex-shrink-0">
              {formatCurrencyCompact(s.total)}
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex items-stretch justify-between gap-1.5 h-full">
      {serie.map((s) => (
        <div
          key={s.label}
          className="flex-1 h-full flex flex-col items-center justify-end gap-1 min-w-0"
          title={`${s.label}: ${formatCurrencyCompact(s.total)}`}
        >
          <div className="flex-1 w-full flex items-end justify-center">
            <div
              className="w-1.5 rounded-full transition-all duration-500"
              style={{
                height: `${Math.max(s.total > 0 ? 2 : 0, (s.total / max) * 100)}%`,
                backgroundColor: AZUL_PROGRESO,
              }}
            />
          </div>
          <span className="text-[9px] font-medium text-muted-foreground whitespace-nowrap">{s.label}</span>
        </div>
      ))}
    </div>
  )
}

function LoteRow({ lote }: { lote: LoteCargos }) {
  const router = useRouter()
  const Icon = FAMILIA_ICON[lote.familia]
  const archivado = lote.visibilidad === 'archivado'

  return (
    <button
      type="button"
      onClick={() => router.push(`/reportes/cargos/${encodeURIComponent(lote.clave)}`)}
      className={cn(
        'w-full text-left border border-border rounded-lg px-3 py-2.5 transition-all hover:border-primary/50 active:scale-[0.985]',
        archivado ? 'bg-card/60' : 'bg-card',
      )}
    >
      {/* Línea 1: micro ícono + título (+ contexto y badge de archivado) */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-6 h-6 rounded-full border border-primary bg-background flex items-center justify-center flex-shrink-0">
          <Icon className="h-3.5 w-3.5 text-primary" />
        </div>
        <p className={cn('text-sm font-semibold truncate flex-1 min-w-0', archivado ? 'text-muted-foreground' : 'text-foreground')}>
          {lote.titulo}
        </p>
        {lote.contexto && (
          <span className="text-[10px] font-medium text-muted-foreground truncate max-w-[35%] flex-shrink-0">
            {lote.contexto}
          </span>
        )}
        {archivado && (
          <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 border border-border rounded-full px-1.5 py-0.5 flex-shrink-0">
            Archivado
          </span>
        )}
      </div>

      {/* Línea 2: strip de progreso + fracción + chevron */}
      <div className="mt-2 flex items-center gap-2">
        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden min-w-[48px]">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, lote.pct)}%`,
              backgroundColor: AZUL_PROGRESO,
              opacity: archivado ? 0.45 : 1,
            }}
          />
        </div>
        <span className="text-[11px] font-medium text-muted-foreground tabular-nums whitespace-nowrap flex-shrink-0">
          <span className="font-semibold text-foreground">{formatCurrencyCompact(lote.cobrado)}</span>
          {' / '}{formatCurrencyCompact(lote.total)} ({lote.pct}%)
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </div>
    </button>
  )
}
