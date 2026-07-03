'use client'

import * as React from 'react'
import { startTransition, useActionState, useEffect, useState } from 'react'
import { crearCargoGrupalAction, type FormState } from '@/app/(app)/grupos/actions'
import { guardarCobroFrecuenteAction } from '@/app/(app)/configuracion/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft, ArrowRight, Loader2, Banknote, GraduationCap, Users, Receipt } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency'
import { normalizeWholeMoneyInput, preventMoneyWheel } from '@/lib/utils/money-input'
import { ConceptoCombobox, GuardarCatalogoToggle, useCobroConcepto, type CobroFrecuente } from '@/components/ui/concepto-combobox'
import { cn } from '@/lib/utils'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'

const initialState: FormState = {}

interface PersonaBeca {
  id: string
  nombre?: string
  apellido?: string
  beca_activa?: boolean
  beca_porcentaje?: number
}

interface InscripcionConPersona {
  persona: PersonaBeca
}

interface MassCargoDrawerProps {
  grupoId: string
  inscripciones: InscripcionConPersona[]
  /** Controlado desde el padre (opcional). Si se omite, el drawer se autocontrola y renderiza su trigger por defecto. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Se llama al generar los cargos con éxito (para mostrar un toast desde el padre). */
  onSuccess?: (msg: string) => void
  /** Catálogo de cobros frecuentes (para el combobox del concepto). */
  cobros?: CobroFrecuente[]
  /** Título del drawer (default "Cargo grupal"). */
  titulo?: string
}

export function MassCargoDrawer({
  grupoId,
  inscripciones,
  open: controlledOpen,
  onOpenChange,
  onSuccess,
  cobros = [],
  titulo = 'Cargo grupal',
}: MassCargoDrawerProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen
  const setOpen = isControlled && onOpenChange ? onOpenChange : setUncontrolledOpen
  const [state, formAction, isPending] = useActionState(crearCargoGrupalAction, initialState)

  // Flujo de 3 pasos: 0 = concepto + monto, 1 = selección de alumnos, 2 = resumen.
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')

  const {
    concepto, setConcepto, monto, setMonto,
    guardarEnCatalogo, setGuardarEnCatalogo, mostrarGuardar, debeGuardarEnCatalogo,
    onPick, onCreate, reset: resetCobro,
    selectedItemId, setSelectedItemId,
  } = useCobroConcepto(cobros)
  const [cobroGuardadoConExito, setCobroGuardadoConExito] = useState(false)

  // Por defecto todos los alumnos están marcados para el cobro.
  const allIds = inscripciones.map((i) => i.persona.id)
  const [selectedIds, setSelectedIds] = useState<string[]>(allIds)
  const [idempotencyKey, setIdempotencyKey] = useState('')
  const [aplicarBecas, setAplicarBecas] = useState(false)

  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setStep(0)
      setDirection('forward')
      resetCobro()
      setSelectedIds(inscripciones.map((i) => i.persona.id))
      // Llave de idempotencia nueva en cada apertura del cajón.
      setIdempotencyKey(crypto.randomUUID())
      setAplicarBecas(false)
      setCobroGuardadoConExito(false)
    }
  }

  // Alumnos becados entre los seleccionados (para la leyenda y el opt-in).
  const becadosSeleccionados = inscripciones.filter(
    (i) => selectedIds.includes(i.persona.id) && i.persona?.beca_activa && (i.persona?.beca_porcentaje ?? 0) > 0,
  ).length

  useEffect(() => {
    if (!state.success) return
    const msg = state.message ?? 'Cargos generados con éxito.'
    const finalMsg = cobroGuardadoConExito
      ? `${msg} Y se guardó "${concepto.trim()}" en el catálogo.`
      : msg
    onSuccess?.(finalMsg)
    setTimeout(() => {
      setOpen(false)
    }, 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success, cobroGuardadoConExito])

  const togglePersona = (id: string, isChecked: boolean) => {
    setSelectedIds((prev) => (isChecked ? [...prev, id] : prev.filter((x) => x !== id)))
  }

  const excludedIds = allIds.filter((id) => !selectedIds.includes(id))

  const conceptoValido = concepto.trim().length >= 2
  const montoValido = Number(monto) > 0
  const puedeAvanzar = conceptoValido && montoValido

  const resumenStep = 2
  const goNext = () => { if (!puedeAvanzar) return; setDirection('forward'); setStep((s) => Math.min(s + 1, resumenStep)) }
  const goBack = () => { setDirection('back'); setStep((s) => Math.max(s - 1, 0)) }

  const handleGenerar = async () => {
    setCobroGuardadoConExito(false)
    if (debeGuardarEnCatalogo) {
      try {
        const res = await guardarCobroFrecuenteAction({ id: null, concepto: concepto.trim(), monto: Number(monto) })
        if (res.success) {
          setCobroGuardadoConExito(true)
        }
      } catch { /* el cargo no se bloquea si falla guardar en catálogo */ }
    }
    const fd = new FormData()
    fd.set('grupo_id', grupoId)
    fd.set('concepto', concepto.trim())
    fd.set('monto', String(Number(monto)))
    fd.set('excluded_persona_ids', JSON.stringify(excludedIds))
    fd.set('idempotency_key', idempotencyKey)
    fd.set('aplicar_becas', becadosSeleccionados > 0 && aplicarBecas ? 'true' : 'false')
    startTransition(() => formAction(fd))
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DrawerTrigger asChild>
          <button className="flex flex-col items-center justify-center bg-card border border-border rounded-xl p-3 hover:bg-accent hover:text-accent-foreground transition-colors">
            <Banknote className="h-5 w-5 text-primary mb-1" />
            <span className="text-[10px] font-bold text-foreground">Nuevo cargo</span>
          </button>
        </DrawerTrigger>
      )}
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader className="text-left">
            <DrawerTitle>{step === 0 ? titulo : step === 1 ? 'Selecciona alumnos' : 'Resumen'}</DrawerTitle>
            <DrawerDescription>
              {step === 0
                ? 'Define el concepto y el monto del cargo.'
                : step === 1
                  ? 'Desmarca a quien no deba recibir el cargo.'
                  : 'Revisa antes de generar los cargos.'}
            </DrawerDescription>
          </DrawerHeader>

          {/* Cuerpo del paso (se desliza desde la derecha al avanzar) */}
          <div className="relative overflow-hidden">
            <div
              key={step}
              className={cn(
                'px-4 max-h-[60vh] overflow-y-auto animate-in fade-in duration-300',
                direction === 'back' ? 'slide-in-from-left-8' : 'slide-in-from-right-8',
              )}
            >
              {/* Paso 0: concepto + monto */}
              {step === 0 && (
                <div className="space-y-4 pb-2">
                  <div className="space-y-2">
                    <ConceptoCombobox
                      id="mc-concepto"
                      value={concepto}
                      onChange={setConcepto}
                      catalogo={cobros}
                      onPick={onPick}
                      onCreate={onCreate}
                      selectedItemId={selectedItemId}
                      setSelectedItemId={setSelectedItemId}
                      placeholder="Ej. Inscripción torneo"
                      className="h-11"
                      autoFocus
                    />
                  </div>
                  {selectedItemId !== undefined && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      <Label htmlFor="mc-monto">Monto ($)</Label>
                      <Input
                        id="mc-monto"
                        type="number"
                        step="1"
                        min="1"
                        inputMode="numeric"
                        value={monto}
                        onWheel={preventMoneyWheel}
                        onChange={(e) => setMonto(normalizeWholeMoneyInput(e.target.value))}
                        placeholder="0"
                        className="h-11 bg-white text-zinc-900 border-zinc-200 placeholder:text-zinc-400 focus-visible:ring-ring"
                      />
                    </div>
                  )}
                  <GuardarCatalogoToggle
                    show={mostrarGuardar}
                    checked={guardarEnCatalogo}
                    onCheckedChange={setGuardarEnCatalogo}
                  />
                </div>
              )}

              {/* Paso 1: selección de alumnos */}
              {step === 1 && (
                <div className="space-y-4 pb-2 animate-in fade-in duration-200">
                  <div>
                    <Label className="mb-2 block">Aplicar a ({selectedIds.length}/{allIds.length})</Label>
                    <div className="space-y-2">
                      {inscripciones.map((ins) => (
                        <div key={ins.persona.id} className="flex items-center space-x-2 bg-muted/30 border border-border p-2 rounded-md">
                          <Checkbox
                            id={`chk-${ins.persona.id}`}
                            checked={selectedIds.includes(ins.persona.id)}
                            onCheckedChange={(checked) => togglePersona(ins.persona.id, checked as boolean)}
                          />
                          <label
                            htmlFor={`chk-${ins.persona.id}`}
                            className="text-sm font-medium leading-none flex-1 truncate cursor-pointer"
                          >
                            {ins.persona.nombre} {ins.persona.apellido}
                          </label>
                        </div>
                      ))}
                      {inscripciones.length === 0 && (
                        <p className="text-sm text-muted-foreground py-6 text-center">Este grupo no tiene alumnos activos.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Paso 2: Resumen */}
              {step === 2 && (
                <div className="space-y-4 pb-2 animate-in fade-in duration-200">
                  <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold text-foreground truncate">{concepto || '—'}</span>
                      <span className="text-sm font-bold text-foreground tabular-nums flex-shrink-0">
                        {formatCurrency(Number(monto || '0'))}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">Total a aplicar</span>
                      <span className="text-base font-bold text-primary tabular-nums">
                        {selectedIds.length} {selectedIds.length === 1 ? 'cargo' : 'cargos'}
                      </span>
                    </div>
                  </div>

                  {becadosSeleccionados > 0 && (
                    <div className="rounded-lg border border-[#22887c]/30 bg-[#22887c]/5 p-3 space-y-2">
                      <div className="flex items-center gap-2 text-[#22887c]">
                        <GraduationCap className="h-4 w-4 flex-shrink-0" />
                        <span className="text-xs font-semibold">
                          {becadosSeleccionados === 1 ? 'Hay 1 alumno con beca' : `Hay ${becadosSeleccionados} alumnos con beca`}
                        </span>
                      </div>
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <Checkbox
                          checked={aplicarBecas}
                          onCheckedChange={(c) => setAplicarBecas(c as boolean)}
                          className="mt-0.5"
                        />
                        <span className="text-xs text-foreground">
                          <span className="font-semibold">Aplicar becas a este cargo</span>
                          <span className="block text-[11px] text-muted-foreground leading-snug">
                            Si se activa, los alumnos con beca recibirán automáticamente el descuento de su porcentaje en este cobro.
                          </span>
                        </span>
                      </label>
                    </div>
                  )}

                  {state?.message && !state.success && (
                    <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
                      {state.message}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <DrawerFooter className="mt-2">
            {step < resumenStep ? (
              <div className="flex gap-2 w-full">
                {step > 0 ? (
                  <>
                    <Button type="button" variant="outline" className="h-11" style={{ flex: '0 0 30%' }} onClick={goBack}>
                      <ArrowLeft className="mr-1 h-4 w-4" />
                      Atrás
                    </Button>
                    <Button type="button" className="h-11" style={{ flex: '0 0 70%' }} onClick={goNext} disabled={!puedeAvanzar}>
                      Siguiente
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <Button type="button" className="w-full h-11" onClick={goNext} disabled={!puedeAvanzar}>
                    Siguiente
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex gap-2 w-full">
                <Button type="button" variant="outline" className="h-11" style={{ flex: '0 0 30%' }} onClick={goBack}>
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Atrás
                </Button>
                <Button
                  type="button"
                  className="h-11"
                  style={{ flex: '0 0 70%' }}
                  onClick={handleGenerar}
                  disabled={isPending || selectedIds.length === 0}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generando cargos…
                    </>
                  ) : (
                    <>
                      <IconoCargoGrupal className="mr-2" />
                      Generar cargos
                    </>
                  )}
                </Button>
              </div>
            )}
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

function IconoCargoGrupal({ className }: { className?: string }) {
  return (
    <span className={cn('relative inline-flex items-center justify-center', className)}>
      <Users className="h-4 w-4" />
      <Receipt className="absolute -bottom-1 -right-1.5 h-2.5 w-2.5 bg-primary text-primary-foreground rounded-sm p-[1px]" />
    </span>
  )
}
