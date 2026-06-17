'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { useAcademia } from '@/lib/contexts/academia-context'
import {
  buildShareLink,
  buildHistorialShareMensaje,
  buildWhatsAppShareUrl,
} from '@/lib/utils/whatsapp'
import { WhatsappLinkIcon } from '@/components/ui/whatsapp-link-icon'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  alumnoNombre: string
  telefono: string | null | undefined
  shareCode: string
}

/** Bottom sheet con la vista previa del mensaje de enlace + Enviar / Cancelar. */
export function EnviarEnlaceHistorialSheet({
  open,
  onOpenChange,
  alumnoNombre,
  telefono,
  shareCode,
}: Props) {
  const { academiaNombre } = useAcademia()
  const [origin] = useState(() => (typeof window !== 'undefined' ? window.location.origin : ''))

  const link = buildShareLink(shareCode, origin)
  const mensaje = buildHistorialShareMensaje({ academia: academiaNombre, alumno: alumnoNombre, link })

  const enviar = () => {
    window.open(buildWhatsAppShareUrl(telefono, mensaje), '_blank', 'noopener,noreferrer')
    onOpenChange(false)
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader className="text-left">
            <DrawerTitle className="flex items-center text-foreground">
              <WhatsappLinkIcon className="mr-3 text-[#22887c]" /> Enviar enlace a historial
            </DrawerTitle>
            <DrawerDescription>
              <strong>{alumnoNombre.toUpperCase()}</strong>
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4">
            <p className="text-xs font-semibold text-muted-foreground tracking-wider mb-2">
              Vista previa del mensaje
            </p>
            <div className="rounded-xl border border-border bg-secondary/35 p-3 text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed max-h-[40vh] overflow-y-auto">
              {mensaje}
            </div>
          </div>

          <DrawerFooter>
            <Button
              onClick={enviar}
              disabled={!shareCode}
              className="w-full h-12 text-base font-bold bg-[#22887c] hover:bg-[#1a6b62]"
            >
              <Send className="mr-2 h-4 w-4" /> Enviar por WhatsApp
            </Button>
            <DrawerClose asChild>
              <Button variant="ghost" className="h-11 text-muted-foreground">Cancelar</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
