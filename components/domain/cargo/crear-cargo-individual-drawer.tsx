'use client'

import * as React from 'react'
import { useActionState, useEffect, useState } from 'react'
import { crearCargoIndividualAction, type FormState } from '@/app/(app)/seguimiento/actions'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { normalizeWholeMoneyInput, preventMoneyWheel } from '@/lib/utils/money-input'
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

const initialState: FormState = {}

type Props = {
  personaId: string
  children?: React.ReactNode
  /** Si se pasa, modo controlado externo (el componente padre maneja el estado). */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Pre-fills opcionales (ej: "Inscripción" + monto del grupo). */
  conceptoDefault?: string
  montoDefault?: number
  /** Para diferenciar origen del cargo en BD (default: 'manual'). */
  origen?: string
  tituloDrawer?: string
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full h-11" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {pending ? 'Generando...' : 'Generar cargo'}
    </Button>
  )
}



export function CrearCargoIndividualDrawer({
  personaId,
  children,
  open: openProp,
  onOpenChange,
  conceptoDefault = '',
  montoDefault,
  origen = 'manual',
  tituloDrawer = 'Nuevo cargo',
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = openProp !== undefined
  const open = isControlled ? openProp : internalOpen
  const setOpen = (v: boolean) => {
    if (isControlled) onOpenChange?.(v)
    else setInternalOpen(v)
  }

  const [state, formAction] = useActionState(crearCargoIndividualAction, initialState)

  useEffect(() => {
    if (state.success) setOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success])

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      {children && <DrawerTrigger asChild>{children}</DrawerTrigger>}
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>{tituloDrawer}</DrawerTitle>
            <DrawerDescription>
              Generará un cargo individual para este alumno.
            </DrawerDescription>
          </DrawerHeader>

          <form action={formAction}>
            <input type="hidden" name="persona_id" value={personaId} />
            <input type="hidden" name="origen" value={origen} />

            <div className="p-4 pb-0 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="concepto">Concepto *</Label>
                <Input
                  id="concepto"
                  name="concepto"
                  defaultValue={conceptoDefault}
                  required
                  className="h-11"
                  placeholder="Ej. Examen, Uniforme, Material..."
                />
                {state?.errors?.concepto && <p className="text-sm text-red-600">{state.errors.concepto[0]}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="monto">Monto *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <Input
                    id="monto"
                    name="monto"
                    type="number"
                    step="1"
                    min="1"
                    defaultValue={montoDefault != null ? String(Math.round(montoDefault)) : ''}
                    required
                    onChange={(e) => {
                      e.currentTarget.value = normalizeWholeMoneyInput(e.currentTarget.value)
                    }}
                    onWheel={preventMoneyWheel}
                    inputMode="numeric"
                    placeholder="0"
                    className="h-11 pl-7"
                  />
                </div>
                {state?.errors?.monto && <p className="text-sm text-red-600">{state.errors.monto[0]}</p>}
              </div>

              {state?.message && !state.success && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
                  {state.message}
                </div>
              )}
            </div>

            <DrawerFooter>
              <SubmitButton />
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
