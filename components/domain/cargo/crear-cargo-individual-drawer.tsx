'use client'

import * as React from 'react'
import { startTransition, useActionState, useEffect, useState } from 'react'
import { crearCargoYCobrarAction, type FormState } from '@/app/(app)/seguimiento/actions'
import { guardarCobroFrecuenteAction } from '@/app/(app)/configuracion/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, GraduationCap, Banknote, Landmark, ArrowLeft, ArrowRight, Search, Receipt } from 'lucide-react'
import { normalizeWholeMoneyInput, preventMoneyWheel } from '@/lib/utils/money-input'
import { ConceptoCombobox, GuardarCatalogoToggle, useCobroConcepto, type CobroFrecuente } from '@/components/ui/concepto-combobox'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { cn } from '@/lib/utils'

const initialState: FormState = {}

type AlumnoLite = { id: string; nombre: string; apellido?: string | null }

type Props = {
  personaId?: string
  personaNombre?: string
  alumnos?: AlumnoLite[]
  children?: React.ReactNode
  /** Si se pasa, modo controlado externo (el componente padre maneja el estado). */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Pre-fills opcionales (ej: "Inscripción" + monto del grupo). */
  conceptoDefault?: string
  montoDefault?: number
  /** Para diferenciar origen del cargo en BD (default: 'manual'). */
  origen?: string
  tituloDrawer?: string
  /** Beca del alumno: si está becado se ofrece aplicar el descuento a este cargo. */
  becaActiva?: boolean
  becaPorcentaje?: number
  /** Catálogo de cobros frecuentes (para el combobox del concepto). */
  cobros?: CobroFrecuente[]
  onSuccess?: (msg: string) => void
}

export function CrearCargoIndividualDrawer({
  personaId,
  personaNombre,
  alumnos = [],
  children,
  open: openProp,
  onOpenChange,
  conceptoDefault = '',
  montoDefault,
  origen = 'manual',
  tituloDrawer = 'Nuevo cargo',
  becaActiva = false,
  becaPorcentaje = 0,
  cobros = [],
  onSuccess,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = openProp !== undefined
  const open = isControlled ? openProp : internalOpen
  const setOpen = React.useCallback((v: boolean) => {
    if (isControlled) onOpenChange?.(v)
    else setInternalOpen(v)
  }, [isControlled, onOpenChange])

  const tieneBeca = !!becaActiva && (becaPorcentaje ?? 0) > 0
  const [aplicarBeca, setAplicarBeca] = useState(false)

  const {
    concepto, setConcepto, monto, setMonto,
    guardarEnCatalogo, setGuardarEnCatalogo, mostrarGuardar, debeGuardarEnCatalogo,
    onPick, onCreate, prefill, reset: resetCobro,
    selectedItemId, setSelectedItemId,
  } = useCobroConcepto(cobros)

  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [selectedPersonaLocal, setSelectedPersonaLocal] = useState<AlumnoLite | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const [state, formAction, isPending] = useActionState(crearCargoYCobrarAction, initialState)
  const [localError, setLocalError] = useState<string | null>(null)
  const [cobroGuardadoConExito, setCobroGuardadoConExito] = useState(false)

  const activePersonaId = personaId || selectedPersonaLocal?.id
  const activePersonaNombre = personaNombre || (selectedPersonaLocal ? `${selectedPersonaLocal.nombre} ${selectedPersonaLocal.apellido ?? ''}`.trim() : undefined)

  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      const initialStep = personaId ? 0 : -1
      setStep(initialStep)
      setDirection('forward')
      setSelectedPersonaLocal(null)
      setSearchQuery('')
      setAplicarBeca(false)
      setLocalError(null)
      setCobroGuardadoConExito(false)
      if (conceptoDefault || montoDefault != null) {
        prefill(conceptoDefault, montoDefault != null ? String(Math.round(montoDefault)) : '')
      } else {
        resetCobro()
      }
    }
  }

  const filtradosAlumnos = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!alumnos) return []
    const base = q
      ? alumnos.filter(a => `${a.nombre} ${a.apellido ?? ''}`.toLowerCase().includes(q))
      : alumnos
    return base.slice(0, 40)
  }, [alumnos, searchQuery])

  const prevState = React.useRef(state)

  useEffect(() => {
    if (open) prevState.current = state
  }, [open, state])

  useEffect(() => {
    if (state !== prevState.current) {
      prevState.current = state
      if (state.success && open) {
        const msg = state.message ?? 'Cargo generado.'
        const finalMsg = cobroGuardadoConExito 
          ? `${msg} Y se guardó "${concepto.trim()}" en el catálogo.` 
          : msg
        onSuccess?.(finalMsg)
        setTimeout(() => {
          setOpen(false)
        }, 0)
      }
    }
  }, [state, open, onSuccess, cobroGuardadoConExito, concepto, setOpen])

  // cobrar=false → "Solo cargar a cuenta"; cobrar=true → "Cargar y cobrar ahora".
  const enviar = async (cobrar: boolean, metodoOverride?: 'efectivo' | 'transferencia') => {
    setLocalError(null)
    setCobroGuardadoConExito(false)
    if (concepto.trim().length < 2) { setLocalError('El concepto es requerido.'); return }
    if (!(Number(monto) > 0)) { setLocalError('El monto debe ser mayor a 0.'); return }
    if (!activePersonaId) { setLocalError('No se ha seleccionado ningún alumno.'); return }

    if (debeGuardarEnCatalogo) {
      try {
        const res = await guardarCobroFrecuenteAction({ id: null, concepto: concepto.trim(), monto: Number(monto) })
        if (res.success) {
          setCobroGuardadoConExito(true)
        }
      } catch { /* el cargo no se bloquea si falla guardar en catálogo */ }
    }

    const fd = new FormData()
    fd.set('persona_id', activePersonaId)
    fd.set('origen', origen)
    fd.set('concepto', concepto.trim())
    fd.set('monto', String(Number(monto)))
    fd.set('aplicar_beca', tieneBeca && aplicarBeca ? 'true' : 'false')
    fd.set('cobrar', cobrar ? 'true' : 'false')
    if (cobrar) {
      // Pago completo en el método de pago seleccionado, atómico con el cargo.
      fd.set('metodo_pago', metodoOverride || 'efectivo')
      fd.set('idempotency_key', crypto.randomUUID())
    }
    startTransition(() => formAction(fd))
  }

  const conceptoValido = concepto.trim().length >= 2
  const montoValido = Number(monto) > 0
  const puedeContinuar = conceptoValido && montoValido

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      {children && <DrawerTrigger asChild>{children}</DrawerTrigger>}
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>
              {step === -1 
                ? 'Cargo individual' 
                : step === 0 
                  ? (activePersonaNombre ? `Nuevo cargo • ${activePersonaNombre}` : tituloDrawer) 
                  : 'Registrar cargo'}
            </DrawerTitle>
            <DrawerDescription>
              {step === -1
                ? 'Busca y selecciona al alumno.'
                : step === 0
                  ? 'Define el concepto y el monto del cargo.'
                  : 'Elige cómo registrar el cargo de este alumno.'}
            </DrawerDescription>
          </DrawerHeader>

          {/* Cuerpo del paso con animación de deslizamiento lateral */}
          <div className="relative overflow-hidden">
            <div
              key={step}
              className={cn(
                'animate-in fade-in duration-300',
                direction === 'back' ? 'slide-in-from-left-8' : 'slide-in-from-right-8',
              )}
            >
              {step === -1 && (
                <div className="p-4 pb-0 space-y-4">
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar alumno…"
                      className="h-11 pl-9 bg-white text-zinc-900 border-zinc-200 placeholder:text-zinc-400 focus-visible:ring-ring"
                      autoFocus
                    />
                  </div>

                  <div className="max-h-[35vh] overflow-y-auto space-y-1 rounded-lg border border-border p-1.5 bg-white text-zinc-900">
                    {filtradosAlumnos.map(a => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => {
                          setSelectedPersonaLocal(a)
                          setDirection('forward')
                          setStep(0)
                        }}
                        className="w-full flex items-center justify-between gap-2 px-2.5 py-2.5 rounded-md text-left hover:bg-accent hover:text-foreground transition-colors"
                      >
                        <span className="text-sm font-medium">
                          {a.nombre} {a.apellido ?? ''}
                        </span>
                      </button>
                    ))}
                    {filtradosAlumnos.length === 0 && (
                      <p className="text-xs text-muted-foreground px-2 py-3 text-center">No se encontraron alumnos.</p>
                    )}
                  </div>
                </div>
              )}

              {step === 0 && (
                <div className="p-4 pb-0 space-y-4">
                  <div className="space-y-2">
                    <ConceptoCombobox
                      id="concepto"
                      value={concepto}
                      onChange={setConcepto}
                      catalogo={cobros}
                      onPick={onPick}
                      onCreate={onCreate}
                      selectedItemId={selectedItemId}
                      setSelectedItemId={setSelectedItemId}
                      placeholder="Ej. Examen, Uniforme, Material..."
                      className="h-11"
                    />
                    {state?.errors?.concepto && <p className="text-sm text-red-600">{state.errors.concepto[0]}</p>}
                  </div>

                  {selectedItemId !== undefined && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      <Label htmlFor="monto">Monto *</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                        <Input
                          id="monto"
                          type="number"
                          step="1"
                          min="1"
                          value={monto}
                          onChange={(e) => setMonto(normalizeWholeMoneyInput(e.target.value))}
                          onWheel={preventMoneyWheel}
                          inputMode="numeric"
                          placeholder="0"
                          className="h-11 pl-7 bg-white text-zinc-900 border-zinc-200 placeholder:text-zinc-400 focus-visible:ring-ring"
                        />
                      </div>
                      {state?.errors?.monto && <p className="text-sm text-red-600">{state.errors.monto[0]}</p>}
                    </div>
                  )}

                  <GuardarCatalogoToggle
                    show={mostrarGuardar}
                    checked={guardarEnCatalogo}
                    onCheckedChange={setGuardarEnCatalogo}
                  />

                  {tieneBeca && (
                    <div className="rounded-lg border border-[#22887c]/30 bg-[#22887c]/5 p-3 space-y-2">
                      <div className="flex items-center gap-2 text-[#22887c]">
                        <GraduationCap className="h-4 w-4 flex-shrink-0" />
                        <span className="text-xs font-semibold">Este alumno tiene beca del {becaPorcentaje}%</span>
                      </div>
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <Checkbox
                          checked={aplicarBeca}
                          onCheckedChange={(c) => setAplicarBeca(c as boolean)}
                          className="mt-0.5"
                        />
                        <span className="text-xs text-foreground">
                          <span className="font-semibold">Aplicar beca a este cargo</span>
                          <span className="block text-[11px] text-muted-foreground leading-snug">
                            Si se activa, se descontará el {becaPorcentaje}% de su beca a este cobro.
                          </span>
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              )}

              {step === 1 && (
                <div className="p-4 pb-0 space-y-4">
                  {/* Tarjeta unificada del resumen */}
                  <div className="border border-border/60 bg-muted/10 p-4 rounded-xl flex items-center justify-between text-sm">
                    <div className="flex flex-col text-left min-w-0 mr-2">
                      <span className="font-bold text-foreground truncate">{concepto}</span>
                      {activePersonaNombre && (
                        <span className="text-xs text-muted-foreground truncate mt-0.5">{activePersonaNombre}</span>
                      )}
                    </div>
                    <span className="font-bold text-foreground flex-shrink-0">${monto}</span>
                  </div>

                  {/* Contenedor: Registrar como pendiente */}
                  <div className="space-y-2 w-full text-left">
                    <Label className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase block">
                      Registrar como pendiente
                    </Label>
                    <Button
                      type="button"
                      className="w-full h-11 font-semibold bg-white border border-zinc-900 text-zinc-900 hover:bg-zinc-50 rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all"
                      disabled={isPending}
                      onClick={() => enviar(false)}
                    >
                      {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Receipt className="mr-2 h-4 w-4" />}
                      Generar cargo
                    </Button>
                    <p className="text-[10px] text-muted-foreground text-center mt-1.5">
                      El cargo se generará y quedará pendiente.
                    </p>
                  </div>

                  {/* Separador con "O" en el centro */}
                  <div className="relative flex items-center justify-center py-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border/45" />
                    </div>
                    <span className="relative bg-background px-3 text-[10px] font-bold text-muted-foreground uppercase">
                      O
                    </span>
                  </div>

                  {/* Contenedor: Registrar como pagado */}
                  <div className="space-y-2 w-full text-left">
                    <Label className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase block">
                      Registrar como pagado
                    </Label>
                    <div className="flex flex-col gap-2.5 w-full">
                      <Button
                        type="button"
                        className="h-11 font-bold bg-white border border-[#22887c] text-[#22887c] hover:bg-[#22887c]/5 rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all w-full"
                        disabled={isPending}
                        onClick={() => enviar(true, 'efectivo')}
                      >
                        {isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Banknote className="h-4 w-4" />
                            <span>Efectivo</span>
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        className="h-11 font-bold bg-white border border-primary text-primary hover:bg-primary/5 rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all w-full"
                        disabled={isPending}
                        onClick={() => enviar(true, 'transferencia')}
                      >
                        {isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Landmark className="h-4 w-4" />
                            <span>Transferencia</span>
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center mt-1.5">
                      El cargo se generará y se marcará como pagado al mismo tiempo.
                    </p>
                  </div>

                  {(localError || (state?.message && !state.success)) && (
                    <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
                      {localError ?? state.message}
                    </div>
                  )}
                </div>
              )}

              {step === -1 ? (
                <DrawerFooter className="flex flex-col gap-2 mt-2">
                  <DrawerClose asChild>
                    <Button variant="ghost" className="h-11 text-muted-foreground w-full font-semibold">
                      Cerrar
                    </Button>
                  </DrawerClose>
                </DrawerFooter>
              ) : step === 0 ? (
                <DrawerFooter className="flex flex-col gap-2 mt-2">
                  <div className="flex flex-row gap-2 w-full">
                    {!personaId && alumnos.length > 0 && (
                      <Button
                        variant="outline"
                        type="button"
                        onClick={() => {
                          setDirection('back')
                          setStep(-1)
                        }}
                        className="h-11 font-semibold flex items-center justify-center gap-2"
                        style={{ flex: '0 0 30%' }}
                      >
                        <ArrowLeft className="h-4 w-4" />
                        <span>Atrás</span>
                      </Button>
                    )}
                    <Button
                      type="button"
                      disabled={!puedeContinuar}
                      onClick={() => {
                        setDirection('forward')
                        setStep(1)
                      }}
                      className="h-11 font-semibold bg-primary hover:bg-primary/90 text-white flex items-center justify-center gap-2"
                      style={{ flex: (!personaId && alumnos.length > 0) ? '0 0 70%' : '0 0 100%' }}
                    >
                      <span>Siguiente</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <DrawerClose asChild>
                    <Button variant="ghost" className="h-11 text-muted-foreground w-full font-semibold">
                      Cerrar
                    </Button>
                  </DrawerClose>
                </DrawerFooter>
              ) : (
                <DrawerFooter className="flex flex-col gap-2 mt-2">
                  <div className="flex flex-row gap-2 w-full">
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => {
                        setDirection('back')
                        setStep(0)
                      }}
                      className="h-11 font-semibold flex items-center justify-center gap-2"
                      style={{ flex: '0 0 30%' }}
                    >
                      <ArrowLeft className="h-4 w-4" />
                      <span>Atrás</span>
                    </Button>
                  </div>
                  <DrawerClose asChild>
                    <Button variant="ghost" className="h-11 text-muted-foreground w-full font-semibold">
                      Cerrar
                    </Button>
                  </DrawerClose>
                </DrawerFooter>
              )}
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
