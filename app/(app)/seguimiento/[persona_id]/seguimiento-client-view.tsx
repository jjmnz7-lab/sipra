'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PageSubheader } from '@/components/layout/page-subheader'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils/currency'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { colorPorSlug } from '@/lib/constants/grupo-apariencia'
import {
  Clock,
  Banknote,
  MessageCircle,
  MoreVertical,
  Users,
  Phone,
  Plus,
  Copy,
  ChevronDown,
  ChevronRight,
  GraduationCap,
} from 'lucide-react'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { colorEstado, descuentoEspecialBadge, type EstadoFinancieroAlumno } from '@/lib/constants/alumno-finanzas'

import { RegistrarPagoDrawer } from '@/components/domain/cargo/registrar-pago-drawer'
import { RecordatorioMensajeDrawer } from '@/components/domain/envio/recordatorio-mensaje-drawer'
import { CrearPromesaDrawer } from '@/components/domain/timeline/crear-promesa-drawer'
import { CrearCargoIndividualDrawer } from '@/components/domain/cargo/crear-cargo-individual-drawer'
import { AnularCargoDrawer } from '@/components/domain/cargo/anular-cargo-drawer'
import { AccionesAlumnoSheet } from '@/components/domain/persona/acciones-alumno-sheet'
import { EnviarEnlaceHistorialSheet } from '@/components/domain/envio/enviar-enlace-historial-sheet'
import { EditarAlumnoDrawer } from '@/components/domain/persona/editar-alumno-drawer'
import { FaltaTelefonoAlert } from '@/components/domain/persona/falta-telefono-alert'
import { MasAccionesSheet } from '@/components/domain/seguimiento/mas-acciones-sheet'
import { EventoRow } from '@/components/domain/timeline/evento-row'

const TIMELINE_PREVIEW = 4

export function SeguimientoClientView({
  persona,
  gruposAlumno = [],
  planesAlumno = [],
  cargosActivos,
  estadoFinanciero,
  deudaTotal,
  saldoAFavor = 0,
  timeline,
  allowPartial = true,
  allowOverpayment = true,
  grupos = [],
  planes = [],
  cobrosFrecuentes = [],
  multiPlanEnabled = false,
  currentGrupoId = null,
  currentPlanIds = [],
}: {
  persona: any
  gruposAlumno?: { id: string; nombre: string; color: string | null; emoji: string | null }[]
  planesAlumno?: { id: string; nombre: string }[]
  cargosActivos: any[]
  estadoFinanciero: EstadoFinancieroAlumno
  deudaTotal: number
  saldoAFavor?: number
  timeline: any[]
  allowPartial?: boolean
  allowOverpayment?: boolean
  grupos?: any[]
  planes?: any[]
  cobrosFrecuentes?: { id: string; concepto: string; monto: number }[]
  multiPlanEnabled?: boolean
  currentGrupoId?: string | null
  currentPlanIds?: string[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isExiting, setIsExiting] = useState(false)


  const [isPagoOpen, setIsPagoOpen] = useState(false)
  const [isRecordatorioOpen, setIsRecordatorioOpen] = useState(false)
  const [isPromesaOpen, setIsPromesaOpen] = useState(false)
  const [isCargoOpen, setIsCargoOpen] = useState(false)
  const [isAnularCargoOpen, setIsAnularCargoOpen] = useState(false)
  const [isMasAccionesOpen, setIsMasAccionesOpen] = useState(false)
  const [isKebabOpen, setIsKebabOpen] = useState(false)
  const [isEnviarEnlaceOpen, setIsEnviarEnlaceOpen] = useState(false)
  const [isEditarOpen, setIsEditarOpen] = useState(false)
  const [isAlertOpen, setIsAlertOpen] = useState(false)
  const [editFocus, setEditFocus] = useState<'telefono' | null>(null)

  useEffect(() => {
    const edit = searchParams.get('edit')
    if (edit === 'telefono') {
      setTimeout(() => {
        setEditFocus('telefono')
        setIsEditarOpen(true)
      }, 0)
      const url = new URL(window.location.href)
      url.searchParams.delete('edit')
      window.history.replaceState({}, '', url.pathname + url.search)
    }
  }, [searchParams])

  const [groupsExpanded, setGroupsExpanded] = useState(false)
  const [plansExpanded, setPlansExpanded] = useState(false)
  const [isPhoneOptionsOpen, setIsPhoneOptionsOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage(null)
    }, 1000)
  }

  const estadoDef = colorEstado(estadoFinanciero)

  const handleBack = () => {
    setIsExiting(true)
    setTimeout(() => router.back(), 200)
  }

  const suspendido = persona.estado_registro !== 'activo'
  const tieneHistorial = (timeline?.length ?? 0) > 0
  const descuento = descuentoEspecialBadge(persona.descuento_hermanos_activo, persona.beca_activa, persona.beca_porcentaje)
  const eventosPreview = timeline.slice(0, TIMELINE_PREVIEW)
  const nombreCompleto = `${persona.nombre} ${persona.apellido ?? ''}`.trim()

  return (
    <div
      className={`flex flex-col h-full min-h-screen bg-background pb-48 transition-all duration-200 ${
        isExiting ? 'animate-out slide-out-to-right fade-out' : 'animate-in slide-in-from-right'
      }`}
    >
      {/* Sub-header con avatar de iniciales + kebab */}
      <PageSubheader
        title={
          <div className="flex items-center justify-between w-full min-w-0 gap-2">
            <span className={cn("truncate mr-2", suspendido && "text-muted-foreground/65")}>
              {persona.nombre} {persona.apellido}
            </span>
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
      <div className="sticky top-[112px] z-20 bg-background/95 backdrop-blur-sm border-b border-border w-full overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="flex gap-1.5 items-center justify-center min-w-full px-3 py-1.5 flex-nowrap">
          {suspendido && (
            <ListonBadge
              icon={<span className="inline-block h-1.5 w-1.5 rounded-full bg-gray-400" />}
              className="bg-muted text-muted-foreground border-border"
            >
              suspendido
            </ListonBadge>
          )}
          {/* Badge de teléfono */}
          <ListonBadge
            icon={<Phone className="h-3 w-3" />}
            onClick={() => {
              if (persona.telefono_whatsapp) {
                setIsPhoneOptionsOpen(true)
              } else {
                setIsAlertOpen(true)
              }
            }}
          >
            {persona.telefono_whatsapp || '- - - - -'}
            <ChevronDown className="h-3 w-3 text-[#22887c] ml-1" />
          </ListonBadge>

          {/* Badge de grupos */}
          {gruposAlumno.length === 0 ? (
            <ListonBadge className="bg-amber-500/10 text-amber-700 dark:text-amber-500 border-amber-500/30">
              ⚠️ sin grupo
            </ListonBadge>
          ) : gruposAlumno.length === 1 ? (() => {
            const g = gruposAlumno[0]!
            const gColor = colorPorSlug(g.color)
            return (
              <Link
                href={`/grupos/${g.id}`}
                className={cn(
                  "inline-flex items-center flex-shrink-0 text-[10px] font-semibold px-2 py-1 rounded-full whitespace-nowrap",
                  "cursor-pointer active:scale-95 transition-all"
                )}
                style={{
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: gColor.border,
                  color: gColor.textLight,
                  backgroundColor: gColor.bg,
                }}
              >
                {g.emoji ? (
                  <span className="mr-1 text-[11px] leading-none">{g.emoji}</span>
                ) : (
                  <span className="text-[10px] mr-1 opacity-60" style={{ color: gColor.textLight }}>
                    <Users className="h-3 w-3 inline" />
                  </span>
                )}
                {g.nombre}
              </Link>
            )
          })() : (
            <ListonBadge
              icon={<Users className="h-3 w-3" />}
              onClick={() => setGroupsExpanded(!groupsExpanded)}
              className={cn(groupsExpanded && "border-[#22887c]/30 bg-[#22887c]/15 text-[#22887c]")}
            >
              {groupsExpanded ? (
                gruposAlumno.map((g) => g.nombre).join(', ')
              ) : (
                <>
                  <span>{gruposAlumno[0]!.nombre}</span>
                  <span className="inline-flex items-center justify-center bg-[#22887c]/15 text-[#22887c] rounded-full px-1.5 py-[1px] text-[9px] font-bold ml-1">
                    +{gruposAlumno.length - 1}
                  </span>
                </>
              )}
            </ListonBadge>
          )}

          {/* Badge de esquemas de cobro */}
          {planesAlumno.length === 0 ? (
            <ListonBadge className="bg-amber-500/10 text-amber-700 dark:text-amber-500 border-amber-500/30">
              ⚠️ sin esquema de pago
            </ListonBadge>
          ) : planesAlumno.length === 1 ? (
            <ListonBadge icon={<PlanIcon />}>
              {planesAlumno[0]!.nombre}
            </ListonBadge>
          ) : (
            <ListonBadge
              icon={<PlanIcon />}
              onClick={() => setPlansExpanded(!plansExpanded)}
              className={cn(plansExpanded && "border-[#22887c]/30 bg-[#22887c]/15 text-[#22887c]")}
            >
              {plansExpanded ? (
                planesAlumno.map((p) => p.nombre).join(', ')
              ) : (
                <>
                  <span>{planesAlumno[0]!.nombre}</span>
                  <span className="inline-flex items-center justify-center bg-[#22887c]/15 text-[#22887c] rounded-full px-1.5 py-[1px] text-[9px] font-bold ml-1">
                    +{planesAlumno.length - 1}
                  </span>
                </>
              )}
            </ListonBadge>
          )}

          {/* Badge de descuento especial (solo si hay uno activo). Mismos colores
              que el badge de esquema de cobro (ListonBadge neutro). */}
          {descuento && (
            <ListonBadge icon={descuento.tipo === 'beca' ? <GraduationCap className="h-3 w-3" /> : <Users className="h-3 w-3" />}>
              {descuento.label}
            </ListonBadge>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Snapshot: total + desglose */}
        <div className="bg-card rounded-xl p-4 border border-border flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Saldo</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span
                className="text-2xl font-black leading-none"
                style={{ color: estadoDef.hex }}
              >
                {formatCurrency(deudaTotal)}
              </span>
              <span
                className="text-[10px] font-bold uppercase tracking-wider bg-transparent border-0"
                style={{
                  color: estadoDef.hex
                }}
              >
                {estadoDef.label}
              </span>
            </div>
            {saldoAFavor > 0 && (
              <p className="mt-1.5 text-xs font-semibold text-[#15435a] flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#15435a]" aria-hidden="true" />
                Saldo a favor: {formatCurrency(saldoAFavor)}
              </p>
            )}
          </div>
        </div>

        {/* Modales / drawers */}
        <RegistrarPagoDrawer
          personaId={persona.id}
          personaNombre={`${persona.nombre} ${persona.apellido ?? ''}`.trim()}
          cargoIds={cargosActivos.map((c: any) => c.id)}
          saldoTotal={deudaTotal}
          allowPartial={allowPartial}
          allowOverpayment={allowOverpayment}
          open={isPagoOpen}
          onOpenChange={setIsPagoOpen}
        />

        <RecordatorioMensajeDrawer
          telefono={persona.telefono_whatsapp}
          nombre={`${persona.nombre} ${persona.apellido ?? ''}`.trim()}
          monto={deudaTotal}
          concepto={cargosActivos.length === 1 ? cargosActivos[0].concepto : 'adeudo pendiente'}
          cargosActivos={cargosActivos}
          personaId={persona.id}
          open={isRecordatorioOpen}
          onOpenChange={setIsRecordatorioOpen}
          codigoPais={persona.codigo_pais}
        />

        <CrearPromesaDrawer personaId={persona.id} open={isPromesaOpen} onOpenChange={setIsPromesaOpen} />

        <CrearCargoIndividualDrawer
          personaId={persona.id}
          personaNombre={`${persona.nombre} ${persona.apellido ?? ''}`.trim()}
          open={isCargoOpen}
          onOpenChange={setIsCargoOpen}
          origen="manual"
          tituloDrawer="Nuevo cargo"
          becaActiva={persona.beca_activa}
          becaPorcentaje={persona.beca_porcentaje}
          cobros={cobrosFrecuentes}
          onSuccess={showToast}
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
          onRegistrarPromesa={() => setIsPromesaOpen(true)}
          onAnularCargo={() => setIsAnularCargoOpen(true)}
          onEnviarEnlace={() => setIsEnviarEnlaceOpen(true)}
          suspendido={suspendido}
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
          shareCode={persona.share_code}
          linkBloqueado={!!persona.share_link_bloqueado}
          onToast={showToast}
        />

        <EnviarEnlaceHistorialSheet
          open={isEnviarEnlaceOpen}
          onOpenChange={setIsEnviarEnlaceOpen}
          alumnoNombre={nombreCompleto}
          telefono={persona.telefono_whatsapp}
          shareCode={persona.share_code}
          codigoPais={persona.codigo_pais}
        />

        <EditarAlumnoDrawer
          persona={{
            id: persona.id,
            nombre: persona.nombre,
            apellido: persona.apellido,
            telefono_whatsapp: persona.telefono_whatsapp,
            email: persona.email,
            descuento_hermanos_activo: persona.descuento_hermanos_activo,
            descuento_hermanos_monto: persona.descuento_hermanos_monto,
            beca_activa: persona.beca_activa,
            beca_porcentaje: persona.beca_porcentaje,
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

        {/* Historial reciente */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center">
              <Clock className="h-4 w-4 mr-2 text-muted-foreground" /> Historial reciente
            </h2>
            {timeline.length > 0 && (
              <Link
                href={`/seguimiento/${persona.id}/historial`}
                className="flex items-center gap-0.5 text-xs font-semibold text-[#22887c] hover:underline"
              >
                ver completo
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>

          {eventosPreview.length === 0 ? (
            <div className="text-center py-8 px-4 border border-dashed border-border rounded-xl bg-muted/20">
              <Clock className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                El historial está limpio. Aquí aparecerán los pagos registrados,
                cargos y movimientos del alumno.
              </p>
            </div>
          ) : (
            <div>
              {eventosPreview.map((evento: any, i: number) => (
                <EventoRow
                  key={evento.id}
                  evento={evento}
                  isLast={i === eventosPreview.length - 1}
                />
              ))}
            </div>
          )}
        </div>

        {/* 3 botones fijos (fijos abajo justo arriba del menú principal) */}
        <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] left-0 right-0 z-40 bg-card/95 backdrop-blur-sm border-t border-border p-4 flex gap-2">
          <Button
            onClick={() => setIsPagoOpen(true)}
            className="flex-[2] h-11 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm"
          >
            <Banknote className="h-4 w-4 mr-1.5" /> Registrar Pago
          </Button>

          {deudaTotal > 0 && (
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
          )}

          <Button
            variant="outline"
            onClick={() => setIsMasAccionesOpen(true)}
            className="flex-1 h-11 rounded-lg border-2 border-[#1c686e] bg-white dark:bg-white hover:bg-[#1c686e]/10 hover:text-[#1c686e] transition-colors"
          >
            <Plus className="h-[22px] w-[22px] text-[#1c686e]" strokeWidth={3.5} />
          </Button>
        </div>

        {/* Drawers adicionales */}
        <Drawer open={isPhoneOptionsOpen} onOpenChange={setIsPhoneOptionsOpen}>
          <DrawerContent className="max-h-[40vh]">
            <div className="mx-auto w-full max-w-sm pb-6">
              <DrawerHeader>
                <DrawerTitle className="text-center text-sm font-semibold">{persona.telefono_whatsapp}</DrawerTitle>
              </DrawerHeader>
              <div className="px-4 space-y-2 flex flex-col">
                <a
                  href={`tel:${persona.telefono_whatsapp}`}
                  className="w-full flex items-center justify-center gap-2 py-3 text-sm font-normal border-b border-border hover:bg-accent rounded-lg"
                  onClick={() => setIsPhoneOptionsOpen(false)}
                >
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>Llamar</span>
                </a>
                <button
                  onClick={() => {
                    if (persona.telefono_whatsapp) {
                      navigator.clipboard.writeText(persona.telefono_whatsapp)
                      showToast("Número telefónico copiado.")
                    }
                    setIsPhoneOptionsOpen(false)
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 text-sm font-normal hover:bg-accent rounded-lg"
                >
                  <Copy className="h-4 w-4 text-muted-foreground" />
                  <span>Copiar</span>
                </button>
                <button
                  onClick={() => setIsPhoneOptionsOpen(false)}
                  className="w-full flex items-center justify-center gap-2 py-3 text-sm font-normal border-t border-border hover:bg-accent rounded-lg"
                >
                  <span>Cerrar</span>
                </button>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      </div>

      {/* Toast sutil */}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[#22887c]/70 backdrop-blur-sm text-white text-xs px-3.5 py-2 rounded-lg shadow-md animate-in fade-in slide-in-from-bottom-2 duration-150">
          {toastMessage}
        </div>
      )}
    </div>
  )
}

function ListonBadge({
  children,
  icon,
  className,
  onClick,
}: {
  children: React.ReactNode
  icon?: React.ReactNode
  className?: string
  onClick?: () => void
}) {
  const Component = onClick ? 'button' : 'span'
  return (
    <Component
      onClick={onClick}
      {...(onClick ? { type: 'button' as const, tabIndex: -1 } : {})}
      className={cn(
        "inline-flex items-center flex-shrink-0 text-[10px] font-semibold px-2 py-1 rounded-full whitespace-nowrap",
        onClick 
          ? "cursor-pointer active:scale-95 transition-all border border-border bg-card text-foreground/85 hover:bg-accent"
          : "border border-border bg-card text-foreground/85",
        className
      )}
    >
      {icon && <span className="text-muted-foreground mr-1.5">{icon}</span>}
      {children}
    </Component>
  )
}

/** Ícono de plan de cobro: flechas en ciclo con signo $ superpuesto. */
function PlanIcon() {
  return (
    <span className="relative inline-flex items-center justify-center h-3.5 w-3.5 flex-shrink-0">
      {/* Flechas en ciclo (SVG simplificado) */}
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
        {/* Signo $ */}
        <text x="7" y="8.2" textAnchor="middle" fontSize="5.5" fontWeight="700" fill="currentColor" fontFamily="system-ui">$</text>
      </svg>
    </span>
  )
}
