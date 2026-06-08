'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

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
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md rounded-xl sm:rounded-lg sm:w-full p-6">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg font-bold">Teléfono no registrado</AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-muted-foreground mt-2">
            El alumno <span className="font-semibold text-foreground">{nombreAlumno}</span> NO tiene registrado un número de teléfono/Whatsapp.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6 flex flex-col gap-2 sm:flex-row-reverse sm:justify-start sm:gap-2 border-t-0 bg-transparent">
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              onOpenChange(false)
              // Wait slightly for dialog to close before opening the edit drawer
              setTimeout(() => {
                onRegistrarClick()
              }, 100)
            }}
            className="w-full sm:w-auto bg-[#15435a] hover:bg-[#15435a]/90 text-white font-semibold rounded-lg h-11"
          >
            Registrar número ahora
          </AlertDialogAction>
          <AlertDialogCancel className="w-full sm:w-auto mt-0 rounded-lg h-11 font-medium border-0 bg-card hover:bg-card shadow-none">
            Cerrar
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
