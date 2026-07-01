'use client'

import * as React from 'react'
import { startTransition, useActionState, useEffect, useState } from 'react'
import { crearCargoIndividualAction, type FormState } from '@/app/(app)/seguimiento/actions'
import { guardarCobroFrecuenteAction } from '@/app/(app)/configuracion/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, GraduationCap } from 'lucide-react'
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

const initialState: FormState = {}

type Props = {
  personaId: string
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
  const setOpen = (v: boolean) => {
    if (isControlled) onOpenChange?.(v)
    else setInternalOpen(v)
  }

  const tieneBeca = !!becaActiva && (becaPorcentaje ?? 0) > 0
  const [aplicarBeca, setAplicarBeca] = useState(false)

  const {
    concepto, setConcepto, monto, setMonto,
    guardarEnCatalogo, setGuardarEnCatalogo, mostrarGuardar, debeGuardarEnCatalogo,
    onPick, onCreate, prefill, reset: resetCobro,
    selectedItemId, setSelectedItemId,
  } = useCobroConcepto(cobros)

  const [state, formAction, isPending] = useActionState(crearCargoIndividualAction, initialState)
  const [localError, setLocalError] = useState<string | null>(null)
  const [cobroGuardadoConExito, setCobroGuardadoConExito] = useState(false)

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAplicarBeca(false)
      setLocalError(null)
      setCobroGuardadoConExito(false)
      if (conceptoDefault || montoDefault != null) {
        prefill(conceptoDefault, montoDefault != null ? String(Math.round(montoDefault)) : '')
      } else {
        resetCobro()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (state.success) {
      const msg = state.message ?? 'Cargo generado con éxito.'
      const finalMsg = cobroGuardadoConExito 
        ? `${msg} Y se guardó "${concepto.trim()}" en el catálogo.` 
        : msg
      onSuccess?.(finalMsg)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success, cobroGuardadoConExito])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    setCobroGuardadoConExito(false)
    if (concepto.trim().length < 2) { setLocalError('El concepto es requerido.'); return }
    if (!(Number(monto) > 0)) { setLocalError('El monto debe ser mayor a 0.'); return }

    if (debeGuardarEnCatalogo) {
      try {
        const res = await guardarCobroFrecuenteAction({ id: null, concepto: concepto.trim(), monto: Number(monto) })
        if (res.success) {
          setCobroGuardadoConExito(true)
        }
      } catch { /* el cargo no se bloquea si falla guardar en catálogo */ }
    }

    const fd = new FormData()
    fd.set('persona_id', personaId)
    fd.set('origen', origen)
    fd.set('concepto', concepto.trim())
    fd.set('monto', String(Number(monto)))
    fd.set('aplicar_beca', tieneBeca && aplicarBeca ? 'true' : 'false')
    startTransition(() => formAction(fd))
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      {children && <DrawerTrigger asChild>{children}</DrawerTrigger>}
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>{tituloDrawer}</DrawerTitle>
            <DrawerDescription>
              Generará un cargo individual para este alumno.
            </DrawerDescription>
          </DrawerHeader>

          <form onSubmit={handleSubmit}>
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
                      className="h-11 pl-7"
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

              {(localError || (state?.message && !state.success)) && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
                  {localError ?? state.message}
                </div>
              )}
            </div>

            <DrawerFooter>
              <Button type="submit" className="w-full h-11" disabled={isPending}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isPending ? 'Generando...' : 'Generar cargo'}
              </Button>
              <DrawerClose asChild>
                <Button type="button" variant="outline" className="h-11">Cancelar</Button>
              </DrawerClose>
            </DrawerFooter>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
