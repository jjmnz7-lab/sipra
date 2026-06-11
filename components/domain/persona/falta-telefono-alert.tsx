'use client'

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"

interface FaltaTelefonoAlertProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  nombreAlumno: string
  onRegistrarClick: () => void
}

export function FaltaTelefonoAlert({
  open,
  onOpenChange,
  nombreAlumno,
  onRegistrarClick,
}: FaltaTelefonoAlertProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md pb-6 px-4">
          <DrawerHeader className="text-left px-0">
            <DrawerTitle className="text-lg font-bold">Teléfono no registrado</DrawerTitle>
            <DrawerDescription className="text-sm text-muted-foreground mt-2">
              El alumno <span className="font-semibold text-foreground">{nombreAlumno}</span> NO tiene registrado un número de teléfono/Whatsapp.
            </DrawerDescription>
          </DrawerHeader>
          <DrawerFooter className="mt-4 flex flex-col gap-2 p-0">
            <Button
              onClick={(e) => {
                e.preventDefault()
                onOpenChange(false)
                // Wait slightly for drawer to close before opening the edit drawer
                setTimeout(() => {
                  onRegistrarClick()
                }, 150)
              }}
              className="w-full bg-[#15435a] hover:bg-[#15435a]/90 text-white font-semibold rounded-lg h-11"
            >
              Registrar número ahora
            </Button>
            <DrawerClose asChild>
              <Button 
                variant="ghost" 
                className="w-full mt-0 rounded-lg h-11 font-medium text-muted-foreground hover:bg-muted"
              >
                Cerrar
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

