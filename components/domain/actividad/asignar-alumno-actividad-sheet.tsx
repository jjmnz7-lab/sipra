'use client'

import { useEffect, useMemo, useState } from 'react'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { asignarAlumnoAActividadAction, type FormState } from '@/app/(app)/actividades/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Search, UserPlus, X, CheckCircle2, Info } from 'lucide-react'
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'

export type AlumnoLite = {
  id: string
  nombre: string
  apellido: string | null
  telefono_whatsapp?: string | null
}

type Props = {
  actividadId: string
  actividadNombre: string
  alumnos: AlumnoLite[]
  /** Costo de la actividad: prellenado del cargo único (editable). */
  costoActividad: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
  cupoMaximo?: number | null
  alumnosCount?: number
}

const initialState: FormState = {}

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full h-11" disabled={pending || disabled}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
      {pending ? 'Inscribiendo...' : 'Inscribir al alumno'}
    </Button>
  )
}

function normalizar(s: string | null | undefined) {
  return (s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export function AsignarAlumnoActividadSheet({
  actividadId,
  actividadNombre,
  alumnos,
  costoActividad,
  open,
  onOpenChange,
  cupoMaximo,
  alumnosCount,
}: Props) {
  const [state, formAction] = useActionState(asignarAlumnoAActividadAction, initialState)
  const [query, setQuery] = useState('')
  const [alumnoSel, setAlumnoSel] = useState<AlumnoLite | null>(null)

  const montoSugerido = costoActividad ?? 0
  const [monto, setMonto] = useState<string>(String(montoSugerido))

  const cleanQuery = useMemo(() => normalizar(query.trim()), [query])

  const filtrados = useMemo(() => {
    if (!cleanQuery) return alumnos.slice(0, 8)
    return alumnos
      .filter((a) => normalizar(`${a.nombre} ${a.apellido ?? ''}`).includes(cleanQuery))
      .slice(0, 12)
  }, [alumnos, cleanQuery])

  // Reset al abrir
  useEffect(() => {
    if (open) {
      setQuery('')
      setAlumnoSel(null)
      setMonto(String(montoSugerido))
    }
  }, [open, montoSugerido])

  // Cerrar al éxito (mismo patrón que el resto de drawers con server actions del codebase).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- cierre tras commit del server action
    if (state.success) onOpenChange(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success])

  const montoNum = Number(monto) || 0

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[88vh]">
        <div className="mx-auto w-full max-w-sm flex flex-col overflow-y-auto pb-6">
          <DrawerHeader className="text-left">
            <DrawerTitle className="flex items-center text-foreground">
              <UserPlus className="mr-2 h-5 w-5 text-[#22887c]" /> Asignar alumno
            </DrawerTitle>
            <p className="text-xs text-muted-foreground">
              Inscribir a esta actividad:{' '}
              <strong className="text-foreground">{actividadNombre}</strong>
            </p>
          </DrawerHeader>

          <form action={formAction}>
            <input type="hidden" name="actividad_id" value={actividadId} />
            <input type="hidden" name="persona_id" value={alumnoSel?.id ?? ''} />
            <input type="hidden" name="monto" value={alumnoSel ? String(montoNum) : '0'} />

            <div className="px-4 space-y-3">
              {/* Buscador / alumno seleccionado */}
              {!alumnoSel ? (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground tracking-wider">
                    Buscar alumno
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Nombre o apellido…"
                      className="h-11 pl-9"
                      autoFocus
                    />
                  </div>

                  <div className="max-h-[40vh] overflow-y-auto rounded-lg border border-border p-1.5 space-y-1">
                    {filtrados.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setAlumnoSel(a)}
                        className="w-full text-left px-2.5 py-2 rounded-md text-sm text-foreground hover:bg-accent transition-colors truncate"
                      >
                        {a.nombre} {a.apellido ?? ''}
                      </button>
                    ))}
                    {filtrados.length === 0 && (
                      <p className="text-xs text-muted-foreground px-2 py-3 text-center">
                        {alumnos.length === 0
                          ? 'No hay alumnos activos disponibles para inscribir.'
                          : 'Sin coincidencias.'}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
                    <span className="text-sm font-semibold text-foreground truncate">
                      {alumnoSel.nombre} {alumnoSel.apellido ?? ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAlumnoSel(null)}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Cambiar alumno"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {cupoMaximo != null && alumnosCount != null && alumnosCount >= cupoMaximo && (
                    <div className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-200 bg-amber-50/60 text-amber-800 text-xs">
                      <Info className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Capacidad máxima alcanzada: </span>
                        La actividad «{actividadNombre}» está llena ({alumnosCount} de {cupoMaximo} alumnos).
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Cargo único de la actividad (editable) */}
              {alumnoSel && (
                <div className="space-y-2">
                  <Label htmlFor="monto_actividad_input" className="text-xs font-semibold text-muted-foreground tracking-wider">
                    Costo de la actividad (editable)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                    <Input
                      id="monto_actividad_input"
                      type="number"
                      step="1"
                      min="0"
                      value={monto}
                      onChange={(e) => setMonto(e.target.value)}
                      inputMode="numeric"
                      className="h-11 pl-7"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {montoNum > 0
                      ? `Se generará un cargo único inmediato por $${Math.round(montoNum)}.`
                      : 'No se generará ningún cargo al inscribir.'}
                  </p>
                </div>
              )}

              {/* Errores del action */}
              {state.message && !state.success && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
                  {state.message}
                </div>
              )}
            </div>

            <DrawerFooter>
              <SubmitButton disabled={!alumnoSel} />
            </DrawerFooter>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

