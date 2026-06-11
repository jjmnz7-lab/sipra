'use client'

import * as React from 'react'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { archivarActividadAction } from '@/app/(app)/actividades/actions'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Hourglass, Loader2, Users, AlertTriangle } from 'lucide-react'

type Props = {
  actividadId: string
  actividadNombre: string
  alumnosCount: number
  /** Si la fecha de fin todavía está en el futuro, se pide una confirmación extra. */
  fechaFinFutura?: boolean
  fechaFin?: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Archivar una actividad = darla por terminada. Las inscripciones activas se
 * rompen; no hay migración a otro destino (a diferencia de los grupos) porque
 * el cargo único ya quedó generado y la actividad simplemente concluye.
 */
export function ArchivarActividadDrawer({
  actividadId, actividadNombre, alumnosCount,
  fechaFinFutura = false, fechaFin = null,
  open, onOpenChange,
}: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [confirmAnticipado, setConfirmAnticipado] = useState(false)
  const [pending, startTransition] = useTransition()

  const reset = () => { setError(null); setConfirmAnticipado(false) }
  const confirmAnticipadoListo = !fechaFinFutura || confirmAnticipado

  const handleConfirm = () => {
    setError(null)
    startTransition(async () => {
      const res = await archivarActividadAction(actividadId)
      if (!res.success) {
        setError(res.message ?? 'No se pudo archivar la actividad.')
        return
      }
      onOpenChange(false)
      router.push('/actividades')
      router.refresh()
    })
  }

  // Formato corto de fecha para el aviso de cierre anticipado.
  const fechaFinLegible = (() => {
    if (!fechaFin) return ''
    const [y, m, d] = String(fechaFin).split('-').map(Number)
    if (!y || !m || !d) return fechaFin
    return new Date(y, m - 1, d).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
  })()

  return (
    <Drawer open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v) }}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader className="text-left">
            <DrawerTitle className="flex items-center gap-2">
              <Hourglass className="h-5 w-5 text-muted-foreground" /> Archivar actividad
            </DrawerTitle>
            <DrawerDescription>
              <strong>{actividadNombre}</strong> se archivará (no se borra; el historial y los cargos se conservan).
            </DrawerDescription>
          </DrawerHeader>

          <div className="p-4 pb-0 space-y-3">
            {/* Aviso si la actividad aún no llega a su fecha de fin */}
            {fechaFinFutura && (
              <button
                type="button"
                onClick={() => setConfirmAnticipado((v) => !v)}
                className={cn(
                  'w-full flex items-start gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors',
                  confirmAnticipado
                    ? 'border-amber-400 bg-amber-100/60'
                    : 'border-amber-300 bg-amber-50 hover:bg-amber-100/50',
                )}
              >
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-600" />
                <span className="text-xs leading-relaxed text-amber-900">
                  Esta actividad aún no llega a su fecha de fin{fechaFinLegible ? ` (${fechaFinLegible})` : ''}.
                  Vas a finalizarla de forma anticipada. <strong>{confirmAnticipado ? 'Confirmado ✓' : 'Toca para confirmar.'}</strong>
                </span>
              </button>
            )}

            {/* Conteo de dependientes */}
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm text-foreground">
              <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              {alumnosCount === 0 ? (
                <span>No hay alumnos activos en esta actividad.</span>
              ) : (
                <span>
                  <strong>{alumnosCount}</strong> {alumnosCount === 1 ? 'alumno inscrito' : 'alumnos inscritos'} —
                  {' '}al archivar, su inscripción a esta actividad termina. Sus cargos y pagos no se modifican.
                </span>
              )}
            </div>

            {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">{error}</div>}
          </div>

          <DrawerFooter>
            <Button
              onClick={handleConfirm}
              disabled={pending || !confirmAnticipadoListo}
              className="h-11"
            >
              {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Hourglass className="mr-2 h-4 w-4" />}
              {pending ? 'Archivando...' : 'Archivar actividad'}
            </Button>
            <DrawerClose asChild><Button variant="ghost" className="h-11">Cancelar</Button></DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
