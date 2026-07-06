'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { CalendarClock, Receipt, Tag } from 'lucide-react'
import { WhatsappLinkIcon } from '@/components/ui/whatsapp-link-icon'
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
  onAplicarDescuento: () => void
  onEnviarEnlace: () => void
  /** Si el alumno está suspendido, se deshabilitan las acciones que generan cargos $. */
  suspendido?: boolean
  showDescuento?: boolean
}

export function MasAccionesSheet({
  open,
  onOpenChange,
  onAgregarCargo,
  onRegistrarPromesa,
  onAplicarDescuento,
  onEnviarEnlace,
  suspendido = false,
  showDescuento = false,
}: Props) {
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
              onClick={() => handle(onAgregarCargo)}
              disabled={suspendido}
              className={cargoBtnClass}
            >
              <Receipt className="h-5 w-5 text-[#22887c] flex-shrink-0" />
              <span className="text-sm font-medium text-foreground">Agregar Cargo</span>
            </button>

            {showDescuento && (
              <button
                onClick={() => handle(onAplicarDescuento)}
                disabled={suspendido}
                className={cargoBtnClass}
              >
                <div className="h-5 w-5 flex items-center justify-center text-[#22887c] flex-shrink-0 font-extrabold text-sm select-none">
                  <span>$</span>
                  <span className="text-xs mt-1 -ml-0.5">↓</span>
                </div>
                <span className="text-sm font-medium text-foreground">Aplicar descuento</span>
              </button>
            )}

            <button
              onClick={() => handle(onEnviarEnlace)}
              disabled={suspendido}
              className={cargoBtnClass}
            >
              <WhatsappLinkIcon className="text-[#22887c]" />
              <span className="text-sm font-medium text-foreground">Enviar enlace a historial</span>
            </button>

            <button
              onClick={() => handle(onRegistrarPromesa)}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-accent transition-colors text-left"
            >
              <CalendarClock className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <span className="text-sm font-medium text-foreground">Registrar promesa de pago</span>
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

