'use client'

import * as React from 'react'
import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import {
  Search, UserPlus, Loader2, FileText, CreditCard, X, Ticket, ArrowLeft,
} from 'lucide-react'
import { normalizeWholeMoneyInput, preventMoneyWheel } from '@/lib/utils/money-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type AlumnoLite = { id: string; nombre: string; apellido?: string | null }
export type PlanVisita = { id: string; nombre: string; monto: number }

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  alumnos: AlumnoLite[]
  planesPorVisita: PlanVisita[]
  /** Si viene, el alumno queda fijo (perfil): se omite el buscador y el alta rápida. */
  alumnoFijo?: AlumnoLite
}

type Modo = 'buscar' | 'nuevo'

export function VisitaExpressDrawer({ open, onOpenChange, alumnos, planesPorVisita, alumnoFijo }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [modo, setModo] = useState<Modo>('buscar')
  const [query, setQuery] = useState('')
  const [alumnoSel, setAlumnoSel] = useState<AlumnoLite | null>(null)

  // Alta rápida (alumno nuevo con plan por_visita)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoTelefono, setNuevoTelefono] = useState('')

  // Clase / costo
  const [planId, setPlanId] = useState<string>('')
  const [montoCargo, setMontoCargo] = useState<string>('')

  const [error, setError] = useState<string | null>(null)

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return alumnos.slice(0, 8)
    return alumnos
      .filter((a) => `${a.nombre} ${a.apellido ?? ''}`.toLowerCase().includes(q))
      .slice(0, 8)
  }, [alumnos, query])

  const planSel = useMemo(() => planesPorVisita.find((p) => p.id === planId), [planesPorVisita, planId])

  // Alumno activo: el fijo (perfil) tiene prioridad sobre el seleccionado en el buscador.
  const alumnoActivo = alumnoFijo ?? alumnoSel

  const reset = () => {
    setModo('buscar'); setQuery(''); setAlumnoSel(null)
    setNuevoNombre(''); setNuevoTelefono('')
    setPlanId(''); setMontoCargo(''); setError(null)
  }

  const close = () => { onOpenChange(false); reset() }

  // Al elegir una clase, pre-llenar el costo (editable).
  const elegirPlan = (id: string) => {
    setPlanId(id)
    const p = planesPorVisita.find((x) => x.id === id)
    if (p) setMontoCargo(normalizeWholeMoneyInput(String(Math.round(Number(p.monto)))))
  }

  const montoNum = Number(montoCargo) || 0
  const alumnoListo = alumnoFijo
    ? true
    : modo === 'buscar' ? !!alumnoSel : nuevoNombre.trim().length >= 2
  const puedeEnviar = alumnoListo && montoNum > 0 && !isPending

  const enviar = (cobrarAhora: boolean) => {
    setError(null)
    if (!alumnoListo) { setError('Selecciona o crea un alumno.'); return }
    if (montoNum <= 0) { setError('El costo debe ser mayor a 0.'); return }

    const payload: Record<string, unknown> = {
      monto_cargo: montoNum,
      concepto: planSel ? planSel.nombre : 'Visita / Clase suelta',
    }

    if (alumnoFijo) {
      payload.alumno_id = alumnoFijo.id
    } else if (modo === 'buscar') {
      payload.alumno_id = alumnoSel!.id
    } else {
      payload.alumno_nuevo = {
        nombre: nuevoNombre.trim(),
        telefono_whatsapp: nuevoTelefono.trim() || undefined,
        plan_cobro_id: planId || undefined, // vincula el plan por_visita si se eligió
      }
    }

    if (cobrarAhora) {
      payload.monto_pago = montoNum
      payload.metodo_pago = 'efectivo'
      payload.idempotency_key = crypto.randomUUID()
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/visitas/express', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data?.error ?? 'No se pudo registrar la visita.')
          return
        }
        close()
        router.refresh()
      } catch {
        setError('Error de red. Intenta de nuevo.')
      }
    })
  }

  return (
    <Drawer open={open} onOpenChange={(v) => { if (!v) close(); else onOpenChange(true) }}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm max-h-[90vh] overflow-y-auto">
          <DrawerHeader className="text-left">
            <DrawerTitle className="flex items-center text-foreground">
              <Ticket className="mr-2 h-5 w-5 text-[#15435a]" /> Registrar visita
            </DrawerTitle>
          </DrawerHeader>

          <div className="p-4 pb-0 space-y-4">
            {/* -------- Paso 1: Alumno -------- */}
            {!alumnoFijo && !alumnoSel && modo === 'buscar' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-muted-foreground tracking-wider">Buscar alumno</Label>
                  <button
                    type="button"
                    onClick={() => { setModo('nuevo'); setError(null) }}
                    className="flex items-center gap-1 text-xs font-semibold text-[#15435a] hover:text-[#0f3245]"
                  >
                    <UserPlus className="h-3.5 w-3.5" /> Nuevo
                  </button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Nombre del alumno..."
                    className="h-11 pl-9"
                    autoFocus
                  />
                </div>
                <div className="space-y-1 rounded-lg border border-border p-1.5">
                  {filtrados.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setAlumnoSel(a)}
                      className="w-full text-left px-2.5 py-2 rounded-md text-sm text-foreground hover:bg-accent transition-colors truncate"
                    >
                      {a.nombre} {a.apellido ?? ''}
                    </button>
                  ))}
                  {filtrados.length === 0 && (
                    <p className="text-xs text-muted-foreground px-2 py-2">
                      Sin resultados. Crea un alumno nuevo con &ldquo;Nuevo&rdquo;.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Alta rápida */}
            {!alumnoFijo && !alumnoSel && modo === 'nuevo' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-muted-foreground tracking-wider">Alumno nuevo (por visita)</Label>
                  <button
                    type="button"
                    onClick={() => { setModo('buscar'); setError(null) }}
                    className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Buscar
                  </button>
                </div>
                <Input value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} placeholder="Nombre y apellido *" className="h-11" autoFocus />
                <Input value={nuevoTelefono} onChange={(e) => setNuevoTelefono(e.target.value)} placeholder="Teléfono (WhatsApp)" type="tel" className="h-11" />
              </div>
            )}

            {/* Alumno seleccionado (chip). El fijo (perfil) no se puede quitar. */}
            {alumnoActivo && (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
                <span className="text-sm font-semibold text-foreground truncate">
                  {alumnoActivo.nombre} {alumnoActivo.apellido ?? ''}
                </span>
                {!alumnoFijo && (
                  <button type="button" onClick={() => setAlumnoSel(null)} className="text-muted-foreground hover:text-foreground" aria-label="Cambiar alumno">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}

            {/* -------- Paso 2: Clase + costo -------- */}
            {alumnoListo && (
              <>
                {planesPorVisita.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground tracking-wider">Clase / tipo de visita</Label>
                    <Select value={planId} onValueChange={(id) => elegirPlan(id)}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Selecciona una clase…" />
                      </SelectTrigger>
                      <SelectContent>
                        {planesPorVisita.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.nombre} — ${Math.round(Number(p.monto))}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="monto_cargo" className="text-xs font-semibold text-muted-foreground tracking-wider">
                    Costo de la visita
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                    <Input
                      id="monto_cargo"
                      type="number"
                      step="1"
                      min="0"
                      inputMode="numeric"
                      onWheel={preventMoneyWheel}
                      value={montoCargo}
                      onChange={(e) => setMontoCargo(normalizeWholeMoneyInput(e.target.value))}
                      placeholder="0"
                      className="h-11 pl-7"
                    />
                  </div>
                </div>
              </>
            )}

            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">{error}</div>
            )}
          </div>

          <DrawerFooter>
            <div className="grid grid-cols-1 gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-12 text-base font-semibold"
                disabled={!puedeEnviar}
                onClick={() => enviar(false)}
              >
                {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <FileText className="mr-2 h-5 w-5" />}
                Solo cargar a cuenta
              </Button>
              <Button
                type="button"
                className="h-12 text-base font-bold bg-[#22887c] hover:bg-[#1a6b62]"
                disabled={!puedeEnviar}
                onClick={() => enviar(true)}
              >
                {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CreditCard className="mr-2 h-5 w-5" />}
                Cargar y cobrar ahora
              </Button>
              <Button type="button" variant="ghost" className="h-11 text-muted-foreground" onClick={close} disabled={isPending}>
                Cancelar
              </Button>
            </div>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
