'use client'

import * as React from 'react'
import { createContext, useCallback, useContext, useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { FaltaTelefonoAlert } from '@/components/domain/persona/falta-telefono-alert'
import { cn } from '@/lib/utils'

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
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [info, setInfo] = useState<{ alumno: string; monto: number; fecha: string } | null>(null)
  const [datos, setDatos] = useState<DatosCompartir | null>(null)
  const [cargando, setCargando] = useState(false)
  const [noTelefonoAlertOpen, setNoTelefonoAlertOpen] = useState(false)

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
    const link = buildShareLink(datos.share_code, window.location.origin)
    const msg = buildPagoConfirmacionMensaje({
      academia: academiaNombre,
      alumno: info.alumno,
      monto: info.monto,
      fecha: info.fecha,
      link,
    })
    window.open(buildWhatsAppShareUrl(datos.telefono, msg, datos.codigo_pais), '_blank', 'noopener,noreferrer')
    setOpen(false)
  }

  const hasPhone = !!datos?.telefono

  const handleButtonClick = () => {
    if (!datos) return
    if (!hasPhone) {
      setNoTelefonoAlertOpen(true)
      return
    }
    notificar()
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
                onClick={handleButtonClick}
                disabled={cargando || !datos}
                className={cn(
                  "w-full h-12 text-base font-bold transition-all",
                  (!hasPhone && datos)
                    ? "bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-pointer opacity-70 hover:bg-slate-300"
                    : "bg-[#22887c] hover:bg-[#1a6b62] text-white"
                )}
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

      {datos && (
        <FaltaTelefonoAlert
          open={noTelefonoAlertOpen}
          onOpenChange={setNoTelefonoAlertOpen}
          nombreAlumno={info?.alumno ?? ''}
          onRegistrarClick={() => {
            setOpen(false)
            if (datos?.id) {
              router.push(`/seguimiento/${datos.id}`)
            }
          }}
        />
      )}
    </PagoConfirmacionContext.Provider>
  )
}
