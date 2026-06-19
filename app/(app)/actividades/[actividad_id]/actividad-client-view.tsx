'use client'

import { useState, useMemo, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PageSubheader } from '@/components/layout/page-subheader'
import { ChevronRight, ChevronDown, MoreVertical, CalendarDays, Clock, Plus, UserPlus, Receipt, User, Info } from 'lucide-react'
import { ESTADOS_FINANCIEROS, type EstadoFinancieroAlumno } from '@/lib/constants/alumno-finanzas'
import { formatearDiasSemanaCorto, formatearHorario } from '@/lib/constants/dias-semana'
import { cn } from '@/lib/utils'
import { formatFechaCorta } from '@/lib/utils/format-fecha'
import { calcularEstadoActividad, parseFechaLocal } from '@/lib/utils/actividad-estado'
import { MassCargoDrawer } from '@/components/domain/grupo/mass-cargo-drawer'
import { AsignarAlumnoActividadSheet, type AlumnoLite } from '@/components/domain/actividad/asignar-alumno-actividad-sheet'
import { AccionesActividadSheet } from '@/components/domain/actividad/acciones-actividad-sheet'
import { EditarActividadDrawer } from '@/components/domain/actividad/editar-actividad-drawer'
import { ArchivarActividadDrawer } from '@/components/domain/actividad/archivar-actividad-drawer'
import { FinalizarActividadDrawer } from '@/components/domain/actividad/finalizar-actividad-drawer'
import { useToast } from '@/components/ui/use-toast'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'

// Semáforo financiero único (mismos 4 colores que ESTADOS_FINANCIEROS).
const COLOR_POR_ESTADO: Record<EstadoFinancieroAlumno, string> = Object.fromEntries(
  ESTADOS_FINANCIEROS.map((e) => [e.slug, e.hex]),
) as Record<EstadoFinancieroAlumno, string>

export function ActividadClientView({
  actividad,
  inscripciones,
  totalAlumnos,
  mapEstadoMiembro,
  alumnosDisponibles = [],
  abrirArchivar = false,
  timezone = 'America/Mexico_City',
}: {
  actividad: any
  inscripciones: any[]
  totalAlumnos: number
  mapEstadoMiembro: Record<string, EstadoFinancieroAlumno>
  /** Alumnos activos NO inscritos a esta actividad (para el sheet Asignar alumno). */
  alumnosDisponibles?: AlumnoLite[]
  /** Si true, abre automáticamente el drawer de archivación. */
  abrirArchivar?: boolean
  timezone?: string
}) {
  const [suspendedExpanded, setSuspendedExpanded] = useState(false)

  const router = useRouter()
  const [isExiting, setIsExiting] = useState(false)
  const [isKebabOpen, setIsKebabOpen] = useState(false)
  const [isEditarOpen, setIsEditarOpen] = useState(false)
  const [isArchivarOpen, setIsArchivarOpen] = useState(abrirArchivar || false)
  const [isFinalizarOpen, setIsFinalizarOpen] = useState(false)
  const [isCargoOpen, setIsCargoOpen] = useState(false)
  const [isAsignarOpen, setIsAsignarOpen] = useState(false)
  const [isFabSheetOpen, setIsFabSheetOpen] = useState(false)
  const { showToast, toast } = useToast()

  const { alumnosActivos, alumnosSuspendidos } = useMemo(() => {
    const activos = (inscripciones ?? []).filter((ins: any) => ins.persona?.estado_registro === 'activo')
    const suspendidos = (inscripciones ?? []).filter((ins: any) => ins.persona?.estado_registro !== 'activo')
    return { alumnosActivos: activos, alumnosSuspendidos: suspendidos }
  }, [inscripciones])

  const handleBack = () => {
    setIsExiting(true)
    setTimeout(() => router.back(), 200)
  }

  const costoNum = actividad.costo_actividad != null ? Number(actividad.costo_actividad) : null
  const costoLabel = costoNum != null ? `$${costoNum.toFixed(0)}` : null

  // Días/horario reales. Si no hay nada, no se muestra la línea.
  const diasLabel = formatearDiasSemanaCorto(actividad.dias_semana ?? null)
  const horaLabel = formatearHorario(actividad.hora_inicio ?? null, actividad.hora_fin ?? null)
  const horarioLabel = [diasLabel, horaLabel].filter(Boolean).join(' • ') || null

  // Estado temporal de la actividad (inició / finalizó / archivada) para badges y gating.
  const { yaInicio, yaFinalizo, archivada, activa } = calcularEstadoActividad(
    actividad.fecha_inicio, actividad.fecha_fin, actividad.estado,
  )
  const esUnDia = !!actividad.fecha_inicio && actividad.fecha_inicio === actividad.fecha_fin

  // Aviso informativo: finaliza hoy o mañana (solo mientras está vigente).
  const { finalizaHoy, finalizaManana } = useMemo(() => {
    const fin = parseFechaLocal(actividad.fecha_fin)
    if (!fin || !activa) return { finalizaHoy: false, finalizaManana: false }
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const manana = new Date(hoy)
    manana.setDate(manana.getDate() + 1)
    return {
      finalizaHoy: fin.getTime() === hoy.getTime(),
      finalizaManana: fin.getTime() === manana.getTime(),
    }
  }, [actividad.fecha_fin, activa])

  // Sheet del FAB (Asignar alumno / Cargo grupal). "Asignar alumno" solo si está vigente.
  const opcionesFab = [
    activa && {
      key: 'asignar',
      icon: <UserPlus className="h-5 w-5" />,
      color: '#22887c',
      titulo: 'Asignar alumno',
      desc: 'Inscribe a un alumno existente; se le genera el cargo único de la actividad.',
      onClick: () => { setIsFabSheetOpen(false); setIsAsignarOpen(true) },
    },
    {
      key: 'cargo',
      icon: <Receipt className="h-5 w-5" />,
      color: '#15435a',
      titulo: 'Cargo grupal',
      desc: 'Aplica un cobro extra a los inscritos de esta actividad (con opción de excluir).',
      onClick: () => { setIsFabSheetOpen(false); setIsCargoOpen(true) },
    },
  ].filter(Boolean) as { key: string; icon: ReactNode; color: string; titulo: string; desc: string; onClick: () => void }[]

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
              className="h-9 w-9 rounded-full flex items-center justify-center text-base bg-transparent border border-border flex-shrink-0"
              aria-hidden="true"
            >
              {actividad.emoji ?? ''}
            </div>
            <span className="truncate">{actividad.nombre}</span>
          </div>
        }
        onBack={handleBack}
        actions={
          archivada ? undefined : (
            <button
              onClick={() => setIsKebabOpen(true)}
              className="p-2 -mr-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-colors"
              aria-label="Acciones de la actividad"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
          )
        }
      />

      {/* Listón sticky: badges */}
      <div className="sticky top-[112px] z-20 bg-background/95 backdrop-blur-sm border-b border-border px-3 py-1.5">
        <div className="flex items-center justify-center flex-wrap gap-1.5">
          <ListonBadge
            icon={<User className="h-3 w-3" />}
            className={actividad.cupo_maximo != null && totalAlumnos >= actividad.cupo_maximo ? 'text-[#fd9c09] bg-[#ffffff] border-[#e2e8f0] font-bold' : ''}
          >
            {totalAlumnos} {totalAlumnos === 1 ? 'alumno' : 'alumnos'}
            {actividad.cupo_maximo != null ? (
              ` • máx ${actividad.cupo_maximo}`
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

          {esUnDia ? (
            actividad.fecha_inicio && (
              <ListonBadge
                icon={<CalendarDays className="h-3 w-3" />}
                className={yaFinalizo ? 'text-muted-foreground bg-muted/30' : ''}
              >
                {yaFinalizo ? 'fue el' : 'el'} {formatFechaCorta(actividad.fecha_inicio)}
              </ListonBadge>
            )
          ) : (
            <>
              {actividad.fecha_inicio && (
                <ListonBadge
                  icon={<CalendarDays className="h-3 w-3" />}
                  className={yaInicio ? 'text-muted-foreground bg-muted/30' : ''}
                >
                  {yaInicio ? 'inició' : 'inicia'}: {formatFechaCorta(actividad.fecha_inicio)}
                </ListonBadge>
              )}
              {actividad.fecha_fin && (
                <ListonBadge
                  icon={<CalendarDays className="h-3 w-3" />}
                  className={yaFinalizo ? 'text-muted-foreground bg-muted/30' : ''}
                >
                  {yaFinalizo ? 'finalizó' : 'finaliza'}: {formatFechaCorta(actividad.fecha_fin)}
                </ListonBadge>
              )}
            </>
          )}

          {costoLabel && (
            <ListonBadge>
              {costoLabel}
            </ListonBadge>
          )}
        </div>
      </div>

      {(finalizaHoy || finalizaManana) && (
        <div className="px-4 pt-3">
          <div className="flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50/60 px-3 py-2.5 text-blue-900">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-500" />
            <span className="text-xs leading-relaxed">
              {finalizaHoy ? 'Esta actividad finaliza hoy.' : 'Esta actividad finaliza mañana.'}
            </span>
          </div>
        </div>
      )}

      <div className="p-4 space-y-2">
        {alumnosActivos?.map(({ persona }: any) => {
          const estado: EstadoFinancieroAlumno = mapEstadoMiembro[persona.id] ?? 'al_dia'
          const bordeHex = COLOR_POR_ESTADO[estado]

          return (
            <Link href={`/seguimiento/${persona.id}?from=actividades`} key={persona.id} className="block">
              <div className="relative overflow-hidden flex items-center bg-card border border-border rounded-lg py-2 pr-3 pl-5 hover:border-primary/50 transition-[transform,border-color,box-shadow,background-color] duration-150 active:scale-[0.985] active:border-[#22887c]/60 active:shadow-[0_0_0_1px_rgba(34,136,124,0.18),0_8px_20px_rgba(34,136,124,0.08)] gap-3 min-h-[48px]">
                {/* Indicator strip (6px, color del semáforo financiero) */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-[6px]"
                  style={{ backgroundColor: bordeHex }}
                />
                <div className="flex items-center min-w-0 gap-3 flex-1 w-full">
                  <p className="text-sm font-semibold truncate text-foreground">
                    {persona.nombre} {persona.apellido}
                  </p>
                </div>
              </div>
            </Link>
          )
        })}

        {(!alumnosActivos || alumnosActivos.length === 0) && (
          <div className="text-center py-8 px-4 border border-dashed border-border rounded-xl bg-muted/20">
            <p className="text-sm text-muted-foreground">
              Aún no hay alumnos inscritos en esta actividad. Toca el botón + para asignar al primero.
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

                  return (
                    <Link href={`/seguimiento/${persona.id}?from=actividades`} key={persona.id} className="block">
                      <div className="relative overflow-hidden flex items-center bg-card/65 border border-border/65 rounded-lg py-2 pr-3 pl-5 hover:border-primary/50 transition-[transform,border-color,box-shadow,background-color] duration-150 active:scale-[0.985] active:border-[#22887c]/60 active:shadow-[0_0_0_1px_rgba(34,136,124,0.18),0_8px_20px_rgba(34,136,124,0.08)] gap-3 min-h-[48px]">
                        {/* Indicator strip (6px, color del semáforo financiero) */}
                        <div
                          className="absolute left-0 top-0 bottom-0 w-[6px]"
                          style={{ backgroundColor: bordeHex }}
                        />
                        <div className="flex items-center min-w-0 gap-3 flex-1 w-full">
                          <p className="text-sm font-semibold text-muted-foreground/65 truncate">
                            {persona.nombre} {persona.apellido}
                          </p>
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
          aria-label="Acciones de la actividad"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

      {/* FAB bottom sheet */}
      <Drawer open={isFabSheetOpen} onOpenChange={setIsFabSheetOpen}>
        <DrawerContent className="max-h-[60vh]">
          <div className="mx-auto w-full max-w-md flex flex-col pb-6">
            <DrawerHeader className="text-left">
              <DrawerTitle>¿Qué quieres hacer en esta actividad?</DrawerTitle>
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
        grupoId={actividad.id}
        inscripciones={inscripciones || []}
        open={isCargoOpen}
        onOpenChange={setIsCargoOpen}
        onSuccess={showToast}
      />
      <AsignarAlumnoActividadSheet
        actividadId={actividad.id}
        actividadNombre={actividad.nombre}
        alumnos={alumnosDisponibles}
        costoActividad={costoNum}
        open={isAsignarOpen}
        onOpenChange={setIsAsignarOpen}
        cupoMaximo={actividad.cupo_maximo}
        alumnosCount={totalAlumnos}
      />

      <AccionesActividadSheet
        open={isKebabOpen}
        onOpenChange={setIsKebabOpen}
        actividadNombre={actividad.nombre}
        puedeEditar={activa}
        puedeFinalizar={activa}
        puedeArchivar={!activa && !archivada}
        onEditar={() => setIsEditarOpen(true)}
        onFinalizar={() => setIsFinalizarOpen(true)}
        onArchivar={() => setIsArchivarOpen(true)}
      />

      <ArchivarActividadDrawer
        actividadId={actividad.id}
        actividadNombre={actividad.nombre}
        alumnosCount={totalAlumnos}
        open={isArchivarOpen}
        onOpenChange={setIsArchivarOpen}
      />
      <FinalizarActividadDrawer
        actividadId={actividad.id}
        actividadNombre={actividad.nombre}
        alumnosCount={totalAlumnos}
        open={isFinalizarOpen}
        onOpenChange={setIsFinalizarOpen}
      />
      <EditarActividadDrawer
        timezone={timezone}
        actividad={{
          id: actividad.id,
          nombre: actividad.nombre,
          emoji: actividad.emoji ?? null,
          fecha_inicio: actividad.fecha_inicio ?? null,
          fecha_fin: actividad.fecha_fin ?? null,
          costo_actividad: actividad.costo_actividad ?? null,
          dias_semana: actividad.dias_semana ?? null,
          hora_inicio: actividad.hora_inicio ?? null,
          hora_fin: actividad.hora_fin ?? null,
          cupo_maximo: actividad.cupo_maximo ?? null,
        }}
        open={isEditarOpen}
        onOpenChange={setIsEditarOpen}
      />

      {toast}
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
