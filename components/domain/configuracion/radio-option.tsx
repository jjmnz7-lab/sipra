'use client'

import * as React from 'react'

/**
 * Botón-radio reutilizable usado en Cobranza (opciones de régimen) y en
 * Pagos atrasados (tipo de recargo). Versión compacta cuando `compact`.
 */
export function RadioOption({
  checked,
  label,
  onClick,
  rightSlot,
  compact,
}: {
  checked: boolean
  label: React.ReactNode
  onClick: () => void
  rightSlot?: React.ReactNode
  compact?: boolean
}) {
  return (
    <div
      className={`w-full flex items-center gap-3 rounded-lg border text-left transition-colors ${
        compact ? 'p-2' : 'p-3'
      } ${
        checked
          ? 'border-primary bg-primary/5'
          : 'border-border bg-background hover:bg-muted/40'
      }`}
    >
      <button
        type="button"
        role="radio"
        aria-checked={checked}
        onClick={onClick}
        className="flex items-center gap-3 flex-1 text-left"
      >
        <span
          className={`shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
            checked ? 'border-primary' : 'border-muted-foreground/40'
          }`}
        >
          {checked && <span className="w-2 h-2 rounded-full bg-primary" />}
        </span>
        <span className="text-sm text-foreground">{label}</span>
      </button>
      {rightSlot}
    </div>
  )
}
