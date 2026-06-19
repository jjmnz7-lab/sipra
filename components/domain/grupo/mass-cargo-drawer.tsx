'use client'

import * as React from 'react'
import { useActionState, useEffect, useState } from 'react'
import { crearCargoGrupalAction, type FormState } from '@/app/(app)/grupos/actions'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Banknote } from 'lucide-react'
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

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full h-11" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {pending ? 'Procesando cargos...' : 'Generar Cargos'}
    </Button>
  )
}

interface MassCargoDrawerProps {
  grupoId: string
  inscripciones: any[]
  /** Controlado desde el padre (opcional). Si se omite, el drawer se autocontrola y renderiza su trigger por defecto. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Se llama al generar los cargos con éxito (para mostrar un toast desde el padre). */
  onSuccess?: (msg: string) => void
}

export function MassCargoDrawer({ grupoId, inscripciones, open: controlledOpen, onOpenChange, onSuccess }: MassCargoDrawerProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen
  const setOpen = isControlled && onOpenChange ? onOpenChange : setUncontrolledOpen
  const [state, formAction] = useActionState(crearCargoGrupalAction, initialState)
  
  // Por defecto todos los alumnos están marcados para el cobro
  const allIds = inscripciones.map(i => i.persona.id)
  const [selectedIds, setSelectedIds] = useState<string[]>(allIds)
  const [idempotencyKey, setIdempotencyKey] = useState('')

  useEffect(() => {
    if (open) {
      setSelectedIds(inscripciones.map(i => i.persona.id))
      // Generar una llave de idempotencia nueva en cada apertura del cajón
      setIdempotencyKey(crypto.randomUUID())
    }
  }, [open, inscripciones])

  useEffect(() => {
    if (!state.success) return
    onSuccess?.(state.message ?? 'Cargos generados con éxito.')
    setOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success])

  const togglePersona = (id: string, isChecked: boolean) => {
    if (isChecked) {
      setSelectedIds(prev => [...prev, id])
    } else {
      setSelectedIds(prev => prev.filter(x => x !== id))
    }
  }

  const excludedIds = allIds.filter(id => !selectedIds.includes(id))

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DrawerTrigger asChild>
          <button className="flex flex-col items-center justify-center bg-card border border-border rounded-xl p-3 hover:bg-accent hover:text-accent-foreground transition-colors">
            <Banknote className="h-5 w-5 text-primary mb-1" />
            <span className="text-[10px] font-bold text-foreground">Nuevo cargo</span>
          </button>
        </DrawerTrigger>
      )}
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>Cargo Masivo</DrawerTitle>
            <DrawerDescription>
              Aplica un cargo a todos los miembros seleccionados.
            </DrawerDescription>
          </DrawerHeader>
          
          <form action={formAction}>
            <input type="hidden" name="grupo_id" value={grupoId} />
            <input type="hidden" name="excluded_persona_ids" value={JSON.stringify(excludedIds)} />
            <input type="hidden" name="idempotency_key" value={idempotencyKey} />

            <div className="p-4 pb-0 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <Label htmlFor="concepto">Concepto</Label>
                <Input
                  id="concepto"
                  name="concepto"
                  placeholder="Ej. Inscripción torneo"
                  required
                  className="h-11"
                />
                {state?.errors?.concepto && (
                  <p className="text-sm text-red-600">{state.errors.concepto[0]}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="monto">Monto ($)</Label>
                <Input
                  id="monto"
                  name="monto"
                  type="number"
                  step="1"
                  min="1"
                  placeholder="0"
                  required
                  onWheel={preventMoneyWheel}
                  onChange={(e) => {
                    e.currentTarget.value = normalizeWholeMoneyInput(e.currentTarget.value)
                  }}
                  className="h-11"
                />
                {state?.errors?.monto && (
                  <p className="text-sm text-red-600">{state.errors.monto[0]}</p>
                )}
              </div>

              <div className="mt-4 border-t pt-4">
                <Label className="mb-2 block">Aplicar a ({selectedIds.length}/{allIds.length})</Label>
                <div className="space-y-2">
                  {inscripciones.map((ins) => (
                    <div key={ins.persona.id} className="flex items-center space-x-2 bg-muted/30 border border-border p-2 rounded-md">
                      <Checkbox 
                        id={`chk-${ins.persona.id}`} 
                        checked={selectedIds.includes(ins.persona.id)}
                        onCheckedChange={(checked) => togglePersona(ins.persona.id, checked as boolean)}
                      />
                      <label 
                        htmlFor={`chk-${ins.persona.id}`} 
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 truncate cursor-pointer"
                      >
                        {ins.persona.nombre} {ins.persona.apellido}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {state?.message && !state.success && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
                  {state.message}
                </div>
              )}
            </div>
            
            <DrawerFooter className="mt-2">
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
