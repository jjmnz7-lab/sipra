'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { CalendarClock, XCircle, Zap, Ticket, Receipt } from 'lucide-react'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAgregarCargo: () => void
  onRegistrarPromesa: () => void
  onAnularCargo: () => void
  onRegistrarVisita: () => void
  /** Si el alumno está suspendido, se deshabilitan las acciones que generan cargos $. */
  suspendido?: boolean
}

export function MasAccionesSheet({ open, onOpenChange, onAgregarCargo, onRegistrarPromesa, onAnularCargo, onRegistrarVisita, suspendido = false }: Props) {
  const handle = (cb: () => void) => {
    onOpenChange(false)
    setTimeout(cb, 200)
  }

  const cargoBtnClass = suspendido
    ? 'w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left opacity-40 cursor-not-allowed'
    : 'w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-accent transition-colors text-left'

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader className="text-left pb-2">
            <DrawerTitle className="text-base">Más acciones</DrawerTitle>
            {suspendido && (
              <p className="text-xs text-muted-foreground">
                El alumno está suspendido: las acciones que generan cargos no están disponibles.
              </p>
            )}
          </DrawerHeader>
 
          <div className="px-4 pb-2 space-y-1.5">
            <button
              onClick={() => handle(onRegistrarVisita)}
              disabled={suspendido}
              className={cargoBtnClass}
            >
              <Ticket className="h-5 w-5 text-[#15435a] flex-shrink-0" />
              <span className="text-sm font-medium text-foreground">Registrar visita</span>
            </button>
 
            <button
              onClick={() => handle(onAgregarCargo)}
              disabled={suspendido}
              className={cargoBtnClass}
            >
              <Receipt className="h-5 w-5 text-[#22887c] flex-shrink-0" />
              <span className="text-sm font-medium text-foreground">Agregar cargo extra</span>
            </button>
 
            <button
              onClick={() => handle(onRegistrarPromesa)}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-accent transition-colors text-left"
            >
              <CalendarClock className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <span className="text-sm font-medium text-foreground">Registrar promesa de pago</span>
            </button>

            <button
              onClick={() => handle(onAnularCargo)}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-destructive/10 transition-colors text-left"
            >
              <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />
              <span className="text-sm font-medium text-destructive">Cancelar / Anular un cargo</span>
            </button>
          </div>

          <DrawerFooter className="pt-2">
            <DrawerClose asChild>
              <Button variant="ghost" className="h-11">Cerrar</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
