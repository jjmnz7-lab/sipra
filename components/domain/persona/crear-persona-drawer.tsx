'use client'

import * as React from 'react'
import { startTransition, useActionState, useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { crearPersonaAction, type FormState } from '@/app/(app)/grupos/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, UserPlus, Info, CheckCircle2, Check, Users, GraduationCap } from 'lucide-react'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { formatCurrencyCompact } from '@/lib/utils/currency'
import { colorPorSlug } from '@/lib/constants/grupo-apariencia'
import { normalizeWholeMoneyInput, preventMoneyWheel } from '@/lib/utils/money-input'

const initialState: FormState = {}

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

type Grupo = {
  id: string
  nombre: string
  /** Plan que dicta el precio de este grupo (academias estilo fútbol). */

  cupo_maximo?: number | null
  color?: string | null
  emoji?: string | null
  persona_grupo?: { estado: string }[] | null
}

export type PlanCobro = {
  id: string
  nombre: string
  monto: number
  frecuencia: 'mensual' | 'semanal' | 'por_visita' | 'pago_unico'
  requiere_inscripcion?: boolean
}

const FRECUENCIA_LABEL: Record<PlanCobro['frecuencia'], string> = {
  mensual: '/mes',
  semanal: '/semana',
  por_visita: '/visita',
  pago_unico: '/visita',
}

type Props = {
  grupos: Grupo[]
  planes?: PlanCobro[]
  /** Regla de complejidad bajo demanda: true = multi grupos/planes; false = simple. */
  multiPlanEnabled?: boolean
  modoProrrateo?: 'proporcional' | 'completo'
  defaultGrupoId?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  hideTrigger?: boolean
}

function SubmitButton({ pending }: { pending: boolean }) {
  return (
    <Button type="submit" className="w-full h-12 text-base font-bold bg-[#22887c] hover:bg-[#1a6b62]" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
      {pending ? 'Guardando...' : 'Guardar alumno'}
    </Button>
  )
}

// Prorrateo (misma lógica que la RPC `calcular_cargo_plan_v1`): solo aplica a
// planes mensuales en modo proporcional.
function calcularPreviewPlan(plan: PlanCobro | undefined, modo: 'proporcional' | 'completo', hoy: Date) {
  if (!plan) return { monto: 0, diasMes: 0, diasRestantes: 0, prorrateaApplica: false }
  const year = hoy.getFullYear()
  const month = hoy.getMonth()
  const diasMes = new Date(year, month + 1, 0).getDate()
  const diasRestantes = diasMes - hoy.getDate() + 1
  const base = Number(plan.monto ?? 0)
  const prorrateaApplica = plan.frecuencia === 'mensual' && modo === 'proporcional'
  let monto = base
  if (base > 0 && prorrateaApplica) {
    monto = Math.round((base * diasRestantes / diasMes) * 100) / 100
  }
  return { monto, diasMes, diasRestantes, prorrateaApplica }
}

// Plan por defecto del modo simple: 'Mensualidad General' (onboarding) o el primero.
function planPorDefecto(planes: PlanCobro[]): PlanCobro | undefined {
  return planes.find((p) => p.nombre.toLowerCase() === 'mensualidad general') ?? planes[0]
}

export function CrearPersonaDrawer({
  grupos = [],
  planes = [],
  modoProrrateo = 'proporcional',
  defaultGrupoId,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: Props) {
  const router = useRouter()
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen
  const setOpen = isControlled && onOpenChange ? onOpenChange : setUncontrolledOpen
  const [state, formAction, isPending] = useActionState(crearPersonaAction, initialState)
  const { showToast, toast } = useToast()

  // Datos personales
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [telefono, setTelefono] = useState('')

  const handleTelefonoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '')
    setTelefono(value.slice(0, 10))
  }

  // Grupo y Plan Únicos
  const [grupoId, setGrupoId] = useState<string>(defaultGrupoId ?? '')
  const [planId, setPlanId] = useState<string>('none')
  const [monto, setMonto] = useState<string>('0')
  const [condonar, setCondonar] = useState(false)

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

  const planDefault = useMemo(() => planPorDefecto(planes), [planes])

  const grupoSimpleSel = useMemo(() => grupos.find((g) => g.id === grupoId), [grupos, grupoId])
  const planEfectivo = useMemo(() => {
    return planes.find((p) => p.id === planId) ?? null
  }, [planes, planId])

  const preview = useMemo(
    () => calcularPreviewPlan(planEfectivo ?? undefined, modoProrrateo, new Date()),
    [planEfectivo, modoProrrateo]
  )

  const selectedGrupoActiveAlumnos = useMemo(() => {
    if (!grupoSimpleSel) return 0
    return (grupoSimpleSel.persona_grupo || []).filter((pg: { estado: string }) => pg.estado === 'activo').length
  }, [grupoSimpleSel])

  const selectedGrupoCupoMaximo = grupoSimpleSel?.cupo_maximo
  const selectedGrupoFull = !!(selectedGrupoCupoMaximo && selectedGrupoActiveAlumnos >= selectedGrupoCupoMaximo)

  // Inicializar plan default al abrir
  useEffect(() => {
    if (open) {
      const defaultPlan = planPorDefecto(planes)
      setPlanId(defaultPlan?.id ?? 'none')
    }
  }, [open, planes])

  // Sincroniza el monto sugerido cuando cambia el plan efectivo.
  useEffect(() => {
    setTimeout(() => {
      setMonto(String(Math.round(preview.monto)))
      setCondonar(false)
    }, 0)
  }, [preview.monto, open])

  // Reinicia descuentos al abrir el drawer.
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        setHermanosActivo(false)
        setHermanosMonto('')
        setBecaActiva(false)
        setBecaPorcentaje(25)
      }, 0)
    }
  }, [open])

  const prevState = React.useRef(state)

  useEffect(() => {
    if (open) prevState.current = state
  }, [open])

  useEffect(() => {
    if (state !== prevState.current) {
      prevState.current = state
      if (state.success && open) {
        const nombreCompleto = `${nombre} ${apellido}`.trim()
        showToast(`${nombreCompleto} agregado correctamente.`, 4500)
        setOpen(false)
        // reset
        setNombre(''); setApellido(''); setTelefono('')
        setGrupoId(defaultGrupoId ?? '')
        setPlanId(planPorDefecto(planes)?.id ?? 'none')
        setLocalError(null)
        router.refresh()
      }
    }
  }, [state, open, router, showToast, defaultGrupoId, setOpen, nombre, apellido, planes])

  useEffect(() => {
    if (open && defaultGrupoId) {
      setTimeout(() => {
        setGrupoId(defaultGrupoId)
      }, 0)
    }
  }, [open, defaultGrupoId])

  const montoFinal = condonar ? 0 : Number(monto) || 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    if (nombre.trim().length < 2) { setLocalError('El nombre es requerido.'); return }
    if (telefono && telefono.length !== 10) { setLocalError('El teléfono debe tener exactamente 10 dígitos.'); return }
    if (!grupoId) { setLocalError('Selecciona un grupo.'); return }

    const fd = new FormData()
    fd.set('nombre', nombre)
    fd.set('apellido', apellido)
    fd.set('telefono_whatsapp', telefono)
    fd.set('grupo_id', grupoId)
    fd.set('plan_id', planId === 'none' ? '' : planId)
    fd.set('monto', String(montoFinal))
    fd.set('descuento_hermanos_activo', hermanosActivo ? 'true' : 'false')
    fd.set('descuento_hermanos_monto', hermanosActivo ? String(Number(hermanosMonto || '0')) : '0')
    fd.set('beca_activa', becaActiva ? 'true' : 'false')
    fd.set('beca_porcentaje', becaActiva ? String(becaPorcentaje) : '0')
    startTransition(() => formAction(fd))
  }

  return (
    <>
    <Drawer open={open} onOpenChange={setOpen}>
      {!isControlled && !hideTrigger && (
        <DrawerTrigger asChild>
          <Button className="h-14 w-14 rounded-full shadow-lg bg-[#15435a] hover:bg-[#0f3245] fixed bottom-20 right-4 lg:static lg:h-10 lg:w-auto lg:rounded-lg lg:shadow-none">
            <UserPlus className="h-6 w-6 lg:mr-2 lg:h-4 lg:w-4" />
            <span className="hidden lg:inline">Nuevo Alumno</span>
          </Button>
        </DrawerTrigger>
      )}
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm max-h-[90vh] overflow-y-auto">
          <DrawerHeader className="text-left">
            <DrawerTitle className="flex items-center text-foreground">
              <UserPlus className="mr-2 h-5 w-5 text-[#22887c]" /> Agregar Alumno
            </DrawerTitle>
          </DrawerHeader>

          <form onSubmit={handleSubmit}>
            <div className="p-4 pb-0 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre" className="text-xs font-semibold text-muted-foreground tracking-wider">Nombre *</Label>
                  <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apellido" className="text-xs font-semibold text-muted-foreground tracking-wider">Apellido</Label>
                  <Input id="apellido" value={apellido} onChange={(e) => setApellido(e.target.value)} className="h-11" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefono_whatsapp" className="text-xs font-semibold text-muted-foreground tracking-wider">Teléfono (WhatsApp)</Label>
                <Input id="telefono_whatsapp" value={telefono} onChange={handleTelefonoChange} type="tel" inputMode="numeric" maxLength={10} className="h-11" placeholder="10 dígitos" />
              </div>

                  <div className="space-y-2">
                    <Label htmlFor="grupo_id" className="text-xs font-semibold text-muted-foreground tracking-wider">Grupo *</Label>
                    <Select value={grupoId} onValueChange={setGrupoId}>
                      <SelectTrigger className="h-11">
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
                    {selectedGrupoFull && (
                      <div className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-200 bg-amber-50/60 text-amber-800 text-xs">
                        <Info className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Capacidad máxima alcanzada: </span>
                          El grupo «{grupoSimpleSel?.nombre}» está lleno ({selectedGrupoActiveAlumnos} de {selectedGrupoCupoMaximo} alumnos).
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="plan_id" className="text-xs font-semibold text-muted-foreground tracking-wider">Plan de cobro</Label>
                    <Select value={planId} onValueChange={setPlanId}>
                      <SelectTrigger id="plan_id" className="h-11">
                        <SelectValue placeholder="Sin plan de cobro" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin plan de cobro</SelectItem>
                        {planes.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.nombre} — {formatCurrencyCompact(p.monto)} {FRECUENCIA_LABEL[p.frecuencia] ?? ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
                    {planDefault && preview.prorrateaApplica && (
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Info className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                        <span>Prorrateo: {preview.diasRestantes} de {preview.diasMes} días</span>
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="monto" className="text-sm font-semibold text-foreground">Cargo inicial</Label>
                        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                          <input type="checkbox" checked={condonar} onChange={(e) => setCondonar(e.target.checked)} className="h-3.5 w-3.5" />
                          Condonar
                        </label>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                        <Input
                          id="monto" type="number" step="1" min="0"
                          value={condonar ? '0' : monto}
                          onChange={(e) => setMonto(e.target.value)}
                          inputMode="numeric"
                          disabled={condonar}
                          className="h-10 pl-7"
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {planEfectivo
                          ? `Plan: ${planEfectivo.nombre}. Puedes editar o condonar el primer cargo.`
                          : 'No hay plan configurado; captura el cargo inicial o déjalo en 0.'}
                      </p>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-border">
                      <span className="text-sm font-semibold text-foreground">Total a generar</span>
                      <span className={`text-lg font-bold ${montoFinal > 0 ? 'text-primary' : 'text-[#22887c]'}`}>${Math.round(montoFinal)}</span>
                    </div>
                  </div>

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
                      <Label htmlFor="crear-hermanos-monto" className="text-[11px] font-medium text-muted-foreground">Monto a descontar ($)</Label>
                      <Input
                        id="crear-hermanos-monto"
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

              {(localError || (state?.message && !state.success)) && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
                  {localError ?? state.message}
                </div>
              )}
            </div>

            <DrawerFooter>
              <SubmitButton pending={isPending} />
              <DrawerClose asChild>
                <Button type="button" variant="ghost" className="h-11 text-muted-foreground">Cancelar</Button>
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


