'use client'

import * as React from 'react'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { archivarGrupoAction } from '@/app/(app)/grupos/actions'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Archive, Hourglass, Loader2, ArrowRightLeft, Clock, Users, AlertTriangle } from 'lucide-react'

type GrupoLite = { id: string; nombre: string }
type Modo = 'migrar' | 'pendiente'

type Props = {
  grupoId: string
  grupoNombre: string
  alumnosCount: number
  gruposDestino: GrupoLite[]
  /** Si es taller, los textos/iconos cambian a "Archivar taller". */
  esTaller?: boolean
  /** Si es taller con fecha_fin todavía en el futuro, se requiere una confirmación extra para archivarlo. */
  fechaFinFutura?: boolean
  fechaFin?: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ArchivarGrupoDrawer({
  grupoId, grupoNombre, alumnosCount, gruposDestino,
  esTaller = false, fechaFinFutura = false, fechaFin = null,
  open, onOpenChange,
}: Props) {
  const router = useRouter()
  const [modo, setModo] = useState<Modo | null>(null)
  const [destinoId, setDestinoId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  // Confirmación extra requerida solo cuando se intenta finalizar un taller cuya fecha
  // de fin aún no ha llegado.
  const [confirmAnticipado, setConfirmAnticipado] = useState(false)
  const [pending, startTransition] = useTransition()

  const reset = () => { setModo(null); setDestinoId(''); setError(null); setConfirmAnticipado(false) }
  const hayDestinos = gruposDestino.length > 0
  const requiereConfirmAnticipado = esTaller && fechaFinFutura
  const confirmAnticipadoListo = !requiereConfirmAnticipado || confirmAnticipado
  const puedeConfirmar = (modo === 'pendiente' || (modo === 'migrar' && !!destinoId)) && confirmAnticipadoListo

  // Textos según contexto
  const accion = esTaller ? 'Archivar taller' : 'Archivar grupo'
  const accionVerbo = esTaller ? 'archivar' : 'archivar'
  const accionGerundio = esTaller ? 'Archivando...' : 'Archivando...'
  const CierreIcon = esTaller ? Hourglass : Archive

  const handleConfirm = () => {
    setError(null)
    const destino = modo === 'migrar' ? destinoId : null
    startTransition(async () => {
      const res = await archivarGrupoAction(grupoId, destino)
      if (!res.success) {
        setError(res.message ?? `No se pudo ${accionVerbo} el ${esTaller ? 'taller' : 'grupo'}.`)
        return
      }
      onOpenChange(false)
      router.push('/grupos')
      router.refresh()
    })
  }

  // Formato corto de fecha para el aviso de cierre anticipado.
  const fechaFinLegible = (() => {
    if (!fechaFin) return ''
    const [y, m, d] = String(fechaFin).split('-').map(Number)
    if (!y || !m || !d) return fechaFin
    return new Date(y, m - 1, d).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
  })()

  return (
    <Drawer open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v) }}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader className="text-left">
            <DrawerTitle className="flex items-center gap-2">
              <CierreIcon className="h-5 w-5 text-muted-foreground" /> {accion}
            </DrawerTitle>
            <DrawerDescription>
              <strong>{grupoNombre}</strong> se archivará (no se borra; el historial se conserva).
            </DrawerDescription>
          </DrawerHeader>

          <div className="p-4 pb-0 space-y-3">
            {/* Aviso si el taller aún no llega a su fecha de fin */}
            {requiereConfirmAnticipado && (
              <button
                type="button"
                onClick={() => setConfirmAnticipado((v) => !v)}
                className={cn(
                  'w-full flex items-start gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors',
                  confirmAnticipado
                    ? 'border-amber-400 bg-amber-100/60'
                    : 'border-amber-300 bg-amber-50 hover:bg-amber-100/50',
                )}
              >
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-600" />
                <span className="text-xs leading-relaxed text-amber-900">
                  Este taller aún no llega a su fecha de fin{fechaFinLegible ? ` (${fechaFinLegible})` : ''}.
                  Vas a finalizarlo de forma anticipada. <strong>{confirmAnticipado ? 'Confirmado ✓' : 'Toca para confirmar.'}</strong>
                </span>
              </button>
            )}

            {/* Conteo de dependientes */}
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm text-foreground">
              <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              {alumnosCount === 0 ? (
                <span>No hay alumnos activos en este {esTaller ? 'taller' : 'grupo'}.</span>
              ) : (
                <span><strong>{alumnosCount}</strong> {alumnosCount === 1 ? 'alumno activo depende' : 'alumnos activos dependen'} de este {esTaller ? 'taller' : 'grupo'}.</span>
              )}
            </div>

            {alumnosCount > 0 && (
              <div className="space-y-2">
                {/* Opción A */}
                <OpcionCard
                  active={modo === 'migrar'}
                  disabled={!hayDestinos}
                  icon={<ArrowRightLeft className="h-4 w-4" />}
                  titulo={'Mudar alumnos a otro grupo'}
                  desc={hayDestinos ? 'Muévelos a otro grupo activo con un solo tap.' : 'No hay otros grupos activos disponibles.'}
                  onClick={() => setModo('migrar')}
                />
                {modo === 'migrar' && hayDestinos && (
                  <div className="pl-2 space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground tracking-wider">Grupo destino</Label>
                    <Select value={destinoId} onValueChange={setDestinoId}>
                      <SelectTrigger className="h-11"><SelectValue placeholder="Selecciona el grupo" /></SelectTrigger>
                      <SelectContent>
                        {gruposDestino.map((g) => (<SelectItem key={g.id} value={g.id}>{g.nombre}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Opción B */}
                <OpcionCard
                  active={modo === 'pendiente'}
                  icon={<Clock className="h-4 w-4" />}
                  titulo={'Archivar de todos modos'}
                  desc="Deja a los alumnos como pendientes. No afecta planes ni cargos."
                  onClick={() => setModo('pendiente')}
                />
                {modo === 'pendiente' && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
                    <Clock className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-500" />
                    <p className="text-[11px] leading-relaxed">Los alumnos quedarán sin este grupo hasta que los reubiques.</p>
                  </div>
                )}
              </div>
            )}

            {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">{error}</div>}
          </div>

          <DrawerFooter>
            <Button
              onClick={handleConfirm}
              disabled={
                pending ||
                (alumnosCount > 0 && !puedeConfirmar) ||
                (alumnosCount === 0 && !confirmAnticipadoListo)
              }
              className="h-11"
            >
              {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CierreIcon className="mr-2 h-4 w-4" />}
              {pending ? accionGerundio : accion}
            </Button>
            <DrawerClose asChild><Button variant="ghost" className="h-11">Cancelar</Button></DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

function OpcionCard({
  active, disabled, icon, titulo, desc, onClick,
}: {
  active: boolean
  disabled?: boolean
  icon: React.ReactNode
  titulo: string
  desc: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full flex items-start gap-3 rounded-xl border p-3 text-left transition-colors',
        disabled && 'opacity-50 cursor-not-allowed',
        active ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent',
      )}
    >
      <span className={cn('mt-0.5 flex-shrink-0', active ? 'text-primary' : 'text-muted-foreground')}>{icon}</span>
      <span className="min-w-0">
        <span className={cn('block text-sm font-semibold', active ? 'text-primary' : 'text-foreground')}>{titulo}</span>
        <span className="block text-xs text-muted-foreground mt-0.5">{desc}</span>
      </span>
    </button>
  )
}
