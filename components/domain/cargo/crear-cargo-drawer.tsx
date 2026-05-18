'use client'

import * as React from 'react'
import { useActionState, useEffect, useState } from 'react'
import { crearCargoAction, type FormState } from '@/app/(app)/pendientes/actions'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, PlusCircle } from 'lucide-react'
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
    <Button type="submit" className="w-full h-11" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {pending ? 'Guardando...' : 'Asignar Cargo'}
    </Button>
  )
}

export function CrearCargoDrawer({ alumnos = [], open: controlledOpen, onOpenChange }: { alumnos: any[], open?: boolean, onOpenChange?: (open: boolean) => void }) {
  const [localOpen, setLocalOpen] = useState(false)
  const [state, formAction] = useActionState(crearCargoAction, initialState)

  const open = controlledOpen ?? localOpen
  const setOpen = onOpenChange ?? setLocalOpen

  useEffect(() => {
    if (state.success) {
      setOpen(false)
    }
  }, [state.success])

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      {controlledOpen === undefined && (
        <DrawerTrigger asChild>
          <Button className="h-14 w-14 rounded-full shadow-lg bg-indigo-600 hover:bg-indigo-700 fixed bottom-20 right-4 lg:static lg:h-10 lg:w-auto lg:rounded-lg lg:shadow-none z-40">
            <PlusCircle className="h-6 w-6 lg:mr-2 lg:h-4 lg:w-4" />
            <span className="hidden lg:inline">Nuevo Cargo</span>
          </Button>
        </DrawerTrigger>
      )}
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>Asignar Nuevo Cargo</DrawerTitle>
            <DrawerDescription>
              Registra una nueva mensualidad, inscripción o deuda.
            </DrawerDescription>
          </DrawerHeader>
          
          <form action={formAction}>
            <div className="p-4 pb-0 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="persona_id">Alumno *</Label>
                <Select name="persona_id" required>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Selecciona un alumno" />
                  </SelectTrigger>
                  <SelectContent>
                    {alumnos.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.nombre} {a.apellido}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {state?.errors?.persona_id && <p className="text-sm text-red-600">{state.errors.persona_id[0]}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="concepto">Concepto *</Label>
                <Input id="concepto" name="concepto" required className="h-11" placeholder="Ej. Mensualidad Diciembre" />
                {state?.errors?.concepto && <p className="text-sm text-red-600">{state.errors.concepto[0]}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="monto_original">Monto ($) *</Label>
                  <Input id="monto_original" name="monto_original" type="number" step="0.01" min="1" inputMode="decimal" required className="h-11 text-lg font-semibold" placeholder="500.00" />
                  {state?.errors?.monto_original && <p className="text-sm text-red-600">{state.errors.monto_original[0]}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fecha_vencimiento">Vence el *</Label>
                  {/* Uso de input nativo para mayor velocidad en móviles */}
                  <Input id="fecha_vencimiento" name="fecha_vencimiento" type="date" required className="h-11" />
                  {state?.errors?.fecha_vencimiento && <p className="text-sm text-red-600">{state.errors.fecha_vencimiento[0]}</p>}
                </div>
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
