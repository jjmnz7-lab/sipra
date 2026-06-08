'use client'

import * as React from 'react'
import { useActionState, useEffect, useState } from 'react'
import { crearGrupoAction, type FormState } from '@/app/(app)/grupos/actions'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, UsersRound, CheckCircle2, Plus, Users, CalendarDays, ChevronRight } from 'lucide-react'
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
} from '@/components/ui/drawer'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export type PlanLite = { id: string; nombre: string; monto: number; frecuencia: string }

const NONE = '__none__'

const FRECUENCIA_SUFIJO: Record<string, string> = {
  mensual: '/mes', semanal: '/semana', por_visita: '/visita', pago_unico: 'único',
}

const initialState: FormState = {}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full h-11" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
      {pending ? 'Creando...' : label}
    </Button>
  )
}

interface CrearGrupoDrawerProps {
  planes?: PlanLite[]
  timezone?: string
}

export function CrearGrupoDrawer({ planes = [], timezone = 'America/Mexico_City' }: CrearGrupoDrawerProps) {
  const [fabMenuOpen, setFabMenuOpen] = useState(false)
  const [open, setOpen] = useState(false)
  const [esTaller, setEsTaller] = useState(false)

  const [state, formAction] = useActionState(crearGrupoAction, initialState)
  const [planSugerido, setPlanSugerido] = useState<string>(NONE)
  const [nombre, setNombre] = useState<string>('')
  const [colorSlug, setColorSlug] = useState<string>(COLORES_GRUPO[0].slug)
  const [emoji, setEmoji] = useState<string>('')
  const [dias, setDias] = useState<number[]>([])
  const [horaInicio, setHoraInicio] = useState<string>('')
  const [horaFin, setHoraFin] = useState<string>('')

  // Cupo máximo
  const [cupoIlimitado, setCupoIlimitado] = useState(true)
  const [cupoMaximo, setCupoMaximo] = useState<number>(10)

  // Fechas taller
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')

  // Reset al cerrar/abrir
  useEffect(() => {
    if (open) {
      setNombre('')
      setColorSlug(COLORES_GRUPO[0].slug)
      setEmoji('')
      setPlanSugerido(NONE)
      setDias([])
      setHoraInicio('')
      setHoraFin('')
      setCupoIlimitado(true)
      setCupoMaximo(10)
      setFechaInicio('')
      setFechaFin('')
    }
  }, [open])

  useEffect(() => {
    if (state.success) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- cierre tras commit del server action
      setOpen(false)
    }
  }, [state.success])

  const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: timezone })
  const tomorrowStr = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toLocaleDateString('sv-SE', { timeZone: timezone })
  })()

  const placeholderNombre = esTaller ? 'Nombre del taller' : 'Nombre del grupo'

  return (
    <>
      {/* FAB */}
      <div className="fixed bottom-20 right-4 z-50">
        <button
          onClick={() => setFabMenuOpen(true)}
          className="bg-[#15435a] hover:bg-[#0f3245] text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg transition-all active:scale-95 z-50"
          aria-label="Crear nuevo grupo o taller"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

      {/* Drawer del menú del FAB: grupo / taller */}
      <Drawer open={fabMenuOpen} onOpenChange={setFabMenuOpen}>
        <DrawerContent className="max-h-[88vh]">
          <div className="mx-auto w-full max-w-md flex flex-col overflow-hidden pb-6">
            <DrawerHeader className="text-left">
              <DrawerTitle>Crear nuevo...</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setEsTaller(false)
                  setOpen(true)
                  setFabMenuOpen(false)
                }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl border border-border hover:bg-accent transition-colors text-left"
              >
                <span
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
                  style={{ color: '#15435a', backgroundColor: '#15435a14' }}
                >
                  <Users className="h-5 w-5" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-foreground">Crear nuevo grupo</span>
                  <span className="block text-xs text-muted-foreground">Organiza alumnos por nivel u horario.</span>
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setEsTaller(true)
                  setOpen(true)
                  setFabMenuOpen(false)
                }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl border border-border hover:bg-accent transition-colors text-left"
              >
                <span
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
                  style={{ color: '#22887c', backgroundColor: '#22887c14' }}
                >
                  <CalendarDays className="h-5 w-5" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-foreground">Crear nuevo taller</span>
                  <span className="block text-xs text-muted-foreground">Crea un curso o actividad temporal.</span>
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Drawer del formulario (grupo o taller) */}
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-sm max-h-[85vh] overflow-y-auto">
            <DrawerHeader className="text-left">
              <DrawerTitle className="flex items-center text-foreground">
                {esTaller ? (
                  <CalendarDays className="mr-2 h-5 w-5 text-[#22887c]" />
                ) : (
                  <UsersRound className="mr-2 h-5 w-5 text-primary" />
                )}
                {esTaller ? 'Crear nuevo taller' : 'Crear nuevo grupo'}
              </DrawerTitle>
            </DrawerHeader>

            <form action={formAction}>
              <input type="hidden" name="plan_sugerido_id" value={planSugerido === NONE ? '' : planSugerido} />
              <input type="hidden" name="es_temporal" value={esTaller ? 'true' : 'false'} />
              <input type="hidden" name="color" value={colorSlug} />
              <input type="hidden" name="emoji" value={emoji} />

              <div className="p-4 pb-0 space-y-5">
                {/* 1. Nombre */}
                <div className="space-y-2">
                  <Label htmlFor="nombre" className="text-xs font-semibold text-muted-foreground tracking-wider">
                    {esTaller ? 'Nombre del taller' : 'Nombre del grupo'}
                  </Label>
                  <Input
                    id="nombre"
                    name="nombre"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    required
                    className="h-11"
                    placeholder={esTaller ? 'Ej. Taller de Verano' : 'Ej. Grupo B'}
                    autoFocus
                  />
                  {state?.errors?.nombre && (
                    <p className="text-sm text-red-600">{state.errors.nombre[0]}</p>
                  )}
                </div>

                {/* 2. Plan — campos específicos */}
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
                          min={todayStr}
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
                  planes.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground tracking-wider">Plan sugerido (opcional)</Label>
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

                {/* 5-7. Color → Emoji → Vista previa (mismo bloque que en Editar grupo) */}
                <AparienciaGrupoFields
                  colorSlug={colorSlug}
                  emoji={emoji}
                  nombre={nombre}
                  onColorChange={setColorSlug}
                  onEmojiChange={setEmoji}
                  placeholderNombre={placeholderNombre}
                  esTaller={esTaller}
                />

                {state?.message && !state.success && (
                  <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
                    {state.message}
                  </div>
                )}
              </div>

              <DrawerFooter>
                <SubmitButton label={esTaller ? 'Guardar Taller' : 'Guardar Grupo'} />
                <DrawerClose asChild>
                  <Button variant="ghost" className="h-11 text-muted-foreground">Cancelar</Button>
                </DrawerClose>
              </DrawerFooter>
            </form>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}
