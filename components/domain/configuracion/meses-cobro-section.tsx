'use client'

import * as React from 'react'
import { useMemo, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { CalendarDays, Pencil } from 'lucide-react'
import { DirtyFooter } from '@/components/domain/configuracion/dirty-footer'
import { useDirtySection } from '@/components/domain/configuracion/use-dirty-section'
import { useToast } from '@/components/ui/use-toast'
import { guardarMesesCobroAction } from '@/app/(app)/configuracion/actions'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function resumen(meses: number[]): string {
  if (meses.length === 0) return 'Se generan cargos los 12 meses del año.'
  const nombres = [...meses].sort((a, b) => a - b).map((m) => MESES[m - 1])
  return `Sin cobro en: ${nombres.join(', ')}.`
}

export function MesesCobroSection({ initialMeses }: { initialMeses: number[] }) {
  const initial = useMemo(() => ({ meses: [...initialMeses].sort((a, b) => a - b) }), [initialMeses])
  const [meses, setMeses] = useState<number[]>(initial.meses)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const { showToast, toast } = useToast()

  const current = { meses }
  const { dirty, snapshot, commitSnapshot } = useDirtySection(current, initial)

  const toggleMes = (m: number) => {
    setMeses((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m].sort((a, b) => a - b)))
  }

  const onCancel = () => { setMeses(snapshot.meses); setError(null) }

  const onSave = () => {
    setError(null)
    startTransition(async () => {
      const res = await guardarMesesCobroAction(meses)
      if (!res.success) { setError(res.message ?? 'No se pudo guardar.'); return }
      commitSnapshot()
      showToast('Meses de cobro guardados.')
    })
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Meses de cobro</p>

      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="w-full flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-card text-left hover:bg-accent transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <CalendarDays className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm text-foreground">{resumen(meses)}</span>
        </div>
        <span className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground flex-shrink-0">
          <Pencil className="h-4 w-4" />
        </span>
      </button>

      <DirtyFooter dirty={dirty} pending={isPending} onCancel={onCancel} onSave={onSave} errorMessage={error} />

      {/* Bottom sheet: seleccionar meses SIN cobro (6 filas × 2 columnas) */}
      <Drawer open={sheetOpen} onOpenChange={setSheetOpen}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-sm">
            <DrawerHeader className="text-left">
              <DrawerTitle>Meses sin cobro</DrawerTitle>
              <DrawerDescription>
                Marca los meses en los que los planes mensuales NO deben generar cargos.
              </DrawerDescription>
            </DrawerHeader>

            <div className="p-4 pb-0">
              <div className="grid grid-cols-2 gap-2">
                {MESES.map((nombre, i) => {
                  const m = i + 1
                  const selected = meses.includes(m)
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => toggleMes(m)}
                      className={`h-11 rounded-md text-sm font-medium transition-colors border ${
                        selected
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-foreground border-input hover:bg-muted/40'
                      }`}
                    >
                      {nombre}
                    </button>
                  )
                })}
              </div>
            </div>

            <DrawerFooter className="mt-4">
              <DrawerClose asChild>
                <Button type="button" className="h-11">Listo</Button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>

      {toast}
    </div>
  )
}
