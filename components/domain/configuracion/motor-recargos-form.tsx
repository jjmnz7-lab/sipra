'use client'

import * as React from 'react'
import { useActionState, useEffect, useState } from 'react'
import { guardarConfiguracionRecargosAction, ejecutarMotorRecargosAction, type FormState } from '@/app/(app)/configuracion/actions'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Plus, Trash2, Play } from 'lucide-react'

const initialGuardarState: FormState = {}
const initialEjecutarState: FormState = {}

function GuardarButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full h-11 bg-indigo-600 hover:bg-indigo-700" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {pending ? 'Guardando...' : 'Guardar Reglas'}
    </Button>
  )
}

function EjecutarButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant="outline" className="w-full h-11 text-emerald-700 border-emerald-200 hover:bg-emerald-50" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
      {pending ? 'Procesando deudas...' : 'Ejecutar Motor Ahora'}
    </Button>
  )
}

export function MotorRecargosForm({ initialConfig }: { initialConfig: any }) {
  const [guardarState, guardarAction] = useActionState(guardarConfiguracionRecargosAction, initialGuardarState)
  const [ejecutarState, ejecutarAction] = useActionState(ejecutarMotorRecargosAction, initialEjecutarState)
  
  const [activo, setActivo] = useState(initialConfig?.activo || false)
  const [escalones, setEscalones] = useState<any[]>(
    initialConfig?.escalones?.length > 0 
      ? initialConfig.escalones 
      : [{ nivel: 1, dias_retraso: 1, monto: 50 }]
  )

  const addEscalon = () => {
    if (escalones.length >= 5) return
    const last = escalones[escalones.length - 1]
    setEscalones([...escalones, { nivel: escalones.length + 1, dias_retraso: (last?.dias_retraso || 0) + 5, monto: 50 }])
  }

  const removeEscalon = (index: number) => {
    const newEscalones = [...escalones]
    newEscalones.splice(index, 1)
    // Re-indexar
    setEscalones(newEscalones.map((e, i) => ({ ...e, nivel: i + 1 })))
  }

  const updateEscalon = (index: number, field: string, value: string) => {
    const newEscalones = [...escalones]
    newEscalones[index] = { ...newEscalones[index], [field]: Number(value) }
    setEscalones(newEscalones)
  }

  return (
    <div className="space-y-8">
      <form action={guardarAction} className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-lg">
          <div>
            <h3 className="font-medium text-slate-900">Activar Recargos</h3>
            <p className="text-sm text-slate-500">Genera deudas aditivas a morosos.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              name="activo" 
              className="sr-only peer" 
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>

        {activo && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-semibold text-slate-700">Escalones de penalización</h4>
              {escalones.length < 5 && (
                <Button type="button" variant="ghost" size="sm" onClick={addEscalon} className="text-indigo-600 h-8">
                  <Plus className="h-4 w-4 mr-1" /> Agregar
                </Button>
              )}
            </div>

            {escalones.map((escalon, i) => (
              <div key={i} className="flex items-end gap-3 bg-white p-3 border border-slate-100 rounded-lg shadow-sm">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-slate-500">Días de atraso</Label>
                  <Input 
                    type="number" 
                    name={`dias_${i+1}`} 
                    value={escalon.dias_retraso}
                    onChange={(e) => updateEscalon(i, 'dias_retraso', e.target.value)}
                    min="1" 
                    required 
                    className="h-10"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-slate-500">Monto ($)</Label>
                  <Input 
                    type="number" 
                    name={`monto_${i+1}`} 
                    value={escalon.monto}
                    onChange={(e) => updateEscalon(i, 'monto', e.target.value)}
                    min="1" 
                    required 
                    className="h-10"
                  />
                </div>
                {escalones.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeEscalon(i)} className="h-10 w-10 text-red-500 hover:text-red-700 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            
            <p className="text-xs text-slate-500 leading-relaxed mt-2">
              Ejemplo: Si pones 1 día de atraso y $50, al día siguiente del vencimiento se generará una deuda adicional de $50 al alumno. Si luego configuras 5 días de atraso y $100, se le sumarán otros $100 al quinto día.
            </p>
          </div>
        )}

        {guardarState?.message && (
          <div className={`p-3 text-sm rounded-md border ${guardarState.success ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
            {guardarState.message}
          </div>
        )}

        <GuardarButton />
      </form>

      <div className="border-t border-slate-200 pt-6">
        <form action={ejecutarAction}>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
            <h4 className="text-sm font-semibold text-slate-800">Prueba Manual (Emulador de Cron)</h4>
            <p className="text-xs text-slate-600">
              Usa este botón para evaluar todas las deudas vencidas y generar los recargos ahora mismo. En producción esto ocurre automáticamente a la media noche.
            </p>
            <EjecutarButton />
            {ejecutarState?.message && (
              <div className={`p-3 text-sm rounded-md border ${ejecutarState.success ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                {ejecutarState.message}
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
