'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DIAS_SEMANA } from '@/lib/constants/dias-semana'

type Props = {
  diasSeleccionados: number[]
  horaInicio: string
  horaFin: string
  onDiasChange: (dias: number[]) => void
  onHoraInicioChange: (v: string) => void
  onHoraFinChange: (v: string) => void
  disableDias?: boolean
  diasPermitidos?: number[]
}

/**
 * Bloque homogéneo para capturar días de la semana y horario del grupo o la actividad.
 *
 * - Días: cuadrícula horizontal multi-selección. Botones cuadrados redondeados
 *   con 1 letra. El día se persiste como entero (0=Dom..6=Sáb).
 * - Horario: hora_inicio (obligatoria si se captura horario) + hora_fin (opcional).
 *
 * Ambos campos son OPCIONALES: el grupo puede guardarse sin días ni horario.
 */
export function LogisticaGrupoFields({
  diasSeleccionados,
  horaInicio,
  horaFin,
  onDiasChange,
  onHoraInicioChange,
  onHoraFinChange,
  disableDias = false,
  diasPermitidos,
}: Props) {
  const toggleDia = (valor: number) => {
    const next = diasSeleccionados.includes(valor)
      ? diasSeleccionados.filter((d) => d !== valor)
      : [...diasSeleccionados, valor].sort((a, b) => {
          // Ordenar respetando el orden visual L→D para que los hidden inputs queden estables.
          const orden = DIAS_SEMANA.map((d) => d.value)
          return orden.indexOf(a) - orden.indexOf(b)
        })
    onDiasChange(next)
  }

  // Hora fin queda deshabilitada si no hay hora inicio.
  const finDisabled = !horaInicio
  // Hint visual: si fin <= inicio, lo marcamos como error de UI (el server también valida).
  const finInvalido = !!horaInicio && !!horaFin && horaFin <= horaInicio

  return (
    <>
      {/* Días de la semana — cuadrícula horizontal */}
      <div className="space-y-2">
        <Label>Días (opcional)</Label>
        <div className="grid grid-cols-7 gap-1.5">
          {DIAS_SEMANA.map((d) => {
            const selected = diasSeleccionados.includes(d.value)
            const isPermitted = !diasPermitidos || diasPermitidos.includes(d.value)
            const isDisabled = disableDias || !isPermitted

            return (
              <button
                type="button"
                key={d.value}
                disabled={isDisabled}
                onClick={() => toggleDia(d.value)}
                title={d.fullLabel}
                aria-label={d.fullLabel}
                aria-pressed={selected}
                className={`h-10 rounded-lg text-sm font-bold transition-colors disabled:pointer-events-none disabled:opacity-50 ${
                  selected
                    ? 'bg-primary text-primary-foreground border border-primary'
                    : 'bg-card text-muted-foreground border border-border hover:bg-accent'
                } ${!isDisabled ? 'active:scale-95' : ''}`}
              >
                {d.shortLabel}
              </button>
            )
          })}
        </div>
      </div>

      {/* Horario */}
      <div className="space-y-2">
        <Label>Horario (opcional)</Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="hora_inicio" className="text-[11px] font-medium text-muted-foreground">
              Hora inicio
            </Label>
            <Input
              id="hora_inicio"
              name="hora_inicio"
              type="time"
              value={horaInicio}
              onChange={(e) => onHoraInicioChange(e.target.value)}
              className="h-11"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="hora_fin" className="text-[11px] font-medium text-muted-foreground">
              Hora fin
            </Label>
            <Input
              id="hora_fin"
              name="hora_fin"
              type="time"
              value={horaFin}
              onChange={(e) => onHoraFinChange(e.target.value)}
              disabled={finDisabled}
              className={`h-11 ${finInvalido ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
            />
          </div>
        </div>
        {finInvalido && (
          <p className="text-[11px] text-red-600">La hora de fin debe ser mayor que la de inicio.</p>
        )}
        {!finDisabled && !horaFin && (
          <p className="text-[11px] text-muted-foreground">La hora de fin es opcional.</p>
        )}
      </div>

      {/* Hidden inputs para mandar al server action */}
      <input type="hidden" name="dias_semana" value={JSON.stringify(diasSeleccionados)} />
    </>
  )
}
