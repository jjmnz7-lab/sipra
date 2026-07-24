'use client'

import * as React from 'react'
import { useActionState, useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { SectionFooter } from '@/components/domain/configuracion/section-footer'
import { useDirtySection } from '@/components/domain/configuracion/use-dirty-section'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import {
  guardarEstadosPagoAction,
  type FormState,
} from '@/app/(app)/configuracion/actions'

type EstadosPagoState = {
  dia_atrasado: number
  dia_urgente: number
}

const ATRASADO_HEX = '#B85C50'
const URGENTE_HEX = '#7A2F38'
const MIN_SEPARACION = 4

function deriveInitialEstadosPago(initialConfig: any): EstadosPagoState {
  const diaAtrasado = Math.min(28, Math.max(1, Number(initialConfig?.dia_atrasado) || 6))
  
  let diaUrgente = 20
  if (initialConfig?.dia_urgente) {
    diaUrgente = Math.min(31, Math.max(5, Number(initialConfig.dia_urgente)))
  } else if (initialConfig?.marcar_critico?.dia_umbral) {
    diaUrgente = Math.min(31, Math.max(5, Number(initialConfig.marcar_critico.dia_umbral)))
  }

  if (diaUrgente < diaAtrasado + MIN_SEPARACION) {
    diaUrgente = diaAtrasado + MIN_SEPARACION
  }

  return {
    dia_atrasado: diaAtrasado,
    dia_urgente: diaUrgente,
  }
}

const initialFormState: FormState = {}

export function EstadosPagoSection({ initialConfig }: { initialConfig: any }) {
  const initial = useMemo(() => deriveInitialEstadosPago(initialConfig), [initialConfig])

  const [diaAtrasado, setDiaAtrasado] = useState<number>(initial.dia_atrasado)
  const [diaUrgente, setDiaUrgente] = useState<number>(initial.dia_urgente)

  const [atrasadoSheetOpen, setAtrasadoSheetOpen] = useState(false)
  const [urgenteSheetOpen, setUrgenteSheetOpen] = useState(false)

  const current: EstadosPagoState = {
    dia_atrasado: diaAtrasado,
    dia_urgente: diaUrgente,
  }

  const { dirty, snapshot, commitSnapshot } = useDirtySection(current, initial)
  const [state, formAction] = useActionState(guardarEstadosPagoAction, initialFormState)

  useEffect(() => {
    if (state.success) commitSnapshot()
  }, [state.success, commitSnapshot])

  const onCancel = () => {
    setDiaAtrasado(snapshot.dia_atrasado)
    setDiaUrgente(snapshot.dia_urgente)
  }

  const configJson = useMemo(
    () =>
      JSON.stringify({
        dia_atrasado: diaAtrasado,
        dia_urgente: diaUrgente,
      }),
    [diaAtrasado, diaUrgente]
  )

  const selectDiaAtrasado = (d: number) => {
    setDiaAtrasado(d)
    if (diaUrgente < d + MIN_SEPARACION) {
      setDiaUrgente(Math.min(31, d + MIN_SEPARACION))
    }
    setAtrasadoSheetOpen(false)
  }

  const selectDiaUrgente = (d: number) => {
    setDiaUrgente(d)
    if (diaAtrasado > d - MIN_SEPARACION) {
      setDiaAtrasado(Math.max(1, d - MIN_SEPARACION))
    }
    setUrgenteSheetOpen(false)
  }

  const maxAtrasadoPermitido = diaUrgente - MIN_SEPARACION
  const minUrgentePermitido = diaAtrasado + MIN_SEPARACION

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Estados de pago</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="config_estados_pago_json" value={configJson} />

          {/* Campo Atrasado */}
          <div className="flex items-start gap-3 py-2 border-b border-border/60">
            <div className="flex items-center flex-wrap gap-x-1.5 gap-y-1 text-sm leading-relaxed">
              <span className="text-foreground">El alumno se marca como</span>
              <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ATRASADO_HEX }} aria-hidden />
                &ldquo;Atrasado&rdquo;
              </span>
              <span className="text-foreground">a partir del día</span>
              <button
                type="button"
                onClick={() => setAtrasadoSheetOpen(true)}
                className="inline-flex items-center justify-center h-8 min-w-[2.75rem] px-2 rounded-md border border-input bg-background text-foreground hover:bg-muted/40 text-sm font-medium transition-colors"
              >
                {diaAtrasado}
              </button>
              <span className="text-foreground">sin registrarse el pago.</span>
            </div>
          </div>

          {/* Campo Urgente */}
          <div className="flex items-start gap-3 py-2">
            <div className="flex items-center flex-wrap gap-x-1.5 gap-y-1 text-sm leading-relaxed">
              <span className="text-foreground">El alumno se marca como</span>
              <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: URGENTE_HEX }} aria-hidden />
                &ldquo;Urgente&rdquo;
              </span>
              <span className="text-foreground">a partir del día</span>
              <button
                type="button"
                onClick={() => setUrgenteSheetOpen(true)}
                className="inline-flex items-center justify-center h-8 min-w-[2.75rem] px-2 rounded-md border border-input bg-background text-foreground hover:bg-muted/40 text-sm font-medium transition-colors"
              >
                {diaUrgente}
              </button>
              <span className="text-foreground">
                sin registrarse el pago <span className="text-xs text-muted-foreground">(además de la regla automática de 2+ mensualidades o más de 1 mes)</span>.
              </span>
            </div>
          </div>

          <SectionFooter
            dirty={dirty}
            onCancel={onCancel}
            errorMessage={state.success === false ? state.message : null}
          />
        </form>

        {/* Bottom sheet: Día para "Atrasado" */}
        <Drawer open={atrasadoSheetOpen} onOpenChange={setAtrasadoSheetOpen}>
          <DrawerContent>
            <div className="mx-auto w-full max-w-sm">
              <DrawerHeader className="text-left">
                <DrawerTitle>Día para Atrasado</DrawerTitle>
                <DrawerDescription>
                  A partir de este día del mes (sin registrar el pago), el alumno se marca como Atrasado. Debe ser al menos {MIN_SEPARACION} días menor que Urgente (máx. día {maxAtrasadoPermitido}).
                </DrawerDescription>
              </DrawerHeader>
              <div className="p-4 pb-6">
                <div className="grid grid-cols-4 gap-2 max-w-xs mx-auto">
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => {
                    const selected = d === diaAtrasado
                    const disabled = d > maxAtrasadoPermitido
                    return (
                      <button
                        key={d}
                        type="button"
                        disabled={disabled}
                        onClick={() => selectDiaAtrasado(d)}
                        className={cn(
                          'h-11 rounded-md text-sm font-medium transition-colors border',
                          selected
                            ? 'bg-primary text-primary-foreground border-primary font-semibold'
                            : disabled
                            ? 'text-muted-foreground/30 cursor-not-allowed border-transparent bg-muted/10'
                            : 'bg-background text-foreground border-input hover:bg-muted/40'
                        )}
                      >
                        {d}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </DrawerContent>
        </Drawer>

        {/* Bottom sheet: Día para "Urgente" */}
        <Drawer open={urgenteSheetOpen} onOpenChange={setUrgenteSheetOpen}>
          <DrawerContent>
            <div className="mx-auto w-full max-w-sm">
              <DrawerHeader className="text-left">
                <DrawerTitle>Día para Urgente</DrawerTitle>
                <DrawerDescription>
                  A partir de este día del mes (sin registrar el pago), el alumno se marca como Urgente. Debe ser al menos {MIN_SEPARACION} días mayor que Atrasado (mín. día {minUrgentePermitido}).
                </DrawerDescription>
              </DrawerHeader>
              <div className="p-4 pb-6">
                <div className="grid grid-cols-4 gap-2 max-w-xs mx-auto">
                  {Array.from({ length: 31 - 5 + 1 }, (_, i) => i + 5).map((d) => {
                    const selected = d === diaUrgente
                    const disabled = d < minUrgentePermitido
                    return (
                      <button
                        key={d}
                        type="button"
                        disabled={disabled}
                        onClick={() => selectDiaUrgente(d)}
                        className={cn(
                          'h-11 rounded-md text-sm font-medium transition-colors border',
                          selected
                            ? 'bg-primary text-primary-foreground border-primary font-semibold'
                            : disabled
                            ? 'text-muted-foreground/30 cursor-not-allowed border-transparent bg-muted/10'
                            : 'bg-background text-foreground border-input hover:bg-muted/40'
                        )}
                      >
                        {d}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      </CardContent>
    </Card>
  )
}
