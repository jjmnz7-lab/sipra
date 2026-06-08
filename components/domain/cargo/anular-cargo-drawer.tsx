'use client'

import * as React from 'react'
import { useActionState, useEffect } from 'react'
import { anularCargoAction, type FormState } from '@/app/(app)/seguimiento/actions'
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
} from '@/components/ui/drawer'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const initialState: FormState = {}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant="destructive" className="w-full h-11" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {pending ? 'Anulando...' : 'Anular cargo'}
    </Button>
  )
}

type Cargo = {
  id: string
  concepto: string
  monto_original: number | string
  saldo_pendiente: number | string
  estado_financiero: string
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  cargos: Cargo[]
}

export function AnularCargoDrawer({ open, onOpenChange, cargos }: Props) {
  const [state, formAction] = useActionState(anularCargoAction, initialState)
  const [selectedId, setSelectedId] = React.useState<string>('')

  const cargosAnulables = cargos.filter(c => c.estado_financiero !== 'liquidado' && c.estado_financiero !== 'anulado')
  const cargoSeleccionado = cargosAnulables.find(c => c.id === selectedId)

  useEffect(() => {
    if (state.success) {
      onOpenChange(false)
      setSelectedId('')
    }
  }, [state.success, onOpenChange])

  useEffect(() => {
    if (!open) setSelectedId('')
  }, [open])

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader className="text-left">
            <DrawerTitle className="flex items-center text-destructive">
              <AlertTriangle className="mr-2 h-5 w-5" /> Anular cargo
            </DrawerTitle>
            <DrawerDescription>
              El cargo se marcará como anulado y dejará de contar en la deuda.
            </DrawerDescription>
          </DrawerHeader>

          <form action={formAction}>
            <input type="hidden" name="cargo_id" value={selectedId} />

            <div className="p-4 pb-0 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cargo_select">Cargo a anular *</Label>
                {cargosAnulables.length === 0 ? (
                  <div className="p-3 bg-muted/50 text-sm text-muted-foreground rounded-md border border-border">
                    No hay cargos pendientes que se puedan anular.
                  </div>
                ) : (
                  <Select value={selectedId} onValueChange={setSelectedId}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Selecciona un cargo" />
                    </SelectTrigger>
                    <SelectContent>
                      {cargosAnulables.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.concepto} · {formatCurrency(Number(c.saldo_pendiente))}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {cargoSeleccionado && (
                <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-md text-sm">
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">Concepto:</span> {cargoSeleccionado.concepto}
                  </p>
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">Monto original:</span>{' '}
                    {formatCurrency(Number(cargoSeleccionado.monto_original))}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="motivo">Motivo de anulación *</Label>
                <Input
                  id="motivo"
                  name="motivo"
                  required
                  className="h-11 border-destructive/30 focus-visible:ring-destructive"
                  placeholder="Ej. Cargo duplicado, error de captura..."
                />
                <p className="text-xs text-muted-foreground">Esta acción quedará registrada en el historial.</p>
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
