'use client'

import * as React from 'react'
import { useActionState, useEffect, useState } from 'react'
import { registrarPagoAction, type FormState } from '@/app/(app)/inicio/actions'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Banknote, Landmark, CheckCircle2 } from 'lucide-react'
import { parseWholeMoneyInput, preventMoneyWheel } from '@/lib/utils/money-input'
import { cn } from '@/lib/utils'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import type { CargoConPersona } from '@/lib/types/domain'
import { useConfirmarPago } from './pago-confirmacion-provider'

const initialState: FormState = {}

function SubmitButton({ label, disabled }: { label: string; disabled?: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full h-14 text-lg font-bold bg-primary hover:bg-primary/90" disabled={pending || disabled}>
      {pending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
      {pending ? 'Procesando...' : label}
    </Button>
  )
}

interface RegistrarPagoDrawerProps {
  /** Modo single-cargo (lista de pendientes). */
  cargo?: CargoConPersona
  /** Modo saldo global del alumno (perfil). */
  personaId?: string
  personaNombre?: string
  cargoIds?: string[]
  saldoTotal?: number
  /** Bandera de la academia. Si false, no se permiten abonos parciales. */
  allowPartial?: boolean
  /** Bandera de la academia. Si false, no se permiten pagos mayores al saldo (saldo a favor). */
  allowOverpayment?: boolean
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function RegistrarPagoDrawer({
  cargo,
  personaId,
  personaNombre,
  cargoIds,
  saldoTotal,
  allowPartial = true,
  allowOverpayment = true,
  children,
  open: controlledOpen,
  onOpenChange,
}: RegistrarPagoDrawerProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen
  const setOpen = isControlled && onOpenChange ? onOpenChange : setUncontrolledOpen

  // Normalizar ambos modos
  const adeudo = cargo ? Number(cargo.saldo_pendiente) : Number(saldoTotal ?? 0)
  const ids = cargo ? [cargo.id] : (cargoIds ?? [])
  const pid = cargo ? cargo.persona_id : (personaId ?? '')
  const nombre = cargo
    ? `${cargo.persona?.nombre ?? '—'} ${cargo.persona?.apellido ?? ''}`.trim()
    : (personaNombre ?? '')

  const confirmarPago = useConfirmarPago()
  const [state, formAction] = useActionState(registrarPagoAction, initialState)
  const [idempotencyKey, setIdempotencyKey] = useState('')
  const [monto, setMonto] = useState<number | ''>(adeudo > 0 ? Math.round(adeudo) : '')
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'transferencia'>('efectivo')

  const montoNumerico = typeof monto === 'number' ? monto : 0
  const esCobroLibre = adeudo <= 0                       // sin deuda → anticipo puro
  const faltante = adeudo - montoNumerico                // >0 = aún debe
  const excedente = montoNumerico - adeudo               // >0 = saldo a favor
  const parcialBloqueado = !allowPartial && adeudo > 0 && montoNumerico < adeudo
  // Sobrepago (saldo a favor): excedente sobre deuda, o anticipo puro sin deuda.
  const saldoFavorBloqueado = !allowOverpayment && montoNumerico > Math.max(adeudo, 0)
  const montoInvalido = montoNumerico <= 0 || parcialBloqueado || saldoFavorBloqueado

  // El botón refleja la naturaleza del cobro.
  const esAbono = allowPartial && adeudo > 0 && montoNumerico > 0 && montoNumerico < adeudo
  const botonLabel = esCobroLibre ? 'Registrar cobro' : esAbono ? 'Registrar Abono' : 'Registrar Pago'

  // Reset al abrir: nuevo idempotency key + monto = adeudo actual (vacío si no hay deuda)
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        setIdempotencyKey(crypto.randomUUID())
        setMonto(adeudo > 0 ? Math.round(adeudo) : '')
        setMetodoPago('efectivo')
      }, 0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (state.success) {
      // Dispara la confirmación en el provider (estable, sobrevive el desmontaje
      // de esta tarjeta/drawer al revalidar) y cierra el drawer de cobro.
      if (pid) confirmarPago({ personaId: pid, monto: montoNumerico, alumnoNombre: nombre })
      setOpen(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success])

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      {children && <DrawerTrigger asChild>{children}</DrawerTrigger>}
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader className="text-left">
            <DrawerTitle className="flex items-center text-foreground">
              <Banknote className="mr-2 h-5 w-5 text-primary" /> Registrar cobro
            </DrawerTitle>
            <DrawerDescription>
              <strong>{nombre.toUpperCase()}</strong>
              {!cargo && (
                <span className="block text-xs mt-0.5">
                  {esCobroLibre
                    ? 'Sin adeudo: el cobro se registrará como saldo a favor.'
                    : `Saldo deudor actual: $${Math.round(adeudo)}`}
                </span>
              )}
            </DrawerDescription>
          </DrawerHeader>

          <form action={formAction}>
            <input type="hidden" name="cargo_ids" value={JSON.stringify(ids)} />
            <input type="hidden" name="persona_id" value={pid} />
            <input type="hidden" name="idempotency_key" value={idempotencyKey} />

            <div className="p-4 pb-0 space-y-5">
              <div className="space-y-3">
                <Label htmlFor="monto_pago" className="text-xs font-semibold text-muted-foreground tracking-wider">
                  Monto a cobrar ($)
                </Label>
                <Input
                  id="monto_pago"
                  name="monto_pago"
                  type="number"
                  step="1"
                  min="1"
                  value={monto}
                  onChange={(e) => setMonto(parseWholeMoneyInput(e.target.value))}
                  onWheel={preventMoneyWheel}
                  inputMode="numeric"
                  required
                  placeholder="0"
                  className="h-16 text-3xl font-bold text-center text-primary bg-primary/10 border-primary/20"
                />
                <div className="text-center mt-2 font-medium text-sm min-h-[20px]">
                  {saldoFavorBloqueado ? (
                    <span className="text-red-600">
                      {"La opción 'Permitir pagos mayores al saldo pendiente' está bloqueada en la configuración del sistema."}
                    </span>
                  ) : (
                    <>
                      {esCobroLibre && montoNumerico > 0 && (
                        <span className="text-[#15435a]">Se registrará como saldo a favor: ${Math.round(montoNumerico)}</span>
                      )}
                      {!esCobroLibre && faltante === 0 && montoNumerico > 0 && (
                        <span className="text-[#22887c] flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4 mr-1" /> El saldo quedará liquidado
                        </span>
                      )}
                      {!esCobroLibre && faltante > 0 && allowPartial && (
                        <span className="text-amber-600">Quedará pendiente: ${Math.round(faltante)}</span>
                      )}
                      {!esCobroLibre && faltante > 0 && !allowPartial && (
                        <span className="text-red-600">
                          {"La opción 'Permitir pagos parciales' está bloqueada en la configuración del sistema."}
                        </span>
                      )}
                      {!esCobroLibre && excedente > 0 && (
                        <span className="text-[#15435a]">Genera saldo a favor: ${Math.round(excedente)}</span>
                      )}
                    </>
                  )}
                </div>
                {state?.errors?.monto_pago && <p className="text-sm text-red-600 text-center">{state.errors.monto_pago[0]}</p>}
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-semibold text-muted-foreground tracking-wider">Método de pago</Label>
                <input type="hidden" name="metodo_pago" value={metodoPago} />
                <div className="grid grid-cols-2 p-1 bg-muted/60 dark:bg-muted/30 rounded-xl border border-border/40 select-none relative w-full h-12 items-center">
                  {/* Pastilla indicadora animada */}
                  <div
                    className={cn(
                      "absolute w-[47%] h-[80%] bg-white rounded-lg shadow-sm transition-all duration-300 ease-in-out border",
                      metodoPago === 'efectivo'
                        ? "left-1 border-[#22887c]"
                        : "left-[51.5%] border-primary"
                    )}
                  />

                  {/* Opción Efectivo */}
                  <button
                    type="button"
                    onClick={() => setMetodoPago('efectivo')}
                    className={cn(
                      "flex-1 h-9 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all z-10",
                      metodoPago === 'efectivo'
                        ? "text-[#22887c]"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Banknote className="h-4.5 w-4.5" />
                    <span>Efectivo</span>
                  </button>

                  {/* Opción Transferencia */}
                  <button
                    type="button"
                    onClick={() => setMetodoPago('transferencia')}
                    className={cn(
                      "flex-1 h-9 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all z-10",
                      metodoPago === 'transferencia'
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Landmark className="h-4.5 w-4.5" />
                    <span>Transferencia</span>
                  </button>
                </div>
                {state?.errors?.metodo_pago && <p className="text-sm text-destructive">{state.errors.metodo_pago[0]}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="nota" className="text-xs font-semibold text-muted-foreground tracking-wider">Nota (opcional)</Label>
                <Input id="nota" name="nota" className="h-11 text-sm leading-relaxed border-input bg-background focus-visible:ring-ring" />
              </div>

              {state?.message && !state.success && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
                  <p className="font-bold">{state.message}</p>
                </div>
              )}
            </div>

            <DrawerFooter className="mt-4">
              <SubmitButton label={botonLabel} disabled={montoInvalido} />
              <DrawerClose asChild>
                <Button variant="ghost" className="h-11 text-muted-foreground">Cancelar</Button>
              </DrawerClose>
            </DrawerFooter>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
