'use client'

import * as React from 'react'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
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
import { Plus, Pencil, Archive, Trash2, Loader2, ArrowRightLeft, Clock, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseWholeMoneyInput, preventMoneyWheel } from '@/lib/utils/money-input'
import { useToast } from '@/components/ui/use-toast'
import { MesesCobroSection } from '@/components/domain/configuracion/meses-cobro-section'
import { ProrrateoBlock } from '@/components/domain/configuracion/cobranza-form-section'
import {
  guardarPlanCobroAction,
  archivarPlanCobroAction,
  eliminarPlanDefinitivoAction,
} from '@/app/(app)/configuracion/actions'

export type PlanCobro = {
  id: string
  nombre: string
  monto: number
  frecuencia: 'mensual' | 'semanal' | 'por_visita' | 'pago_unico'
  /** Alumnos ACTIVOS vinculados (para el archivado inteligente). */
  alumnosCount?: number
  /** Vínculos totales en alumno_planes (cualquier estado). 0 ⇒ se puede eliminar. */
  vinculosCount?: number
}

type ArchiveModo = 'migrar' | 'pendiente'
type Draft = { id: string | null; nombre: string; monto: number | '' }

const SUFIJO_POR_FRECUENCIA: Record<PlanCobro['frecuencia'], string> = {
  mensual: '/mes',
  semanal: '/semana',
  por_visita: '/visita',
  pago_unico: '/visita',
}

export function PlanesCobroSection({
  planes,
  initialMesesSinCobro,
  initialCobro,
}: {
  planes: PlanCobro[]
  initialMesesSinCobro: number[]
  initialCobro?: any
}) {
  const router = useRouter()
  const { showToast, toast } = useToast()

  // Crear / editar plan
  const [draft, setDraft] = useState<Draft | null>(null)

  // Archivar plan
  const [archivePlan, setArchivePlan] = useState<PlanCobro | null>(null)
  const [archiveModo, setArchiveModo] = useState<ArchiveModo | null>(null)
  const [destinoId, setDestinoId] = useState<string>('')

  // Eliminar plan
  const [deletePlan, setDeletePlan] = useState<PlanCobro | null>(null)

  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const openAdd = () => { setError(null); setDraft({ id: null, nombre: '', monto: '' }) }
  const openEdit = (p: PlanCobro) => { setError(null); setDraft({ id: p.id, nombre: p.nombre, monto: Math.round(Number(p.monto)) }) }

  const conceptoValido = draft != null && draft.nombre.trim().length >= 2
  const montoValido = draft != null && typeof draft.monto === 'number' && draft.monto >= 0

  const guardarPlan = () => {
    if (!draft) return
    setError(null)
    const monto = typeof draft.monto === 'number' ? draft.monto : 0
    startTransition(async () => {
      const res = await guardarPlanCobroAction({ id: draft.id, nombre: draft.nombre.trim(), monto })
      if (!res.success) { setError(res.message ?? 'No se pudo guardar.'); return }
      const wasEdit = !!draft.id
      setDraft(null)
      showToast(wasEdit ? 'Plan actualizado.' : 'Plan creado.')
      router.refresh()
    })
  }

  // -- Archivar --
  const otrosPlanes = archivePlan ? planes.filter((p) => p.id !== archivePlan.id) : []
  const archiveCount = archivePlan?.alumnosCount ?? 0
  const hayDestinosPlan = otrosPlanes.length > 0
  const puedeConfirmarArchive =
    archiveCount === 0 || archiveModo === 'pendiente' || (archiveModo === 'migrar' && !!destinoId)

  const openArchive = (p: PlanCobro) => {
    setError(null); setArchiveModo(null); setDestinoId(''); setArchivePlan(p)
  }

  const handleArchive = () => {
    if (!archivePlan) return
    setError(null)
    const planId = archivePlan.id
    const destino = archiveModo === 'migrar' ? destinoId : null
    startTransition(async () => {
      const res = await archivarPlanCobroAction(planId, destino)
      if (!res.success) { setError(res.message ?? 'No se pudo archivar el plan.'); return }
      setArchivePlan(null); setArchiveModo(null); setDestinoId('')
      showToast(destino ? 'Plan archivado y alumnos migrados.' : 'Plan archivado.')
      router.refresh()
    })
  }

  // -- Eliminar --
  const handleDelete = () => {
    if (!deletePlan) return
    setError(null)
    const planId = deletePlan.id
    startTransition(async () => {
      const res = await eliminarPlanDefinitivoAction(planId)
      if (!res.success) { setError(res.message ?? 'No se pudo eliminar el plan.'); return }
      setDeletePlan(null)
      showToast('Plan eliminado.')
      router.refresh()
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-lg">Planes de Cobro Mensual</CardTitle>
          <Button type="button" size="sm" onClick={openAdd} className="h-9 flex-shrink-0">
            <Plus className="h-4 w-4 mr-1" /> Agregar plan
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Los planes mensuales se cobran automáticamente cada día 1ro de mes.
        </p>

        <div className="space-y-2">
          {planes.length === 0 && (
            <div className="text-center py-6 px-4 border border-dashed border-border rounded-lg bg-muted/20">
              <p className="text-sm text-muted-foreground">Aún no hay planes. Agrega el primero.</p>
            </div>
          )}

          {planes.map((p) => {
            const eliminable = (p.vinculosCount ?? 0) === 0
            return (
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
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    type="button" variant="ghost" size="icon"
                    onClick={() => openEdit(p)}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent"
                    aria-label={`Editar plan ${p.nombre}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button" variant="ghost" size="icon"
                    onClick={() => openArchive(p)}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent"
                    aria-label={`Archivar plan ${p.nombre}`}
                  >
                    <Archive className="h-4 w-4" />
                  </Button>
                  {eliminable && (
                    <Button
                      type="button" variant="ghost" size="icon"
                      onClick={() => { setError(null); setDeletePlan(p) }}
                      className="h-8 w-8 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                      aria-label={`Eliminar plan ${p.nombre}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {error && !draft && !archivePlan && !deletePlan && (
          <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">{error}</div>
        )}

        {/* Meses de cobro (subsección sin título propio) */}
        <div className="border-t border-border pt-4">
          <MesesCobroSection initialMeses={initialMesesSinCobro} />
        </div>

        {/* ¿Qué pasa si un alumno entra con el mes ya iniciado? (Prorrateo) */}
        <div className="border-t border-border pt-4">
          <ProrrateoBlock initialConfig={initialCobro} />
        </div>
      </CardContent>

      {/* Drawer: crear / editar plan */}
      <Drawer open={!!draft} onOpenChange={(v) => { if (!v) setDraft(null) }}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-sm">
            <DrawerHeader className="text-left">
              <DrawerTitle>{draft?.id ? 'Editar plan' : 'Nuevo plan mensual'}</DrawerTitle>
              <DrawerDescription>
                {draft?.id
                  ? 'Cambiar el costo aplicará solo a los nuevos cargos; los ya generados no cambian.'
                  : 'Tarifa mensual recurrente que asignas a los alumnos al inscribirlos.'}
              </DrawerDescription>
            </DrawerHeader>

            {draft && (
              <div className="p-4 pb-0 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="plan_nombre">Nombre</Label>
                  <Input
                    id="plan_nombre"
                    value={draft.nombre}
                    onChange={(e) => setDraft({ ...draft, nombre: e.target.value })}
                    placeholder="Ej. Mensualidad estándar"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plan_monto">Costo mensual ($)</Label>
                  <Input
                    id="plan_monto"
                    type="number"
                    step="1"
                    min="0"
                    inputMode="numeric"
                    value={draft.monto}
                    placeholder="0"
                    onWheel={preventMoneyWheel}
                    onChange={(e) => setDraft({ ...draft, monto: parseWholeMoneyInput(e.target.value) })}
                    className="h-11"
                  />
                </div>
                {error && (
                  <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">{error}</div>
                )}
              </div>
            )}

            <DrawerFooter className="flex flex-row gap-2 mt-4">
              <DrawerClose asChild>
                <Button type="button" variant="outline" className="flex-1 h-11">Cancelar</Button>
              </DrawerClose>
              <Button type="button" onClick={guardarPlan} disabled={isPending || !conceptoValido || !montoValido} className="flex-1 h-11">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Drawer: archivar plan (inteligente) */}
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
                  <div className={cn('rounded-xl border transition-colors', archiveModo === 'migrar' ? 'border-primary bg-primary/5' : 'border-border')}>
                    <OpcionCardButton
                      active={archiveModo === 'migrar'}
                      disabled={!hayDestinosPlan}
                      icon={<ArrowRightLeft className="h-4 w-4" />}
                      titulo="Mudar alumnos ahora"
                      desc={hayDestinosPlan ? 'Muévelos a otro plan activo con un solo tap.' : 'No hay otros planes activos disponibles.'}
                      onClick={() => setArchiveModo('migrar')}
                    />
                    {archiveModo === 'migrar' && hayDestinosPlan && (
                      <div className="px-3 pb-3 pt-2 mx-3 mb-1 border-t border-dashed border-primary/30 space-y-1.5">
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
                  </div>

                  <div className={cn('rounded-xl border transition-colors', archiveModo === 'pendiente' ? 'border-primary bg-primary/5' : 'border-border')}>
                    <OpcionCardButton
                      active={archiveModo === 'pendiente'}
                      icon={<Clock className="h-4 w-4" />}
                      titulo="Archivar de todos modos"
                      desc="Deja a los alumnos como pendientes. No generarán cargos de este plan hasta reubicarlos."
                      onClick={() => setArchiveModo('pendiente')}
                    />
                    {archiveModo === 'pendiente' && (
                      <div className="px-3 pb-3 pt-2 mx-3 mb-1 border-t border-dashed border-amber-300 flex items-start gap-2 text-amber-800">
                        <Clock className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-500" />
                        <p className="text-[11px] leading-relaxed">Estos alumnos quedarán sin este plan y no generarán cargos futuros hasta que les asignes otro.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">{error}</div>}
            </div>

            <DrawerFooter className="flex flex-row gap-2 mt-4">
              <DrawerClose asChild>
                <Button type="button" variant="outline" className="flex-1 h-11">Cancelar</Button>
              </DrawerClose>
              <Button type="button" onClick={handleArchive} disabled={isPending || !puedeConfirmarArchive} className="flex-1 h-11">
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Archive className="mr-2 h-4 w-4" />}
                {isPending ? 'Archivando…' : 'Archivar plan'}
              </Button>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Drawer: eliminar plan definitivamente */}
      <Drawer open={!!deletePlan} onOpenChange={(v) => { if (!v) setDeletePlan(null) }}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-sm">
            <DrawerHeader className="text-left">
              <DrawerTitle className="flex items-center gap-2"><Trash2 className="h-5 w-5 text-destructive" /> Eliminar plan</DrawerTitle>
              <DrawerDescription>
                <strong>{deletePlan?.nombre}</strong> se eliminará de forma definitiva. Esta acción no se puede deshacer.
              </DrawerDescription>
            </DrawerHeader>
            <div className="p-4 pb-0">
              {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">{error}</div>}
            </div>
            <DrawerFooter className="flex flex-row gap-2 mt-4">
              <DrawerClose asChild>
                <Button type="button" variant="outline" className="flex-1 h-11">Cancelar</Button>
              </DrawerClose>
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={isPending} className="flex-1 h-11">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Eliminar
              </Button>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>

      {toast}
    </Card>
  )
}

function OpcionCardButton({
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
      className={cn('w-full flex items-start gap-3 p-3 text-left transition-colors rounded-xl', disabled && 'opacity-50 cursor-not-allowed')}
    >
      <span className={cn('mt-0.5 flex-shrink-0', active ? 'text-primary' : 'text-muted-foreground')}>{icon}</span>
      <span className="min-w-0">
        <span className={cn('block text-sm font-semibold', active ? 'text-primary' : 'text-foreground')}>{titulo}</span>
        <span className="block text-xs text-muted-foreground mt-0.5">{desc}</span>
      </span>
    </button>
  )
}
