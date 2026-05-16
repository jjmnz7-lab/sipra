'use client'

import * as React from 'react'
import { useActionState, useEffect, useState } from 'react'
import { registrarPagoAction, type FormState } from '@/app/(app)/pendientes/actions'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Banknote } from 'lucide-react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const initialState: FormState = {}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full h-14 text-lg font-bold bg-emerald-600 hover:bg-emerald-700" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
      {pending ? 'Procesando...' : 'Confirmar Pago'}
    </Button>
  )
}

export function RegistrarPagoDrawer({ cargo, children }: { cargo: any, children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [state, formAction] = useActionState(registrarPagoAction, initialState)
  const [idempotencyKey, setIdempotencyKey] = useState('')

  useEffect(() => {
    if (open) {
      // Generamos un idempotency_key cada vez que se abre el modal para evitar dobles cobros
      setIdempotencyKey(crypto.randomUUID())
    }
  }, [open])

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
          <DrawerHeader className="text-left">
            <DrawerTitle className="flex items-center text-emerald-700">
              <Banknote className="mr-2 h-5 w-5" /> Registrar Pago
            </DrawerTitle>
            <DrawerDescription>
              Cobro a <strong>{cargo.persona.nombre} {cargo.persona.apellido}</strong> por {cargo.concepto}.
            </DrawerDescription>
          </DrawerHeader>
          
          <form action={formAction}>
            <input type="hidden" name="cargo_id" value={cargo.id} />
            <input type="hidden" name="persona_id" value={cargo.persona_id} />
            <input type="hidden" name="idempotency_key" value={idempotencyKey} />

            <div className="p-4 pb-0 space-y-5">
              
              <div className="space-y-3">
                <Label htmlFor="monto_pago" className="text-sm font-semibold text-slate-700">Monto a cobrar ($)</Label>
                <Input 
                  id="monto_pago" 
                  name="monto_pago" 
                  type="number" 
                  step="0.01" 
                  min="1" 
                  max={cargo.saldo_pendiente}
                  defaultValue={cargo.saldo_pendiente}
                  inputMode="decimal" 
                  required 
                  className="h-16 text-3xl font-bold text-center text-emerald-700 bg-emerald-50 border-emerald-200" 
                />
                <p className="text-xs text-center text-slate-500">Saldo pendiente: ${cargo.saldo_pendiente}</p>
                {state?.errors?.monto_pago && <p className="text-sm text-red-600 text-center">{state.errors.monto_pago[0]}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="metodo_pago">Método de Pago</Label>
                <Select name="metodo_pago" defaultValue="efectivo" required>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Selecciona el método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="transferencia">Transferencia</SelectItem>
                    <SelectItem value="tarjeta">Tarjeta</SelectItem>
                    <SelectItem value="deposito">Depósito</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
                {state?.errors?.metodo_pago && <p className="text-sm text-red-600">{state.errors.metodo_pago[0]}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="referencia">Referencia / Folio (opcional)</Label>
                <Input id="referencia" name="referencia" className="h-11" placeholder="Ej. Terminación 4590" />
              </div>

              {state?.message && !state.success && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
                  {state.message}
                </div>
              )}
            </div>
            
            <DrawerFooter className="mt-4">
              <SubmitButton />
              <DrawerClose asChild>
                <Button variant="ghost" className="h-11 text-slate-500">Cancelar</Button>
              </DrawerClose>
            </DrawerFooter>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
