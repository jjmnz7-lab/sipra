'use client'

import * as React from 'react'
import { useActionState, useEffect, useState } from 'react'
import { crearAvisoGrupalAction, type FormState } from '@/app/(app)/grupos/actions'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Bell } from 'lucide-react'
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
      {pending ? 'Publicando...' : 'Publicar Aviso'}
    </Button>
  )
}

export function CrearAvisoDrawer({ grupoId }: { grupoId: string }) {
  const [open, setOpen] = useState(false)
  const [state, formAction] = useActionState(crearAvisoGrupalAction, initialState)

  useEffect(() => {
    if (state.success) {
      setOpen(false)
    }
  }, [state.success])

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button className="flex flex-col items-center justify-center bg-card border border-border rounded-xl p-3 hover:bg-accent hover:text-accent-foreground transition-colors">
          <Bell className="h-5 w-5 text-primary mb-1" />
          <span className="text-[10px] font-bold text-foreground">Nuevo aviso</span>
        </button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>Aviso Operativo</DrawerTitle>
            <DrawerDescription>
              Publica un evento no financiero en el historial de los alumnos de este grupo.
            </DrawerDescription>
          </DrawerHeader>
          
          <form action={formAction}>
            <input type="hidden" name="grupo_id" value={grupoId} />
            <div className="p-4 pb-0 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="titulo">Título del aviso</Label>
                <Input
                  id="titulo"
                  name="titulo"
                  placeholder="Ej. Ensayo general el viernes"
                  required
                  className="h-11"
                />
                {state?.errors?.titulo && (
                  <p className="text-sm text-red-600">{state.errors.titulo[0]}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="descripcion">Detalles (Opcional)</Label>
                <Textarea
                  id="descripcion"
                  name="descripcion"
                  placeholder="Traer uniforme completo."
                  className="resize-none"
                  rows={3}
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
