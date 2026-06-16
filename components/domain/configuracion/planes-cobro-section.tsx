'use client'

import * as React from 'react'
import { useActionState, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useFormStatus } from 'react-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Plus, Archive, Loader2, Layers, ArrowRightLeft, Clock, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { normalizeWholeMoneyInput, preventMoneyWheel } from '@/lib/utils/money-input'
import { Switch } from '@/components/ui/switch'
import {
  crearPlanCobroAction,
  archivarPlanCobroAction,
  convertirAPlanUnicoAction,
  activarMultiPlanAction,
  type FormState,
} from '@/app/(app)/configuracion/actions'

export type PlanCobro = {
  id: string
  nombre: string
  monto: number
  frecuencia: 'mensual' | 'semanal' | 'por_visita' | 'pago_unico'
  alumnosCount?: number
}

type ArchiveModo = 'migrar' | 'pendiente'

const FRECUENCIAS: { value: PlanCobro['frecuencia']; label: string; sufijo: string }[] = [
  { value: 'mensual', label: 'Mensual', sufijo: '/mes' },
  { value: 'semanal', label: 'Semanal', sufijo: '/semana' },
  { value: 'por_visita', label: 'Por visita', sufijo: '/visita' },
]

const SUFIJO_POR_FRECUENCIA: Record<PlanCobro['frecuencia'], string> = {
  mensual: '/mes',
  semanal: '/semana',
  por_visita: '/visita',
  pago_unico: '/visita',
}

const initialState: FormState = {}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="h-10" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
      Agregar plan
    </Button>
  )
}

export function PlanesCobroSection({
  planes,
  multiPlanEnabled = false,
}: {
  planes: PlanCobro[]
  multiPlanEnabled?: boolean
}) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement | null>(null)
  const [frecuencia, setFrecuencia] = useState<PlanCobro['frecuencia']>('mensual')
  const [state, formAction] = useActionState(crearPlanCobroAction, initialState)

  // Archivar plan
  const [archivePlan, setArchivePlan] = useState<PlanCobro | null>(null)
  const [archiveModo, setArchiveModo] = useState<ArchiveModo | null>(null)
  const [destinoId, setDestinoId] = useState<string>('')
  const [isArchiving, startArchive] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Modo de operación / convertir a plan único
  const [fallbackId, setFallbackId] = useState<string>('')
  const [convertOpen, setConvertOpen] = useState(false)
  const [isConverting, startConvert] = useTransition()
  const [isActivating, startActivate] = useTransition()

  const handleToggleModo = (next: boolean) => {
    setError(null)
    if (next) {
      // OFF → ON: no requiere migración.
      startActivate(async () => {
        const res = await activarMultiPlanAction()
        if (!res.success) { setError(res.message ?? 'No se pudo activar multi-plan.'); return }
        router.refresh()
      })
    } else {
      // ON → OFF: migración bloqueante (elegir tarifa única).
      setFallbackId('')
      setConvertOpen(true)
    }
  }

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset()
      setFrecuencia('mensual')
    }
  }, [state.success])

  const otrosPlanes = archivePlan ? planes.filter((p) => p.id !== archivePlan.id) : []
  const archiveCount = archivePlan?.alumnosCount ?? 0
  const hayDestinosPlan = otrosPlanes.length > 0
  const puedeConfirmarArchive = archiveCount === 0 || archiveModo === 'pendiente' || (archiveModo === 'migrar' && !!destinoId)

  const openArchive = (p: PlanCobro) => {
    setError(null)
    setArchiveModo(null)
    setDestinoId('')
    setArchivePlan(p)
  }

  const handleArchive = () => {
    if (!archivePlan) return
    setError(null)
    const planId = archivePlan.id
    const destino = archiveModo === 'migrar' ? destinoId : null
    startArchive(async () => {
      const res = await archivarPlanCobroAction(planId, destino)
      if (!res.success) {
        setError(res.message ?? 'No se pudo archivar el plan.')
        return
      }
      setArchivePlan(null)
      setArchiveModo(null)
      setDestinoId('')
      router.refresh()
    })
  }

  const handleConvert = () => {
    if (!fallbackId) return
    setError(null)
    startConvert(async () => {
      const res = await convertirAPlanUnicoAction(fallbackId)
      if (!res.success) {
        setError(res.message ?? 'No se pudo convertir la academia.')
        return
      }
      setConvertOpen(false)
      setFallbackId('')
      router.refresh()
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Planes de cobro</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Tarifas recurrentes que asignas a los alumnos al inscribirlos. Los planes mensuales se
          cobran automáticamente cada mes.
        </p>

        {/* Lista de planes existentes */}
        <div className="space-y-2">
          {planes.length === 0 && (
            <div className="text-center py-6 px-4 border border-dashed border-border rounded-lg bg-muted/20">
              <p className="text-sm text-muted-foreground">Aún no hay planes. Crea el primero abajo.</p>
            </div>
          )}

          {planes.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-card"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{p.nombre}</p>
                <p className="text-xs text-muted-foreground">
                  ${Math.round(Number(p.monto))} {SUFIJO_POR_FRECUENCIA[p.frecuencia]}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => openArchive(p)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent flex-shrink-0"
                aria-label={`Archivar plan ${p.nombre}`}
              >
                <Archive className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {error && !archivePlan && !convertOpen && (
          <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">{error}</div>
        )}

        {/* Modo de operación: switch multi-plan */}
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#15435a] flex-shrink-0" />
              <p className="text-sm font-semibold text-foreground">Modo multi-plan</p>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {multiPlanEnabled
                ? 'Cada alumno puede tener varios planes. Apágalo para usar una tarifa única.'
                : 'Tarifa única general. Actívalo para manejar múltiples planes y horarios.'}
            </p>
          </div>
          {isActivating ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground flex-shrink-0" />
          ) : (
            <Switch checked={multiPlanEnabled} onCheckedChange={handleToggleModo} className="flex-shrink-0" />
          )}
        </div>

        {/* Form para crear un nuevo plan */}
        <form ref={formRef} action={formAction} className="space-y-3 border-t border-dashed border-border pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5 sm:col-span-1">
              <Label htmlFor="plan_nombre" className="text-xs font-semibold text-muted-foreground tracking-wider">Nombre</Label>
              <Input id="plan_nombre" name="nombre" placeholder="Ej. Mensualidad estándar" className="h-10" />
              {state?.errors?.nombre && <p className="text-sm text-red-600">{state.errors.nombre[0]}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan_monto" className="text-xs font-semibold text-muted-foreground tracking-wider">Monto ($)</Label>
              <Input
                id="plan_monto"
                name="monto"
                type="number"
                step="1"
                min="0"
                inputMode="numeric"
                placeholder="0"
                onWheel={preventMoneyWheel}
                onChange={(e) => {
                  e.currentTarget.value = normalizeWholeMoneyInput(e.currentTarget.value)
                }}
                className="h-10"
              />
              {state?.errors?.monto && <p className="text-sm text-red-600">{state.errors.monto[0]}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan_frecuencia" className="text-xs font-semibold text-muted-foreground tracking-wider">Frecuencia</Label>
              <Select value={frecuencia} onValueChange={(v) => setFrecuencia(v as PlanCobro['frecuencia'])}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FRECUENCIAS.map((f) => (<SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>))}
                </SelectContent>
              </Select>
              <input type="hidden" name="frecuencia" value={frecuencia} />
            </div>
          </div>
          {state?.message && !state.success && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">{state.message}</div>
          )}
          <div className="flex justify-end">
            <SubmitButton />
          </div>
        </form>
      </CardContent>

      {/* Drawer: Archivar plan (modal inteligente) */}
      <Drawer open={!!archivePlan} onOpenChange={(v) => { if (!v) { setArchivePlan(null); setArchiveModo(null); setDestinoId('') } }}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-sm">
            <DrawerHeader className="text-left">
              <DrawerTitle className="flex items-center gap-2"><Archive className="h-5 w-5 text-muted-foreground" /> Archivar plan</DrawerTitle>
              <DrawerDescription>
                <strong>{archivePlan?.nombre}</strong> se archivará (no se borra; el historial se conserva).
              </DrawerDescription>
            </DrawerHeader>

            <div className="p-4 pb-0 space-y-3">
              <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm text-foreground">
                <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                {archiveCount === 0 ? (
                  <span>Ningún alumno activo depende de este plan.</span>
                ) : (
                  <span><strong>{archiveCount}</strong> {archiveCount === 1 ? 'alumno activo depende' : 'alumnos activos dependen'} de este plan.</span>
                )}
              </div>

              {archiveCount > 0 && (
                <div className="space-y-2">
                  <OpcionCard
                    active={archiveModo === 'migrar'}
                    disabled={!hayDestinosPlan}
                    icon={<ArrowRightLeft className="h-4 w-4" />}
                    titulo="Mudar alumnos ahora"
                    desc={hayDestinosPlan ? 'Muévelos a otro plan activo con un solo tap.' : 'No hay otros planes activos disponibles.'}
                    onClick={() => setArchiveModo('migrar')}
                  />
                  {archiveModo === 'migrar' && hayDestinosPlan && (
                    <div className="pl-2 space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground tracking-wider">Plan destino</Label>
                      <Select value={destinoId} onValueChange={setDestinoId}>
                        <SelectTrigger className="h-11"><SelectValue placeholder="Selecciona el plan" /></SelectTrigger>
                        <SelectContent>
                          {otrosPlanes.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.nombre} — ${Math.round(Number(p.monto))} {SUFIJO_POR_FRECUENCIA[p.frecuencia]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <OpcionCard
                    active={archiveModo === 'pendiente'}
                    icon={<Clock className="h-4 w-4" />}
                    titulo="Archivar de todos modos"
                    desc="Deja a los alumnos como pendientes. No generarán cargos de este plan hasta reubicarlos."
                    onClick={() => setArchiveModo('pendiente')}
                  />
                  {archiveModo === 'pendiente' && (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
                      <Clock className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-500" />
                      <p className="text-[11px] leading-relaxed">Estos alumnos quedarán sin este plan y no generarán cargos futuros hasta que les asignes otro.</p>
                    </div>
                  )}
                </div>
              )}

              {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">{error}</div>}
            </div>

            <DrawerFooter>
              <Button onClick={handleArchive} disabled={isArchiving || !puedeConfirmarArchive} className="h-11">
                {isArchiving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Archive className="mr-2 h-4 w-4" />}
                {isArchiving ? 'Archivando...' : 'Archivar plan'}
              </Button>
              <DrawerClose asChild><Button variant="ghost" className="h-11">Cancelar</Button></DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Drawer: Convertir a plan único */}
      <Drawer open={convertOpen} onOpenChange={(v) => { if (!v) setConvertOpen(false) }}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-sm">
            <DrawerHeader className="text-left">
              <DrawerTitle className="flex items-center gap-2"><Layers className="h-5 w-5 text-[#15435a]" /> Convertir a plan único</DrawerTitle>
              <DrawerDescription>Todos los alumnos activos pasarán al plan elegido y el resto se archivará.</DrawerDescription>
            </DrawerHeader>

            <div className="p-4 pb-0 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground tracking-wider">Plan que se conserva</Label>
                <Select value={fallbackId} onValueChange={setFallbackId}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Selecciona el plan único" /></SelectTrigger>
                  <SelectContent>
                    {planes.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.nombre} — ${Math.round(Number(p.monto))} {SUFIJO_POR_FRECUENCIA[p.frecuencia]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">{error}</div>}
            </div>

            <DrawerFooter>
              <Button onClick={handleConvert} disabled={isConverting || !fallbackId} className="h-11 bg-[#15435a] hover:bg-[#0f3245]">
                {isConverting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Layers className="mr-2 h-4 w-4" />}
                {isConverting ? 'Convirtiendo...' : 'Convertir'}
              </Button>
              <DrawerClose asChild><Button variant="ghost" className="h-11">Cancelar</Button></DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </Card>
  )
}

function OpcionCard({
  active, disabled, icon, titulo, desc, onClick,
}: {
  active: boolean
  disabled?: boolean
  icon: React.ReactNode
  titulo: string
  desc: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full flex items-start gap-3 rounded-xl border p-3 text-left transition-colors',
        disabled && 'opacity-50 cursor-not-allowed',
        active ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent',
      )}
    >
      <span className={cn('mt-0.5 flex-shrink-0', active ? 'text-primary' : 'text-muted-foreground')}>{icon}</span>
      <span className="min-w-0">
        <span className={cn('block text-sm font-semibold', active ? 'text-primary' : 'text-foreground')}>{titulo}</span>
        <span className="block text-xs text-muted-foreground mt-0.5">{desc}</span>
      </span>
    </button>
  )
}
