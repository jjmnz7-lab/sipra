'use client'

import * as React from 'react'
import { useActionState, useEffect, useState } from 'react'
import { editarGrupoAction, type FormState } from '@/app/(app)/grupos/actions'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Pencil, CheckCircle2 } from 'lucide-react'
import { COLORES_GRUPO } from '@/lib/constants/grupo-apariencia'
import { AparienciaGrupoFields } from './apariencia-grupo-fields'
import { LogisticaGrupoFields } from './logistica-grupo-fields'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export type PlanLite = { id: string; nombre: string; monto: number; frecuencia: string }

const NONE = '__none__'

const FRECUENCIA_SUFIJO: Record<string, string> = {
  mensual: '/mes', semanal: '/semana', por_visita: '/visita', pago_unico: 'único',
}

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
  grupo: {
    id: string
    nombre: string
    color: string | null
    emoji: string | null
    plan_sugerido_id?: string | null
    dias_semana?: number[] | null
    hora_inicio?: string | null
    hora_fin?: string | null
    cupo_maximo?: number | null
    es_temporal?: boolean | null
    fecha_inicio?: string | null
    fecha_fin?: string | null
    costo_taller?: number | null
  }
  planes?: PlanLite[]
  open: boolean
  onOpenChange: (open: boolean) => void
  timezone?: string
}

export function EditarGrupoDrawer({ grupo, planes = [], open, onOpenChange, timezone = 'America/Mexico_City' }: Props) {
  const [state, formAction] = useActionState(editarGrupoAction, initialState)
  const [colorSlug, setColorSlug] = useState<string>(grupo.color ?? COLORES_GRUPO[0].slug)
  const [emoji, setEmoji] = useState<string>(grupo.emoji ?? '')
  const [nombre, setNombre] = useState<string>(grupo.nombre)
  const [planSugerido, setPlanSugerido] = useState<string>(grupo.plan_sugerido_id ?? NONE)
  const [dias, setDias] = useState<number[]>(grupo.dias_semana ?? [])
  const [horaInicio, setHoraInicio] = useState<string>((grupo.hora_inicio ?? '').slice(0, 5))
  const [horaFin, setHoraFin] = useState<string>((grupo.hora_fin ?? '').slice(0, 5))

  // Cupo máximo
  const [cupoIlimitado, setCupoIlimitado] = useState(grupo.cupo_maximo === null || grupo.cupo_maximo === undefined)
  const [cupoMaximo, setCupoMaximo] = useState<number>(grupo.cupo_maximo ?? 10)

  // Fechas taller
  const [fechaInicio, setFechaInicio] = useState(grupo.fecha_inicio ?? '')
  const [fechaFin, setFechaFin] = useState(grupo.fecha_fin ?? '')
  const [costoTaller, setCostoTaller] = useState<string>(grupo.costo_taller != null ? String(grupo.costo_taller) : '')

  const esTaller = !!grupo.es_temporal

  // Resync cuando se abre el drawer (por si cambió el grupo entre aperturas).
  useEffect(() => {
    if (open) {
      setColorSlug(grupo.color ?? COLORES_GRUPO[0].slug)
      setEmoji(grupo.emoji ?? '')
      setNombre(grupo.nombre)
      setPlanSugerido(grupo.plan_sugerido_id ?? NONE)
      setDias(grupo.dias_semana ?? [])
      setHoraInicio((grupo.hora_inicio ?? '').slice(0, 5))
      setHoraFin((grupo.hora_fin ?? '').slice(0, 5))
      setCupoIlimitado(grupo.cupo_maximo === null || grupo.cupo_maximo === undefined)
      setCupoMaximo(grupo.cupo_maximo ?? 10)
      setFechaInicio(grupo.fecha_inicio ?? '')
      setFechaFin(grupo.fecha_fin ?? '')
      setCostoTaller(grupo.costo_taller != null ? String(grupo.costo_taller) : '')
    }
  }, [open, grupo])

  useEffect(() => {
    if (state.success) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- cierre tras commit del server action
      onOpenChange(false)
    }
  }, [state.success, onOpenChange])

  const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: timezone })
  const tomorrowStr = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toLocaleDateString('sv-SE', { timeZone: timezone })
  })()

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm max-h-[90vh] overflow-y-auto">
          <DrawerHeader className="text-left">
            <DrawerTitle className="flex items-center text-foreground">
              <Pencil className="mr-2 h-5 w-5 text-primary" /> Editar {esTaller ? 'taller' : 'grupo'}
            </DrawerTitle>
            <DrawerDescription>
              Personaliza los detalles de este {esTaller ? 'taller' : 'grupo'}.
            </DrawerDescription>
          </DrawerHeader>

          <form action={formAction}>
            <input type="hidden" name="grupo_id" value={grupo.id} />
            <input type="hidden" name="color" value={colorSlug} />
            <input type="hidden" name="emoji" value={emoji} />
            <input type="hidden" name="plan_sugerido_id" value={planSugerido === NONE ? '' : planSugerido} />
            <input type="hidden" name="es_temporal" value={esTaller ? 'true' : 'false'} />

            <div className="p-4 pb-0 space-y-5">
              {/* 1. Nombre */}
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre del {esTaller ? 'taller' : 'grupo'} *</Label>
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

              {/* Campos específicos de Taller */}
              {esTaller ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="fecha_inicio" className="text-xs font-semibold text-muted-foreground tracking-wider">Fecha de inicio *</Label>
                      <Input
                        id="fecha_inicio"
                        name="fecha_inicio"
                        type="date"
                        required
                        value={fechaInicio}
                        onChange={(e) => {
                          setFechaInicio(e.target.value)
                          if (fechaFin && e.target.value && fechaFin <= e.target.value) {
                            const nextDay = new Date(e.target.value)
                            nextDay.setDate(nextDay.getDate() + 1)
                            setFechaFin(nextDay.toLocaleDateString('sv-SE'))
                          }
                        }}
                        className="h-11 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fecha_fin" className="text-xs font-semibold text-muted-foreground tracking-wider">Fecha de fin *</Label>
                      <Input
                        id="fecha_fin"
                        name="fecha_fin"
                        type="date"
                        required
                        value={fechaFin}
                        onChange={(e) => setFechaFin(e.target.value)}
                        min={fechaInicio ? (() => {
                          const [y, m, d] = fechaInicio.split('-').map(Number)
                          const next = new Date(y!, m! - 1, d! + 1)
                          return next.toLocaleDateString('sv-SE')
                        })() : tomorrowStr}
                        className="h-11 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="costo_taller" className="text-xs font-semibold text-muted-foreground tracking-wider">Costo del taller *</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                      <Input
                        id="costo_taller"
                        name="costo_taller"
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={costoTaller}
                        onChange={(e) => setCostoTaller(e.target.value)}
                        className="h-11 pl-7"
                        placeholder="0.00"
                      />
                    </div>
                    {state?.errors?.costo_taller && (
                      <p className="text-sm text-red-600">{state.errors.costo_taller[0]}</p>
                    )}
                  </div>
                </>
              ) : (
                /* 2. Plan */
                planes.length > 0 && (
                  <div className="space-y-2">
                    <Label>Plan sugerido (opcional)</Label>
                    <Select value={planSugerido} onValueChange={setPlanSugerido}>
                      <SelectTrigger className="h-11"><SelectValue placeholder="Sin plan sugerido" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Sin plan sugerido</SelectItem>
                        {planes.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.nombre} — ${Number(p.monto).toFixed(2)} {FRECUENCIA_SUFIJO[p.frecuencia] ?? ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground">Se autoselecciona al inscribir alumnos a este grupo (editable).</p>
                  </div>
                )
              )}

              {/* Campo Cupo máximo */}
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

              {/* 3-4. Días + horario (opcionales) */}
              <LogisticaGrupoFields
                diasSeleccionados={dias}
                horaInicio={horaInicio}
                horaFin={horaFin}
                onDiasChange={setDias}
                onHoraInicioChange={setHoraInicio}
                onHoraFinChange={setHoraFin}
              />

              {/* 5-7. Color → Emoji → Vista previa */}
              <AparienciaGrupoFields
                colorSlug={colorSlug}
                emoji={emoji}
                nombre={nombre}
                onColorChange={setColorSlug}
                onEmojiChange={setEmoji}
                placeholderNombre={esTaller ? "Nombre del taller" : "Nombre del grupo"}
                esTaller={esTaller}
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
