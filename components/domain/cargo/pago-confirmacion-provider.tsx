'use client'

import * as React from 'react'
import { createContext, useCallback, useContext, useState } from 'react'
import { CheckCircle2, Send, Loader2 } from 'lucide-react'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { useAcademia } from '@/lib/contexts/academia-context'
import { obtenerDatosCompartir, type DatosCompartir } from '@/app/(app)/inicio/actions'
import {
  buildShareLink,
  buildPagoConfirmacionMensaje,
  buildWhatsAppShareUrl,
} from '@/lib/utils/whatsapp'
import { formatCurrency } from '@/lib/utils/currency'

type ConfirmarPagoArgs = {
  personaId: string
  monto: number
  alumnoNombre: string
}

const PagoConfirmacionContext = createContext<(args: ConfirmarPagoArgs) => void>(() => {})

/** Dispara el bottom sheet de confirmación post-pago desde cualquier superficie. */
export function useConfirmarPago() {
  return useContext(PagoConfirmacionContext)
}

/**
 * Monta el bottom sheet de confirmación una sola vez (en el layout de la app),
 * por encima de las listas. Así sobrevive aunque la tarjeta/drawer que originó
 * el pago se desmonte tras revalidar (p. ej. al liquidar por completo en la
 * lista de pendientes).
 */
export function PagoConfirmacionProvider({ children }: { children: React.ReactNode }) {
  const { academiaNombre } = useAcademia()
  const [open, setOpen] = useState(false)
  const [info, setInfo] = useState<{ alumno: string; monto: number; fecha: string } | null>(null)
  const [datos, setDatos] = useState<DatosCompartir | null>(null)
  const [cargando, setCargando] = useState(false)

  const confirmar = useCallback((args: ConfirmarPagoArgs) => {
    setInfo({
      alumno: args.alumnoNombre,
      monto: args.monto,
      fecha: new Date().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' }),
    })
    setDatos(null)
    setCargando(true)
    setOpen(true)
    obtenerDatosCompartir(args.personaId)
      .then((d) => setDatos(d))
      .finally(() => setCargando(false))
  }, [])

  const notificar = () => {
    if (!datos || !info) return
    const link = buildShareLink(datos.share_token, window.location.origin)
    const msg = buildPagoConfirmacionMensaje({
      academia: academiaNombre,
      alumno: info.alumno,
      monto: info.monto,
      fecha: info.fecha,
      link,
    })
    window.open(buildWhatsAppShareUrl(datos.telefono, msg), '_blank', 'noopener,noreferrer')
    setOpen(false)
  }

  return (
    <PagoConfirmacionContext.Provider value={confirmar}>
      {children}

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-sm">
            <DrawerHeader className="text-left">
              <DrawerTitle className="flex items-center text-foreground">
                <CheckCircle2 className="mr-2 h-5 w-5 text-[#22887c]" /> Pago registrado
              </DrawerTitle>
              <DrawerDescription>
                {info && (
                  <>
                    <strong>{info.alumno.toUpperCase()}</strong> • {formatCurrency(info.monto)}
                  </>
                )}
              </DrawerDescription>
            </DrawerHeader>

            <div className="px-4 text-sm text-muted-foreground">
              Comparte la confirmación y el enlace seguro del historial con el tutor.
            </div>

            <DrawerFooter>
              <Button
                onClick={notificar}
                disabled={cargando || !datos}
                className="w-full h-12 text-base font-bold bg-[#22887c] hover:bg-[#1a6b62]"
              >
                {cargando ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Notificar por WhatsApp
              </Button>
              <DrawerClose asChild>
                <Button variant="ghost" className="h-11 text-muted-foreground">Cerrar</Button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </PagoConfirmacionContext.Provider>
  )
}
