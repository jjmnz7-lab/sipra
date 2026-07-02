'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { MessageCircle, Send, Smile, Briefcase, AlertTriangle, Link2 } from 'lucide-react'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { buildRecordatorioConTono, buildWhatsAppUrl, formatDesgloseCargos, buildShareLink, appendEnlaceHistorial, type TonoRecordatorio, type CargoRecordatorio } from '@/lib/utils/whatsapp'
import { useAcademia } from '@/lib/contexts/academia-context'
import { obtenerDatosCompartir } from '@/app/(app)/inicio/actions'
import { cn } from '@/lib/utils'
import { clasificarAlumno, type EstadoFinancieroAlumno } from '@/lib/constants/alumno-finanzas'
import { ahoraAcademia, ACADEMIA_TZ_FALLBACK } from '@/lib/utils/fecha-academia'

interface RecordatorioMensajeDrawerProps {
  telefono: string | null | undefined
  nombre: string
  monto: number
  concepto: string
  cargosActivos?: CargoRecordatorioConEstado[]
  /** Habilita el toggle "Incluir enlace a historial" (requiere el id del alumno). */
  personaId?: string
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

type CargoRecordatorioConEstado = CargoRecordatorio & {
  estado_financiero?: string | null
}

function getTonoPredeterminado(cargos: CargoRecordatorioConEstado[] | undefined): TonoRecordatorio {
  // Este drawer es compartido y no conoce el timezone real de la academia
  // (solo afecta el TONO por default sugerido, editable por el usuario antes
  // de enviar) — cae al mismo fallback que el resto de la app.
  const estado = clasificarAlumno(cargos ?? [], ahoraAcademia(ACADEMIA_TZ_FALLBACK)) as EstadoFinancieroAlumno

  switch (estado) {
    case 'urgente':
      return 'urgente'
    case 'atrasado':
      return 'formal'
    case 'pendiente':
    case 'al_dia':
    default:
      return 'amigable'
  }
}

function getEtiquetaTonoSugerido(cargos: CargoRecordatorioConEstado[] | undefined): string {
  const tono = getTonoPredeterminado(cargos)

  switch (tono) {
    case 'formal':
      return 'Formal'
    case 'urgente':
      return 'Urgente'
    case 'amigable':
    default:
      return 'Amigable'
  }
}

const TONOS: { value: TonoRecordatorio; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'amigable', label: 'Amigable', icon: <Smile className="h-5 w-5" />, description: 'Cercano y cordial' },
  { value: 'formal', label: 'Formal', icon: <Briefcase className="h-5 w-5" />, description: 'Profesional' },
  { value: 'urgente', label: 'Urgente', icon: <AlertTriangle className="h-5 w-5" />, description: 'Firme y directo' },
]

export function RecordatorioMensajeDrawer({
  telefono,
  nombre,
  monto,
  concepto,
  cargosActivos,
  personaId,
  children,
  open: controlledOpen,
  onOpenChange,
}: RecordatorioMensajeDrawerProps) {
  const { academiaNombre } = useAcademia()
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen
  const setOpen = isControlled && onOpenChange ? onOpenChange : setUncontrolledOpen

  // Estado derivado con override manual: el tono y el mensaje se CALCULAN en
  // cada render a partir de props/toggles; el usuario puede sobreescribirlos y
  // su override vive en *Manual (null = usar el valor autogenerado). Así no
  // hay efectos sincronizando estado (patrón "you might not need an effect").
  const [tonoManual, setTonoManual] = useState<TonoRecordatorio | null>(null)
  const [mensajeManual, setMensajeManual] = useState<string | null>(null)
  const [incluirDesglose, setIncluirDesglose] = useState(true)
  const [incluirEnlace, setIncluirEnlace] = useState(false)
  const [shareCode, setShareCode] = useState<string | null>(null)
  const tonoSugerido = getEtiquetaTonoSugerido(cargosActivos)

  const tono = tonoManual ?? getTonoPredeterminado(cargosActivos)
  const editado = mensajeManual !== null

  const desgloseText = incluirDesglose && cargosActivos ? formatDesgloseCargos(cargosActivos) : undefined
  let mensajeAuto = buildRecordatorioConTono(
    { nombre, academia: academiaNombre, monto, concepto, desglose: desgloseText },
    tono
  )
  // incluirEnlace solo puede activarse con interacción del usuario (cliente),
  // así que window nunca se toca durante el prerender.
  if (incluirEnlace && shareCode) {
    mensajeAuto = appendEnlaceHistorial(mensajeAuto, buildShareLink(shareCode, window.location.origin))
  }
  const mensaje = mensajeManual ?? mensajeAuto

  // Carga perezosa del código al abrir (sólo si hay alumno asociado).
  useEffect(() => {
    if (open && personaId && !shareCode) {
      obtenerDatosCompartir(personaId).then((d) => {
        if (d) setShareCode(d.share_code)
      })
    }
  }, [open, personaId, shareCode])

  const resetEstado = () => {
    setTonoManual(null)
    setMensajeManual(null)
    setIncluirDesglose(true)
    setIncluirEnlace(false)
  }

  const handleTonoChange = (nuevoTono: TonoRecordatorio) => {
    setTonoManual(nuevoTono)
    setMensajeManual(null) // Regenerar al cambiar tono
  }

  const handleDesgloseToggle = (val: boolean) => {
    setIncluirDesglose(val)
    setMensajeManual(null) // Regenerar al cambiar desglose
  }

  const handleEnlaceToggle = (val: boolean) => {
    setIncluirEnlace(val)
    setMensajeManual(null) // Regenerar al cambiar el enlace
  }

  const handleMensajeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMensajeManual(e.target.value)
  }

  const handleSend = () => {
    const url = buildWhatsAppUrl(telefono, mensaje)
    if (url !== '#') {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
    setOpen(false)
    resetEstado()
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) resetEstado()
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      {children && (
        <DrawerTrigger asChild>
          {children}
        </DrawerTrigger>
      )}
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader className="text-left">
            <DrawerTitle className="flex items-center text-foreground">
              <MessageCircle className="mr-2 h-5 w-5 text-[#22887c]" /> Enviar Recordatorio
            </DrawerTitle>
            <DrawerDescription>
              <strong>{nombre.toUpperCase()}</strong>
            </DrawerDescription>
          </DrawerHeader>

          <div className="p-4 space-y-4">
            {/* Selector de Tono */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-muted-foreground tracking-wider">Tono del mensaje</p>
                <p className="text-[10px] font-medium text-muted-foreground">
                  Sugerido: <span className="text-foreground">{tonoSugerido}</span>
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {TONOS.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => handleTonoChange(t.value)}
                    className={cn(
                      'flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200',
                      tono === t.value
                        ? 'border-[#22887c] bg-[#22887c]/5 text-[#22887c] shadow-sm'
                        : 'border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    {t.icon}
                    <span className="text-xs font-semibold mt-1.5">{t.label}</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5 hidden sm:block">{t.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle Desglose (Opción B) */}
            {cargosActivos && cargosActivos.length > 0 && (
              <div 
                className="flex items-center space-x-3 p-3 bg-secondary/35 rounded-xl border border-border/60 hover:bg-secondary/50 transition-colors select-none cursor-pointer"
                onClick={() => handleDesgloseToggle(!incluirDesglose)}
              >
                <Switch 
                  id="desglose-toggle" 
                  checked={incluirDesglose} 
                  onCheckedChange={(checked) => handleDesgloseToggle(!!checked)} 
                  onClick={(e) => e.stopPropagation()} 
                  className="data-checked:!bg-[#22887c]"
                />
                <div className="flex flex-col gap-0.5 pointer-events-none">
                  <Label htmlFor="desglose-toggle" className="text-xs font-bold text-muted-foreground">
                    Incluir desglose detallado de saldo
                  </Label>
                </div>
              </div>
            )}

            {/* Toggle: incluir el enlace seguro al historial */}
            {personaId && (
              <div
                className="flex items-center space-x-3 p-3 bg-secondary/35 rounded-xl border border-border/60 hover:bg-secondary/50 transition-colors select-none cursor-pointer"
                onClick={() => handleEnlaceToggle(!incluirEnlace)}
              >
                <Switch
                  id="enlace-toggle"
                  checked={incluirEnlace}
                  onCheckedChange={(checked) => handleEnlaceToggle(!!checked)}
                  onClick={(e) => e.stopPropagation()}
                  className="data-checked:!bg-[#22887c]"
                />
                <div className="flex flex-col gap-0.5 pointer-events-none">
                  <Label htmlFor="enlace-toggle" className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                    <Link2 className="h-3.5 w-3.5" /> Incluir enlace a historial
                  </Label>
                </div>
              </div>
            )}

            {/* Textarea editable con vista previa */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground tracking-wider">Mensaje</p>
                {editado && (
                  <button
                    type="button"
                    onClick={() => setMensajeManual(null)}
                    className="text-[10px] text-primary hover:underline font-medium"
                  >
                    Restaurar original
                  </button>
                )}
              </div>
              <Textarea
                value={mensaje}
                onChange={handleMensajeChange}
                className="min-h-[140px] text-sm resize-none leading-relaxed"
              />
              {editado && (
                <p className="text-[10px] text-amber-500 font-medium">✏️ Mensaje editado manualmente</p>
              )}
            </div>
          </div>

          <DrawerFooter>
            <Button
              onClick={handleSend}
              className="w-full h-12 text-base font-bold bg-[#22887c] hover:bg-[#1a6b62]"
              disabled={!telefono || !mensaje.trim()}
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
