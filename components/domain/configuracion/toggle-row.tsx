'use client'

import * as React from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

/**
 * Fila de toggle reutilizable (Switch + Label) usada en las secciones de
 * Configuración (Políticas de cobro, Recargos y excepciones).
 */
export function ToggleRow({
  id,
  checked,
  onCheckedChange,
  label,
  description,
  compact,
}: {
  id: string
  checked: boolean
  onCheckedChange: (v: boolean) => void
  label: React.ReactNode
  description?: React.ReactNode
  compact?: boolean
}) {
  return (
    <div className={`flex items-start gap-3 rounded-md ${compact ? 'py-1' : 'py-1.5'}`}>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} className="mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <Label htmlFor={id} className="text-sm text-foreground cursor-pointer leading-tight">
          {label}
        </Label>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
    </div>
  )
}
