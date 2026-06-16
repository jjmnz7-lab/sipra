'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PageSubheader } from '@/components/layout/page-subheader'
import { ChevronRight, ChevronDown, MoreVertical, Clock, Plus, UserPlus, Receipt, User } from 'lucide-react'
import { colorPorSlug } from '@/lib/constants/grupo-apariencia'
import { ESTADOS_FINANCIEROS, type EstadoFinancieroAlumno } from '@/lib/constants/alumno-finanzas'
import { formatearDiasSemanaCorto, formatearHorario } from '@/lib/constants/dias-semana'
import { cn } from '@/lib/utils'
import { MassCargoDrawer } from '@/components/domain/grupo/mass-cargo-drawer'
import { AsignarAlumnoSheet, type AlumnoLite } from '@/components/domain/grupo/asignar-alumno-sheet'
import { AccionesGrupoSheet } from '@/components/domain/grupo/acciones-grupo-sheet'
import { EditarGrupoDrawer } from '@/components/domain/grupo/editar-grupo-drawer'
import { ArchivarGrupoDrawer } from '@/components/domain/grupo/archivar-grupo-drawer'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'

type PlanLite = { id: string; nombre: string; monto: number; frecuencia: string }

// SemÃ¡foro financiero Ãºnico (mismos 4 colores que ESTADOS_FINANCIEROS).
const COLOR_POR_ESTADO: Record<EstadoFinancieroAlumno, string> = Object.fromEntries(
  ESTADOS_FINANCIEROS.map((e) => [e.slug, e.hex]),
) as Record<EstadoFinancieroAlumno, string>

const FRECUENCIA_LABEL: Record<string, string> = {
  mensual: '/mes',
  semanal: '/sem',
  por_visita: '/visita',
  pago_unico: '/visita',
}

export function GrupoClientView({
  grupo,
  inscripciones,
  planes = [],
  montoInscripcionDefault = 0,
  cobrarInscripcionDefault = false,
  gruposDestino = [],
  totalAlumnos,
  mapEstadoMiembro,
  planesPorAlumno = {},
  alumnosDisponibles = [],
  abrirArchivar = false,
}: {
  grupo: any
  inscripciones: any[]
  cargos?: any[]
  planes?: PlanLite[]
  modoProrrateo?: 'proporcional' | 'completo'
  multiPlanEnabled?: boolean
  montoInscripcionDefault?: number
  cobrarInscripcionDefault?: boolean
  gruposDestino?: { id: string; nombre: string }[]
  totalAlumnos: number
  alDia: number
  pendientes: number
  atrasados: number
  urgentes: number
  pendienteGrupo?: number
  mapEstadoMiembro: Record<string, EstadoFinancieroAlumno>
  /** Planes asignados a cada alumno del grupo (para el badge multi-plan). */
  planesPorAlumno?: Record<string, PlanLite[]>
  /** Alumnos activos NO inscritos a este grupo (para el sheet Asignar alumno). */
  alumnosDisponibles?: AlumnoLite[]
  timezone?: string
  /** Si true, abre automÃ¡ticamente el drawer de archivaciÃ³n. */
  abrirArchivar?: boolean
}) {
  const [suspendedExpanded, setSuspendedExpanded] = useState(false)

  const router = useRouter()
  const [isExiting, setIsExiting] = useState(false)
  const [isKebabOpen, setIsKebabOpen] = useState(false)
  const [isEditarOpen, setIsEditarOpen] = useState(false)
  const [isArchivarOpen, setIsArchivarOpen] = useState(abrirArchivar || false)
  const [isCargoOpen, setIsCargoOpen] = useState(false)
  const [isAsignarOpen, setIsAsignarOpen] = useState(false)
  const [isFabSheetOpen, setIsFabSheetOpen] = useState(false)

  const { alumnosActivos, alumnosSuspendidos } = useMemo(() => {
    const activos = (inscripciones ?? []).filter((ins: any) => ins.persona?.estado_registro === 'activo')
    const suspendidos = (inscripciones ?? []).filter((ins: any) => ins.persona?.estado_registro !== 'activo')
    return { alumnosActivos: activos, alumnosSuspendidos: suspendidos }
  }, [inscripciones])

  const handleBack = () => {
    setIsExiting(true)
    setTimeout(() => router.back(), 200)
  }

  const colorGrupo = colorPorSlug(grupo.color)

  // Días/horario reales del grupo. Si no hay nada, no se muestra la línea.
  const diasLabel = formatearDiasSemanaCorto(grupo.dias_semana ?? null)
  const horaLabel = formatearHorario(grupo.hora_inicio ?? null, grupo.hora_fin ?? null)
  const horarioLabel = [diasLabel, horaLabel].filter(Boolean).join(' • ') || null

  // Sheet del FAB (Asignar alumno / Cargo grupal)
  const opcionesFab = [
    {
      key: 'asignar',
      icon: <UserPlus className="h-5 w-5" />,
      color: '#22887c',
      titulo: 'Asignar alumno',
      desc: 'Inscribe rÃ¡pidamente a un alumno existente a este grupo.',
      onClick: () => { setIsFabSheetOpen(false); setIsAsignarOpen(true) },
    },
    {
      key: 'cargo',
      icon: <Receipt className="h-5 w-5" />,
      color: '#15435a',
      titulo: 'Cargo grupal',
      desc: 'Aplica un cobro extra a los miembros de este grupo (con opciÃ³n de excluir).',
      onClick: () => { setIsFabSheetOpen(false); setIsCargoOpen(true) },
    },
  ]

  return (
    <div
      className={`flex flex-col h-full min-h-screen bg-background pb-24 transition-all duration-200 ${
        isExiting ? 'animate-out slide-out-to-right fade-out' : 'animate-in slide-in-from-right'
      }`}
    >
      <PageSubheader
        title={
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="h-9 w-9 rounded-full flex items-center justify-center text-base bg-transparent flex-shrink-0"
              style={{ border: `3px solid ${colorGrupo.hex}` }}
              aria-hidden="true"
            >
              {grupo.emoji ?? ''}
            </div>
            <span className="truncate">{grupo.nombre}</span>
          </div>
        }
        onBack={handleBack}
        actions={
          <button
            onClick={() => setIsKebabOpen(true)}
            className="p-2 -mr-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-colors"
            aria-label="Acciones del grupo"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
        }
      />

      {/* Listón sticky (misma altura que el listón de filtros de Inicio): badges */}
      <div className="sticky top-[112px] z-20 bg-background/95 backdrop-blur-sm border-b border-border px-3 py-1.5">
        <div className="flex items-center justify-center flex-wrap gap-1.5">
          <ListonBadge
            icon={<User className="h-3 w-3" />}
            className={grupo.cupo_maximo != null && totalAlumnos >= grupo.cupo_maximo ? 'text-[#fd9c09] bg-[#ffffff] border-[#e2e8f0] font-bold' : ''}
          >
            {totalAlumnos} {totalAlumnos === 1 ? 'alumno' : 'alumnos'}
            {grupo.cupo_maximo != null ? (
              ` • máx ${grupo.cupo_maximo}`
            ) : (
              <>
                {' • '}
                <span className="text-[10px] font-normal align-middle">∞</span>
              </>
            )}
          </ListonBadge>

          {horarioLabel && (
            <ListonBadge icon={<Clock className="h-3 w-3" />}>
              {horarioLabel}
            </ListonBadge>
          )}


        </div>
      </div>

      <div className="p-4 space-y-2">
        {alumnosActivos?.map(({ persona }: any) => {
          const estado: EstadoFinancieroAlumno = mapEstadoMiembro[persona.id] ?? 'al_dia'
          const bordeHex = COLOR_POR_ESTADO[estado]
          const planesAlumno = planesPorAlumno[persona.id] ?? []

          return (
            <Link href={`/seguimiento/${persona.id}?from=grupos`} key={persona.id} className="block">
              <div className="relative overflow-hidden flex flex-col sm:flex-row sm:items-center sm:justify-between items-start bg-card border border-border rounded-lg py-2 pr-3 pl-5 hover:border-primary/50 transition-[transform,border-color,box-shadow,background-color] duration-150 active:scale-[0.985] active:border-[#22887c]/60 active:shadow-[0_0_0_1px_rgba(34,136,124,0.18),0_8px_20px_rgba(34,136,124,0.08)] gap-2 sm:gap-3 min-h-[62px] sm:min-h-[38px]">
                {/* Indicator strip (6px, color del semÃ¡foro financiero) */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-[6px]"
                  style={{ backgroundColor: bordeHex }}
                />
                <div className="flex items-center min-w-0 gap-3 flex-1 w-full">
                  <p className="text-sm font-semibold truncate text-foreground">
                    {persona.nombre} {persona.apellido}
                  </p>
                </div>
                <div className="flex items-center justify-start sm:justify-end w-full sm:w-auto">
                  {planesAlumno.length > 0 ? (
                    <span
                      className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border bg-white border-gray-200 dark:bg-card dark:border-border dark:text-foreground flex-shrink-0 whitespace-nowrap"
                      style={{ color: '#333a4a' }}
                      title={planesAlumno.map((p) => p.nombre).join(', ')}
                    >
                      <span>{planesAlumno[0].nombre}</span>
                      {planesAlumno.length > 1 && (
                        <span>, +{planesAlumno.length - 1}</span>
                      )}
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-[9px] font-semibold border border-amber-200 bg-amber-50 text-amber-600 rounded-full px-1.5 py-0.5 flex-shrink-0 whitespace-nowrap">
                      Sin plan
                    </span>
                  )}
                </div>
              </div>
            </Link>
          )
        })}

        {(!alumnosActivos || alumnosActivos.length === 0) && (
          <div className="text-center py-8 px-4 border border-dashed border-border rounded-xl bg-muted/20">
            <p className="text-sm text-muted-foreground">
              AÃºn no hay alumnos activos en este grupo. Toca el botÃ³n + para asignar al primero.
            </p>
          </div>
        )}

        {alumnosSuspendidos.length > 0 && (
          <div className="mt-6 space-y-2">
            <button
              type="button"
              onClick={() => setSuspendedExpanded(!suspendedExpanded)}
              className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors px-1 py-1"
            >
              <ChevronDown className={cn("h-4 w-4 transition-transform", suspendedExpanded && "rotate-180")} />
              <span>
                Alumnos suspendidos ({alumnosSuspendidos.length})
              </span>
            </button>
            
            {suspendedExpanded && (
              <div className="space-y-2">
                {alumnosSuspendidos.map(({ persona }: any) => {
                  const estado: EstadoFinancieroAlumno = mapEstadoMiembro[persona.id] ?? 'al_dia'
                  const bordeHex = COLOR_POR_ESTADO[estado]
                  const planesAlumno = planesPorAlumno[persona.id] ?? []

                  return (
                    <Link href={`/seguimiento/${persona.id}?from=grupos`} key={persona.id} className="block">
                      <div className="relative overflow-hidden flex flex-col sm:flex-row sm:items-center sm:justify-between items-start bg-card/65 border border-border/65 rounded-lg py-2 pr-3 pl-5 hover:border-primary/50 transition-[transform,border-color,box-shadow,background-color] duration-150 active:scale-[0.985] active:border-[#22887c]/60 active:shadow-[0_0_0_1px_rgba(34,136,124,0.18),0_8px_20px_rgba(34,136,124,0.08)] gap-2 sm:gap-3 min-h-[62px] sm:min-h-[38px]">
                        {/* Indicator strip (6px, color del semÃ¡foro financiero) */}
                        <div
                          className="absolute left-0 top-0 bottom-0 w-[6px]"
                          style={{ backgroundColor: bordeHex }}
                        />
                        <div className="flex items-center min-w-0 gap-3 flex-1 w-full">
                          <p className="text-sm font-semibold text-muted-foreground/65 truncate">
                            {persona.nombre} {persona.apellido}
                          </p>
                        </div>
                        <div className="flex items-center justify-start sm:justify-end w-full sm:w-auto">
                          {planesAlumno.length > 0 ? (
                            <span
                              className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border bg-white border-gray-200 dark:bg-card dark:border-border dark:text-foreground flex-shrink-0 whitespace-nowrap"
                              style={{ color: '#333a4a' }}
                              title={planesAlumno.map((p) => p.nombre).join(', ')}
                            >
                              <span>{planesAlumno[0].nombre}</span>
                              {planesAlumno.length > 1 && (
                                <span>, +{planesAlumno.length - 1}</span>
                              )}
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[9px] font-semibold border border-amber-200 bg-amber-50 text-amber-600 rounded-full px-1.5 py-0.5 flex-shrink-0 whitespace-nowrap">
                              Sin plan
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* FAB */}
      <div className="fixed bottom-20 right-4 z-50">
        <button
          onClick={() => setIsFabSheetOpen(true)}
          className="bg-[#15435a] hover:bg-[#0f3245] text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg transition-all active:scale-95"
          aria-label="Acciones del grupo"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

      {/* FAB bottom sheet */}
      <Drawer open={isFabSheetOpen} onOpenChange={setIsFabSheetOpen}>
        <DrawerContent className="max-h-[60vh]">
          <div className="mx-auto w-full max-w-md flex flex-col pb-6">
            <DrawerHeader className="text-left">
              <DrawerTitle>Â¿QuÃ© quieres hacer en este grupo?</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 space-y-2">
              {opcionesFab.map((op) => (
                <button
                  key={op.key}
                  type="button"
                  onClick={op.onClick}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-lg border border-border hover:bg-accent transition-colors text-left"
                >
                  <span
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
                    style={{ color: op.color, backgroundColor: `${op.color}14` }}
                  >
                    {op.icon}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-foreground">{op.titulo}</span>
                    <span className="block text-xs text-muted-foreground">{op.desc}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Drawers / sheets */}
      <MassCargoDrawer
        grupoId={grupo.id}
        inscripciones={inscripciones || []}
        open={isCargoOpen}
        onOpenChange={setIsCargoOpen}
      />
      <AsignarAlumnoSheet
        grupoId={grupo.id}
        grupoNombre={grupo.nombre}
        alumnos={alumnosDisponibles}
        planSugerido={grupo.plan_sugerido_id ? planes.find((p) => p.id === grupo.plan_sugerido_id) ?? null : null}
        cobrarInscripcionDefault={cobrarInscripcionDefault}
        montoInscripcionDefault={montoInscripcionDefault}
        open={isAsignarOpen}
        onOpenChange={setIsAsignarOpen}
        cupoMaximo={grupo.cupo_maximo}
        alumnosCount={totalAlumnos}
      />

      <AccionesGrupoSheet
        open={isKebabOpen}
        onOpenChange={setIsKebabOpen}
        grupoNombre={grupo.nombre}
        onEditar={() => setIsEditarOpen(true)}
        onArchivar={() => setIsArchivarOpen(true)}
      />

      <ArchivarGrupoDrawer
        grupoId={grupo.id}
        grupoNombre={grupo.nombre}
        alumnosCount={totalAlumnos}
        gruposDestino={gruposDestino}
        open={isArchivarOpen}
        onOpenChange={setIsArchivarOpen}
      />
      <EditarGrupoDrawer
        grupo={{
          id: grupo.id,
          nombre: grupo.nombre,
          color: grupo.color ?? null,
          emoji: grupo.emoji ?? null,
          plan_sugerido_id: grupo.plan_sugerido_id ?? null,
          dias_semana: grupo.dias_semana ?? null,
          hora_inicio: grupo.hora_inicio ?? null,
          hora_fin: grupo.hora_fin ?? null,
          cupo_maximo: grupo.cupo_maximo ?? null,
        }}
        planes={planes}
        open={isEditarOpen}
        onOpenChange={setIsEditarOpen}
      />
    </div>
  )
}

function ListonBadge({ children, icon, className }: { children: React.ReactNode; icon?: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center flex-shrink-0 text-[10px] font-semibold px-2 py-1 rounded-full border border-border bg-card text-foreground/85 whitespace-nowrap", className)}>
      {icon && <span className="text-muted-foreground mr-1.5">{icon}</span>}
      {children}
    </span>
  )
}

