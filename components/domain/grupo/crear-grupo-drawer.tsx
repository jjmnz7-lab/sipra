'use client'

import * as React from 'react'
import { useActionState, useEffect, useState } from 'react'
import { crearGrupoAction, type FormState } from '@/app/(app)/grupos/actions'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, UsersRound, CheckCircle2, Plus } from 'lucide-react'
import { COLORES_GRUPO, EMOJIS_GRUPO } from '@/lib/constants/grupo-apariencia'
import { formatCurrencyCompact } from '@/lib/utils/currency'
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
import { useToast } from '@/components/ui/use-toast'

export type PlanLite = { id: string; nombre: string; monto: number; frecuencia: string }

const NONE = '__none__'

const FRECUENCIA_SUFIJO: Record<string, string> = {
  mensual: '/mes', semanal: '/semana', por_visita: '/visita', pago_unico: '/visita',
}

const initialState: FormState = {}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full h-11" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
      {pending ? 'Creando...' : 'Guardar Grupo'}
    </Button>
  )
}

interface CrearGrupoDrawerProps {
  planes?: PlanLite[]
}

export function CrearGrupoDrawer({ planes = [] }: CrearGrupoDrawerProps) {
  const [open, setOpen] = useState(false)
  const { showToast, toast } = useToast()

  const [state, formAction] = useActionState(crearGrupoAction, initialState)
  const [planSugerido, setPlanSugerido] = useState<string>(NONE)
  const [nombre, setNombre] = useState<string>('')
  const [colorSlug, setColorSlug] = useState<string>(COLORES_GRUPO[0].slug)
  const [emoji, setEmoji] = useState<string>(EMOJIS_GRUPO[0])
  const [dias, setDias] = useState<number[]>([])
  const [horaInicio, setHoraInicio] = useState<string>('')
  const [horaFin, setHoraFin] = useState<string>('')

  // Cupo máximo
  const [cupoIlimitado, setCupoIlimitado] = useState(true)
  const [cupoMaximo, setCupoMaximo] = useState<number>(10)

  // Reset al cerrar/abrir
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        setNombre('')
        setColorSlug(COLORES_GRUPO[0].slug)
        setEmoji(EMOJIS_GRUPO[0])
        setPlanSugerido(NONE)
        setDias([])
        setHoraInicio('')
        setHoraFin('')
        setCupoIlimitado(true)
        setCupoMaximo(10)
      }, 0)
    }
  }, [open])

  const prevState = React.useRef(state)

  useEffect(() => {
    if (open) prevState.current = state
  }, [open, state])

  useEffect(() => {
    if (state !== prevState.current) {
      prevState.current = state
      if (state.success && open) {
        showToast(`Grupo ${nombre} creado.`)
        setTimeout(() => setOpen(false), 0)
      }
    }
  }, [state, open, nombre, showToast])

  return (
    <>
      {/* FAB: crea directamente un grupo (las actividades viven en su propia pantalla) */}
      <div className="fixed bottom-20 right-4 z-50">
        <button
          onClick={() => setOpen(true)}
          className="bg-[#15435a] hover:bg-[#0f3245] text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg transition-all active:scale-95 z-50"
          aria-label="Crear nuevo grupo"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

      {/* Drawer del formulario */}
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-sm max-h-[85vh] overflow-y-auto">
            <DrawerHeader className="text-left">
              <DrawerTitle className="flex items-center text-foreground">
                <UsersRound className="mr-2 h-5 w-5 text-primary" />
                Crear nuevo grupo
              </DrawerTitle>
            </DrawerHeader>

            <form action={formAction}>
              <input type="hidden" name="plan_sugerido_id" value={planSugerido === NONE ? '' : planSugerido} />
              <input type="hidden" name="color" value={colorSlug} />
              <input type="hidden" name="emoji" value={emoji} />

              <div className="p-4 pb-0 space-y-5">
                {/* 1. Nombre */}
                <div className="space-y-2">
                  <Label htmlFor="nombre" className="text-xs font-semibold text-muted-foreground tracking-wider">
                    Nombre del grupo
                  </Label>
                  <Input
                    id="nombre"
                    name="nombre"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    required
                    className="h-11"
                    placeholder="Ej. Grupo B"
                    autoFocus
                  />
                  {state?.errors?.nombre && (
                    <p className="text-sm text-red-600">{state.errors.nombre[0]}</p>
                  )}
                </div>

                {/* 2. Plan sugerido */}
                {planes.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground tracking-wider">Plan sugerido (opcional)</Label>
                    <Select value={planSugerido} onValueChange={setPlanSugerido}>
                      <SelectTrigger className="h-11"><SelectValue placeholder="Sin plan sugerido" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Sin plan sugerido</SelectItem>
                        {planes.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.nombre} — {formatCurrencyCompact(p.monto)} {FRECUENCIA_SUFIJO[p.frecuencia] ?? ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground">Se autoselecciona al inscribir alumnos a este grupo (editable).</p>
                  </div>
                )}

                {/* 3. Cupo máximo */}
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

                {/* 4-5. Días + horario (opcionales) */}
                <LogisticaGrupoFields
                  diasSeleccionados={dias}
                  horaInicio={horaInicio}
                  horaFin={horaFin}
                  onDiasChange={setDias}
                  onHoraInicioChange={setHoraInicio}
                  onHoraFinChange={setHoraFin}
                />

                {/* 6-8. Color → Emoji → Vista previa (mismo bloque que en Editar grupo) */}
                <AparienciaGrupoFields
                  colorSlug={colorSlug}
                  emoji={emoji}
                  nombre={nombre}
                  onColorChange={setColorSlug}
                  onEmojiChange={setEmoji}
                  placeholderNombre="Nombre del grupo"
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
        {toast}
      </Drawer>
    </>
  )
}


