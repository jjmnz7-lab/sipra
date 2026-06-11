'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Pencil, Archive, Share2 } from 'lucide-react'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  grupoNombre: string
  onEditar: () => void
  onArchivar: () => void
  onCompartirResumen?: () => void
}

export function AccionesGrupoSheet({ open, onOpenChange, grupoNombre, onEditar, onArchivar, onCompartirResumen }: Props) {
  const cierreLabel = 'Archivar grupo'
  const editarLabel = 'Editar grupo'
  const CierreIcon = Archive
  const handle = (cb: () => void) => {
    onOpenChange(false)
    // Pequeño delay para que el sheet termine de cerrar antes de abrir el siguiente drawer.
    setTimeout(() => cb(), 200)
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader className="text-left pb-2">
            <DrawerTitle className="text-base">Acciones del grupo</DrawerTitle>
            <DrawerDescription className="text-xs">{grupoNombre}</DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-2 space-y-1.5">
            <button
              onClick={() => handle(onEditar)}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-accent transition-colors text-left"
            >
              <Pencil className="h-5 w-5 text-foreground/80 flex-shrink-0" />
              <span className="text-sm font-medium text-foreground">{editarLabel}</span>
            </button>

            {onCompartirResumen && (
              <button
                onClick={() => handle(onCompartirResumen)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-accent transition-colors text-left"
              >
                <Share2 className="h-5 w-5 text-[#22887c] flex-shrink-0" />
                <span className="text-sm font-medium text-foreground">Compartir resumen</span>
              </button>
            )}

            <button
              onClick={() => handle(onArchivar)}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-destructive/10 transition-colors text-left"
            >
              <CierreIcon className="h-5 w-5 text-destructive flex-shrink-0" />
              <span className="text-sm font-medium text-destructive">{cierreLabel}</span>
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
