'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Receipt, Lock, ShieldCheck } from 'lucide-react'
import { EventoRow } from '@/components/domain/timeline/evento-row'
import type { EventoTimeline } from '@/components/domain/timeline/evento-config'
import { colorEstado, type EstadoFinancieroAlumno } from '@/lib/constants/alumno-finanzas'
import { formatCurrency } from '@/lib/utils/currency'
import { SIPRA_NOMBRE, SIPRA_TAGLINE, LANDING_URL } from '@/lib/constants/branding'

const PREVIEW = 4

export type MovimientoPublico = {
  id: string
  tipo: string
  titulo: string
  descripcion: string | null
  monto: number | null
  fecha_evento: string
  categoria: string
}

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/)
  const a = partes[0]?.[0] ?? ''
  const b = partes[1]?.[0] ?? ''
  return (a + b).toUpperCase() || 'A'
}

/** Pie de marca SIPRA: impersonal, atrae a otros dueños hacia la landing. */
function SipraFooter() {
  return (
    <footer className="w-full max-w-md mx-auto px-4 pb-8 pt-6">
      <a
        href={LANDING_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex flex-col items-center gap-1.5 text-center"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logos/isotipo-sipra.png"
          alt={SIPRA_NOMBRE}
          className="h-7 w-7 opacity-70 transition-opacity group-hover:opacity-100"
        />
        <p className="text-[11px] text-muted-foreground leading-snug">
          <span className="font-semibold text-foreground/70">{SIPRA_NOMBRE}</span>
          {' • '}
          {SIPRA_TAGLINE}
        </p>
      </a>
    </footer>
  )
}

/** Página neutral para enlaces inválidos, suspendidos o bloqueados. */
export function EnlaceNoDisponible() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <h1 className="text-base font-semibold text-foreground">Este enlace no está disponible</h1>
        <p className="mt-1.5 text-sm text-muted-foreground max-w-xs leading-relaxed">
          Es posible que el enlace haya cambiado o ya no esté activo. Solicita uno nuevo a tu
          academia.
        </p>
      </div>
      <SipraFooter />
    </div>
  )
}

export function HistorialPublicoView({
  academia,
  alumnoNombre,
  estado,
  deuda,
  saldoAFavor,
  movimientos,
}: {
  academia: { nombre: string; logoUrl: string | null }
  alumnoNombre: string
  estado: EstadoFinancieroAlumno
  deuda: number
  saldoAFavor: number
  movimientos: MovimientoPublico[]
}) {
  const [expanded, setExpanded] = useState(false)
  const estadoDef = colorEstado(estado)

  const hayMas = movimientos.length > PREVIEW
  const visibles = expanded ? movimientos : movimientos.slice(0, PREVIEW)

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Encabezado institucional: logo + nombre de la academia */}
      <header className="bg-card border-b border-border">
        <div className="max-w-md mx-auto px-5 py-5 flex flex-col items-center text-center gap-2.5">
          {academia.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={academia.logoUrl}
              alt={academia.nombre}
              className="h-16 w-16 rounded-2xl object-cover shadow-sm ring-1 ring-border"
            />
          ) : (
            <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl font-black shadow-sm ring-1 ring-border">
              {iniciales(academia.nombre)}
            </div>
          )}
          <h1 className="text-lg font-bold text-foreground leading-tight">{academia.nombre}</h1>
        </div>
      </header>

      <main className="flex-1 w-full max-w-md mx-auto px-4 py-5 space-y-4">
        {/* Estado de cuenta: alumno + semáforo + saldo (dos líneas) */}
        <section className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Estado de cuenta
              </p>
              <h2 className="text-xl font-black text-foreground mt-1 leading-tight break-words">
                {alumnoNombre || 'Alumno'}
              </h2>
            </div>
            <span
              className="flex-shrink-0 text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full border"
              style={{
                color: estadoDef.hex,
                backgroundColor: `${estadoDef.hex}1A`,
                borderColor: `${estadoDef.hex}33`,
              }}
            >
              {estadoDef.label}
            </span>
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground font-medium">Saldo</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black leading-none" style={{ color: estadoDef.hex }}>
                {formatCurrency(deuda)}
              </span>
            </div>
            {saldoAFavor > 0 && (
              <p className="mt-2 text-xs font-semibold text-[#15435a] flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#15435a]" aria-hidden="true" />
                Saldo a favor: {formatCurrency(saldoAFavor)}
              </p>
            )}
            <p className="mt-3 text-[10px] text-muted-foreground/70 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Información actualizada en tiempo real
            </p>
          </div>
        </section>

        {/* Historial financiero (sólo movimientos financieros) */}
        <section className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center">
            <Receipt className="h-4 w-4 mr-2 text-muted-foreground" /> Historial de pagos
          </h3>

          {movimientos.length === 0 ? (
            <div className="text-center py-8 px-4">
              <Receipt className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                Aún no hay movimientos financieros registrados.
              </p>
            </div>
          ) : (
            <div>
              {visibles.map((m, i) => {
                const esUltimo = i === visibles.length - 1 && (expanded || !hayMas)
                return <EventoRow key={m.id} evento={m as unknown as EventoTimeline} isLast={esUltimo} />
              })}

              {hayMas && (
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 h-11 rounded-xl border border-border bg-muted/40 text-sm font-semibold text-foreground/80 hover:bg-muted transition-colors active:scale-[0.99]"
                >
                  {expanded ? (
                    <>
                      Ver menos <ChevronUp className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Ver movimientos anteriores <ChevronDown className="h-4 w-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </section>
      </main>

      <SipraFooter />
    </div>
  )
}
