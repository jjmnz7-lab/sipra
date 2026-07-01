'use client'

import * as React from 'react'
import { useActionState, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Loader2, Layers, Receipt, Users, GraduationCap } from 'lucide-react'
import {
  crearCargoMasivoMultigrupoAction,
  type FormState,
} from '@/app/(app)/grupos/actions'
import { guardarCobroFrecuenteAction } from '@/app/(app)/configuracion/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { ConceptoCombobox, GuardarCatalogoToggle, useCobroConcepto, type CobroFrecuente } from '@/components/ui/concepto-combobox'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer'
import { normalizeWholeMoneyInput, preventMoneyWheel } from '@/lib/utils/money-input'
import { formatCurrency } from '@/lib/utils/currency'
import { colorPorSlug } from '@/lib/constants/grupo-apariencia'
import { cn } from '@/lib/utils'

export type GrupoCargoMasivo = {
  id: string
  nombre: string
  color: string | null
  emoji: string | null
  inscripciones: {
    persona: {
      id: string
      nombre: string
      apellido: string | null
      beca_activa?: boolean
      beca_porcentaje?: number
    }
  }[]
}

interface CargoMasivoWizardProps {
  grupos: GrupoCargoMasivo[]
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Catálogo de cobros frecuentes (para el combobox del concepto). */
  cobros?: CobroFrecuente[]
  /** Se llama al generar los cargos con éxito (para mostrar un toast desde el padre). */
  onSuccess?: (msg: string) => void
}

const initialState: FormState = {}

export function CargoMasivoWizard({ grupos, open, onOpenChange, cobros = [], onSuccess }: CargoMasivoWizardProps) {
  const [state, formAction, isPending] = useActionState(crearCargoMasivoMultigrupoAction, initialState)

  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const {
    concepto, setConcepto, monto, setMonto,
    guardarEnCatalogo, setGuardarEnCatalogo, mostrarGuardar, debeGuardarEnCatalogo,
    onPick, onCreate, reset: resetCobro,
    selectedItemId, setSelectedItemId,
  } = useCobroConcepto(cobros)
  const [cobroGuardadoConExito, setCobroGuardadoConExito] = useState(false)
  // Orden = orden de selección (define el "primer grupo" para de-duplicar).
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  // Exclusiones manuales por grupo (persona_ids quitados del cobro).
  const [excludedByGrupo, setExcludedByGrupo] = useState<Record<string, string[]>>({})
  const [duplicar, setDuplicar] = useState(false)
  const [aplicarBecas, setAplicarBecas] = useState(false)
  const [loteId, setLoteId] = useState('')
  const [showConfirmation, setShowConfirmation] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  // Reset completo en cada apertura.
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStep(0)
      setDirection('forward')
      resetCobro()
      setSelectedIds([])
      setExcludedByGrupo({})
      setDuplicar(false)
      setAplicarBecas(false)
      setLoteId(crypto.randomUUID())
      setCobroGuardadoConExito(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!state.success) return
    const msg = state.message ?? 'Cargos generados con éxito.'
    const finalMsg = cobroGuardadoConExito
      ? `${msg} Y se guardó "${concepto.trim()}" en el catálogo.`
      : msg
    onSuccess?.(finalMsg)
    onOpenChange(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success, cobroGuardadoConExito])

  const selectedGrupos = useMemo(
    () => selectedIds.map((id) => grupos.find((g) => g.id === id)).filter(Boolean) as GrupoCargoMasivo[],
    [selectedIds, grupos],
  )

  // Estructura de pasos: 0=concepto, 1=grupos, 2..(N+1)=exclusión por grupo, N+2=resumen.
  const resumenStep = selectedGrupos.length + 2
  const isExclusionStep = step >= 2 && step < resumenStep
  const exclusionGrupo = isExclusionStep ? selectedGrupos[step - 2] : null

  // ── Cálculos de selección / de-duplicación ──────────────────────────────────
  const excludedSet = (gid: string) => new Set(excludedByGrupo[gid] ?? [])

  const selectedCountPorGrupo = useMemo(() => {
    const m: Record<string, number> = {}
    for (const g of selectedGrupos) {
      const ex = excludedSet(g.id)
      m[g.id] = g.inscripciones.filter((i) => !ex.has(i.persona.id)).length
    }
    return m
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGrupos, excludedByGrupo])

  // Nº de grupos seleccionados en los que cada persona está incluida (no excluida).
  const includedCountPorPersona = useMemo(() => {
    const m = new Map<string, number>()
    for (const g of selectedGrupos) {
      const ex = excludedSet(g.id)
      for (const i of g.inscripciones) {
        if (ex.has(i.persona.id)) continue
        m.set(i.persona.id, (m.get(i.persona.id) ?? 0) + 1)
      }
    }
    return m
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGrupos, excludedByGrupo])

  const totalAlumnosUnicos = useMemo(
    () => Array.from(includedCountPorPersona.values()).filter((n) => n >= 1).length,
    [includedCountPorPersona],
  )

  // Becados entre los alumnos efectivamente incluidos (para la leyenda y el opt-in).
  const becadosIncluidos = useMemo(() => {
    const becaById = new Map<string, boolean>()
    for (const g of selectedGrupos) {
      for (const i of g.inscripciones) {
        const p = i.persona
        if (p?.beca_activa && (p?.beca_porcentaje ?? 0) > 0) becaById.set(p.id, true)
      }
    }
    let n = 0
    for (const pid of includedCountPorPersona.keys()) {
      if (becaById.get(pid)) n++
    }
    return n
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGrupos, includedCountPorPersona])
  const totalCargos = useMemo(
    () => Array.from(includedCountPorPersona.values()).reduce((acc, n) => acc + n, 0),
    [includedCountPorPersona],
  )
  const duplicados = useMemo(
    () => Array.from(includedCountPorPersona.values()).filter((n) => n >= 2).length,
    [includedCountPorPersona],
  )

  // Payload de grupos para el server action (aplica de-duplicación si !duplicar).
  const gruposPayload = useMemo(() => {
    // Grupo "de cobro" de cada persona = primer grupo seleccionado donde está incluida.
    const chargedGroup = new Map<string, string>()
    if (!duplicar) {
      for (const g of selectedGrupos) {
        const ex = excludedSet(g.id)
        for (const i of g.inscripciones) {
          if (ex.has(i.persona.id)) continue
          if (!chargedGroup.has(i.persona.id)) chargedGroup.set(i.persona.id, g.id)
        }
      }
    }
    return selectedGrupos.map((g) => {
      const manual = excludedSet(g.id)
      const excluded = new Set(manual)
      if (!duplicar) {
        for (const i of g.inscripciones) {
          const pid = i.persona.id
          if (manual.has(pid)) continue
          if (chargedGroup.get(pid) !== g.id) excluded.add(pid) // se cobra en otro grupo
        }
      }
      return { grupo_id: g.id, excluded_persona_ids: Array.from(excluded) }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGrupos, excludedByGrupo, duplicar])

  // ── Navegación ───────────────────────────────────────────────────────────────
  const conceptoValido = concepto.trim().length >= 2
  const montoValido = Number(monto) > 0
  const puedeAvanzar =
    step === 0 ? conceptoValido && montoValido : step === 1 ? selectedIds.length > 0 : true

  const goNext = () => {
    if (!puedeAvanzar) return
    setDirection('forward')
    setStep((s) => Math.min(s + 1, resumenStep))
  }
  const goBack = () => {
    setDirection('back')
    setStep((s) => Math.max(s - 1, 0))
  }

  const toggleGrupo = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const togglePersona = (gid: string, pid: string, incluido: boolean) => {
    setExcludedByGrupo((prev) => {
      const cur = new Set(prev[gid] ?? [])
      if (incluido) cur.delete(pid)
      else cur.add(pid)
      return { ...prev, [gid]: Array.from(cur) }
    })
  }

  const setTodosGrupo = (g: GrupoCargoMasivo, incluir: boolean) => {
    setExcludedByGrupo((prev) => ({
      ...prev,
      [g.id]: incluir ? [] : g.inscripciones.map((i) => i.persona.id),
    }))
  }

  const tituloPaso =
    step === 0
      ? 'Cargo masivo'
      : step === 1
        ? 'Selecciona grupos'
        : isExclusionStep
          ? 'Excluir alumnos'
          : 'Resumen'

  const subtituloPaso =
    step === 0
      ? 'Define el concepto y el monto del cargo.'
      : step === 1
        ? 'Puedes elegir más de un grupo.'
        : isExclusionStep
          ? 'Desmarca a quien no deba recibir el cargo.'
          : 'Revisa antes de generar los cargos.'

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <div className="mx-auto w-full max-w-md flex flex-col overflow-hidden">
          <DrawerHeader className="text-left">
            <DrawerTitle className="truncate">{tituloPaso}</DrawerTitle>
            <DrawerDescription className="truncate">{subtituloPaso}</DrawerDescription>
            {isExclusionStep && (
              <p className="text-xs text-muted-foreground mt-2 font-medium">
                Grupo {step - 1} de {selectedGrupos.length}
              </p>
            )}
          </DrawerHeader>

          {/* Cuerpo del paso (se desliza desde la derecha al avanzar) */}
          <div className="relative overflow-hidden">
            <div
              key={step}
              className={cn(
                'px-4 max-h-[58vh] overflow-y-auto animate-in fade-in duration-300',
                direction === 'back' ? 'slide-in-from-left-8' : 'slide-in-from-right-8',
              )}
            >
              {/* Paso 0: concepto + monto */}
              {step === 0 && (
                <div className="space-y-4 pb-2">
                  <div className="space-y-2">
                    <ConceptoCombobox
                      id="cm-concepto"
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
                      <Label htmlFor="cm-monto">Monto ($)</Label>
                      <Input
                        id="cm-monto"
                        type="number"
                        step="1"
                        min="1"
                        inputMode="numeric"
                        value={monto}
                        onWheel={preventMoneyWheel}
                        onChange={(e) => setMonto(normalizeWholeMoneyInput(e.target.value))}
                        placeholder="0"
                        className="h-11"
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

              {/* Paso 1: selección múltiple de grupos */}
              {step === 1 && (
                <div className="space-y-2 pb-2">
                  {grupos.length === 0 && (
                    <p className="text-sm text-muted-foreground py-6 text-center">
                      No hay grupos activos.
                    </p>
                  )}
                  {grupos.map((g) => {
                    const selected = selectedIds.includes(g.id)
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => toggleGrupo(g.id)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors',
                          selected ? 'border-primary/50 bg-primary/5' : 'border-border hover:bg-accent',
                        )}
                      >
                        <Checkbox checked={selected} className="pointer-events-none" tabIndex={-1} />
                        <GrupoEmojiCircle slug={g.color} emoji={g.emoji} className="h-9 w-9 text-base" />
                        <span
                          className="flex-1 min-w-0 truncate text-sm font-medium"
                          style={{ color: colorPorSlug(g.color).textLight }}
                        >
                          {g.nombre}
                        </span>
                        <span className="text-xs text-muted-foreground flex-shrink-0 tabular-nums">
                          {g.inscripciones.length} {g.inscripciones.length === 1 ? 'alumno' : 'alumnos'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Pasos 2..N+1: exclusión de alumnos por grupo */}
              {isExclusionStep && exclusionGrupo && (
                <div className="space-y-2 pb-2">
                  <div className="flex items-center justify-between gap-2 sticky top-0 bg-card py-1 z-10">
                    <div className="flex items-center gap-2 min-w-0">
                      <GrupoEmojiCircle slug={exclusionGrupo.color} emoji={exclusionGrupo.emoji} className="h-8 w-8 text-sm" />
                      <span
                        className="truncate text-sm font-medium"
                        style={{ color: colorPorSlug(exclusionGrupo.color).textLight }}
                      >
                        {exclusionGrupo.nombre}
                      </span>
                      <span className="text-xs text-muted-foreground flex-shrink-0 tabular-nums">
                        ({selectedCountPorGrupo[exclusionGrupo.id] ?? 0}/{exclusionGrupo.inscripciones.length})
                      </span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => setTodosGrupo(exclusionGrupo, true)}
                        className="text-[11px] font-semibold text-primary hover:underline"
                      >
                        Todos
                      </button>
                      <span className="text-muted-foreground/40">·</span>
                      <button
                        type="button"
                        onClick={() => setTodosGrupo(exclusionGrupo, false)}
                        className="text-[11px] font-semibold text-muted-foreground hover:underline"
                      >
                        Ninguno
                      </button>
                    </div>
                  </div>

                  {exclusionGrupo.inscripciones.length === 0 && (
                    <p className="text-sm text-muted-foreground py-6 text-center">
                      Este grupo no tiene alumnos activos.
                    </p>
                  )}
                  {exclusionGrupo.inscripciones.map((ins) => {
                    const ex = excludedSet(exclusionGrupo.id)
                    const incluido = !ex.has(ins.persona.id)
                    return (
                      <label
                        key={ins.persona.id}
                        className="flex items-center gap-3 bg-muted/30 border border-border p-2.5 rounded-md cursor-pointer"
                      >
                        <Checkbox
                          checked={incluido}
                          onCheckedChange={(c) => togglePersona(exclusionGrupo.id, ins.persona.id, c as boolean)}
                        />
                        <span className="text-sm font-medium flex-1 truncate">
                          {ins.persona.nombre} {ins.persona.apellido ?? ''}
                        </span>
                      </label>
                    )
                  })}
                </div>
              )}

              {/* Paso resumen */}
              {step === resumenStep && (
                <div className="space-y-4 pb-2">
                  <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold text-foreground truncate">{concepto || '—'}</span>
                      <span className="text-sm font-bold text-foreground tabular-nums flex-shrink-0">
                        {montoValido ? formatCurrency(Number(monto)) : '—'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {selectedGrupos.map((g) => (
                      <div
                        key={g.id}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card"
                      >
                        <GrupoEmojiCircle slug={g.color} emoji={g.emoji} className="h-8 w-8 text-sm" />
                        <span
                          className="flex-1 min-w-0 truncate text-sm font-medium"
                          style={{ color: colorPorSlug(g.color).textLight }}
                        >
                          {g.nombre}
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground flex-shrink-0 tabular-nums">
                          {selectedCountPorGrupo[g.id] ?? 0}{' '}
                          {(selectedCountPorGrupo[g.id] ?? 0) === 1 ? 'alumno' : 'alumnos'}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">Total a aplicar</span>
                      <span className="text-base font-bold text-primary tabular-nums">
                        {totalCargos} {totalCargos === 1 ? 'cargo' : 'cargos'}
                      </span>
                    </div>
                    {duplicados > 0 && (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {duplicar
                          ? `${totalAlumnosUnicos} alumnos · ${duplicados} en varios grupos (cargo por cada grupo).`
                          : `${duplicados} ${duplicados === 1 ? 'alumno está' : 'alumnos están'} en varios grupos y recibirá${duplicados === 1 ? '' : 'n'} un solo cargo.`}
                      </p>
                    )}
                  </div>

                  {/* Toggle duplicar (solo si hay alumnos en varios grupos) */}
                  {duplicados > 0 && (
                    <div
                      className="flex items-start gap-3 p-3 bg-secondary/35 rounded-xl border border-border/60 cursor-pointer select-none"
                      onClick={() => setDuplicar((v) => !v)}
                    >
                      <Layers className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground">Duplicar cargo en cada grupo</p>
                        <p className="text-[11px] text-muted-foreground leading-snug">
                          Si un alumno está en varios grupos, recibe un cargo por cada uno (p. ej. inscripciones).
                        </p>
                      </div>
                      <Switch
                        checked={duplicar}
                        onCheckedChange={(c) => setDuplicar(!!c)}
                        onClick={(e) => e.stopPropagation()}
                        className="data-checked:!bg-primary mt-0.5"
                      />
                    </div>
                  )}

                  {/* Opt-in de becas (solo si hay becados entre los incluidos) */}
                  {becadosIncluidos > 0 && (
                    <div className="rounded-xl border border-[#22887c]/30 bg-[#22887c]/5 p-3 space-y-2">
                      <div className="flex items-center gap-2 text-[#22887c]">
                        <GraduationCap className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                        <span className="text-xs font-semibold">
                          {becadosIncluidos === 1 ? 'Hay 1 alumno con beca' : `Hay ${becadosIncluidos} alumnos con beca`}
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
                    <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200 dark:bg-red-900/25 dark:text-red-300 dark:border-red-800/50">
                      {state.message}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Formulario oculto para el envío (resumenStep) */}
          {step === resumenStep && (
            <form ref={formRef} action={formAction} className="hidden">
              <input type="hidden" name="lote_id" value={loteId} />
              <input type="hidden" name="concepto" value={concepto} />
              <input type="hidden" name="monto" value={monto} />
              <input type="hidden" name="grupos" value={JSON.stringify(gruposPayload)} />
              <input type="hidden" name="aplicar_becas" value={becadosIncluidos > 0 && aplicarBecas ? 'true' : 'false'} />
            </form>
          )}

          {/* Footer de navegación / envío */}
          <div className="p-4 pt-3 mt-auto">
            {step < resumenStep ? (
              <div className="flex gap-2">
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
                  <Button type="button" className="h-11 flex-1" onClick={goNext} disabled={!puedeAvanzar}>
                    Siguiente
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {/* Nota de confirmación inline */}
                {showConfirmation && (
                  <div className="rounded-lg border border-primary bg-white dark:bg-background px-3 py-2.5 text-xs text-primary text-center animate-in fade-in slide-in-from-bottom-2 duration-150">
                    <p className="font-semibold">¿Confirmar generación de cargos?</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11"
                    style={{ flex: '0 0 30%' }}
                    onClick={showConfirmation ? () => setShowConfirmation(false) : goBack}
                  >
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    {showConfirmation ? 'Cancelar' : 'Atrás'}
                  </Button>
                  <Button
                    type="button"
                    className="h-11"
                    style={{ flex: '0 0 70%' }}
                    disabled={isPending || totalCargos === 0}
                    onClick={showConfirmation
                      ? async () => {
                          setCobroGuardadoConExito(false)
                          if (debeGuardarEnCatalogo) {
                            try {
                              const res = await guardarCobroFrecuenteAction({ id: null, concepto: concepto.trim(), monto: Number(monto || '0') })
                              if (res.success) {
                                setCobroGuardadoConExito(true)
                              }
                            } catch { /* el cargo no se bloquea si falla guardar en catálogo */ }
                          }
                          formRef.current?.requestSubmit()
                        }
                      : () => setShowConfirmation(true)
                    }
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generando cargos…
                      </>
                    ) : (
                      <>
                        <IconoCargoMasivo className="mr-2" />
                        {showConfirmation ? 'Confirmar' : 'Generar cargos'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

/** Ícono compuesto: grupo (Users) + cargo masivo (Receipt) superpuesto en esquina inferior derecha. */
function IconoCargoMasivo({ className }: { className?: string }) {
  return (
    <span className={cn('relative inline-flex items-center justify-center', className)}>
      <Users className="h-4 w-4" />
      <Receipt className="absolute -bottom-1 -right-1.5 h-2.5 w-2.5 bg-primary text-primary-foreground rounded-sm p-[1px]" />
    </span>
  )
}

/** Emoji del grupo dentro de un círculo con su color (igual que en la pantalla Grupos). */
function GrupoEmojiCircle({
  slug,
  emoji,
  className,
}: {
  slug?: string | null
  emoji?: string | null
  className?: string
}) {
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
