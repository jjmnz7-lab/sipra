'use client'

import React, { useState, useRef } from 'react'
import { MessageCircle } from 'lucide-react'
import { RecordatorioMensajeDrawer } from '@/components/domain/envio/recordatorio-mensaje-drawer'
import { RegistrarPagoDrawer } from './registrar-pago-drawer'
import { EditarAlumnoDrawer } from '@/components/domain/persona/editar-alumno-drawer'
import { FaltaTelefonoAlert } from '@/components/domain/persona/falta-telefono-alert'
import { BilleteDollarIcon } from '@/components/ui/billete-dollar-icon'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils/currency'
import { colorEstado } from '@/lib/constants/alumno-finanzas'
import { colorPorSlug } from '@/lib/constants/grupo-apariencia'

type GrupoEditar = {
  id: string
  nombre: string
  color?: string | null
  emoji?: string | null
  plan_sugerido_id?: string | null
}
type PlanEditar = { id: string; nombre: string; monto: number; frecuencia: string }

interface SwipeableCargoCardProps {
  alumno: any
  allowPartial?: boolean
  allowOverpayment?: boolean
  grupos?: GrupoEditar[]
  planes?: PlanEditar[]
  multiPlanEnabled?: boolean
}

function getIniciales(nombre: string | null | undefined, apellido: string | null | undefined) {
  const a = (nombre?.[0] ?? '').toUpperCase()
  const b = (apellido?.[0] ?? '').toUpperCase()
  return (a + b) || '?'
}

export function SwipeableCargoCard({
  alumno,
  allowPartial = true,
  allowOverpayment = true,
  grupos = [],
  planes = [],
  multiPlanEnabled = false,
}: SwipeableCargoCardProps) {
  const [offsetX, setOffsetX] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false)
  const [isPagoOpen, setIsPagoOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isAlertOpen, setIsAlertOpen] = useState(false)
  const [editFocus, setEditFocus] = useState<'telefono' | null>(null)

  const startX = useRef(0)
  const currentX = useRef(0)

  const nombreCompleto = `${alumno.persona?.nombre ?? ''} ${alumno.persona?.apellido ?? ''}`.trim()

  // Aviso accionable cuando el alumno no tiene teléfono/whatsapp.
  const avisarSinTelefono = () => {
    setIsAlertOpen(true)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
    currentX.current = e.touches[0].clientX
    setIsSwiping(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return
    currentX.current = e.touches[0].clientX
    const diff = currentX.current - startX.current
    
    // Permitir deslizar hacia ambos lados con límite de resistencia (80px)
    const limit = 80
    let limitedDiff = diff
    if (diff > limit) {
      limitedDiff = limit + (diff - limit) * 0.2
    } else if (diff < -limit) {
      limitedDiff = -limit + (diff + limit) * 0.2
    }
    setOffsetX(limitedDiff)
  }

  const handleTouchEnd = () => {
    setIsSwiping(false)
    const diff = currentX.current - startX.current
    setOffsetX(0) // Siempre regresa a la posición original
    
    // Umbral de 60px para disparar los Drawers directamente
    if (diff < -60) {
      if (alumno.persona?.telefono_whatsapp) {
        setIsWhatsAppOpen(true)
      } else {
        avisarSinTelefono()
      }
    } else if (diff > 60) {
      if (alumno.cargos && alumno.cargos.length > 0) {
        setIsPagoOpen(true)
      }
    }
  }

  const primaryCargo = alumno.cargos?.[0]
  const concepto = alumno.cargosCount === 1 
    ? primaryCargo?.concepto 
    : `${alumno.cargosCount} cargos pendientes`
  const suspendido = alumno.persona?.estado_registro !== 'activo'
  const sinTelefono = !alumno.persona?.telefono_whatsapp
  const estado = colorEstado(alumno.estadoFinanciero)
  const iniciales = getIniciales(alumno.persona?.nombre, alumno.persona?.apellido)
  const grupo = alumno.persona?.grupo
  const grupoColor = grupo ? colorPorSlug(grupo.color) : null

  return (
    <>
      <div className="relative overflow-hidden rounded-lg bg-muted/10">
        {/* Indicador de Swipe en el Fondo */}
        {isSwiping && offsetX !== 0 && (
          <div
            className={`absolute inset-0 flex items-center px-6 transition-colors duration-150 ${
              offsetX < 0
                ? (sinTelefono ? 'bg-gray-400/15 justify-end' : 'bg-[#22887c]/10 justify-end')
                : 'bg-[#cbe4f0] justify-start'
            }`}
          >
            {offsetX < 0 ? (
              <div className={`flex items-center gap-2 font-bold text-xs select-none ${
                sinTelefono ? 'text-muted-foreground/60' : 'text-[#22887c]'
              }`}>
                <span>Recordar</span>
                <MessageCircle className="h-4 w-4" />
              </div>
            ) : (
              <div className="flex items-center gap-2 text-[#15435a] font-bold text-xs select-none">
                <BilleteDollarIcon className="h-5 w-5" />
                <span>Cobrar</span>
              </div>
            )}
          </div>
        )}

        {/* Contenido de la tarjeta (se desliza) */}
        <div 
          style={{ transform: `translateX(${offsetX}px)` }}
          className={`relative bg-card rounded-lg transition-[transform,box-shadow,border-color,background-color] duration-150 ${
            isSwiping ? 'transition-none' : 'transition-transform duration-350 ease-out'
          }`}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <Card className={`relative overflow-hidden border hover:border-primary/50 transition-[transform,border-color,box-shadow,background-color] duration-150 active:scale-[0.985] active:border-[#22887c]/60 active:shadow-[0_0_0_1px_rgba(34,136,124,0.18),0_8px_20px_rgba(34,136,124,0.08)] ${
            suspendido ? 'bg-card/65 border-border/65' : 'bg-card border-border'
          }`}>
            {/* Indicator strip (8px, color del semáforo financiero) */}
            <div
              className="absolute left-0 top-0 bottom-0 w-[6px]"
              style={{ backgroundColor: estado.hex }}
            />
            <CardContent className="py-1 pr-3 pl-5 flex gap-3 items-center">
              {/* Contenido principal (clicable para ir a Seguimiento) */}
              <Link href={`/seguimiento/${alumno.persona_id}?from=inicio`} className="relative flex-1 min-w-0 transition-[transform,border-color,box-shadow,background-color] duration-150 active:scale-[0.985] active:translate-y-[1px]">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <h3 className={`font-bold truncate text-sm sm:text-base ${
                      suspendido ? 'text-muted-foreground/65' : 'text-foreground'
                    }`}>
                      {alumno.persona.nombre} {alumno.persona.apellido}
                    </h3>
                  </div>
                  {grupo && grupoColor ? (
                    <span
                      className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full border max-w-[120px] truncate select-none flex-shrink-0"
                      style={{
                        borderColor: grupoColor.border,
                        color: grupoColor.textLight,
                        backgroundColor: grupoColor.bg,
                      }}
                      title={grupo.nombre}
                    >
                      {grupo.emoji && <span className="mr-0.5">{grupo.emoji}</span>}
                      {grupo.nombre}
                    </span>
                  ) : (
                    <span className="text-[10px] sm:text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-full max-w-[120px] truncate select-none flex-shrink-0">
                      Sin grupo
                    </span>
                  )}
                </div>
                
                <p className="mt-1 select-none">
                  <span
                    className="text-[9px] font-semibold uppercase tracking-wide"
                    style={{ color: estado.hex }}
                  >
                    {estado.label}
                  </span>
                  {' • '}
                  <span className="font-bold text-foreground text-sm">
                    {formatCurrency(alumno.totalAdeudado)}
                  </span>
                </p>

                {/* Badge de suspendido en la esquina inferior derecha */}
                {suspendido && (
                  <span className="absolute bottom-0 right-0 inline-flex items-center gap-1 pointer-events-none select-none">
                    <span className="h-1.5 w-1.5 rounded-full bg-gray-400" aria-hidden="true" />
                    <span className="text-[9px] font-medium text-muted-foreground">suspendido</span>
                  </span>
                )}
              </Link>

              {/* Acciones Rápidas Estáticas (Derecha) */}
              <div className={`flex items-center gap-1.5 border-l pl-2 ${suspendido ? 'border-border/40' : 'border-border'}`}>
                <button
                  onClick={() => {
                    if (alumno.persona?.telefono_whatsapp) {
                      setIsWhatsAppOpen(true)
                    } else {
                      avisarSinTelefono()
                    }
                  }}
                  className={`p-2 rounded-full transition-[transform,background-color,color,box-shadow] duration-150 active:scale-[0.92] active:bg-[#22887c]/12 active:shadow-[0_0_0_1px_rgba(34,136,124,0.18)] ${
                    alumno.persona?.telefono_whatsapp
                      ? "text-[#22887c] hover:bg-[#22887c]/10"
                      : "text-muted-foreground/40 cursor-not-allowed opacity-50"
                  }`}
                >
                  <MessageCircle className="h-6 w-6" />
                </button>

                {primaryCargo && (
                  <button
                    onClick={() => setIsPagoOpen(true)}
                    className="p-2 text-[#15435a] hover:bg-[#15435a]/10 rounded-full transition-[transform,background-color,color,box-shadow] duration-150 active:scale-[0.92] active:bg-[#22887c]/12 active:shadow-[0_0_0_1px_rgba(34,136,124,0.18)]"
                  >
                    <BilleteDollarIcon className="h-7 w-7" />
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {alumno.persona?.telefono_whatsapp && (
        <RecordatorioMensajeDrawer
          open={isWhatsAppOpen}
          onOpenChange={setIsWhatsAppOpen}
          telefono={alumno.persona.telefono_whatsapp}
          nombre={`${alumno.persona.nombre ?? ''} ${alumno.persona.apellido ?? ''}`.trim()}
          monto={alumno.totalAdeudado}
          concepto={concepto}
          cargosActivos={alumno.cargos}
          personaId={alumno.persona_id}
          codigoPais={alumno.persona.codigo_pais}
        />
      )}

      {primaryCargo && (
        <RegistrarPagoDrawer
          open={isPagoOpen}
          onOpenChange={setIsPagoOpen}
          personaId={alumno.persona_id}
          personaNombre={nombreCompleto}
          cargoIds={alumno.cargos?.map((c: any) => c.id) ?? []}
          saldoTotal={alumno.totalAdeudado}
          allowPartial={allowPartial}
          allowOverpayment={allowOverpayment}
        />
      )}

      <EditarAlumnoDrawer
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open)
          if (!open) setEditFocus(null)
        }}
        persona={{
          id: alumno.persona_id,
          nombre: alumno.persona?.nombre ?? '',
          apellido: alumno.persona?.apellido ?? null,
          telefono_whatsapp: alumno.persona?.telefono_whatsapp ?? null,
          email: alumno.email ?? null,
        }}
        grupos={grupos}
        planes={planes}
        multiPlanEnabled={multiPlanEnabled}
        currentGrupoId={alumno.persona?.grupo?.id ?? null}
        currentPlanIds={alumno.planIds ?? []}
        initialFocus={editFocus}
      />

      <FaltaTelefonoAlert 
        open={isAlertOpen} 
        onOpenChange={setIsAlertOpen} 
        nombreAlumno={nombreCompleto || 'Este alumno'}
        onRegistrarClick={() => {
          setEditFocus('telefono')
          setIsEditOpen(true)
        }}
      />
    </>
  )
}
