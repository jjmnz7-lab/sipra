'use client'

import * as React from 'react'
import { useActionState, useEffect, useState } from 'react'
import { guardarAjustesAction, type FormState } from '@/app/(app)/configuracion/actions'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

const initialState: FormState = {}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full h-11" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {pending ? 'Guardando...' : 'Guardar cambios'}
    </Button>
  )
}

export function AjustesGeneralesForm({ initialConfig, academiaNombre }: { initialConfig: any, academiaNombre: string }) {
  const [state, formAction] = useActionState(guardarAjustesAction, initialState)
  const [template, setTemplate] = useState(initialConfig.template_recordatorio || 'Hola {nombre}, te recordamos que tu pago de {concepto} por {monto} vence el {fecha}.')
  const [showSaved, setShowSaved] = useState(false)

  useEffect(() => {
    if (state.success) {
      setShowSaved(true)
      const timer = setTimeout(() => setShowSaved(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [state.success])

  // Datos de ejemplo para el preview
  const previewData = {
    nombre: 'Juan Pérez',
    concepto: 'Mensualidad Mayo',
    monto: '$500.00',
    fecha: '10 de Mayo'
  }

  const getPreviewText = () => {
    let text = template
    text = text.replace('{nombre}', previewData.nombre)
    text = text.replace('{concepto}', previewData.concepto)
    text = text.replace('{monto}', previewData.monto)
    text = text.replace('{fecha}', previewData.fecha)
    return text
  }

  return (
    <form action={formAction} className="space-y-6">
      {/* Mi Academia */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Mi Academia</CardTitle>
          <CardDescription>Identidad básica y contexto operativo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre_academia">Nombre de la academia</Label>
            <Input id="nombre_academia" name="nombre_academia" defaultValue={academiaNombre} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nombre_responsable">Nombre del responsable</Label>
            <Input id="nombre_responsable" name="nombre_responsable" defaultValue={initialConfig.nombre_responsable || ''} placeholder="Ej. Profe Juan" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefono_recordatorios">Número para recordatorios (WhatsApp)</Label>
            <Input id="telefono_recordatorios" name="telefono_recordatorios" defaultValue={initialConfig.telefono_recordatorios || ''} placeholder="Ej. 52155..." required />
            <p className="text-xs text-slate-500">SIPRA usará este número para abrir la app de WhatsApp nativa.</p>
          </div>
        </CardContent>
      </Card>

      {/* El Asistente */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">El Asistente</CardTitle>
          <CardDescription>Define el nivel de autonomía y las reglas del calendario.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nivel_automatizacion">Nivel de Automatización</Label>
            <select 
              id="nivel_automatizacion" 
              name="nivel_automatizacion" 
              defaultValue={initialConfig.nivel_automatizacion || 'asistido'}
              className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="asistido">Asistido (Recomendado)</option>
              <option value="semi-automatico">Semi-automático</option>
              <option value="automatico" disabled>Automático (Próximamente)</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <Label>Ventana de Cobro</Label>
            <div className="flex items-center space-x-2">
              <span>Del día</span>
              <Input type="number" name="ventana_cobro_inicio" defaultValue={initialConfig.ventana_cobro_inicio || 1} className="w-20" min="1" max="31" required />
              <span>al día</span>
              <Input type="number" name="ventana_cobro_fin" defaultValue={initialConfig.ventana_cobro_fin || 10} className="w-20" min="1" max="31" required />
            </div>
            <p className="text-xs text-slate-500">Los días fuera de este rango se considerarán Vencidos.</p>
          </div>
        </CardContent>
      </Card>

      {/* Mensajería */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Mensajería</CardTitle>
          <CardDescription>Tono y estilo de los recordatorios.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="template_recordatorio">Plantilla de recordatorio</Label>
            <Textarea 
              id="template_recordatorio" 
              name="template_recordatorio" 
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              rows={4}
              required
            />
            <div className="flex flex-wrap gap-1 mt-1">
              <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{'{nombre}'}</span>
              <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{'{monto}'}</span>
              <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{'{concepto}'}</span>
              <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{'{fecha}'}</span>
            </div>
          </div>

          {/* Preview Dinámico */}
          <div className="space-y-2">
            <Label>Vista previa (WhatsApp)</Label>
            <div className="bg-[#E5DDD5] p-3 rounded-lg border border-slate-200">
              <div className="bg-white p-3 rounded-lg shadow-sm max-w-[80%] relative">
                <p className="text-sm text-slate-800 whitespace-pre-wrap">{getPreviewText()}</p>
                <span className="text-[10px] text-slate-400 absolute bottom-1 right-2">12:00 PM</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feedback y Botón */}
      <div className="sticky bottom-4 bg-white p-4 border border-slate-200 rounded-xl shadow-lg flex items-center justify-between">
        <div className="flex-1 mr-4">
          {showSaved && (
            <div className="flex items-center text-emerald-600 text-sm font-semibold">
              <Check className="h-4 w-4 mr-1" /> Ajustes guardados
            </div>
          )}
          {state?.message && !state.success && (
            <div className="text-red-600 text-sm font-semibold">
              {state.message}
            </div>
          )}
        </div>
        <div className="w-40">
          <SubmitButton />
        </div>
      </div>
    </form>
  )
}
