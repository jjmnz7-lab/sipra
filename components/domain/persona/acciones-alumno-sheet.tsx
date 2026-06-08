'use client'

import * as React from 'react'
import { useActionState, useEffect, useState } from 'react'
import {
  suspenderAlumnoAction,
  reactivarAlumnoAction,
  eliminarAlumnoAction,
  darDeBajaAlumnoAction,
  type FormState,
} from '@/app/(app)/seguimiento/actions'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Pencil, Pause, Play, Trash2, AlertTriangle, Loader2 } from 'lucide-react'
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

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  persona: {
    id: string
    nombre: string
    apellido: string | null
    estado_registro: string
  }
  /** Usado para decidir entre "Eliminar" (hard) o "Dar de baja" (soft). */
  tieneHistorial: boolean
  /** Abre el drawer de edición desde el padre. */
  onEditar: () => void
  onSuccess?: () => void
}

export function AccionesAlumnoSheet({ open, onOpenChange, persona, tieneHistorial, onEditar, onSuccess }: Props) {
  const [confirmOpen, setConfirmOpen] = useState<null | 'suspender' | 'reactivar' | 'eliminar' | 'baja'>(null)

  const suspendido = persona.estado_registro !== 'activo'

  const handleClick = (accion: 'editar' | 'suspender' | 'reactivar' | 'eliminar' | 'baja') => {
    if (accion === 'editar') {
      onOpenChange(false)
      // Pequeño delay para que la animación del sheet termine antes de abrir el siguiente
      setTimeout(() => onEditar(), 200)
      return
    }
    setConfirmOpen(accion)
  }

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-sm">
            <DrawerHeader className="text-left pb-2">
              <DrawerTitle className="text-base">Acciones del alumno</DrawerTitle>
              <DrawerDescription className="text-xs">
                {persona.nombre} {persona.apellido ?? ''}
              </DrawerDescription>
            </DrawerHeader>

            <div className="px-4 pb-2 space-y-1.5">
              <button
                onClick={() => handleClick('editar')}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-accent transition-colors text-left"
              >
                <Pencil className="h-5 w-5 text-foreground/80 flex-shrink-0" />
                <span className="text-sm font-medium text-foreground">Editar alumno</span>
              </button>

              {suspendido ? (
                <button
                  onClick={() => handleClick('reactivar')}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-accent transition-colors text-left"
                >
                  <Play className="h-5 w-5 text-[#22887c] flex-shrink-0" />
                  <span className="text-sm font-medium text-foreground">Activar alumno</span>
                </button>
              ) : (
                <button
                  onClick={() => handleClick('suspender')}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-accent transition-colors text-left"
                >
                  <Pause className="h-5 w-5 text-amber-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-foreground">Suspender alumno</span>
                </button>
              )}

              {tieneHistorial ? (
                <button
                  onClick={() => handleClick('baja')}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-destructive/10 transition-colors text-left"
                >
                  <Trash2 className="h-5 w-5 text-destructive flex-shrink-0" />
                  <span className="text-sm font-medium text-destructive">Dar de baja definitiva</span>
                </button>
              ) : (
                <button
                  onClick={() => handleClick('eliminar')}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-destructive/10 transition-colors text-left"
                >
                  <Trash2 className="h-5 w-5 text-destructive flex-shrink-0" />
                  <span className="text-sm font-medium text-destructive">Eliminar alumno</span>
                </button>
              )}
            </div>

            <DrawerFooter className="pt-2">
              <DrawerClose asChild>
                <Button variant="ghost" className="h-11">Cerrar</Button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>

      {confirmOpen && (
        <ConfirmacionDrawer
          accion={confirmOpen}
          personaId={persona.id}
          nombre={`${persona.nombre} ${persona.apellido ?? ''}`.trim()}
          open={confirmOpen !== null}
          onOpenChange={(o) => {
            if (!o) setConfirmOpen(null)
          }}
          onSuccess={() => {
            setConfirmOpen(null)
            onOpenChange(false)
            onSuccess?.()
          }}
        />
      )}
    </>
  )
}

function SubmitBtn({ label, variant }: { label: string; variant?: 'destructive' | 'default' }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant={variant} className="w-full h-11" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {pending ? 'Procesando...' : label}
    </Button>
  )
}

type Accion = 'suspender' | 'reactivar' | 'eliminar' | 'baja'

const CONFIG: Record<Accion, {
  action: typeof suspenderAlumnoAction
  titulo: string
  descripcion: string
  cta: string
  destructiva: boolean
}> = {
  suspender: {
    action: suspenderAlumnoAction,
    titulo: 'Suspender alumno',
    descripcion: 'Quedará marcado como inactivo. No aparecerá en listas operativas pero su historial se conserva.',
    cta: 'Suspender',
    destructiva: false,
  },
  reactivar: {
    action: reactivarAlumnoAction,
    titulo: 'Reactivar alumno',
    descripcion: 'Volverá a estar activo y aparecerá en las listas operativas.',
    cta: 'Reactivar',
    destructiva: false,
  },
  eliminar: {
    action: eliminarAlumnoAction,
    titulo: 'Eliminar alumno',
    descripcion: 'Se eliminará por completo. Esta opción solo está disponible porque no tiene pagos registrados.',
    cta: 'Eliminar definitivamente',
    destructiva: true,
  },
  baja: {
    action: darDeBajaAlumnoAction,
    titulo: 'Dar de baja definitiva',
    descripcion: 'Se aplicará un soft-delete: el alumno deja de operar pero el ledger (pagos, cargos, historial) queda intacto.',
    cta: 'Dar de baja',
    destructiva: true,
  },
}

function ConfirmacionDrawer({
  accion,
  personaId,
  nombre,
  open,
  onOpenChange,
  onSuccess,
}: {
  accion: Accion
  personaId: string
  nombre: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const cfg = CONFIG[accion]
  const [state, formAction] = useActionState(cfg.action, initialState)

  useEffect(() => {
    if (state.success) onSuccess()
  }, [state.success, onSuccess])

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader className="text-left">
            <DrawerTitle className={`flex items-center ${cfg.destructiva ? 'text-destructive' : 'text-foreground'}`}>
              {cfg.destructiva && <AlertTriangle className="mr-2 h-5 w-5" />}
              {cfg.titulo}
            </DrawerTitle>
            <DrawerDescription>
              <strong>{nombre}</strong>. {cfg.descripcion}
            </DrawerDescription>
          </DrawerHeader>

          <form action={formAction}>
            <input type="hidden" name="persona_id" value={personaId} />

            <div className="p-4 pb-0">
              {state?.message && !state.success && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
                  {state.message}
                </div>
              )}
            </div>

            <DrawerFooter>
              <SubmitBtn label={cfg.cta} variant={cfg.destructiva ? 'destructive' : 'default'} />
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
