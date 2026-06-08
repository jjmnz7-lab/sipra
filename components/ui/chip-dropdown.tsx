'use client'

import * as React from 'react'
import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ChipOption = {
  value: string
  label: string
  /** Punto de color opcional a la izquierda del label (hex). */
  color?: string
}

type Props = {
  /** Texto base del chip cuando no hay selección específica. */
  label: string
  options: ChipOption[]
  selected: Set<string>
  onChange: (next: Set<string>) => void
  /** Valor del item "todos" — mutuamente exclusivo con el resto. Sólo relevante en multi-select. */
  allValue?: string
  /** Si true, sólo permite una opción seleccionada a la vez (no usa "todos"). */
  singleSelect?: boolean
  /** Alineación del popover relativo al chip. */
  align?: 'left' | 'right' | 'center'
  className?: string
}

export function ChipDropdown({
  label,
  options,
  selected,
  onChange,
  allValue = 'todos',
  singleSelect = false,
  align = 'left',
  className,
}: Props) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  // Click fuera cierra
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!wrapperRef.current) return
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const especificos = singleSelect
    ? Array.from(selected)
    : Array.from(selected).filter(v => v !== allValue)
  const isAll = !singleSelect && (selected.has(allValue) || selected.size === 0)
  const count = especificos.length

  // En single-select el chip muestra la etiqueta del item seleccionado
  const selectedOption = singleSelect ? options.find(o => o.value === especificos[0]) : undefined
  const buttonLabel = singleSelect && selectedOption
    ? `${label}: ${selectedOption.label}`
    : label

  const handleToggle = (value: string) => {
    if (singleSelect) {
      const next = new Set<string>([value])
      onChange(next)
      setOpen(false)
      return
    }
    const next = new Set(selected)
    if (value === allValue) {
      // Seleccionar "todos" limpia el resto.
      next.clear()
      next.add(allValue)
    } else {
      // Seleccionar otro deselecciona "todos".
      next.delete(allValue)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      // Si queda vacío, regresa a "todos".
      if (next.size === 0) next.add(allValue)
    }
    onChange(next)
  }

  const alignClass =
    align === 'right' ? 'right-0'
    : align === 'center' ? 'left-1/2 -translate-x-1/2'
    : 'left-0'

  return (
    <div ref={wrapperRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors whitespace-nowrap',
          isAll
            ? 'bg-secondary text-secondary-foreground border-border hover:bg-accent'
            : 'bg-primary/10 text-primary border-primary/30',
        )}
      >
        <span>{buttonLabel}</span>
        {!singleSelect && count > 0 && (
          <span className="ml-0.5 inline-flex items-center justify-center bg-primary text-primary-foreground rounded-full text-[10px] px-1.5 min-w-[18px] h-[18px] font-bold">
            {count}
          </span>
        )}
        <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className={cn('absolute mt-1.5 min-w-[180px] max-w-[80vw] bg-popover text-popover-foreground border border-border rounded-lg shadow-lg z-50 overflow-hidden', alignClass)}>
          <ul className="py-1 max-h-[60vh] overflow-y-auto">
            {options.map(opt => {
              const active = singleSelect
                ? selected.has(opt.value)
                : selected.has(opt.value) || (opt.value === allValue && isAll)
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    onClick={() => handleToggle(opt.value)}
                    className={cn(
                      'w-full flex items-center justify-between gap-2 px-3 py-2 text-xs text-left hover:bg-accent transition-colors',
                      active && 'bg-accent/60',
                    )}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      {opt.color && (
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: opt.color }}
                          aria-hidden="true"
                        />
                      )}
                      <span className="truncate">{opt.label}</span>
                    </span>
                    {active && <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
