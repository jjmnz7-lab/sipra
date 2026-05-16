'use client'

import * as React from 'react'
import { useActionState, useEffect, useState } from 'react'
import { generarMensualidadesAction, type FormState } from '@/app/(app)/dashboard/actions'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Zap, CheckCircle2 } from 'lucide-react'
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
    <Button type="submit" className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-base font-semibold" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Zap className="mr-2 h-5 w-5" />}
      {pending ? 'Generando cargos...' : 'Generar Mensualidades'}
    </Button>
  )
}

// Default next month's 1st
function getDefaultDate(): string {
  const d = new Date()
  d.setMonth(d.getMonth() + 1)
  d.setDate(1)
  return d.toISOString().split('T')[0]
}

function getDefaultConcepto(): string {
  const d = new Date()
  d.setMonth(d.getMonth() + 1)
  const mes = d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
  return `Mensualidad ${mes.charAt(0).toUpperCase() + mes.slice(1)}`
}

export function GenerarMensualidadesDrawer() {
  const [open, setOpen] = useState(false)
  const [state, formAction] = useActionState(generarMensualidadesAction, initialState)

  useEffect(() => {
    if (state.success) {
      const timer = setTimeout(() => setOpen(false), 1800)
      return () => clearTimeout(timer)
    }
  }, [state.success])

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-base font-bold shadow-lg shadow-indigo-200">
          <Zap className="mr-2 h-5 w-5" /> Generar Mensualidades
        </Button>
      </DrawerTrigger>

      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle className="text-lg">Cobro Masivo</DrawerTitle>
            <DrawerDescription>
              Genera un cargo individual para <strong>todos los alumnos activos</strong> de tu academia de una sola vez.
            </DrawerDescription>
          </DrawerHeader>

          {state.success ? (
            <div className="p-6 flex flex-col items-center text-center gap-3">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              <p className="font-bold text-slate-900 text-lg">{state.message}</p>
              {state.data?.omitidos_duplicado ? (
                <p className="text-sm text-slate-500">
                  {state.data.omitidos_duplicado} alumno(s) omitidos por tener ya ese cargo.
                </p>
              ) : null}
            </div>
          ) : (
            <form action={formAction}>
              <div className="p-4 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="concepto">Concepto del cobro</Label>
                  <Input
                    id="concepto"
                    name="concepto"
                    required
                    className="h-11"
                    defaultValue={getDefaultConcepto()}
                    placeholder="Mensualidad Julio 2026"
                  />
                  {state?.errors?.concepto && (
                    <p className="text-sm text-red-600">{state.errors.concepto[0]}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monto">Monto por alumno ($)</Label>
                  <Input
                    id="monto"
                    name="monto"
                    type="number"
                    inputMode="decimal"
                    required
                    min="1"
                    step="0.01"
                    className="h-11 text-lg font-semibold"
                    placeholder="500.00"
                  />
                  {state?.errors?.monto && (
                    <p className="text-sm text-red-600">{state.errors.monto[0]}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fecha_vencimiento">Fecha de vencimiento</Label>
                  <Input
                    id="fecha_vencimiento"
                    name="fecha_vencimiento"
                    type="date"
                    required
                    className="h-11"
                    defaultValue={getDefaultDate()}
                  />
                  {state?.errors?.fecha_vencimiento && (
                    <p className="text-sm text-red-600">{state.errors.fecha_vencimiento[0]}</p>
                  )}
                </div>

                {state?.message && !state.success && (
                  <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
                    {state.message}
                  </div>
                )}

                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-xs text-indigo-700">
                  ✔ Se generará 1 cargo por alumno activo. Si ya existe un cargo igual, se omite automáticamente.
                </div>
              </div>

              <DrawerFooter>
                <SubmitButton />
                <DrawerClose asChild>
                  <Button variant="outline" className="h-11">Cancelar</Button>
                </DrawerClose>
              </DrawerFooter>
            </form>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
