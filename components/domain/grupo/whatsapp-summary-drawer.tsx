'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ClipboardList } from 'lucide-react'
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
import { ESTADOS_FINANCIEROS, type EstadoFinancieroAlumno } from '@/lib/constants/alumno-finanzas'

interface WhatsappSummaryDrawerProps {
  nombreGrupo: string
  inscripciones: any[]
  /**
   * Mapa persona_id → estado financiero (los 4 estándar). Si no se pasa, todos
   * los miembros caen como 'al_dia' por seguridad.
   */
  mapEstadoMiembro?: Record<string, EstadoFinancieroAlumno>
  /** Si se proveen, el drawer es controlado por el padre y no renderiza su trigger. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Sustantivo para el encabezado del mensaje ("grupo" por defecto). */
  noun?: 'grupo' | 'actividad'
}

export function WhatsappSummaryDrawer({
  nombreGrupo,
  inscripciones,
  mapEstadoMiembro = {},
  open: controlledOpen,
  onOpenChange,
  noun = 'grupo',
}: WhatsappSummaryDrawerProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen
  const setOpen = isControlled && onOpenChange ? onOpenChange : setUncontrolledOpen
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!open) return

    // Agrupar miembros por estado financiero (los 4 estándar).
    const grupos: Record<EstadoFinancieroAlumno, string[]> = {
      al_dia: [],
      pendiente: [],
      atrasado: [],
      urgente: [],
    }
    for (const ins of inscripciones) {
      const id = ins.persona?.id
      if (!id) continue
      const estado: EstadoFinancieroAlumno = mapEstadoMiembro[id] ?? 'al_dia'
      const nombre = `${ins.persona.nombre ?? ''} ${ins.persona.apellido ?? ''}`.trim()
      if (nombre) grupos[estado].push(`- ${nombre}`)
    }

    // Armado del texto. Sin emojis. Solo se incluyen las secciones con miembros.
    const partes: string[] = [`Estado ${noun === 'actividad' ? 'de la actividad' : 'del grupo'}: ${nombreGrupo}`]
    for (const def of ESTADOS_FINANCIEROS) {
      const lista = grupos[def.slug]
      if (lista.length === 0) continue
      const sufijo = `(${lista.length})`
      partes.push(`\n*${def.label}* ${sufijo}\n${lista.join('\n')}`)
    }

    partes.push('\n_Si ya realizaste tu pago, ignora este mensaje. ¡Gracias!_')

    setMessage(partes.join('\n'))
  }, [open, nombreGrupo, inscripciones, mapEstadoMiembro, noun])

  const handleSend = () => {
    const encoded = encodeURIComponent(message)
    window.open(`https://wa.me/?text=${encoded}`, '_blank')
    setOpen(false)
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DrawerTrigger asChild>
          <button className="flex flex-col items-center justify-center bg-card border border-border rounded-xl p-3 hover:bg-accent hover:text-accent-foreground transition-colors">
            <ClipboardList className="h-5 w-5 text-primary mb-1" />
            <span className="text-[10px] font-bold text-foreground">Resumen</span>
          </button>
        </DrawerTrigger>
      )}
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>Resumen Compartible</DrawerTitle>
            <DrawerDescription>
              Edita el mensaje antes de enviarlo por WhatsApp.
            </DrawerDescription>
          </DrawerHeader>

          <div className="p-4 pb-0">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[300px] font-mono text-sm resize-none"
            />
          </div>

          <DrawerFooter className="mt-4">
            <Button onClick={handleSend} className="w-full h-11 bg-[#22887c] hover:bg-[#1a6b62]">
              Copiar y abrir WhatsApp
            </Button>
            <DrawerClose asChild>
              <Button variant="outline" className="h-11">Cerrar</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
