'use client'

import * as React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils/currency'
import { buildWhatsAppUrl, buildRecordatorioMensaje } from '@/lib/utils/whatsapp'
import { MessageCircle, XCircle } from 'lucide-react'
import { procesarEnvioAction } from '@/app/(app)/recordatorios/actions'
import { useTransition } from 'react'
import type { EnvioSugerido } from '@/lib/types/domain'

export function EnvioCard({ envio }: { envio: EnvioSugerido }) {
  const [isPending, startTransition] = useTransition()
  const meta = (envio as any).metadata as Record<string, unknown>

  const nombre = String(meta?.persona_nombre ?? 'Alumno')
  const academia = String(meta?.academia_nombre ?? 'la academia')
  const monto = Number(meta?.monto_adeudado ?? 0)
  const concepto = String(meta?.concepto ?? 'mensualidad')
  const telefono = String(meta?.telefono ?? '')

  const mensaje = buildRecordatorioMensaje({ nombre, academia, monto, concepto })
  const waUrl = buildWhatsAppUrl(telefono, mensaje)

  const handleAction = (accion: 'enviar' | 'ignorar') => {
    startTransition(() => {
      const formData = new FormData()
      formData.append('envio_id', envio.id)
      formData.append('accion', accion)
      procesarEnvioAction(formData)
    })
  }

  return (
    <Card className={`overflow-hidden shadow-sm transition-all duration-200 ${isPending ? 'opacity-30 scale-[0.98] pointer-events-none' : ''}`}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-bold text-slate-900 leading-tight">{nombre}</h3>
            <p className="text-sm text-red-600 font-semibold">{formatCurrency(monto)}</p>
          </div>
          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
            Recordatorio
          </span>
        </div>
        
        <p className="text-xs text-slate-600 mb-4 line-clamp-2">
          &quot;{mensaje}&quot;
        </p>

        <div className="flex gap-2">
          <Button 
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white" 
            onClick={() => {
              window.open(waUrl, '_blank', 'noopener,noreferrer')
              handleAction('enviar')
            }}
          >
            <MessageCircle className="mr-2 h-4 w-4" /> Enviar WA
          </Button>
          
          <Button 
            variant="outline" 
            className="text-slate-500"
            onClick={() => handleAction('ignorar')}
          >
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
