'use client'

import * as React from 'react'
import { useActionState, useEffect, useState } from 'react'
import { crearPersonaAction, type FormState } from '@/app/(app)/grupos/actions'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, UserPlus } from 'lucide-react'
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
      {pending ? 'Guardando...' : 'Guardar Alumno'}
    </Button>
  )
}

export function CrearPersonaDrawer({ grupos = [] }: { grupos: any[] }) {
  const [open, setOpen] = useState(false)
  const [state, formAction] = useActionState(crearPersonaAction, initialState)

  useEffect(() => {
    if (state.success) {
      setOpen(false)
    }
  }, [state.success])

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button className="h-14 w-14 rounded-full shadow-lg bg-indigo-600 hover:bg-indigo-700 fixed bottom-20 right-4 lg:static lg:h-10 lg:w-auto lg:rounded-lg lg:shadow-none">
          <UserPlus className="h-6 w-6 lg:mr-2 lg:h-4 lg:w-4" />
          <span className="hidden lg:inline">Nuevo Alumno</span>
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>Agregar Alumno</DrawerTitle>
            <DrawerDescription>
              Registra a un nuevo alumno en tu academia.
            </DrawerDescription>
          </DrawerHeader>
          
          <form action={formAction}>
            <div className="p-4 pb-0 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input id="nombre" name="nombre" required className="h-11" />
                  {state?.errors?.nombre && <p className="text-sm text-red-600">{state.errors.nombre[0]}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apellido">Apellido</Label>
                  <Input id="apellido" name="apellido" className="h-11" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefono_whatsapp">Teléfono (WhatsApp)</Label>
                <Input id="telefono_whatsapp" name="telefono_whatsapp" type="tel" className="h-11" placeholder="Ej. 5512345678" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="grupo_id">Inscribir a grupo (opcional)</Label>
                <Select name="grupo_id" defaultValue="none">
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Selecciona un grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin grupo asignado</SelectItem>
                    {grupos.map(g => (
                      <SelectItem key={g.id} value={g.id}>{g.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
