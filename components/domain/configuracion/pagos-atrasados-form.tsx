'use client'

import * as React from 'react'
import { useActionState, useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DiaPickerPopover } from '@/components/domain/configuracion/dia-picker-popover'
import { RadioOption } from '@/components/domain/configuracion/radio-option'
import { SectionFooter } from '@/components/domain/configuracion/section-footer'
import { useDirtySection } from '@/components/domain/configuracion/use-dirty-section'
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
    // Mapeo legacy: cada escalón → regla monto_fijo
    reglas = initialConfig.escalones.slice(0, 2).map((e: any) => ({
      dia: Math.max(1, Number(e?.dias_retraso) || 7),
      tipo: 'monto_fijo' as TipoRecargo,
      valor: Math.max(0, Number(e?.monto) || 0),
    }))
  }

  const aplicar = initialConfig.aplicar_recargos !== undefined
    ? !!initialConfig.aplicar_recargos
    : !!initialConfig.activo // legacy

  return {
    marcar_critico: marcarCritico,
    aplicar_recargos: aplicar,
    reglas,
  }
}

/* -------------------------------------------------------------------------- */
/* Componente principal                                                       */
/* -------------------------------------------------------------------------- */

const initialFormState: FormState = {}

export function PagosAtrasadosForm({ initialConfig }: { initialConfig: any }) {
  const initial = useMemo(() => deriveInitialState(initialConfig), [initialConfig])

  const [marcarCritico, setMarcarCritico] = useState<MarcarCritico>(initial.marcar_critico)
  const [aplicarRecargos, setAplicarRecargos] = useState<boolean>(initial.aplicar_recargos)
  const [reglas, setReglas] = useState<Regla[]>(initial.reglas)

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
        // Si recargos está apagado, persistimos las reglas tal cual para que el
        // usuario no las pierda al alternar el toggle, pero el backend las ignora.
        reglas: aplicarRecargos ? reglas : reglas,
      }),
    [marcarCritico, aplicarRecargos, reglas]
  )

  const toggleRegla1 = () => {
    if (reglas.length === 0) setReglas([{ ...REGLA_DEFAULT_1 }])
    // si ya hay reglas, no hacemos nada — el toggle de "Aplicar recargos" controla el bloque
  }

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

  // Asegurar que al activar aplicar_recargos siempre haya al menos 1 regla.
  useEffect(() => {
    if (aplicarRecargos && reglas.length === 0) setReglas([{ ...REGLA_DEFAULT_1 }])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aplicarRecargos])

  const updateRegla = (idx: number, patch: Partial<Regla>) => {
    const copia = [...reglas]
    copia[idx] = { ...copia[idx], ...patch }
    // Si la 1ra cambió de día y la 2da tiene un día <= 1ra, ajustar.
    if (idx === 0 && copia.length === 2 && copia[1].dia <= copia[0].dia) {
      copia[1] = { ...copia[1], dia: Math.min(25, copia[0].dia + 1) }
    }
    setReglas(copia)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Pagos atrasados</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="config_recargos_json" value={configJson} />

          {/* Toggle: Marcar como Crítico */}
          <ToggleRow
            id="marcar_critico_toggle"
            checked={marcarCritico.activo}
            onCheckedChange={(v) =>
              setMarcarCritico({ ...marcarCritico, activo: v })
            }
            label="Marcar estado de alumno como “Crítico”"
          />

          {marcarCritico.activo && (
            <div className="ml-12 flex items-center flex-wrap gap-2 text-sm text-foreground">
              <span className="text-muted-foreground">cuando supere el día:</span>
              <DiaPickerPopover
                value={marcarCritico.dia_umbral}
                rangoDias={[6, 25]}
                cols={4}
                min={6}
                max={25}
                onChange={(v) => setMarcarCritico({ ...marcarCritico, dia_umbral: v })}
              />
              <span className="text-muted-foreground">sin registrarse el pago.</span>
            </div>
          )}

          {/* Toggle: Aplicar recargos */}
          <ToggleRow
            id="aplicar_recargos_toggle"
            checked={aplicarRecargos}
            onCheckedChange={(v) => {
              setAplicarRecargos(v)
              if (v) toggleRegla1()
            }}
            label="Aplicar recargos por pago tardío de mensualidad"
          />

          {aplicarRecargos && reglas.length >= 1 && (
            <div className="space-y-2">
              <ReglaCard
                orden={1}
                regla={reglas[0]}
                diaMin={2}
                diaMax={28}
                disabledDays={[]}
                onChange={(patch) => updateRegla(0, patch)}
              />

              <ToggleRow
                id="aplicar_regla_2_toggle"
                compact
                checked={reglas.length === 2}
                onCheckedChange={toggleRegla2}
                label="Aplicar 2da regla"
              />

              {reglas.length === 2 && (
                <ReglaCard
                  orden={2}
                  regla={reglas[1]}
                  diaMin={reglas[0].dia + 1}
                  diaMax={28}
                  disabledDays={Array.from({ length: reglas[0].dia }, (_, i) => i + 1)}
                  onChange={(patch) => updateRegla(1, patch)}
                />
              )}
            </div>
          )}

          <div className="border-t border-dashed border-border my-2" />

          <EjemploDinamico
            marcarCritico={marcarCritico}
            aplicarRecargos={aplicarRecargos}
            reglas={reglas}
          />

          <SectionFooter
            dirty={dirty}
            onCancel={onCancel}
            errorMessage={state.success === false ? state.message : null}
          />
        </form>
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Sub-componentes                                                            */
/* -------------------------------------------------------------------------- */

function ToggleRow({
  id,
  checked,
  onCheckedChange,
  label,
  compact,
}: {
  id: string
  checked: boolean
  onCheckedChange: (v: boolean) => void
  label: React.ReactNode
  compact?: boolean
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-md ${compact ? 'py-1' : 'py-1.5'}`}
    >
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
      <Label
        htmlFor={id}
        className="text-sm text-foreground cursor-pointer leading-tight"
      >
        {label}
      </Label>
    </div>
  )
}

function ReglaCard({
  orden,
  regla,
  diaMin,
  diaMax,
  disabledDays,
  onChange,
}: {
  orden: 1 | 2
  regla: Regla
  diaMin: number
  diaMax: number
  disabledDays: number[]
  onChange: (patch: Partial<Regla>) => void
}) {
  const titulo = orden === 1 ? '1ra regla' : '2da regla'
  return (
    <div className="p-3 rounded-lg border border-border bg-card space-y-2 text-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-foreground">{titulo}</p>
      </div>

      <div className="flex items-center flex-wrap gap-2">
        <span className="text-muted-foreground">A partir del día:</span>
        <DiaPickerPopover
          value={regla.dia}
          rangoDias={[6, 25]}
          cols={4}
          min={diaMin < 6 ? 6 : diaMin}
          max={diaMax > 25 ? 25 : diaMax}
          disabledDays={disabledDays}
          onChange={(v) => onChange({ dia: v })}
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Tipo de recargo</p>
        <RadioOption
          compact
          checked={regla.tipo === 'porcentaje'}
          label="Porcentaje de la mensualidad"
          onClick={() => onChange({ tipo: 'porcentaje' })}
          rightSlot={
            regla.tipo === 'porcentaje' && (
              <div className="flex items-center gap-1">
                <ValorPicker
                  value={regla.valor}
                  valores={VALORES_PORCENTAJE}
                  onChange={(v) => onChange({ valor: v })}
                  max={100}
                />
                <span className="text-sm text-foreground">%</span>
              </div>
            )
          }
        />
        <RadioOption
          compact
          checked={regla.tipo === 'monto_fijo'}
          label="Monto fijo"
          onClick={() => onChange({ tipo: 'monto_fijo' })}
          rightSlot={
            regla.tipo === 'monto_fijo' && (
              <div className="flex items-center gap-1">
                <span className="text-sm text-foreground">$</span>
                <ValorPicker
                  value={regla.valor}
                  valores={VALORES_MONTO}
                  onChange={(v) => onChange({ valor: v })}
                  max={100000}
                />
              </div>
            )
          }
        />
      </div>
    </div>
  )
}

/**
 * Chip + popover vertical con valores comunes. Última opción "Personalizar"
 * muestra un input numérico inline para ingresar un valor libre.
 */
function ValorPicker({
  value,
  valores,
  onChange,
  max,
}: {
  value: number
  valores: number[]
  onChange: (v: number) => void
  max: number
}) {
  const [open, setOpen] = useState(false)
  const [custom, setCustom] = useState(false)
  const [customValue, setCustomValue] = useState<string>(String(value))
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setCustomValue(String(value))
  }, [value])

  useEffect(() => {
    if (!open) {
      setCustom(false)
      return
    }
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const confirmCustom = () => {
    const n = Number(customValue)
    if (!Number.isFinite(n) || n < 0) return
    onChange(Math.min(max, n))
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center h-8 min-w-[3rem] px-2 rounded-md border border-input bg-background text-foreground text-sm font-medium hover:bg-muted/40"
      >
        {value}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 w-44 rounded-md border border-border bg-popover shadow-md">
          <div className="max-h-64 overflow-y-auto py-1">
            {valores.map((v) => {
              const selected = v === value && !custom
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    onChange(v)
                    setOpen(false)
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-muted ${
                    selected ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground'
                  }`}
                >
                  {v}
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => setCustom(true)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted text-foreground border-t border-border"
            >
              Personalizar…
            </button>
            {custom && (
              <div className="px-2 pb-2 pt-1 flex items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  max={max}
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      confirmCustom()
                    }
                  }}
                  className="h-8 text-sm"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={confirmCustom}
                  className="h-8 px-2 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  OK
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Ejemplo dinámico                                                           */
/* -------------------------------------------------------------------------- */

function formatMonto(n: number) {
  return `$${Math.round(n).toLocaleString('en-US')}`
}

function EjemploDinamico({
  marcarCritico,
  aplicarRecargos,
  reglas,
}: {
  marcarCritico: MarcarCritico
  aplicarRecargos: boolean
  reglas: Regla[]
}) {
  const MENSUALIDAD = 1000
  const lineas = useMemo<string[]>(() => {
    const out: string[] = []
    out.push(`Mensualidad: ${formatMonto(MENSUALIDAD)}`)

    // Construir tramos de día con monto y estado.
    type Tramo = { desde: number; hasta: number | 'fin'; monto: number; estado: 'Pendiente' | 'Crítico' }
    const FIN = 30 // simbólico para la salida
    const reglasUsadas = aplicarRecargos ? [...reglas].sort((a, b) => a.dia - b.dia) : []
    const umbral = marcarCritico.activo ? marcarCritico.dia_umbral : null

    // Cortes de día donde puede cambiar algo: día 1, días de reglas, día umbral+1, fin.
    const cortes = new Set<number>([1])
    reglasUsadas.forEach((r) => cortes.add(r.dia))
    if (umbral !== null) cortes.add(umbral + 1)
    cortes.add(FIN + 1)

    const cortesArr = Array.from(cortes).sort((a, b) => a - b)
    const tramos: Tramo[] = []
    for (let i = 0; i < cortesArr.length - 1; i++) {
      const desde = cortesArr[i]
      const hastaRaw = cortesArr[i + 1] - 1
      const hasta = hastaRaw >= FIN ? ('fin' as const) : hastaRaw

      // Monto en este tramo: base + suma de cada regla cuyo día ya pasó (no compuesto).
      // Esto reproduce los mockups del brief: $1,000 → $1,100 → $1,150 (10% + $50).
      const monto = MENSUALIDAD + reglasUsadas
        .filter((r) => r.dia <= desde)
        .reduce(
          (acc, r) =>
            acc + (r.tipo === 'porcentaje' ? (MENSUALIDAD * r.valor) / 100 : r.valor),
          0
        )

      const estado: 'Pendiente' | 'Crítico' = umbral !== null && desde > umbral ? 'Crítico' : 'Pendiente'

      tramos.push({ desde, hasta, monto, estado })
    }

    // Mergear tramos consecutivos con mismo monto+estado
    const merged: Tramo[] = []
    for (const t of tramos) {
      const last = merged[merged.length - 1]
      if (last && last.monto === t.monto && last.estado === t.estado) {
        last.hasta = t.hasta
      } else {
        merged.push({ ...t })
      }
    }

    merged.forEach((t) => {
      const rango =
        t.hasta === 'fin'
          ? `del día ${t.desde} al último día del mes`
          : t.desde === t.hasta
          ? `Día ${t.desde}`
          : `Del día ${t.desde} al ${t.hasta}`
      out.push(`${rango} → ${formatMonto(t.monto)} (estado: ${t.estado})`)
    })

    if (!aplicarRecargos) {
      out.unshift('No se cobrarán penalizaciones por pagos tardíos.')
    }

    return out
  }, [marcarCritico, aplicarRecargos, reglas])

  return (
    <div className="space-y-1 text-xs text-muted-foreground leading-relaxed">
      <p className="font-semibold text-foreground">Ejemplo</p>
      <ul className="space-y-1">
        {lineas.map((l, i) => (
          <li key={i} className="flex gap-2">
            <span aria-hidden>•</span>
            <span>{l}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
