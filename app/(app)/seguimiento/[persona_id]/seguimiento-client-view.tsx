'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageSubheader } from '@/components/layout/page-subheader'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils/currency'
import {
  Clock,
  Banknote,
  MessageCircle,
  MoreHorizontal,
  MoreVertical,
  Users,
  Phone,
  RefreshCcw,
} from 'lucide-react'

import { RegistrarPagoDrawer } from '@/components/domain/cargo/registrar-pago-drawer'
import { RecordatorioMensajeDrawer } from '@/components/domain/envio/recordatorio-mensaje-drawer'
import { CrearPromesaDrawer } from '@/components/domain/timeline/crear-promesa-drawer'
import { AnularPagoDrawer } from '@/components/domain/timeline/anular-pago-drawer'
import { CrearCargoIndividualDrawer } from '@/components/domain/cargo/crear-cargo-individual-drawer'
import { CrearCargoUnicoDrawer } from '@/components/domain/cargo/crear-cargo-unico-drawer'
import { AnularCargoDrawer } from '@/components/domain/cargo/anular-cargo-drawer'
import { VisitaExpressDrawer, type PlanVisita } from '@/components/domain/cargo/visita-express-drawer'
import { AccionesAlumnoSheet } from '@/components/domain/persona/acciones-alumno-sheet'
import { EditarAlumnoDrawer } from '@/components/domain/persona/editar-alumno-drawer'
import { FaltaTelefonoAlert } from '@/components/domain/persona/falta-telefono-alert'
import { MasAccionesSheet } from '@/components/domain/seguimiento/mas-acciones-sheet'
import { HistorialCompletoDrawer } from '@/components/domain/timeline/historial-completo-drawer'
import { iconoEvento } from '@/components/domain/timeline/evento-icono'
import { LedgerCargoRow } from '@/components/domain/timeline/ledger-cargo-row'
import { esEventoCargo, computeSaldosResultantes } from '@/lib/utils/ledger'

const TIMELINE_PREVIEW = 4

function getIniciales(nombre: string, apellido: string | null) {
  const a = (nombre?.[0] ?? '').toUpperCase()
  const b = (apellido?.[0] ?? '').toUpperCase()
  return (a + b) || '?'
}

export function SeguimientoClientView({
  persona,
  grupoNombre,
  cargosActivos,
  deudaTotal,
  saldoAFavor = 0,
  primerCargo,
  timeline,
  allowPartial = true,
  planesPorVisita = [],
  grupos = [],
  planes = [],
  multiPlanEnabled = false,
  currentGrupoId = null,
  currentPlanIds = [],
}: {
  persona: any
  grupoNombre: string | null
  cargosActivos: any[]
  deudaTotal: number
  saldoAFavor?: number
  primerCargo: any
  timeline: any[]
  allowPartial?: boolean
  planesPorVisita?: PlanVisita[]
  grupos?: any[]
  planes?: any[]
  multiPlanEnabled?: boolean
  currentGrupoId?: string | null
  currentPlanIds?: string[]
}) {
  const router = useRouter()
  const [isExiting, setIsExiting] = useState(false)

  const [isPagoOpen, setIsPagoOpen] = useState(false)
  const [isRecordatorioOpen, setIsRecordatorioOpen] = useState(false)
  const [isPromesaOpen, setIsPromesaOpen] = useState(false)
  const [isCargoOpen, setIsCargoOpen] = useState(false)
  const [isCargoUnicoOpen, setIsCargoUnicoOpen] = useState(false)
  const [isAnularCargoOpen, setIsAnularCargoOpen] = useState(false)
  const [isMasAccionesOpen, setIsMasAccionesOpen] = useState(false)
  const [isVisitaOpen, setIsVisitaOpen] = useState(false)
  const [isKebabOpen, setIsKebabOpen] = useState(false)
  const [isEditarOpen, setIsEditarOpen] = useState(false)
  const [isHistorialOpen, setIsHistorialOpen] = useState(false)
  const [isAlertOpen, setIsAlertOpen] = useState(false)
  const [editFocus, setEditFocus] = useState<'telefono' | null>(null)

  const handleBack = () => {
    setIsExiting(true)
    setTimeout(() => router.back(), 200)
  }

  const suspendido = persona.estado_registro !== 'activo'
  const tieneHistorial = (timeline?.length ?? 0) > 0
  const iniciales = getIniciales(persona.nombre, persona.apellido)
  const eventosPreview = timeline.slice(0, TIMELINE_PREVIEW)
  const eventosOcultos = Math.max(0, timeline.length - TIMELINE_PREVIEW)

  // Saldo corriente acumulado por evento (estado de cuenta). Se calcula sobre el
  // timeline COMPLETO anclando al saldo vivo, para que el preview encadene igual
  // que el historial completo.
  const saldoActual = Number(persona.saldo_acumulado ?? deudaTotal)
  const saldosLedger = computeSaldosResultantes(timeline, saldoActual)

  return (
    <div
      className={`flex flex-col h-full min-h-screen bg-background pb-32 transition-all duration-200 ${
        isExiting ? 'animate-out slide-out-to-right fade-out' : 'animate-in slide-in-from-right'
      }`}
    >
      {/* Sub-header con avatar de iniciales + kebab */}
      <PageSubheader
        title={
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="truncate">{persona.nombre} {persona.apellido}</span>
          </div>
        }
        onBack={handleBack}
        actions={
          <button
            onClick={() => setIsKebabOpen(true)}
            className="p-2 -mr-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-colors"
            aria-label="Acciones del alumno"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
        }
      />

      {/* Listón de badges */}
      <div className="bg-card border-b border-border px-4 py-2.5 flex flex-wrap gap-2">
        <Badge
          variant="outline"
          className={`gap-1.5 font-medium ${
            suspendido
              ? 'bg-muted text-muted-foreground border-border'
              : 'bg-[#22887c]/10 text-[#1a6b62] border-[#22887c]/30'
          }`}
        >
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              suspendido ? 'bg-muted-foreground' : 'bg-[#22887c]'
            }`}
          />
          {suspendido ? 'Suspendido' : 'Activo'}
        </Badge>

        {grupoNombre && (
          <Badge variant="outline" className="gap-1.5 font-medium bg-secondary/60 text-secondary-foreground border-border">
            <Users className="h-3 w-3" />
            {grupoNombre}
          </Badge>
        )}

        {persona.telefono_whatsapp && (
          <Badge variant="outline" className="gap-1.5 font-medium bg-secondary/60 text-secondary-foreground border-border">
            <Phone className="h-3 w-3" />
            {persona.telefono_whatsapp}
          </Badge>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Snapshot: total + desglose */}
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="mb-3">
            <p className="text-xs text-muted-foreground font-medium">Pendiente total</p>
            <p
              className={`text-2xl font-black leading-none mt-0.5 ${
                deudaTotal > 0 ? 'text-destructive' : 'text-[#22887c]'
              }`}
            >
              {formatCurrency(deudaTotal)}
            </p>
            {saldoAFavor > 0 && (
              <p className="mt-1.5 text-xs font-semibold text-[#15435a] flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#15435a]" aria-hidden="true" />
                Saldo a favor: {formatCurrency(saldoAFavor)}
              </p>
            )}
          </div>

          {cargosActivos.length > 0 && (
            <div className="border-t border-border pt-3 space-y-2">
              {cargosActivos.map((c: any) => (
                <div key={c.id} className="flex items-baseline gap-2">
                  <p className="text-xs text-muted-foreground truncate flex-shrink-0">{c.concepto}</p>
                  <span
                    className="flex-1 border-b border-dotted border-border/70 translate-y-[-3px]"
                    aria-hidden="true"
                  />
                  <span
                    className={`text-xs font-semibold flex-shrink-0 ${
                      c.estado_financiero === 'vencido' ? 'text-destructive' : 'text-amber-500'
                    }`}
                  >
                    {formatCurrency(c.saldo_pendiente)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {deudaTotal === 0 && <p className="text-xs text-[#22887c] font-medium">Al corriente</p>}
        </div>

        {/* 3 botones fijos */}
        <div className="flex gap-2">
          <Button
            onClick={() => setIsPagoOpen(true)}
            className="flex-[2] h-11 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm"
          >
            <Banknote className="h-4 w-4 mr-1.5" /> Registrar Pago
          </Button>

          <Button
            onClick={() => {
              if (persona.telefono_whatsapp) {
                setIsRecordatorioOpen(true)
              } else {
                setIsAlertOpen(true)
              }
            }}
            className="flex-[1.5] h-11 rounded-lg bg-[#22887c] hover:bg-[#1a6b62] text-white font-semibold text-sm"
          >
            <MessageCircle className="h-4 w-4 mr-1.5" /> Recordar pago
          </Button>

          <Button
            onClick={() => setIsMasAccionesOpen(true)}
            variant="outline"
            className="flex-1 h-11 rounded-lg font-semibold text-sm"
          >
            <MoreHorizontal className="h-4 w-4 mr-1" /> Más
          </Button>
        </div>

        {/* Modales / drawers */}
        <RegistrarPagoDrawer
          personaId={persona.id}
          personaNombre={`${persona.nombre} ${persona.apellido ?? ''}`.trim()}
          cargoIds={cargosActivos.map((c: any) => c.id)}
          saldoTotal={deudaTotal}
          allowPartial={allowPartial}
          open={isPagoOpen}
          onOpenChange={setIsPagoOpen}
        />

        <RecordatorioMensajeDrawer
          telefono={persona.telefono_whatsapp}
          nombre={`${persona.nombre} ${persona.apellido ?? ''}`.trim()}
          monto={deudaTotal}
          concepto={cargosActivos.length === 1 ? cargosActivos[0].concepto : 'adeudo pendiente'}
          cargosActivos={cargosActivos}
          open={isRecordatorioOpen}
          onOpenChange={setIsRecordatorioOpen}
        />

        <CrearPromesaDrawer personaId={persona.id} open={isPromesaOpen} onOpenChange={setIsPromesaOpen} />

        <CrearCargoIndividualDrawer
          personaId={persona.id}
          open={isCargoOpen}
          onOpenChange={setIsCargoOpen}
          origen="manual"
          tituloDrawer="Nuevo cargo"
        />

        <CrearCargoUnicoDrawer
          alumnoId={persona.id}
          open={isCargoUnicoOpen}
          onOpenChange={setIsCargoUnicoOpen}
        />

        <AnularCargoDrawer
          open={isAnularCargoOpen}
          onOpenChange={setIsAnularCargoOpen}
          cargos={cargosActivos}
        />

        <MasAccionesSheet
          open={isMasAccionesOpen}
          onOpenChange={setIsMasAccionesOpen}
          onAgregarCargo={() => setIsCargoOpen(true)}
          onCargoUnico={() => setIsCargoUnicoOpen(true)}
          onRegistrarPromesa={() => setIsPromesaOpen(true)}
          onAnularCargo={() => setIsAnularCargoOpen(true)}
          onRegistrarVisita={() => setIsVisitaOpen(true)}
          suspendido={suspendido}
        />

        <VisitaExpressDrawer
          open={isVisitaOpen}
          onOpenChange={setIsVisitaOpen}
          alumnos={[]}
          planesPorVisita={planesPorVisita}
          alumnoFijo={{ id: persona.id, nombre: persona.nombre, apellido: persona.apellido }}
        />

        <AccionesAlumnoSheet
          open={isKebabOpen}
          onOpenChange={setIsKebabOpen}
          persona={{
            id: persona.id,
            nombre: persona.nombre,
            apellido: persona.apellido,
            estado_registro: persona.estado_registro,
          }}
          tieneHistorial={tieneHistorial}
          onEditar={() => setIsEditarOpen(true)}
        />

        <EditarAlumnoDrawer
          persona={{
            id: persona.id,
            nombre: persona.nombre,
            apellido: persona.apellido,
            telefono_whatsapp: persona.telefono_whatsapp,
            email: persona.email,
          }}
          grupos={grupos}
          planes={planes}
          multiPlanEnabled={multiPlanEnabled}
          currentGrupoId={currentGrupoId}
          currentPlanIds={currentPlanIds}
          open={isEditarOpen}
          onOpenChange={(open) => {
            setIsEditarOpen(open)
            if (!open) setEditFocus(null)
          }}
          initialFocus={editFocus}
        />

        <FaltaTelefonoAlert
          open={isAlertOpen}
          onOpenChange={setIsAlertOpen}
          nombreAlumno={`${persona.nombre} ${persona.apellido ?? ''}`.trim() || 'Este alumno'}
          onRegistrarClick={() => {
            setEditFocus('telefono')
            setIsEditarOpen(true)
          }}
        />

        <HistorialCompletoDrawer
          open={isHistorialOpen}
          onOpenChange={setIsHistorialOpen}
          personaId={persona.id}
          iniciales={timeline}
          saldoActual={saldoActual}
        />

        {/* Historial reciente */}
        <div className="pt-2">
          <h2 className="text-sm font-semibold text-foreground flex items-center mb-3">
            <Clock className="h-4 w-4 mr-2 text-muted-foreground" /> Historial reciente
          </h2>

          {eventosPreview.length === 0 ? (
            <div className="text-center py-8 px-4 border border-dashed border-border rounded-xl bg-muted/20">
              <Clock className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                El historial está limpio. Aquí aparecerán los pagos registrados,
                cargos y movimientos del alumno.
              </p>
            </div>
          ) : (
            <>
              <div className="relative border-l-2 border-border ml-3 space-y-5">
                {eventosPreview.map((evento: any) => {
                  // Cargos → fila ultra-compacta con saldo resultante (estado de cuenta).
                  if (esEventoCargo(evento.tipo)) {
                    return (
                      <LedgerCargoRow
                        key={evento.id}
                        evento={evento}
                        saldoResultante={saldosLedger.get(evento.id)}
                      />
                    )
                  }

                  // Resto (abonos, promesas, notas, anulaciones…) → Card sin cambios.
                  const { Icon, color, bg } = iconoEvento(evento.tipo)
                  const isPago = evento.tipo === 'abono_registrado'
                  const isCargo = false
                  const isAnulacion = evento.tipo === 'pago_anulado' || evento.tipo === 'cargo_anulado'
                  const meta = evento.metadata as Record<string, any> | null
                  const montoEvento = typeof meta?.monto === 'number' ? Number(meta.monto) : null
                  const mostrarMonto = montoEvento != null && (isCargo || isPago)

                  return (
                    <div key={evento.id} className="relative pl-6">
                      <div
                        className={`absolute -left-[13px] top-1 h-6 w-6 rounded-full border-4 border-background flex items-center justify-center ${bg}`}
                      >
                        <Icon className={`h-3 w-3 ${color}`} />
                      </div>

                      <Card
                        className={`overflow-hidden shadow-sm ${
                          isAnulacion ? 'border-destructive/20 bg-destructive/5' : 'border-border'
                        }`}
                      >
                        <CardContent className="p-3">
                          <div className="flex justify-between items-start mb-1 gap-2">
                            <h3
                              className={`text-sm font-bold ${
                                isAnulacion ? 'text-destructive' : 'text-foreground'
                              }`}
                            >
                              {evento.titulo}
                            </h3>
                            <div className="flex flex-col items-end flex-shrink-0">
                              {mostrarMonto && (
                                <span
                                  className={`text-sm font-bold leading-none ${
                                    isPago ? 'text-[#22887c]' : 'text-foreground'
                                  }`}
                                >
                                  {isPago ? '−' : '+'}{formatCurrency(montoEvento!)}
                                </span>
                              )}
                              <span className="text-[10px] text-muted-foreground/80 font-medium whitespace-nowrap mt-0.5">
                                {new Date(evento.fecha_evento).toLocaleDateString('es-MX', {
                                  day: 'numeric',
                                  month: 'short',
                                })}
                              </span>
                            </div>
                          </div>
                          {evento.descripcion && (
                            <p
                              className={`text-xs ${
                                isAnulacion ? 'text-destructive/90' : 'text-muted-foreground'
                              }`}
                            >
                              {evento.descripcion}
                            </p>
                          )}

                          {isPago && meta?.movimiento_id && (
                            <div className="mt-3 flex justify-end border-t border-border/50 pt-2">
                              <AnularPagoDrawer movimientoId={meta.movimiento_id} monto={meta.monto}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <RefreshCcw className="h-3 w-3 mr-1" /> Anular
                                </Button>
                              </AnularPagoDrawer>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )
                })}
              </div>

              {eventosOcultos > 0 && (
                <div className="flex items-center justify-center gap-3 pt-4">
                  <div className="flex gap-1">
                    <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                    <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                    <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                  </div>
                  <button
                    onClick={() => setIsHistorialOpen(true)}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Ver todo ({timeline.length})
                  </button>
                </div>
              )}
            </>
          )}

          {/* Saldo Corriente acumulado (saldo vivo del alumno) */}
          <div className="mt-5 flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Saldo Corriente</span>
            <span
              className={`text-lg font-black ${
                Number(persona.saldo_acumulado ?? deudaTotal) > 0 ? 'text-destructive' : 'text-[#22887c]'
              }`}
            >
              {formatCurrency(Number(persona.saldo_acumulado ?? deudaTotal))}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
