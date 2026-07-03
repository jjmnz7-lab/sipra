'use client'

import * as React from 'react'
import { useActionState, useEffect, useState } from 'react'
import { editarActividadAction, type FormState } from '@/app/(app)/actividades/actions'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Pencil, CheckCircle2 } from 'lucide-react'
import { EMOJI_ACTIVIDAD_DEFAULT } from '@/lib/constants/actividad-apariencia'
import { AparienciaActividadFields } from './apariencia-actividad-fields'
import { LogisticaGrupoFields } from '@/components/domain/grupo/logistica-grupo-fields'
import { useToast } from '@/components/ui/use-toast'
import { normalizeWholeMoneyInput, preventMoneyWheel } from '@/lib/utils/money-input'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer'

const initialState: FormState = {}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full h-11" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
      {pending ? 'Guardando...' : 'Guardar cambios'}
    </Button>
  )
}

type Props = {
  actividad: {
    id: string
    nombre: string
    emoji: string | null
    fecha_inicio: string | null
    fecha_fin: string | null
    costo_actividad: number | null
    dias_semana?: number[] | null
    hora_inicio?: string | null
    hora_fin?: string | null
    cupo_maximo?: number | null
  }
  open: boolean
  onOpenChange: (open: boolean) => void
  timezone?: string
}

export function EditarActividadDrawer({ actividad, open, onOpenChange, timezone = 'America/Mexico_City' }: Props) {
  const [state, formAction] = useActionState(editarActividadAction, initialState)
  const [nombre, setNombre] = useState(actividad.nombre)
  const { toast: showToast } = useToast()
  const [emoji, setEmoji] = useState<string>(actividad.emoji ?? EMOJI_ACTIVIDAD_DEFAULT)
  const [dias, setDias] = useState<number[]>(actividad.dias_semana ?? [])
  const [horaInicio, setHoraInicio] = useState<string>((actividad.hora_inicio ?? '').slice(0, 5))
  const [horaFin, setHoraFin] = useState<string>((actividad.hora_fin ?? '').slice(0, 5))

  // Cupo máximo
  const [cupoIlimitado, setCupoIlimitado] = useState(actividad.cupo_maximo === null || actividad.cupo_maximo === undefined)
  const [cupoMaximo, setCupoMaximo] = useState<number>(actividad.cupo_maximo ?? 10)

  // Fechas
  const esUnDia = !!actividad.fecha_inicio && actividad.fecha_inicio === actividad.fecha_fin
  const [unSoloDia, setUnSoloDia] = useState(esUnDia)
  const [fechaInicio, setFechaInicio] = useState(actividad.fecha_inicio ?? '')
  const [fechaFin, setFechaFin] = useState(actividad.fecha_fin ?? '')
  const [costo, setCosto] = useState<string>(actividad.costo_actividad != null ? String(actividad.costo_actividad) : '')

  const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: timezone })
  const yaInicio = !!actividad.fecha_inicio && actividad.fecha_inicio <= todayStr

  // Resync cuando se abre el drawer (por si cambió la actividad entre aperturas).
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        setNombre(actividad.nombre)
        setEmoji(actividad.emoji ?? EMOJI_ACTIVIDAD_DEFAULT)
        setDias(actividad.dias_semana ?? [])
        setHoraInicio((actividad.hora_inicio ?? '').slice(0, 5))
        setHoraFin((actividad.hora_fin ?? '').slice(0, 5))
        setCupoIlimitado(actividad.cupo_maximo === null || actividad.cupo_maximo === undefined)
        setCupoMaximo(actividad.cupo_maximo ?? 10)
        setUnSoloDia(!!actividad.fecha_inicio && actividad.fecha_inicio === actividad.fecha_fin)
        setFechaInicio(actividad.fecha_inicio ?? '')
        setFechaFin(actividad.fecha_fin ?? '')
        setCosto(actividad.costo_actividad != null ? String(actividad.costo_actividad) : '')
      }, 0)
    }
  }, [open, actividad])

  const prevState = React.useRef(state)

  useEffect(() => {
    if (open) prevState.current = state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (state !== prevState.current) {
      prevState.current = state
      if (state.success && open) {
        showToast(`Cambios guardados en ${nombre}.`)
        setTimeout(() => onOpenChange(false), 0)
      }
    }
  }, [state, open, nombre, showToast, onOpenChange])

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm max-h-[90vh] overflow-y-auto">
          <DrawerHeader className="text-left">
            <DrawerTitle className="flex items-center text-foreground">
              <Pencil className="mr-2 h-5 w-5 text-primary" /> Editar actividad
            </DrawerTitle>
            <DrawerDescription>
              Personaliza los detalles de esta actividad.
            </DrawerDescription>
          </DrawerHeader>

          <form action={formAction}>
            <input type="hidden" name="actividad_id" value={actividad.id} />
            <input type="hidden" name="emoji" value={emoji} />
            <input type="hidden" name="un_solo_dia" value={unSoloDia ? 'true' : 'false'} />
            {yaInicio && <input type="hidden" name="fecha_inicio" value={fechaInicio} />}

            <div className="p-4 pb-0 space-y-5">
              {/* 1. Nombre */}
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre de la actividad *</Label>
                <Input
                  id="nombre"
                  name="nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                  className="h-11"
                />
                {state?.errors?.nombre && <p className="text-sm text-red-600">{state.errors.nombre[0]}</p>}
              </div>

              {/* 2. Fechas (con switch "Un solo día") */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-muted-foreground tracking-wider">
                    {unSoloDia ? 'Fecha *' : 'Fechas *'}
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-medium">Un solo día</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={unSoloDia}
                      onClick={() => setUnSoloDia(!unSoloDia)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        unSoloDia ? 'bg-[#22887c]' : 'bg-muted'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          unSoloDia ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className={unSoloDia ? '' : 'grid grid-cols-2 gap-3'}>
                  <div className="space-y-1.5">
                    {!unSoloDia && (
                      <Label htmlFor="fecha_inicio" className="text-[11px] font-medium text-muted-foreground">Inicio</Label>
                    )}
                    <Input
                      id="fecha_inicio"
                      name="fecha_inicio"
                      type="date"
                      required
                      disabled={yaInicio}
                      value={fechaInicio}
                      onChange={(e) => {
                        setFechaInicio(e.target.value)
                        if (fechaFin && e.target.value && fechaFin < e.target.value) {
                          setFechaFin(e.target.value)
                        }
                      }}
                      min={yaInicio ? undefined : todayStr}
                      className="h-11 text-sm"
                    />
                    {yaInicio && (
                      <p className="text-[11px] text-muted-foreground">
                        La actividad ya inició: no se puede cambiar la fecha de inicio.
                      </p>
                    )}
                  </div>
                  {!unSoloDia && (
                    <div className="space-y-1.5">
                      <Label htmlFor="fecha_fin" className="text-[11px] font-medium text-muted-foreground">Fin</Label>
                      <Input
                        id="fecha_fin"
                        name="fecha_fin"
                        type="date"
                        required
                        value={fechaFin}
                        onChange={(e) => setFechaFin(e.target.value)}
                        min={fechaInicio || undefined}
                        className="h-11 text-sm"
                      />
                    </div>
                  )}
                </div>
                {(state?.errors?.fecha_inicio || state?.errors?.fecha_fin) && (
                  <p className="text-sm text-red-600">
                    {state.errors?.fecha_inicio?.[0] ?? state.errors?.fecha_fin?.[0]}
                  </p>
                )}
              </div>

              {/* 3. Costo */}
              <div className="space-y-2">
                <Label htmlFor="costo_actividad" className="text-xs font-semibold text-muted-foreground tracking-wider">Costo de la actividad *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <Input
                    id="costo_actividad"
                    name="costo_actividad"
                    type="number"
                    step="1"
                    min="0"
                    required
                    onWheel={preventMoneyWheel}
                    onChange={(e) => setCosto(normalizeWholeMoneyInput(e.target.value))}
                    inputMode="numeric"
                    value={costo}
                    className="h-11 pl-7"
                    placeholder="0"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Solo afecta a inscripciones futuras; los cargos ya generados no cambian.
                </p>
                {state?.errors?.costo_actividad && (
                  <p className="text-sm text-red-600">{state.errors.costo_actividad[0]}</p>
                )}
              </div>

              {/* 4. Cupo máximo */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="cupo_maximo" className="text-xs font-semibold text-muted-foreground tracking-wider">Cupo máximo</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-medium">Cupo ilimitado</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={cupoIlimitado}
                      onClick={() => setCupoIlimitado(!cupoIlimitado)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        cupoIlimitado ? 'bg-[#22887c]' : 'bg-muted'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          cupoIlimitado ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <input type="hidden" name="cupo_ilimitado" value={cupoIlimitado ? 'true' : 'false'} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={cupoIlimitado || cupoMaximo <= 1}
                    onClick={() => setCupoMaximo((prev) => Math.max(1, prev - 1))}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-foreground font-bold hover:bg-accent disabled:opacity-50 select-none"
                  >
                    -
                  </button>
                  <Input
                    id="cupo_maximo"
                    name="cupo_maximo"
                    type="number"
                    min="1"
                    max="999"
                    disabled={cupoIlimitado}
                    value={cupoIlimitado ? '' : cupoMaximo}
                    onChange={(e) => {
                      const val = Number(e.target.value)
                      if (val > 0 && val <= 999) {
                        setCupoMaximo(val)
                      } else if (e.target.value === '') {
                        setCupoMaximo(1)
                      }
                    }}
                    placeholder="ilimitado"
                    className="h-11 text-center"
                  />
                  <button
                    type="button"
                    disabled={cupoIlimitado || cupoMaximo >= 999}
                    onClick={() => setCupoMaximo((prev) => Math.min(999, prev + 1))}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-foreground font-bold hover:bg-accent disabled:opacity-50 select-none"
                  >
                    +
                  </button>
                </div>
                {state?.errors?.cupo_maximo && (
                  <p className="text-sm text-red-600">{state.errors.cupo_maximo[0]}</p>
                )}
              </div>

              {/* 5-6. Días + horario (opcionales) */}
              <LogisticaGrupoFields
                diasSeleccionados={dias}
                horaInicio={horaInicio}
                horaFin={horaFin}
                onDiasChange={setDias}
                onHoraInicioChange={setHoraInicio}
                onHoraFinChange={setHoraFin}
              />

              {/* 7-8. Emoji → Vista previa (sin color) */}
              <AparienciaActividadFields
                emoji={emoji}
                nombre={nombre}
                onEmojiChange={setEmoji}
              />

              {state?.message && !state.success && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
                  {state.message}
                </div>
              )}
            </div>

            <DrawerFooter>
              <SubmitButton />
              <DrawerClose asChild>
                <Button variant="ghost" className="h-11 text-muted-foreground">Cancelar</Button>
              </DrawerClose>
            </DrawerFooter>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
