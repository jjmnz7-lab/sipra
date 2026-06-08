'use client'

import * as React from 'react'
import { useEffect, useRef, useState } from 'react'

/**
 * Popover compacto con grilla de días. Reutilizado por Cobranza (5×5 días 2-26)
 * y Pagos atrasados (4×5 días 6-25).
 *
 * Props:
 *  - value: día actualmente seleccionado.
 *  - rangoDias: [start, end] inclusivos para construir la grilla.
 *  - cols: cuántas columnas (5 o 4 típicamente).
 *  - min/max: rango habilitado (los fuera salen disabled pero visibles).
 *  - disabledDays: opcionales adicionales (p.ej. los <= regla[0].dia).
 *  - onChange: callback al seleccionar un día. Cierra el popover automáticamente.
 *  - triggerLabel: opcional para reemplazar el contenido del chip (por defecto, el value).
 */
export function DiaPickerPopover({
  value,
  rangoDias,
  cols,
  min,
  max,
  disabledDays,
  onChange,
  triggerLabel,
  triggerClassName,
}: {
  value: number
  rangoDias: [number, number]
  cols: number
  min?: number
  max?: number
  disabledDays?: number[]
  onChange: (v: number) => void
  triggerLabel?: React.ReactNode
  triggerClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const [start, end] = rangoDias
  const dias = Array.from({ length: end - start + 1 }, (_, i) => i + start)
  const effMin = min ?? start
  const effMax = max ?? end
  const disabledSet = new Set(disabledDays ?? [])

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={
          triggerClassName ??
          'inline-flex items-center justify-center h-8 min-w-[2.5rem] px-2 rounded-md border border-input bg-background text-foreground text-sm font-medium hover:bg-muted/40'
        }
      >
        {triggerLabel ?? value}
      </button>
      {open && (
        <div className="absolute z-50 mt-1 p-2 rounded-md border border-border bg-popover shadow-md">
          <div
            className="grid gap-1"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {dias.map((d) => {
              const disabled = d < effMin || d > effMax || disabledSet.has(d)
              const selected = d === value
              return (
                <button
                  key={d}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onChange(d)
                    setOpen(false)
                  }}
                  className={`w-9 h-9 rounded-md text-sm font-medium transition-colors ${
                    selected
                      ? 'bg-primary text-primary-foreground'
                      : disabled
                      ? 'text-muted-foreground/40 cursor-not-allowed'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  {d}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
