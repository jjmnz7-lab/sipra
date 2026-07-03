'use client'

import * as React from 'react'
import { useActionState, useEffect, useState } from 'react'
import { crearNotaAction, type FormState } from '@/app/(app)/seguimiento/actions'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2, FileText } from 'lucide-react'
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
    <Button type="submit" className="w-full h-11 bg-[#15435a] hover:bg-[#0f3245]" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {pending ? 'Guardando...' : 'Guardar Nota'}
    </Button>
  )
}

export function CrearNotaDrawer({ 
  personaId, 
  children,
  open: controlledOpen,
  onOpenChange
}: { 
  personaId: string, 
  children?: React.ReactNode,
  open?: boolean,
  onOpenChange?: (open: boolean) => void 
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen
  const setOpen = isControlled && onOpenChange ? onOpenChange : setUncontrolledOpen

  const [state, formAction] = useActionState(crearNotaAction, initialState)

  const prevState = React.useRef(state)

  useEffect(() => {
    if (open) prevState.current = state
  }, [open, state])

  useEffect(() => {
    if (state !== prevState.current) {
      prevState.current = state
      if (state.success && open) {
        setOpen(false)
      }
    }
  }, [state, open, setOpen])

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      {children && (
        <DrawerTrigger asChild>
          {children}
        </DrawerTrigger>
      )}
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle className="flex items-center text-[#0f3245]">
              <FileText className="mr-2 h-5 w-5" /> Agregar Nota
            </DrawerTitle>
            <DrawerDescription>
              Escribe un comentario o apunte sobre el seguimiento de esta persona.
            </DrawerDescription>
          </DrawerHeader>
          
          <form action={formAction}>
            <input type="hidden" name="persona_id" value={personaId} />

            <div className="p-4 pb-0 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contenido">Contenido de la nota *</Label>
                <Textarea 
                  id="contenido" 
                  name="contenido" 
                  required 
                  className="min-h-[100px] focus-visible:ring-[#15435a]" 
                  placeholder="Ej. El papá llamó para avisar que..." 
                />
                {state?.errors?.contenido && <p className="text-sm text-red-600">{state.errors.contenido[0]}</p>}
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
