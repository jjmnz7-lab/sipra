'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

/**
 * Footer "Cancelar / Guardar cambios" para secciones de Configuración que
 * guardan vía server action con argumentos (useTransition), no vía <form>.
 * Hermano de SectionFooter (que sí depende de useFormStatus dentro de un form).
 */
export function DirtyFooter({
  dirty,
  pending,
  onCancel,
  onSave,
  errorMessage,
}: {
  dirty: boolean
  pending: boolean
  onCancel: () => void
  onSave: () => void
  errorMessage?: string | null
}) {
  if (!dirty && !errorMessage) return null

  return (
    <div className="flex items-center justify-end gap-2 pt-3 border-t border-dashed border-border animate-in fade-in duration-150">
      <div className="flex-1 text-xs">
        {errorMessage && <span className="text-destructive">{errorMessage}</span>}
      </div>
      {dirty && (
        <>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
            Cancelar
          </Button>
          <Button type="button" size="sm" onClick={onSave} disabled={pending}>
            {pending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            {pending ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </>
      )}
    </div>
  )
}
