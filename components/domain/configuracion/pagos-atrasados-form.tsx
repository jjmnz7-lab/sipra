'use client'

import * as React from 'react'
import { useActionState, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RadioOption } from '@/components/domain/configuracion/radio-option'
import { ToggleRow } from '@/components/domain/configuracion/toggle-row'
import { SectionFooter } from '@/components/domain/configuracion/section-footer'
import { useDirtySection } from '@/components/domain/configuracion/use-dirty-section'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import {
  guardarPagosAtrasadosAction,
  type FormState,
} from '@/app/(app)/configuracion/actions'

/* -------------------------------------------------------------------------- */
/* Tipos                                                                      */
/* -------------------------------------------------------------------------- */

type TipoRecargo = 'porcentaje' | 'monto_fijo'
type Regla = { dia: number; tipo: TipoRecargo; valor: number }
type MarcarCritico = { activo: boolean; dia_umbral: number }

type PagosAtrasadosState = {
  marcar_critico: MarcarCritico
  aplicar_recargos: boolean
  reglas: Regla[]
}

const CRITICO_HEX = '#7A2F38'

const DEFAULT_STATE: PagosAtrasadosState = {
  marcar_critico: { activo: false, dia_umbral: 15 },
  aplicar_recargos: false,
  reglas: [],
}

const REGLA_DEFAULT_1: Regla = { dia: 7, tipo: 'porcentaje', valor: 10 }
const REGLA_DEFAULT_2_FROM = (r1: Regla): Regla => ({
  dia: Math.min(25, Math.max(r1.dia + 1, 15)),
  tipo: 'monto_fijo',
  valor: 50,
})

const VALORES_PORCENTAJE = [5, 10, 15, 20, 25, 30]
const VALORES_MONTO = [20, 50, 100, 150, 200, 300]

function deriveInitialState(initialConfig: any): PagosAtrasadosState {
  if (!initialConfig || typeof initialConfig !== 'object') return DEFAULT_STATE

  const marcar = initialConfig.marcar_critico
  const marcarCritico: MarcarCritico = marcar
    ? {
        activo: !!marcar.activo,
        dia_umbral: Math.min(25, Math.max(6, Number(marcar.dia_umbral) || 15)),
      }
    : { activo: false, dia_umbral: 15 }

  let reglas: Regla[] = []
  if (Array.isArray(initialConfig.reglas)) {
    reglas = initialConfig.reglas.slice(0, 2).map((r: any) => ({
      dia: Math.min(31, Math.max(1, Number(r?.dia) || 7)),
      tipo: (r?.tipo === 'monto_fijo' ? 'monto_fijo' : 'porcentaje') as TipoRecargo,
      valor: Math.max(0, Number(r?.valor) || 0),
    }))
  } else if (Array.isArray(initialConfig.escalones)) {
    reglas = initialConfig.escalones.slice(0, 2).map((e: any) => ({
      dia: Math.max(1, Number(e?.dias_retraso) || 7),
      tipo: 'monto_fijo' as TipoRecargo,
      valor: Math.max(0, Number(e?.monto) || 0),
    }))
  }

  const aplicar = initialConfig.aplicar_recargos !== undefined
    ? !!initialConfig.aplicar_recargos
    : !!initialConfig.activo // legacy

  return { marcar_critico: marcarCritico, aplicar_recargos: aplicar, reglas }
}

/* -------------------------------------------------------------------------- */
/* Bloque de recargos (sin Card; se monta dentro de "Recargos y Excepciones")  */
/* -------------------------------------------------------------------------- */

const initialFormState: FormState = {}

export function RecargosBlock({ initialConfig }: { initialConfig: any }) {
  const initial = useMemo(() => deriveInitialState(initialConfig), [initialConfig])

  const [marcarCritico, setMarcarCritico] = useState<MarcarCritico>(initial.marcar_critico)
  const [aplicarRecargos, setAplicarRecargos] = useState<boolean>(initial.aplicar_recargos)
  const [reglas, setReglas] = useState<Regla[]>(initial.reglas)

  // Bottom sheets
  const [criticoSheetOpen, setCriticoSheetOpen] = useState(false)
  const [editingReglaIdx, setEditingReglaIdx] = useState<number | null>(null)

  const current: PagosAtrasadosState = {
    marcar_critico: marcarCritico,
    aplicar_recargos: aplicarRecargos,
    reglas,
  }

  const { dirty, snapshot, commitSnapshot } = useDirtySection(current, initial)
  const [state, formAction] = useActionState(guardarPagosAtrasadosAction, initialFormState)

  useEffect(() => {
    if (state.success) commitSnapshot()
  }, [state.success, commitSnapshot])

  const onCancel = () => {
    setMarcarCritico(snapshot.marcar_critico)
    setAplicarRecargos(snapshot.aplicar_recargos)
    setReglas(snapshot.reglas)
  }

  const configJson = useMemo(
    () =>
      JSON.stringify({
        marcar_critico: marcarCritico,
        aplicar_recargos: aplicarRecargos,
        reglas,
      }),
    [marcarCritico, aplicarRecargos, reglas]
  )

  const toggleRegla2 = (checked: boolean) => {
    if (checked) {
      if (reglas.length === 0) {
        const r1 = { ...REGLA_DEFAULT_1 }
        setReglas([r1, REGLA_DEFAULT_2_FROM(r1)])
      } else if (reglas.length === 1) {
        setReglas([reglas[0], REGLA_DEFAULT_2_FROM(reglas[0])])
      }
    } else {
      setReglas(reglas.slice(0, 1))
    }
  }

  // Al activar aplicar_recargos siempre habrá al menos 1 regla.
  useEffect(() => {
    if (aplicarRecargos && reglas.length === 0) setReglas([{ ...REGLA_DEFAULT_1 }])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aplicarRecargos])

  const updateRegla = (idx: number, patch: Partial<Regla>) => {
    const copia = [...reglas]
    copia[idx] = { ...copia[idx], ...patch }
    if (idx === 0 && copia.length === 2 && copia[1].dia <= copia[0].dia) {
      copia[1] = { ...copia[1], dia: Math.min(25, copia[0].dia + 1) }
    }
    setReglas(copia)
  }

  return (
    <>
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="config_recargos_json" value={configJson} />

        {/* Marcar como Crítico */}
        <div className="flex items-start gap-3 py-1.5">
          <button
            type="button"
            role="switch"
            aria-checked={marcarCritico.activo}
            aria-label='Marcar estado de alumno como "Crítico"'
            onClick={() => setMarcarCritico({ ...marcarCritico, activo: !marcarCritico.activo })}
            className={cn(
              'relative inline-flex h-[18.4px] w-[32px] mt-0.5 shrink-0 items-center rounded-full border border-transparent transition-colors',
              marcarCritico.activo ? 'bg-primary' : 'bg-input'
            )}
          >
            <span
              className={cn(
                'block size-4 rounded-full bg-white transition-transform',
                marcarCritico.activo ? 'translate-x-[calc(100%-2px)]' : 'translate-x-0'
              )}
            />
          </button>

          <div className={cn('flex items-center flex-wrap gap-x-1.5 gap-y-1 text-sm leading-relaxed', !marcarCritico.activo && 'opacity-40')}>
            <span className="text-foreground">Marcar estado de alumno como</span>
            <span className="inline-flex items-center gap-1 font-semibold text-foreground">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CRITICO_HEX }} aria-hidden />
              &ldquo;Crítico&rdquo;
            </span>
            <span className="text-foreground">cuando supere el día</span>
            <button
              type="button"
              disabled={!marcarCritico.activo}
              onClick={() => setCriticoSheetOpen(true)}
              className="inline-flex items-center justify-center h-8 min-w-[2.75rem] px-2 rounded-md border border-input bg-background text-foreground text-sm font-medium hover:bg-muted/40 disabled:cursor-not-allowed"
            >
              {marcarCritico.activo ? marcarCritico.dia_umbral : ''}
            </button>
            <span className="text-foreground">sin registrarse el pago.</span>
          </div>
        </div>

        {/* Aplicar recargos */}
        <ToggleRow
          id="aplicar_recargos_toggle"
          checked={aplicarRecargos}
          onCheckedChange={setAplicarRecargos}
          label="Aplicar recargos por pago tardío de mensualidad"
        />

        {aplicarRecargos && reglas.length >= 1 && (
          <div className="ml-3 pl-4 border-l-2 border-primary/20 space-y-2">
            <ReglaSummaryCard orden={1} regla={reglas[0]} onEditar={() => setEditingReglaIdx(0)} />

            <ToggleRow
              id="aplicar_regla_2_toggle"
              compact
              checked={reglas.length === 2}
              onCheckedChange={toggleRegla2}
              label="Aplicar 2da regla"
            />

            {reglas.length === 2 && (
              <ReglaSummaryCard orden={2} regla={reglas[1]} onEditar={() => setEditingReglaIdx(1)} />
            )}
          </div>
        )}

        <SectionFooter
          dirty={dirty}
          onCancel={onCancel}
          errorMessage={state.success === false ? state.message : null}
        />
      </form>

      {/* Bottom sheet: día límite de "Crítico" (4 columnas × 5 filas, días 6-25) */}
      <Drawer open={criticoSheetOpen} onOpenChange={setCriticoSheetOpen}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-sm">
            <DrawerHeader className="text-left">
              <DrawerTitle>Día límite</DrawerTitle>
              <DrawerDescription>
                A partir de este día del mes (sin registrarse el pago) el alumno se marca como Crítico.
              </DrawerDescription>
            </DrawerHeader>
            <div className="p-4 pb-6">
              <div className="grid grid-cols-4 gap-2 max-w-xs mx-auto">
                {Array.from({ length: 25 - 6 + 1 }, (_, i) => i + 6).map((d) => {
                  const selected = d === marcarCritico.dia_umbral
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        setMarcarCritico({ ...marcarCritico, dia_umbral: d })
                        setCriticoSheetOpen(false)
                      }}
                      className={cn(
                        'h-11 rounded-md text-sm font-medium transition-colors border',
                        selected
                          ? 'bg-primary text-primary-foreground border-primary font-semibold'
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

      {/* Bottom sheet: editar una regla de recargo */}
      <ReglaEditorSheet
        open={editingReglaIdx !== null}
        idx={editingReglaIdx}
        reglas={reglas}
        onClose={() => setEditingReglaIdx(null)}
        onSave={(idx, patch) => { updateRegla(idx, patch); setEditingReglaIdx(null) }}
      />
    </>
  )
}

/* -------------------------------------------------------------------------- */
/* Tarjeta resumen de una regla                                               */
/* -------------------------------------------------------------------------- */

function resumenRegla(regla: Regla): string {
  return regla.tipo === 'porcentaje'
    ? `${regla.valor}% de la mensualidad`
    : `$${Math.round(regla.valor)} fijo`
}

function ReglaSummaryCard({ orden, regla, onEditar }: { orden: 1 | 2; regla: Regla; onEditar: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onEditar}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEditar() } }}
      className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-card text-sm cursor-pointer hover:bg-accent transition-colors"
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{orden === 1 ? '1ra regla' : '2da regla'}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          A partir del día {regla.dia} · {resumenRegla(regla)}
        </p>
      </div>
      <span className="h-8 w-8 inline-flex items-center justify-center text-muted-foreground flex-shrink-0" aria-hidden>
        <Pencil className="h-4 w-4" />
      </span>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Stepper de valor con < y >                                                 */
/* -------------------------------------------------------------------------- */

function StepperValor({
  value,
  valores,
  onChange,
  max,
  editable,
  prefix,
  suffix,
}: {
  value: number
  valores: number[]
  onChange: (v: number) => void
  max: number
  editable?: boolean
  prefix?: string
  suffix?: string
}) {
  const prev = () => {
    const candidatos = valores.filter((v) => v < value)
    if (candidatos.length) onChange(Math.max(...candidatos))
  }
  const next = () => {
    const candidatos = valores.filter((v) => v > value)
    if (candidatos.length) onChange(Math.min(...candidatos))
  }

  return (
    <div className="flex items-center gap-1">
      <Button type="button" variant="outline" size="icon" className="h-9 w-9 flex-shrink-0" onClick={prev} aria-label="Anterior">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="flex items-center justify-center h-9 min-w-[5rem] px-2 rounded-md border border-input bg-background">
        {prefix && <span className="text-sm text-muted-foreground mr-0.5">{prefix}</span>}
        {editable ? (
          <input
            type="number"
            min={0}
            max={max}
            inputMode="numeric"
            value={value}
            onChange={(e) => {
              const n = e.target.value.replace(/[^\d]/g, '')
              onChange(n === '' ? 0 : Math.min(max, Number(n)))
            }}
            className="w-16 bg-transparent text-center text-sm font-semibold text-foreground outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        ) : (
          <span className="text-sm font-semibold text-foreground">{value}</span>
        )}
        {suffix && <span className="text-sm text-muted-foreground ml-0.5">{suffix}</span>}
      </div>
      <Button type="button" variant="outline" size="icon" className="h-9 w-9 flex-shrink-0" onClick={next} aria-label="Siguiente">
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Bottom sheet: editor de regla (rango de día + acción)                      */
/* -------------------------------------------------------------------------- */

function ReglaEditorSheet({
  open,
  idx,
  reglas,
  onClose,
  onSave,
}: {
  open: boolean
  idx: number | null
  reglas: Regla[]
  onClose: () => void
  onSave: (idx: number, patch: Partial<Regla>) => void
}) {
  const [dia, setDia] = useState(7)
  const [tipo, setTipo] = useState<TipoRecargo>('porcentaje')
  const [valor, setValor] = useState(10)

  // Día mínimo de la 2da regla = día de la 1ra + 1.
  const diaMin = idx === 1 && reglas[0] ? reglas[0].dia + 1 : 6

  useEffect(() => {
    if (open && idx !== null && reglas[idx]) {
      setDia(reglas[idx].dia)
      setTipo(reglas[idx].tipo)
      setValor(reglas[idx].valor)
    }
  }, [open, idx, reglas])

  // Al cambiar de tipo, encajar el valor a un predefinido válido por defecto.
  const cambiarTipo = (t: TipoRecargo) => {
    setTipo(t)
    if (t === 'porcentaje' && !VALORES_PORCENTAJE.includes(valor)) setValor(10)
    if (t === 'monto_fijo' && valor <= 0) setValor(50)
  }

  const guardar = () => {
    if (idx === null) return
    onSave(idx, { dia, tipo, valor })
  }

  return (
    <Drawer open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader className="text-left">
            <DrawerTitle>{idx === 1 ? 'Editar 2da regla' : 'Editar 1ra regla'}</DrawerTitle>
            <DrawerDescription>Define a partir de qué día aplica y el recargo.</DrawerDescription>
          </DrawerHeader>

          <div className="p-4 pb-0 space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">A partir del día</p>
              <div className="grid grid-cols-4 gap-2 max-w-xs">
                {Array.from({ length: 25 - 6 + 1 }, (_, i) => i + 6).map((d) => {
                  const disabled = d < diaMin
                  const selected = d === dia
                  return (
                    <button
                      key={d}
                      type="button"
                      disabled={disabled}
                      onClick={() => setDia(d)}
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

            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Recargo</p>
              <RadioOption
                compact
                checked={tipo === 'porcentaje'}
                label="Porcentaje de la mensualidad"
                onClick={() => cambiarTipo('porcentaje')}
                rightSlot={tipo === 'porcentaje' && (
                  <StepperValor value={valor} valores={VALORES_PORCENTAJE} onChange={setValor} max={100} suffix="%" />
                )}
              />
              <RadioOption
                compact
                checked={tipo === 'monto_fijo'}
                label="Monto fijo"
                onClick={() => cambiarTipo('monto_fijo')}
                rightSlot={tipo === 'monto_fijo' && (
                  <StepperValor value={valor} valores={VALORES_MONTO} onChange={setValor} max={100000} editable prefix="$" />
                )}
              />
            </div>
          </div>

          <DrawerFooter className="flex flex-row gap-2 mt-4 pt-2">
            <DrawerClose asChild>
              <Button type="button" variant="outline" className="flex-1 h-11">Cancelar</Button>
            </DrawerClose>
            <Button type="button" onClick={guardar} className="flex-1 h-11">Listo</Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
