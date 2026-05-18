'use client'

import * as React from 'react'
import { useActionState, useEffect, useState } from 'react'
import { crearPromesaAction, type FormState } from '@/app/(app)/seguimiento/actions'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2, Calendar } from 'lucide-react'
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
    <Button type="submit" className="w-full h-11 bg-amber-600 hover:bg-amber-700" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {pending ? 'Guardando...' : 'Guardar Promesa'}
    </Button>
  )
}

export function CrearPromesaDrawer({ 
  personaId, 
  children 
}: { 
  personaId: string, 
  children: React.ReactNode 
}) {
  const [open, setOpen] = useState(false)
  const [state, formAction] = useActionState(crearPromesaAction, initialState)

  useEffect(() => {
    if (state.success) {
      setOpen(false)
    }
  }, [state.success])

  // Obtener fecha de hoy en formato YYYY-MM-DD para el min del input date
  const hoy = new Date().toISOString().split('T')[0]

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        {children}
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle className="flex items-center text-amber-700">
              <Calendar className="mr-2 h-5 w-5" /> Registrar Promesa de Pago
            </DrawerTitle>
            <DrawerDescription>
              Registra la fecha en la que el cliente se comprometió a pagar.
            </DrawerDescription>
          </DrawerHeader>
          
          <form action={formAction}>
            <input type="hidden" name="persona_id" value={personaId} />

            <div className="p-4 pb-0 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fecha_promesa">Fecha de pago prometida *</Label>
                <Input 
                  id="fecha_promesa" 
                  name="fecha_promesa" 
                  type="date" 
                  min={hoy}
                  required 
                  className="h-11 focus-visible:ring-amber-500" 
                />
                {state?.errors?.fecha_promesa && <p className="text-sm text-red-600">{state.errors.fecha_promesa[0]}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="comentario">Comentario / Detalles *</Label>
                <Textarea 
                  id="comentario" 
                  name="comentario" 
                  required 
                  className="min-h-[80px] focus-visible:ring-amber-500" 
                  placeholder="Ej. Prometió pagar la mitad el viernes y el resto el lunes." 
                />
                {state?.errors?.comentario && <p className="text-sm text-red-600">{state.errors.comentario[0]}</p>}
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
