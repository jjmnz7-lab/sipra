'use client'

import * as React from 'react'
import { useActionState, useEffect, useState, useMemo } from 'react'
import { aplicarDescuentoAction, type FormState } from '@/app/(app)/seguimiento/actions'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
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

const initialState: FormState = {}

function SubmitButton({ label, disabled }: { label: string; disabled?: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      className="w-full h-14 text-lg font-bold bg-[#22887c] hover:bg-[#1a6b62]"
      disabled={pending || disabled}
    >
      {pending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
      {pending ? 'Aplicando...' : label}
    </Button>
  )
}

type Cargo = {
  id: string
  concepto: string
  monto_original: number | string
  saldo_pendiente: number | string
  fecha_vencimiento?: string | null
}

interface AplicarDescuentoDrawerProps {
  personaId: string
  personaNombre: string
  cargos: Cargo[]
  saldoTotal: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (msg: string) => void
}

export function AplicarDescuentoDrawer({
  personaId,
  personaNombre,
  cargos,
  saldoTotal,
  open,
  onOpenChange,
  onSuccess,
}: AplicarDescuentoDrawerProps) {
  const [state, formAction] = useActionState(aplicarDescuentoAction, initialState)
  const [idempotencyKey, setIdempotencyKey] = useState('')
  const [monto, setMonto] = useState<string>('')
  const [concepto, setConcepto] = useState<string>('')
  const [selectedOption, setSelectedOption] = useState<'total' | string>('total')

  const prevState = React.useRef(state)

  useEffect(() => {
    if (open) {
      prevState.current = state
      setIdempotencyKey(crypto.randomUUID())
      setMonto('')
      setConcepto('')
      setSelectedOption('total')
    }
  }, [open, state])

  useEffect(() => {
    if (state !== prevState.current) {
      prevState.current = state
      if (state.success && open) {
        onOpenChange(false)
        onSuccess?.('Descuento aplicado')
      }
    }
  }, [state, open, onOpenChange, onSuccess])

  const selectedLimit = useMemo(() => {
    if (selectedOption === 'total') {
      return saldoTotal
    }
    const c = cargos.find((cargo) => cargo.id === selectedOption)
    return c ? Number(c.saldo_pendiente) : 0
  }, [selectedOption, cargos, saldoTotal])

  const montoNum = Number(monto) || 0
  const isMontoExcedido = montoNum > selectedLimit
  const isMontoInvalido = montoNum <= 0 || isMontoExcedido || !concepto.trim()

  const selectedCargoIds = useMemo(() => {
    if (selectedOption === 'total') {
      return cargos.map((c) => c.id)
    }
    return [selectedOption]
  }, [selectedOption, cargos])

  const needsScroll = cargos.length + 1 > 4

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader className="text-left">
            <DrawerTitle className="flex items-center text-[#22887c]">
              <div className="h-5 w-5 mr-2 flex items-center justify-center font-extrabold text-sm select-none">
                <span>$</span>
                <span className="text-xs mt-1 -ml-0.5">↓</span>
              </div>
              Aplicar descuento
            </DrawerTitle>
            <DrawerDescription>
              Aplica un ajuste de descuento al saldo de <strong>{personaNombre}</strong>.
            </DrawerDescription>
          </DrawerHeader>

          <form action={formAction}>
            <input type="hidden" name="persona_id" value={personaId} />
            <input type="hidden" name="idempotency_key" value={idempotencyKey} />
            <input type="hidden" name="cargo_ids" value={JSON.stringify(selectedCargoIds)} />

            <div className="p-4 pb-0 space-y-4">
              {/* Selector de cargos a aplicar */}
              <div className="space-y-2">
                <Label>Selecciona a qué aplicar el descuento *</Label>
                <div className="border border-border rounded-lg overflow-hidden bg-muted/10">
                  <div className={cn("overflow-y-auto", needsScroll ? "max-h-[170px]" : "")}>
                    {/* First item: Saldo total (no sticky) */}
                    <div className="bg-background border-b border-border">
                      <button
                        type="button"
                        onClick={() => setSelectedOption('total')}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2.5 text-sm transition-colors text-left",
                          selectedOption === 'total' ? "bg-primary/10 text-primary font-semibold" : "hover:bg-accent"
                        )}
                      >
                        <span className="truncate underline">Saldo total</span>
                        <span className="font-bold shrink-0 ml-2">{formatCurrency(saldoTotal)}</span>
                      </button>
                    </div>
                    {/* Rest of items */}
                    <div className="divide-y divide-border/50">
                      {cargos.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setSelectedOption(c.id)}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-2.5 text-sm transition-colors text-left",
                            selectedOption === c.id ? "bg-primary/10 text-primary font-semibold" : "hover:bg-accent"
                          )}
                        >
                          <span className="truncate">{c.concepto}</span>
                          <span className="font-bold shrink-0 ml-2">{formatCurrency(Number(c.saldo_pendiente))}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Monto a descontar */}
              <div className="space-y-2">
                <Label htmlFor="monto_descuento">Monto a descontar *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <Input
                    id="monto_descuento"
                    name="monto"
                    type="number"
                    step="1"
                    min="1"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    required
                    className={cn(
                      "h-11 pl-7",
                      isMontoExcedido && "border-destructive focus-visible:ring-destructive"
                    )}
                    placeholder="Monto"
                  />
                </div>
                {isMontoExcedido && (
                  <p className="text-xs text-destructive">
                    El descuento no puede ser mayor que el saldo seleccionado ({formatCurrency(selectedLimit)}).
                  </p>
                )}
              </div>

              {/* Concepto o motivo */}
              <div className="space-y-2">
                <Label htmlFor="concepto_descuento">Concepto o motivo *</Label>
                <Input
                  id="concepto_descuento"
                  name="concepto"
                  value={concepto}
                  onChange={(e) => setConcepto(e.target.value)}
                  required
                  className="h-11"
                  placeholder="Ej. Beca de fútbol, Ajuste de mensualidad..."
                />
              </div>

              {/* Errores del Server Action */}
              {state?.message && !state.success && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
                  {state.message}
                </div>
              )}
            </div>

            <DrawerFooter>
              <SubmitButton label="Aplicar descuento" disabled={isMontoInvalido} />
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
