'use client'

import * as React from 'react'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { crearCargoManual } from '@/app/(app)/seguimiento/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Zap } from 'lucide-react'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'

type Props = {
  alumnoId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Cargo único inmediato (taller temporal, uniforme, ensayo extra...).
 * Vence hoy y NO altera los planes recurrentes del alumno. Invoca crearCargoManual.
 */
export function CrearCargoUnicoDrawer({ alumnoId, open, onOpenChange }: Props) {
  const router = useRouter()
  const [concepto, setConcepto] = useState('')
  const [monto, setMonto] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const reset = () => {
    setConcepto('')
    setMonto('')
    setError(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const montoNum = Number(monto)
    if (!concepto.trim()) {
      setError('El concepto es obligatorio.')
      return
    }
    if (!Number.isFinite(montoNum) || montoNum <= 0) {
      setError('El monto debe ser mayor a 0.')
      return
    }

    startTransition(async () => {
      const res = await crearCargoManual(alumnoId, montoNum, concepto.trim())
      if (!res.success) {
        setError(res.message ?? 'No se pudo generar el cargo.')
        return
      }
      reset()
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Drawer
      open={open}
      onOpenChange={(v) => {
        if (!v) reset()
        onOpenChange(v)
      }}
    >
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" /> Cargo único
            </DrawerTitle>
            <DrawerDescription>
              Cargo inmediato (taller, uniforme, ensayo extra). Se suma al saldo del alumno y vence hoy.
            </DrawerDescription>
          </DrawerHeader>

          <form onSubmit={handleSubmit}>
            <div className="p-4 pb-0 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cargo_unico_concepto">Concepto *</Label>
                <Input
                  id="cargo_unico_concepto"
                  value={concepto}
                  onChange={(e) => setConcepto(e.target.value)}
                  required
                  className="h-11"
                  placeholder="Ej. Taller de verano, Uniforme, Ensayo extra..."
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cargo_unico_monto">Monto *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <Input
                    id="cargo_unico_monto"
                    type="number"
                    step="0.01"
                    min="0.01"
                    inputMode="decimal"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    required
                    className="h-11 pl-7"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
                  {error}
                </div>
              )}
            </div>

            <DrawerFooter>
              <Button type="submit" className="w-full h-11" disabled={pending}>
                {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                {pending ? 'Generando...' : 'Generar cargo único'}
              </Button>
              <DrawerClose asChild>
                <Button type="button" variant="outline" className="h-11">Cancelar</Button>
              </DrawerClose>
            </DrawerFooter>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
