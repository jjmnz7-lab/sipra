'use client'

import * as React from 'react'
import { useActionState, useEffect, useState, useMemo } from 'react'
import { editarAlumnoAction, type FormState } from '@/app/(app)/seguimiento/actions'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Pencil, CheckCircle2, Check, Info } from 'lucide-react'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

const initialState: FormState = {}

const FRECUENCIA_LABEL: Record<string, string> = {
  mensual: '/mes',
  semanal: '/semana',
  por_visita: '/visita',
  pago_unico: 'único',
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full h-11" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
      {pending ? 'Guardando...' : 'Guardar cambios'}
    </Button>
  )
}

function CheckRow({ label, checked, onClick }: { label: string; checked: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-left",
        checked 
          ? "bg-primary/10 text-primary font-semibold" 
          : "hover:bg-accent text-muted-foreground"
      )}
    >
      <span>{label}</span>
      {checked && <Check className="h-4 w-4 text-primary flex-shrink-0 ml-2" />}
    </button>
  )
}

type Props = {
  persona: {
    id: string
    nombre: string
    apellido: string | null
    telefono_whatsapp: string | null
    /** Se conserva en el tipo por compatibilidad, pero el email ya no se edita en el UI. */
    email?: string | null
  }
  grupos: {
    id: string
    nombre: string
    plan_sugerido_id?: string | null
    cupo_maximo?: number | null
    persona_grupo?: { estado: string }[] | null
  }[]
  planes: { id: string; nombre: string; monto: number; frecuencia: string }[]
  multiPlanEnabled?: boolean
  currentGrupoId: string | null
  currentPlanIds: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
  initialFocus?: 'telefono' | null
}

export function EditarAlumnoDrawer({
  persona,
  grupos = [],
  planes = [],
  multiPlanEnabled = false,
  currentGrupoId,
  currentPlanIds = [],
  open,
  onOpenChange,
  initialFocus,
}: Props) {
  const [state, formAction] = useActionState(editarAlumnoAction, initialState)

  const telefonoRef = React.useRef<HTMLInputElement>(null)

  const [nombre, setNombre] = useState(persona.nombre)
  const [apellido, setApellido] = useState(persona.apellido ?? '')
  const [telefono, setTelefono] = useState(persona.telefono_whatsapp ?? '')

  // Modo SIMPLE
  const [grupoId, setGrupoId] = useState<string>(currentGrupoId ?? '')
  const [planId, setPlanId] = useState<string>(currentPlanIds[0] ?? '')

  // Modo AVANZADO
  const [grupoIds, setGrupoIds] = useState<Set<string>>(new Set(currentGrupoId ? [currentGrupoId] : []))
  const [planIds, setPlanIds] = useState<Set<string>>(new Set(currentPlanIds))

  const [localError, setLocalError] = useState<string | null>(null)

  const selectedGrupoSimple = grupos.find((g) => g.id === grupoId)
  const activeAlumnosSimple = selectedGrupoSimple
    ? (selectedGrupoSimple.persona_grupo || []).filter((pg: any) => pg.estado === 'activo').length
    : 0
  const cupoMaximoSimple = selectedGrupoSimple?.cupo_maximo
  const isSimpleFull = !!(cupoMaximoSimple && activeAlumnosSimple >= cupoMaximoSimple && grupoId !== currentGrupoId)

  const fullGroupsAvanzado = useMemo(() => {
    if (!multiPlanEnabled) return []
    return grupos
      .filter((g) => grupoIds.has(g.id) && g.id !== currentGrupoId)
      .filter((g) => {
        const active = (g.persona_grupo || []).filter((pg: any) => pg.estado === 'activo').length
        const max = g.cupo_maximo
        return !!(max && active >= max)
      })
      .map((g) => ({
        nombre: g.nombre,
        active: (g.persona_grupo || []).filter((pg: any) => pg.estado === 'activo').length,
        max: g.cupo_maximo
      }))
  }, [grupos, grupoIds, multiPlanEnabled, currentGrupoId])

  useEffect(() => {
    if (open) {
      setNombre(persona.nombre)
      setApellido(persona.apellido ?? '')
      setTelefono(persona.telefono_whatsapp ?? '')
      setGrupoId(currentGrupoId ?? '')
      setPlanId(currentPlanIds[0] ?? '')
      setGrupoIds(new Set(currentGrupoId ? [currentGrupoId] : []))
      setPlanIds(new Set(currentPlanIds))
      setLocalError(null)
      
      if (initialFocus === 'telefono') {
        setTimeout(() => {
          if (telefonoRef.current) {
            telefonoRef.current.focus()
            // Optional: scroll into view on mobile
            telefonoRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 300) // Delay to wait for drawer animation to finish
      }
    }
  }, [open, persona, currentGrupoId, currentPlanIds, initialFocus])

  useEffect(() => {
    if (state.success) onOpenChange(false)
  }, [state.success, onOpenChange])

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, id: string) => {
    const next = new Set(set)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setter(next)
  }

  const toggleGrupoAvanzado = (g: { id: string; plan_sugerido_id?: string | null }) => {
    const next = new Set(grupoIds)
    const estabaMarcado = next.has(g.id)
    if (estabaMarcado) next.delete(g.id)
    else next.add(g.id)
    setGrupoIds(next)

    // Auto-selección de plan sugerido en avanzado si se activa
    if (!estabaMarcado && g.plan_sugerido_id && planes.some((p) => p.id === g.plan_sugerido_id)) {
      setPlanIds((prev) => new Set(prev).add(g.plan_sugerido_id!))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    if (nombre.trim().length < 2) {
      setLocalError('El nombre es requerido.')
      return
    }

    let gruposSel: string[]
    let planesSel: string[]

    if (multiPlanEnabled) {
      gruposSel = Array.from(grupoIds)
      planesSel = Array.from(planIds)
      if (gruposSel.length === 0) {
        setLocalError('Selecciona al menos un grupo.')
        return
      }
    } else {
      if (!grupoId) {
        setLocalError('Selecciona un grupo.')
        return
      }
      gruposSel = [grupoId]
      planesSel = planId ? [planId] : []
    }

    const fd = new FormData()
    fd.set('persona_id', persona.id)
    fd.set('nombre', nombre)
    fd.set('apellido', apellido)
    fd.set('telefono_whatsapp', telefono)
    fd.set('grupo_ids', JSON.stringify(gruposSel))
    fd.set('plan_ids', JSON.stringify(planesSel))

    React.startTransition(() => formAction(fd))
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm max-h-[85vh] overflow-y-auto">
          <DrawerHeader className="text-left">
            <DrawerTitle className="flex items-center text-foreground">
              <Pencil className="mr-2 h-5 w-5 text-primary" /> Editar alumno
            </DrawerTitle>
          </DrawerHeader>

          <form onSubmit={handleSubmit}>
            <div className="p-4 pb-0 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="edit-nombre" className="text-xs font-semibold text-muted-foreground tracking-wider">Nombre *</Label>
                  <Input id="edit-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required className="h-11" />
                  {state?.errors?.nombre && <p className="text-sm text-red-600">{state.errors.nombre[0]}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-apellido" className="text-xs font-semibold text-muted-foreground tracking-wider">Apellido</Label>
                  <Input id="edit-apellido" value={apellido} onChange={(e) => setApellido(e.target.value)} className="h-11" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-telefono" className="text-xs font-semibold text-muted-foreground tracking-wider">Teléfono (WhatsApp)</Label>
                <Input
                  id="edit-telefono"
                  type="tel"
                  ref={telefonoRef}
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="h-11"
                  placeholder="10 dígitos"
                />
              </div>

              {/* ---------------- MODO SIMPLE ---------------- */}
              {!multiPlanEnabled && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="edit-grupo" className="text-xs font-semibold text-muted-foreground tracking-wider">Grupo *</Label>
                    <Select value={grupoId} onValueChange={setGrupoId}>
                      <SelectTrigger id="edit-grupo" className="h-11">
                        <SelectValue placeholder="Selecciona un grupo" />
                      </SelectTrigger>
                      <SelectContent>
                        {grupos.map((g) => (
                          <SelectItem key={g.id} value={g.id}>{g.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isSimpleFull && (
                      <div className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-200 bg-amber-50/60 text-amber-800 text-xs">
                        <Info className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Capacidad máxima alcanzada: </span>
                          El grupo "{selectedGrupoSimple?.nombre}" está lleno ({activeAlumnosSimple} de {cupoMaximoSimple} alumnos).
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-plan" className="text-xs font-semibold text-muted-foreground tracking-wider">Plan de cobro</Label>
                    <Select value={planId} onValueChange={setPlanId}>
                      <SelectTrigger id="edit-plan" className="h-11">
                        <SelectValue placeholder="Sin plan de cobro" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Sin plan de cobro</SelectItem>
                        {planes.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.nombre} — ${Number(p.monto).toFixed(2)} {FRECUENCIA_LABEL[p.frecuencia] ?? ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {/* ---------------- MODO AVANZADO ---------------- */}
              {multiPlanEnabled && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground tracking-wider">Grupos *</Label>
                    <div className="space-y-1.5 rounded-lg border border-border p-2">
                      {grupos.map((g) => (
                        <CheckRow
                          key={g.id}
                          label={g.nombre}
                          checked={grupoIds.has(g.id)}
                          onClick={() => toggleGrupoAvanzado(g)}
                        />
                      ))}
                      {grupos.length === 0 && <p className="text-xs text-muted-foreground px-2 py-1">No hay grupos.</p>}
                    </div>
                    {fullGroupsAvanzado.length > 0 && (
                      <div className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-200 bg-amber-50/60 text-amber-800 text-xs">
                        <Info className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Capacidad máxima alcanzada: </span>
                          Los siguientes grupos seleccionados están llenos: {fullGroupsAvanzado.map((g) => `"${g.nombre}" (${g.active}/${g.max})`).join(', ')}.
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground tracking-wider">Planes de cobro</Label>
                    <div className="space-y-1.5 rounded-lg border border-border p-2">
                      {planes.map((p) => (
                        <CheckRow
                          key={p.id}
                          label={`${p.nombre} — $${Number(p.monto).toFixed(2)} ${FRECUENCIA_LABEL[p.frecuencia] ?? ''}`}
                          checked={planIds.has(p.id)}
                          onClick={() => toggle(planIds, setPlanIds, p.id)}
                        />
                      ))}
                      {planes.length === 0 && <p className="text-xs text-muted-foreground px-2 py-1">No hay planes.</p>}
                    </div>
                  </div>
                </>
              )}

              {localError && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
                  {localError}
                </div>
              )}

              {state?.message && !state.success && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
                  {state.message}
                </div>
              )}
            </div>

            <DrawerFooter>
              <SubmitButton />
              <DrawerClose asChild>
                <Button variant="ghost" className="h-11 text-muted-foreground">Cancelar</Button>
              </DrawerClose>
            </DrawerFooter>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
