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
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { formatCurrencyCompact } from '@/lib/utils/currency'
import { colorPorSlug } from '@/lib/constants/grupo-apariencia'
import { normalizeWholeMoneyInput, preventMoneyWheel } from '@/lib/utils/money-input'
import { Users, GraduationCap } from 'lucide-react'

const BECA_OPCIONES = [25, 50, 100] as const

/** Emoji del grupo dentro de un círculo con su color (igual que en la pantalla Grupos). */
function GrupoEmojiCircle({ slug, emoji, className }: { slug?: string | null; emoji?: string | null; className?: string }) {
  const c = colorPorSlug(slug)
  return (
    <div
      className={cn('rounded-full flex items-center justify-center flex-shrink-0', className)}
      style={{ backgroundColor: c.bg, border: `2px solid ${c.border}` }}
      aria-hidden="true"
    >
      {emoji || ''}
    </div>
  )
}

const initialState: FormState = {}

const FRECUENCIA_LABEL: Record<string, string> = {
  mensual: '/mes',
  semanal: '/semana',
  por_visita: '/visita',
  pago_unico: '/visita',
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

function CheckRow({
  label,
  checked,
  onClick,
  leftSlot,
  labelStyle,
}: {
  label: string
  checked: boolean
  onClick: () => void
  leftSlot?: React.ReactNode
  labelStyle?: React.CSSProperties
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-left",
        checked
          ? "bg-primary/10 font-semibold"
          : "hover:bg-accent",
        !labelStyle && (checked ? "text-primary" : "text-muted-foreground"),
      )}
    >
      <span className="flex items-center gap-2.5 min-w-0">
        {leftSlot}
        <span className="truncate" style={labelStyle}>{label}</span>
      </span>
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
    descuento_hermanos_activo?: boolean | null
    descuento_hermanos_monto?: number | null
    beca_activa?: boolean | null
    beca_porcentaje?: number | null
  }
  grupos: {
    id: string
    nombre: string
    plan_sugerido_id?: string | null
    cupo_maximo?: number | null
    color?: string | null
    emoji?: string | null
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
  const { showToast, toast } = useToast()

  const telefonoRef = React.useRef<HTMLInputElement>(null)

  const [nombre, setNombre] = useState(persona.nombre)
  const [apellido, setApellido] = useState(persona.apellido ?? '')
  const [telefono, setTelefono] = useState(persona.telefono_whatsapp ?? '')

  const handleTelefonoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '')
    setTelefono(value.slice(0, 10))
  }

  // Modo SIMPLE
  const [grupoId, setGrupoId] = useState<string>(currentGrupoId ?? '')
  const [planId, setPlanId] = useState<string>(currentPlanIds[0] ?? '')

  // Modo AVANZADO
  const [grupoIds, setGrupoIds] = useState<Set<string>>(new Set(currentGrupoId ? [currentGrupoId] : []))
  const [planIds, setPlanIds] = useState<Set<string>>(new Set(currentPlanIds))

  // Descuentos especiales (Hermanos y Beca son mutuamente excluyentes).
  const [hermanosActivo, setHermanosActivo] = useState(false)
  const [hermanosMonto, setHermanosMonto] = useState('')
  const [becaActiva, setBecaActiva] = useState(false)
  const [becaPorcentaje, setBecaPorcentaje] = useState<number>(25)

  const toggleHermanos = (on: boolean) => {
    setHermanosActivo(on)
    if (on) setBecaActiva(false)
  }
  const toggleBeca = (on: boolean) => {
    setBecaActiva(on)
    if (on) {
      setHermanosActivo(false)
      if (!BECA_OPCIONES.includes(becaPorcentaje as 25 | 50 | 100)) setBecaPorcentaje(25)
    }
  }

  const [localError, setLocalError] = useState<string | null>(null)

  const selectedGrupoSimple = grupos.find((g) => g.id === grupoId)
  const activeAlumnosSimple = selectedGrupoSimple
    ? (selectedGrupoSimple.persona_grupo || []).filter((pg: { estado: string }) => pg.estado === 'activo').length
    : 0
  const cupoMaximoSimple = selectedGrupoSimple?.cupo_maximo
  const isSimpleFull = !!(cupoMaximoSimple && activeAlumnosSimple >= cupoMaximoSimple && grupoId !== currentGrupoId)

  const fullGroupsAvanzado = useMemo(() => {
    if (!multiPlanEnabled) return []
    return grupos
      .filter((g) => grupoIds.has(g.id) && g.id !== currentGrupoId)
      .filter((g) => {
        const active = (g.persona_grupo || []).filter((pg: { estado: string }) => pg.estado === 'activo').length
        const max = g.cupo_maximo
        return !!(max && active >= max)
      })
      .map((g) => ({
        nombre: g.nombre,
        active: (g.persona_grupo || []).filter((pg: { estado: string }) => pg.estado === 'activo').length,
        max: g.cupo_maximo
      }))
  }, [grupos, grupoIds, multiPlanEnabled, currentGrupoId])

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        setNombre(persona.nombre)
        setApellido(persona.apellido ?? '')
        setTelefono(persona.telefono_whatsapp ?? '')
        setGrupoId(currentGrupoId ?? '')
        setPlanId(currentPlanIds[0] ?? '')
        setGrupoIds(new Set(currentGrupoId ? [currentGrupoId] : []))
        setPlanIds(new Set(currentPlanIds))
        setHermanosActivo(!!persona.descuento_hermanos_activo)
        setHermanosMonto(persona.descuento_hermanos_monto ? String(persona.descuento_hermanos_monto) : '')
        setBecaActiva(!!persona.beca_activa)
        setBecaPorcentaje(persona.beca_porcentaje && persona.beca_porcentaje > 0 ? persona.beca_porcentaje : 25)
        setLocalError(null)
      }, 0)
      
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

  const prevState = React.useRef(state)

  useEffect(() => {
    if (open) prevState.current = state
  }, [open, state])

  useEffect(() => {
    if (state !== prevState.current) {
      prevState.current = state
      if (state.success && open) {
        // El mensaje puede incluir el aviso de la mensualidad generada al
        // asignar un esquema (ver generar_mensualidad_esquema_v1).
        showToast(state.message ?? 'Alumno actualizado.', 4000)
        onOpenChange(false)
      }
    }
  }, [state, open, onOpenChange, showToast])

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
    if (telefono && telefono.length !== 10) {
      setLocalError('El teléfono debe tener exactamente 10 dígitos.')
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

    // Descuentos especiales (mutuamente excluyentes; la UI ya lo garantiza).
    fd.set('descuento_hermanos_activo', hermanosActivo ? 'true' : 'false')
    fd.set('descuento_hermanos_monto', hermanosActivo ? String(Number(hermanosMonto || '0')) : '0')
    fd.set('beca_activa', becaActiva ? 'true' : 'false')
    fd.set('beca_porcentaje', becaActiva ? String(becaPorcentaje) : '0')

    React.startTransition(() => formAction(fd))
  }

  return (
    <>
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
                  inputMode="numeric"
                  maxLength={10}
                  ref={telefonoRef}
                  value={telefono}
                  onChange={handleTelefonoChange}
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
                          <SelectItem key={g.id} value={g.id}>
                            <span className="flex items-center gap-2.5 min-w-0">
                              <GrupoEmojiCircle slug={g.color} emoji={g.emoji} className="h-6 w-6 text-sm" />
                              <span className="truncate" style={{ color: colorPorSlug(g.color).textLight }}>{g.nombre}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isSimpleFull && (
                      <div className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-200 bg-amber-50/60 text-amber-800 text-xs">
                        <Info className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Capacidad máxima alcanzada: </span>
                          El grupo «{selectedGrupoSimple?.nombre}» está lleno ({activeAlumnosSimple} de {cupoMaximoSimple} alumnos).
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
                            {p.nombre} — {formatCurrencyCompact(p.monto)} {FRECUENCIA_LABEL[p.frecuencia] ?? ''}
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
                          leftSlot={<GrupoEmojiCircle slug={g.color} emoji={g.emoji} className="h-7 w-7 text-sm" />}
                          labelStyle={{ color: colorPorSlug(g.color).textLight }}
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
                          label={`${p.nombre} — ${formatCurrencyCompact(p.monto)} ${FRECUENCIA_LABEL[p.frecuencia] ?? ''}`}
                          checked={planIds.has(p.id)}
                          onClick={() => toggle(planIds, setPlanIds, p.id)}
                        />
                      ))}
                      {planes.length === 0 && <p className="text-xs text-muted-foreground px-2 py-1">No hay planes.</p>}
                    </div>
                  </div>
                </>
              )}

              {/* ---------------- DESCUENTOS ESPECIALES ---------------- */}
              <div className="space-y-2 pt-2 border-t border-border/60">
                <Label className="text-xs font-semibold text-muted-foreground tracking-wider">Descuentos especiales</Label>

                {/* Toggle Hermanos */}
                <div className="rounded-lg border border-border p-3 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Users className="h-4 w-4 text-primary flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">Hermanos</p>
                        <p className="text-[11px] text-muted-foreground leading-snug">Descuento fijo en cada mensualidad.</p>
                      </div>
                    </div>
                    <Switch checked={hermanosActivo} onCheckedChange={toggleHermanos} className="data-checked:!bg-primary" />
                  </div>
                  {hermanosActivo && (
                    <div className="space-y-1">
                      <Label htmlFor="edit-hermanos-monto" className="text-[11px] font-medium text-muted-foreground">Monto a descontar ($)</Label>
                      <Input
                        id="edit-hermanos-monto"
                        type="number"
                        step="1"
                        min="1"
                        inputMode="numeric"
                        value={hermanosMonto}
                        onWheel={preventMoneyWheel}
                        onChange={(e) => setHermanosMonto(normalizeWholeMoneyInput(e.target.value))}
                        placeholder="0"
                        className="h-10"
                      />
                    </div>
                  )}
                </div>

                {/* Toggle Alumno becado */}
                <div className="rounded-lg border border-border p-3 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <GraduationCap className="h-4 w-4 text-primary flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">Alumno becado</p>
                        <p className="text-[11px] text-muted-foreground leading-snug">Descuento por porcentaje en cada mensualidad.</p>
                      </div>
                    </div>
                    <Switch checked={becaActiva} onCheckedChange={toggleBeca} className="data-checked:!bg-primary" />
                  </div>
                  {becaActiva && (
                    <div className="flex rounded-lg border border-border bg-muted/40 p-1 gap-1">
                      {BECA_OPCIONES.map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setBecaPorcentaje(pct)}
                          className={cn(
                            'flex-1 h-9 rounded-md text-sm font-semibold transition-colors',
                            becaPorcentaje === pct
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'text-muted-foreground hover:bg-accent',
                          )}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

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
    {/* Fuera del Drawer: el toast sobrevive al cierre del sheet. */}
    {toast}
    </>
  )
}



