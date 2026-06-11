'use client'

import * as React from 'react'
import { useActionState, useEffect, useRef } from 'react'
import { anularCargoAction, anularPagoAction, type FormState } from '@/app/(app)/seguimiento/actions'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, AlertTriangle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'

const initialState: FormState = {}

export type AnularTarget =
  | { kind: 'cargo'; cargoId: string; monto: number | null; concepto: string }
  | { kind: 'pago'; movimientoId: string; monto: number | null }

function SubmitButton({ kind }: { kind: 'cargo' | 'pago' }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant="destructive" className="w-full h-11" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {pending ? 'Anulando...' : kind === 'pago' ? 'Sí, anular pago' : 'Sí, anular cargo'}
    </Button>
  )
}

/**
 * Drawer de anulación lanzado desde una fila del historial (cargo o pago
 * específico, sin selector). La validación de estado (ya anulado, con pagos
 * aplicados, etc.) la hace la server action.
 */
export function AnularEventoDrawer({
  open,
  onOpenChange,
  target,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  target: AnularTarget | null
  onSuccess?: () => void
}) {
  const [cargoState, cargoFormAction] = useActionState(anularCargoAction, initialState)
  const [pagoState, pagoFormAction] = useActionState(anularPagoAction, initialState)

  const state = target?.kind === 'pago' ? pagoState : cargoState

  // useActionState conserva el último resultado entre aperturas: sólo se
  // reacciona a transiciones de estado ocurridas con el drawer abierto.
  const prevState = useRef(state)

  useEffect(() => {
    if (open) prevState.current = state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, target])

  useEffect(() => {
    if (state !== prevState.current) {
      prevState.current = state
      if (state.success && open) {
        onOpenChange(false)
        onSuccess?.()
      }
    }
  }, [state, open, onOpenChange, onSuccess])

  if (!target) return null

  const esPago = target.kind === 'pago'

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader className="text-left">
            <DrawerTitle className="flex items-center text-destructive">
              <AlertTriangle className="mr-2 h-5 w-5" /> {esPago ? 'Anular pago' : 'Anular cargo'}
            </DrawerTitle>
            <DrawerDescription>
              {esPago ? (
                <>
                  Estás a punto de anular un pago
                  {target.monto != null && <> de <strong>{formatCurrency(target.monto)}</strong></>}.
                  La deuda volverá a estar pendiente.
                </>
              ) : (
                <>
                  Se anulará el cargo{' '}
                  <strong>{(target as Extract<AnularTarget, { kind: 'cargo' }>).concepto}</strong>
                  {target.monto != null && <> por <strong>{formatCurrency(target.monto)}</strong></>}{' '}
                  y dejará de contar en la deuda.
                </>
              )}
            </DrawerDescription>
          </DrawerHeader>

          <form action={esPago ? pagoFormAction : cargoFormAction}>
            {esPago ? (
              <input type="hidden" name="movimiento_id" value={(target as Extract<AnularTarget, { kind: 'pago' }>).movimientoId} />
            ) : (
              <input type="hidden" name="cargo_id" value={(target as Extract<AnularTarget, { kind: 'cargo' }>).cargoId} />
            )}

            <div className="p-4 pb-0 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="motivo">Motivo de anulación *</Label>
                <Input
                  id="motivo"
                  name="motivo"
                  required
                  className="h-11 border-destructive/30 focus-visible:ring-destructive"
                  placeholder={esPago ? 'Ej. Me equivoqué de alumno' : 'Ej. Cargo duplicado, error de captura...'}
                />
                <p className="text-xs text-muted-foreground">Esta acción quedará registrada en el historial.</p>
                {state?.errors?.motivo && <p className="text-sm text-red-600">{state.errors.motivo[0]}</p>}
              </div>

              {state?.message && !state.success && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
                  {state.message}
                </div>
              )}
            </div>

            <DrawerFooter>
              <SubmitButton kind={target.kind} />
              <DrawerClose asChild>
                <Button variant="outline" className="h-11">Cancelar</Button>
              </DrawerClose>
            </DrawerFooter>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
