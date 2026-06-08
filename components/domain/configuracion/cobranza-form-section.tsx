'use client'

import * as React from 'react'
import { useActionState, useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2, Lightbulb } from 'lucide-react'
import { DiaPickerPopover } from '@/components/domain/configuracion/dia-picker-popover'
import { RadioOption } from '@/components/domain/configuracion/radio-option'
import { SectionFooter } from '@/components/domain/configuracion/section-footer'
import { useDirtySection } from '@/components/domain/configuracion/use-dirty-section'
import {
  guardarCobranzaAction,
  type FormState,
} from '@/app/(app)/configuracion/actions'

/* -------------------------------------------------------------------------- */
/* Tipos                                                                      */
/* -------------------------------------------------------------------------- */

type Regimen = 'completo' | 'proporcional' | 'no_cobrar' | 'reglas_dias'
type Redondeo = 'ninguno' | '1' | '5' | '10' | '50' | '100'
type AccionRegla = 'completo' | 'proporcional' | 'no_cobrar'
type DiaFin = number | 'fin_mes'
type Regla = { dia_inicio: number; dia_fin: DiaFin; accion: AccionRegla }

type CobranzaState = {
  regimen: Regimen
  redondeo: Redondeo
  reglas: Regla[]
}

const DEFAULT_REGLAS: Regla[] = [
  { dia_inicio: 1, dia_fin: 5, accion: 'completo' },
  { dia_inicio: 6, dia_fin: 'fin_mes', accion: 'proporcional' },
]

const REDONDEO_OPCIONES: { value: Redondeo; label: string }[] = [
  { value: 'ninguno', label: 'Sin redondeo' },
  { value: '1', label: 'Al peso más cercano ($1)' },
  { value: '5', label: 'Múltiplo de $5 más cercano' },
  { value: '10', label: 'Múltiplo de $10 más cercano' },
  { value: '50', label: 'Múltiplo de $50 más cercano' },
  { value: '100', label: 'Múltiplo de $100 más cercano' },
]

const ACCION_LABELS: Record<AccionRegla, string> = {
  completo: 'Cobrar mensualidad completa',
  proporcional: 'Cobrar proporcional',
  no_cobrar: 'No cobrar (período de prueba)',
}

function normalizarReglas(reglas: any): Regla[] {
  if (!Array.isArray(reglas) || reglas.length < 2) return DEFAULT_REGLAS
  const arr: Regla[] = reglas.slice(0, 3).map((r: any) => ({
    dia_inicio: Number(r?.dia_inicio) || 1,
    dia_fin: r?.dia_fin === 'fin_mes' ? 'fin_mes' : Number(r?.dia_fin) || 5,
    accion: (['completo', 'proporcional', 'no_cobrar'].includes(r?.accion) ? r.accion : 'completo') as AccionRegla,
  }))
  arr[0].dia_inicio = 1
  arr[arr.length - 1].dia_fin = 'fin_mes'
  for (let i = 1; i < arr.length; i++) {
    const prev = arr[i - 1]
    const prevFin = prev.dia_fin === 'fin_mes' ? 28 : prev.dia_fin
    arr[i].dia_inicio = prevFin + 1
  }
  return arr
}

function inferirRegimen(initial: any): Regimen {
  if (initial?.regimen_alta && ['completo', 'proporcional', 'no_cobrar', 'reglas_dias'].includes(initial.regimen_alta)) {
    return initial.regimen_alta
  }
  if (initial?.modo_prorrateo === 'completo') return 'completo'
  if (initial?.modo_prorrateo === 'proporcional') return 'proporcional'
  return 'completo'
}

function deriveInitialState(initialConfig: any): CobranzaState {
  return {
    regimen: inferirRegimen(initialConfig),
    redondeo: (initialConfig?.proporcional_redondeo as Redondeo) || 'ninguno',
    reglas: normalizarReglas(initialConfig?.reglas_dias),
  }
}

/* -------------------------------------------------------------------------- */
/* Componente principal                                                       */
/* -------------------------------------------------------------------------- */

const initialState: FormState = {}

export function CobranzaFormSection({ initialConfig }: { initialConfig: any }) {
  const initial = useMemo(() => deriveInitialState(initialConfig), [initialConfig])
  const [regimen, setRegimen] = useState<Regimen>(initial.regimen)
  const [redondeo, setRedondeo] = useState<Redondeo>(initial.redondeo)
  const [reglas, setReglas] = useState<Regla[]>(initial.reglas)

  const current: CobranzaState = { regimen, redondeo, reglas }
  const { dirty, snapshot, commitSnapshot } = useDirtySection(current, initial)

  const [state, formAction] = useActionState(guardarCobranzaAction, initialState)

  useEffect(() => {
    if (state.success) commitSnapshot()
  }, [state.success, commitSnapshot])

  const onCancel = () => {
    setRegimen(snapshot.regimen)
    setRedondeo(snapshot.redondeo)
    setReglas(snapshot.reglas)
  }

  const configJson = useMemo(
    () => JSON.stringify({ regimen_alta: regimen, proporcional_redondeo: redondeo, reglas_dias: reglas }),
    [regimen, redondeo, reglas]
  )

  const todasCompleto =
    regimen === 'reglas_dias' && reglas.every((r) => r.accion === 'completo')

  const actualizarFinDeRegla = (idx: number, nuevoFin: number) => {
    const copia = [...reglas]
    copia[idx] = { ...copia[idx], dia_fin: nuevoFin }
    for (let i = idx + 1; i < copia.length; i++) {
      const prev = copia[i - 1]
      const prevFin = prev.dia_fin === 'fin_mes' ? 28 : prev.dia_fin
      copia[i] = { ...copia[i], dia_inicio: prevFin + 1 }
    }
    for (let i = 0; i < copia.length - 1; i++) {
      if (copia[i].dia_fin !== 'fin_mes' && (copia[i].dia_fin as number) < copia[i].dia_inicio) {
        copia[i].dia_fin = copia[i].dia_inicio
        if (i + 1 < copia.length) {
          copia[i + 1].dia_inicio = (copia[i].dia_fin as number) + 1
        }
      }
    }
    setReglas(copia)
  }

  const actualizarAccion = (idx: number, accion: AccionRegla) => {
    const copia = [...reglas]
    copia[idx] = { ...copia[idx], accion }
    setReglas(copia)
  }

  const agregarRegla = () => {
    if (reglas.length >= 3) return
    const first = reglas[0]
    const firstFin = first.dia_fin === 'fin_mes' ? 10 : first.dia_fin
    const nuevoMedioInicio = firstFin + 1
    const nuevoMedioFin = Math.max(nuevoMedioInicio, Math.min(20, nuevoMedioInicio + 5))
    const intermedio: Regla = {
      dia_inicio: nuevoMedioInicio,
      dia_fin: nuevoMedioFin,
      accion: 'proporcional',
    }
    const ultima: Regla = {
      dia_inicio: nuevoMedioFin + 1,
      dia_fin: 'fin_mes',
      accion: reglas[1].accion,
    }
    setReglas([first, intermedio, ultima])
  }

  const eliminarRegla = (idx: number) => {
    if (reglas.length <= 2) return
    if (idx === 0 || idx === reglas.length - 1) return
    const copia = reglas.filter((_, i) => i !== idx)
    copia[0].dia_inicio = 1
    copia[copia.length - 1].dia_fin = 'fin_mes'
    for (let i = 1; i < copia.length; i++) {
      const prev = copia[i - 1]
      const prevFin = prev.dia_fin === 'fin_mes' ? 28 : prev.dia_fin
      copia[i].dia_inicio = prevFin + 1
    }
    setReglas(copia)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Cobranza</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="config_cobro_json" value={configJson} />

          <p className="text-sm font-semibold text-foreground">
            ¿Qué pasa si un alumno entra con el mes ya iniciado?
          </p>

          <div className="space-y-1.5">
            <RadioOption
              checked={regimen === 'completo'}
              label="Cobrar siempre la mensualidad completa"
              onClick={() => setRegimen('completo')}
            />
            <RadioOption
              checked={regimen === 'proporcional'}
              label="Cobrar proporcional según los días restantes"
              onClick={() => setRegimen('proporcional')}
            />
            <RadioOption
              checked={regimen === 'no_cobrar'}
              label="No cobrar hasta el siguiente mes"
              onClick={() => setRegimen('no_cobrar')}
            />
            <RadioOption
              checked={regimen === 'reglas_dias'}
              label="Configurar reglas por días"
              onClick={() => setRegimen('reglas_dias')}
            />
          </div>

          <div className="border-t border-dashed border-border my-2" />

          {regimen === 'proporcional' && (
            <div>
              <Select value={redondeo} onValueChange={(v) => setRedondeo(v as Redondeo)}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REDONDEO_OPCIONES.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {regimen === 'reglas_dias' && (
            <ReglasDiasEditor
              reglas={reglas}
              onCambiarFin={actualizarFinDeRegla}
              onCambiarAccion={actualizarAccion}
              onAgregar={agregarRegla}
              onEliminar={eliminarRegla}
            />
          )}

          <BulletsExplicacion regimen={regimen} reglas={reglas} />

          {todasCompleto && (
            <div className="flex items-start gap-2 p-3 rounded-md border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300">
              <Lightbulb className="h-4 w-4 mt-0.5 shrink-0" />
              <p className="text-xs leading-relaxed">
                Tus reglas actuales cobran el mes completo sin importar el día de ingreso.{' '}
                <button
                  type="button"
                  className="underline font-semibold"
                  onClick={() => setRegimen('completo')}
                >
                  ¿Deseas usar &ldquo;Siempre cobrar completo&rdquo;?
                </button>
              </p>
            </div>
          )}

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

function ReglasDiasEditor({
  reglas,
  onCambiarFin,
  onCambiarAccion,
  onAgregar,
  onEliminar,
}: {
  reglas: Regla[]
  onCambiarFin: (idx: number, nuevoFin: number) => void
  onCambiarAccion: (idx: number, accion: AccionRegla) => void
  onAgregar: () => void
  onEliminar: (idx: number) => void
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-foreground">Reglas personalizadas por días</p>

      {reglas.map((regla, idx) => {
        const esUltima = idx === reglas.length - 1
        const esIntermedia = idx > 0 && !esUltima
        return (
          <div
            key={idx}
            className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg border border-border bg-card text-sm"
          >
            <span className="text-muted-foreground">Día</span>
            <ChipFijo>{regla.dia_inicio}</ChipFijo>
            <span className="text-muted-foreground">al</span>

            {esUltima ? (
              <ChipFijo>Fin de mes</ChipFijo>
            ) : (
              <DiaPickerPopover
                value={regla.dia_fin as number}
                rangoDias={[2, 26]}
                cols={5}
                min={regla.dia_inicio + 1}
                max={26}
                onChange={(v) => onCambiarFin(idx, v)}
              />
            )}

            <span className="ml-auto flex items-center gap-1">
              <Select
                value={regla.accion}
                onValueChange={(v) => onCambiarAccion(idx, v as AccionRegla)}
              >
                <SelectTrigger className="h-8 w-[200px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="completo">{ACCION_LABELS.completo}</SelectItem>
                  <SelectItem value="proporcional">{ACCION_LABELS.proporcional}</SelectItem>
                  <SelectItem value="no_cobrar">{ACCION_LABELS.no_cobrar}</SelectItem>
                </SelectContent>
              </Select>

              {esIntermedia && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onEliminar(idx)}
                  className="h-8 w-8 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                  aria-label="Eliminar regla"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </span>
          </div>
        )
      })}

      {reglas.length < 3 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onAgregar}
          className="text-primary hover:text-primary/80 h-8"
        >
          <Plus className="h-4 w-4 mr-1" /> Agregar otra regla
        </Button>
      )}
    </div>
  )
}

function ChipFijo({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center justify-center h-8 min-w-[2.5rem] px-2 rounded-md bg-muted text-foreground text-sm font-medium">
      {children}
    </span>
  )
}

function BulletsExplicacion({ regimen, reglas }: { regimen: Regimen; reglas: Regla[] }) {
  const bullets = useMemo(() => {
    if (regimen === 'completo') {
      return [
        'Si un alumno se inscribe el día 3, se le generará un cargo por el 100%.',
        'Si un alumno se inscribe el día 25, se le generará un cargo por el 100%.',
      ]
    }
    if (regimen === 'proporcional') {
      return [
        'Si un alumno se inscribe el día 1, se le generará un cargo por el 100%.',
        'Si un alumno se inscribe el día 15, el sistema cobrará la mitad exacta.',
        'Si un alumno se inscribe el día 27, el sistema cobrará solo los días restantes.',
      ]
    }
    if (regimen === 'no_cobrar') {
      return [
        'Si un alumno se inscribe el día 12, entra activo de inmediato pero no genera cargo.',
        'Su primer cargo automático (100%) se programará para el día 1 del siguiente mes.',
      ]
    }
    return reglas.map((r) => {
      const fin = r.dia_fin === 'fin_mes' ? 'fin' : r.dia_fin
      const accionTxt =
        r.accion === 'completo'
          ? 'Mensualidad completa'
          : r.accion === 'proporcional'
          ? 'Cobro proporcional'
          : 'Período de prueba (sin cargo este mes)'
      return `Día ${r.dia_inicio}–${fin} → ${accionTxt}`
    })
  }, [regimen, reglas])

  return (
    <div className="space-y-1 text-xs text-muted-foreground leading-relaxed">
      <ul className="space-y-1">
        {bullets.map((b, i) => (
          <li key={i} className="flex gap-2">
            <span aria-hidden>•</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <p className="pt-1">
        Estas reglas se aplicarán de forma automática al inscribir nuevos alumnos. No afectan a
        mensualidades que ya hayan sido generadas.
      </p>
    </div>
  )
}
