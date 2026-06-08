'use client'

import * as React from 'react'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

/**
 * Footer compartido por las Cards de Configuración. Renderiza el par
 * "Cancelar / Guardar cambios" sólo cuando `dirty === true`.
 *
 * Va dentro de un `<form action={...}>` para que el botón Guardar dispare
 * el submit. Usa `useFormStatus` para deshabilitar mientras pending.
 */
export function SectionFooter({
  dirty,
  onCancel,
  successMessage,
  errorMessage,
}: {
  dirty: boolean
  onCancel: () => void
  successMessage?: string | null
  errorMessage?: string | null
}) {
  if (!dirty && !errorMessage && !successMessage) return null

  return (
    <div className="flex items-center justify-end gap-2 pt-3 border-t border-dashed border-border animate-in fade-in duration-150">
      <div className="flex-1 text-xs">
        {errorMessage && <span className="text-destructive">{errorMessage}</span>}
        {!errorMessage && successMessage && (
          <span className="text-[#22887c]">{successMessage}</span>
        )}
      </div>
      {dirty && (
        <>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
          <SaveButton />
        </>
      )}
    </div>
  )
}

function SaveButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
      {pending ? 'Guardando…' : 'Guardar cambios'}
    </Button>
  )
}
