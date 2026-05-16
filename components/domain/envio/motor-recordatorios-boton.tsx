'use client'

import * as React from 'react'
import { useActionState, useEffect } from 'react'
import { ejecutarMotorRecordatoriosAction, type FormState } from '@/app/(app)/recordatorios/actions'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw } from 'lucide-react'

const initialState: FormState = {}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant="outline" size="sm" className="h-8 text-xs font-medium" disabled={pending}>
      {pending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-1 h-3 w-3" />}
      Escanear Morosos
    </Button>
  )
}

export function MotorRecordatoriosBoton() {
  const [state, formAction] = useActionState(ejecutarMotorRecordatoriosAction, initialState)

  useEffect(() => {
    if (state?.message) {
      // Un pequeño toast o alerta podría ir aquí, pero por simplicidad de MVP la UI de la bandeja vacía lo explica.
      console.log(state.message)
    }
  }, [state])

  return (
    <form action={formAction}>
      <SubmitButton />
    </form>
  )
}
