'use client'

import * as React from 'react'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { finalizarActividadAction } from '@/app/(app)/actividades/actions'
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
import { CalendarOff, Hourglass, Loader2, Users } from 'lucide-react'

type Props = {
  actividadId: string
  actividadNombre: string
  alumnosCount: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * "Finalizar" mueve fecha_fin a hoy (cierre anticipado, sin romper
 * inscripciones); "Finalizar y archivar" hace lo mismo y además archiva
 * (rompe las inscripciones activas), como ArchivarActividadDrawer.
 */
export function FinalizarActividadDrawer({
  actividadId, actividadNombre, alumnosCount,
  open, onOpenChange,
}: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const reset = () => setError(null)

  const handleConfirm = (archivarTambien: boolean) => {
    setError(null)
    startTransition(async () => {
      const res = await finalizarActividadAction(actividadId, archivarTambien)
      if (!res.success) {
        setError(res.message ?? 'No se pudo finalizar la actividad.')
        return
      }
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Drawer open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v) }}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader className="text-left">
            <DrawerTitle className="flex items-center gap-2">
              <CalendarOff className="h-5 w-5 text-muted-foreground" /> Finalizar actividad
            </DrawerTitle>
            <DrawerDescription>
              <strong>{actividadNombre}</strong> se dará por terminada hoy (cierre anticipado).
            </DrawerDescription>
          </DrawerHeader>

          <div className="p-4 pb-0 space-y-3">
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm text-foreground">
              <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              {alumnosCount === 0 ? (
                <span>No hay alumnos activos en esta actividad.</span>
              ) : (
                <span>
                  <strong>{alumnosCount}</strong> {alumnosCount === 1 ? 'alumno inscrito' : 'alumnos inscritos'}.
                </span>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <strong>Finalizar</strong> solo cierra la actividad (deja de aceptar inscripciones o ediciones), conservando las inscripciones actuales.{' '}
              <strong>Finalizar y archivar</strong> además rompe las inscripciones activas y manda la actividad a archivadas.
            </p>

            {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">{error}</div>}
          </div>

          <DrawerFooter className="gap-2">
            <Button
              onClick={() => handleConfirm(false)}
              disabled={pending}
              variant="outline"
              className="h-11"
            >
              {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarOff className="mr-2 h-4 w-4" />}
              Finalizar actividad
            </Button>
            <Button
              onClick={() => handleConfirm(true)}
              disabled={pending}
              className="h-11"
            >
              {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Hourglass className="mr-2 h-4 w-4" />}
              Finalizar y archivar
            </Button>
            <DrawerClose asChild><Button variant="ghost" className="h-11">Cancelar</Button></DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
