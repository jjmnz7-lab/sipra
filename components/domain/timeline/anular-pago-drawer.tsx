'use client'

import * as React from 'react'
import { useActionState, useEffect, useState } from 'react'
import { anularPagoAction, type FormState } from '@/app/(app)/seguimiento/actions'
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
  DrawerTrigger,
} from '@/components/ui/drawer'

const initialState: FormState = {}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant="destructive" className="w-full h-11" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {pending ? 'Anulando...' : 'Sí, anular pago'}
    </Button>
  )
}

export function AnularPagoDrawer({ 
  movimientoId, 
  monto, 
  children 
}: { 
  movimientoId: string, 
  monto: number,
  children: React.ReactNode 
}) {
  const [open, setOpen] = useState(false)
  const [state, formAction] = useActionState(anularPagoAction, initialState)

  useEffect(() => {
    if (state.success) {
      setOpen(false)
    }
  }, [state.success])

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        {children}
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle className="flex items-center text-red-600">
              <AlertTriangle className="mr-2 h-5 w-5" /> Advertencia
            </DrawerTitle>
            <DrawerDescription>
              Estás a punto de anular un pago de <strong>{formatCurrency(monto)}</strong>. 
              La deuda volverá a estar pendiente.
            </DrawerDescription>
          </DrawerHeader>
          
          <form action={formAction}>
            <input type="hidden" name="movimiento_id" value={movimientoId} />

            <div className="p-4 pb-0 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="motivo">Motivo de anulación *</Label>
                <Input 
                  id="motivo" 
                  name="motivo" 
                  required 
                  className="h-11 border-red-200 focus-visible:ring-red-500" 
                  placeholder="Ej. Me equivoqué de alumno" 
                />
                <p className="text-xs text-muted-foreground">
                  Esta acción quedará registrada en el historial.
                </p>
                {state?.errors?.motivo && <p className="text-sm text-red-600">{state.errors.motivo[0]}</p>}
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
