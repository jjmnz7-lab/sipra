'use client'

import * as React from 'react'
import { useActionState, useEffect, useState } from 'react'
import { crearGrupoAction, type FormState } from '@/app/(app)/grupos/actions'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Plus } from 'lucide-react'
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
    <Button type="submit" className="w-full h-11" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {pending ? 'Creando...' : 'Guardar Grupo'}
    </Button>
  )
}

export function CrearGrupoDrawer() {
  const [open, setOpen] = useState(false)
  const [state, formAction] = useActionState(crearGrupoAction, initialState)

  useEffect(() => {
    if (state.success) {
      setOpen(false)
      // Idealmente mostrar un toast aquí
    }
  }, [state.success])

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline" className="h-10 border-dashed border-2 border-slate-300 text-slate-600 bg-slate-50 hover:bg-slate-100">
          <Plus className="mr-2 h-4 w-4" /> Nuevo Grupo
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>Crear nuevo grupo</DrawerTitle>
            <DrawerDescription>
              Agrega una nueva disciplina o clase a tu academia.
            </DrawerDescription>
          </DrawerHeader>
          
          <form action={formAction}>
            <div className="p-4 pb-0 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre del grupo</Label>
                <Input
                  id="nombre"
                  name="nombre"
                  placeholder="Ej. Ballet Inicial"
                  required
                  className="h-11"
                />
                {state?.errors?.nombre && (
                  <p className="text-sm text-red-600">{state.errors.nombre[0]}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción (opcional)</Label>
                <Textarea
                  id="descripcion"
                  name="descripcion"
                  placeholder="Lunes y Miércoles 4:00 PM"
                  className="resize-none"
                />
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
