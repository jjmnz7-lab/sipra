'use client'

import { useMemo, useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { Plus, Tag, X } from 'lucide-react'
import { Label } from '@/components/ui/label'

export type CobroFrecuente = { id: string; concepto: string; monto: number }

/**
 * Toggle sutil "Guardar en el catálogo de cobros frecuentes". Aparece animado solo
 * cuando el concepto es libre/nuevo (no existe en el catálogo).
 */
export function GuardarCatalogoToggle({
  show,
  checked,
  onCheckedChange,
}: {
  show: boolean
  checked: boolean
  onCheckedChange: (v: boolean) => void
}) {
  if (!show) return null
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3 animate-in fade-in slide-in-from-top-1 duration-200">
      <div className="flex items-center gap-2 min-w-0">
        <Tag className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <span className="text-xs font-medium text-foreground leading-snug">Guardar en el catálogo de cobros frecuentes</span>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} size="sm" className="data-checked:!bg-primary flex-shrink-0" />
    </div>
  )
}

const norm = (s: string) => s.trim().toLowerCase()

const ROW_H = 38 // alto de cada fila (coincide con h-[38px] de los items)
const MAX_ROWS = 5 // a partir de aquí la lista scrollea

export function ConceptoCombobox({
  id,
  value,
  onChange,
  catalogo,
  onPick,
  onCreate,
  selectedItemId,
  setSelectedItemId,
  placeholder = 'Ej. Examen, Uniforme, Material…',
  autoFocus,
  className,
}: {
  id?: string
  value: string
  onChange: (text: string) => void
  catalogo: CobroFrecuente[]
  onPick: (item: CobroFrecuente) => void
  onCreate: (text: string) => void
  selectedItemId: string | null | undefined
  setSelectedItemId?: (id: string | null | undefined) => void
  placeholder?: string
  autoFocus?: boolean
  className?: string
}) {
  const [isConceptoCardView, setIsConceptoCardView] = useState(false)

  // Sincronizar reinicio cuando se limpie desde el padre
  useEffect(() => {
    if (selectedItemId === undefined) {
      setTimeout(() => {
        setIsConceptoCardView(false)
      }, 0)
    }
  }, [selectedItemId])

  const handleSelectCrearNuevo = () => {
    setIsConceptoCardView(false)
    onCreate('')
  }

  const handleSelectCatalogItem = (item: CobroFrecuente) => {
    setIsConceptoCardView(false)
    onPick(item)
  }

  const handleClear = () => {
    onChange('')
    setSelectedItemId?.(undefined)
    setIsConceptoCardView(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.currentTarget.blur()
    }
  }

  const handleBlur = () => {
    if (value.trim().length >= 2) {
      setIsConceptoCardView(true)
    }
  }

  // Filas totales = "Crear nuevo" (1) + catálogo. El alto se ajusta a esa
  // cantidad hasta MAX_ROWS; con más, queda fijo y scrollea.
  const alturaLista = Math.min(1 + catalogo.length, MAX_ROWS) * ROW_H

  const showCard = (selectedItemId !== null && selectedItemId !== undefined) || 
                   (selectedItemId === null && isConceptoCardView && value.trim().length >= 2)

  if (showCard) {
    return (
      <div className="w-full flex flex-col gap-2">
        <Label className="text-xs font-semibold text-muted-foreground tracking-wider uppercase block">
          Concepto seleccionado
        </Label>
        <div className="flex items-center justify-between p-3.5 bg-[#22887c]/5 border border-[#22887c]/20 rounded-xl animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <Tag className="h-4 w-4 text-[#22887c] flex-shrink-0" />
            <span className="text-sm font-semibold text-foreground truncate">{value}</span>
            {selectedItemId !== null && (
              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                Catálogo
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Quitar concepto"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col gap-2">
      {selectedItemId === undefined && (
        <div
          className="border border-border rounded-xl overflow-y-auto bg-muted/10 relative"
          style={{ height: alturaLista }}
        >
          {/* Item: Crear nuevo - sticky top-0 */}
          <button
            type="button"
            onClick={handleSelectCrearNuevo}
            className={cn(
              "sticky top-0 z-20 w-full h-[38px] flex items-center gap-2 px-3 text-sm text-left border-b border-border/50 transition-colors bg-white text-zinc-900 hover:bg-zinc-100",
              selectedItemId === null
                ? "bg-primary/5 text-primary font-semibold"
                : "hover:bg-accent/50 text-foreground"
            )}
          >
            <Plus className="h-4 w-4 text-primary flex-shrink-0" />
            <span>Crear nuevo</span>
          </button>

          {/* Catalog Items */}
          {catalogo.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectCatalogItem(item)}
              className={cn(
                "w-full h-[38px] flex items-center justify-between gap-2 px-3 text-sm text-left border-b border-border/50 last:border-b-0 transition-colors",
                selectedItemId === item.id
                  ? "bg-primary/10 text-primary font-semibold"
                  : "hover:bg-accent/50 text-foreground"
              )}
            >
              <span className="flex items-center gap-2 min-w-0">
                <Tag className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className="truncate">{item.concepto}</span>
              </span>
              <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0">
                ${Math.round(item.monto)}
              </span>
            </button>
          ))}
        </div>
      )}

      {selectedItemId === null && !isConceptoCardView && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
          <Label htmlFor={id}>Concepto *</Label>
          <Input
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            autoFocus={autoFocus}
            autoComplete="off"
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className={cn(className, "bg-white text-zinc-900 border-zinc-200 placeholder:text-zinc-400 focus-visible:ring-ring")}
          />
        </div>
      )}
    </div>
  )
}

/**
 * Estado compartido del campo "concepto + monto" con catálogo de cobros frecuentes.
 * Centraliza la lógica para los tres drawers (individual, grupal, masivo).
 */
export function useCobroConcepto(catalogo: CobroFrecuente[]) {
  const [concepto, setConcepto] = useState('')
  const [monto, setMonto] = useState('')
  const [guardarEnCatalogo, setGuardarEnCatalogo] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState<string | null | undefined>(undefined)
  const [comboOpen, setComboOpen] = useState(false)

  const existeEnCatalogo = useMemo(
    () => catalogo.some((c) => norm(c.concepto) === norm(concepto)),
    [catalogo, concepto],
  )

  const esConceptoNuevo = concepto.trim().length >= 2 && !existeEnCatalogo
  const mostrarGuardar = selectedItemId === null && esConceptoNuevo

  const onPick = (item: CobroFrecuente) => {
    setConcepto(item.concepto)
    setMonto(String(Math.round(item.monto)))
    setSelectedItemId(item.id)
    setGuardarEnCatalogo(false)
  }
  const onCreate = (texto: string) => {
    setConcepto(texto)
    setMonto('') // Concepto libre: el monto se mantiene vacío
    setSelectedItemId(null)
  }
  const prefill = (c: string, m: string) => {
    setConcepto(c)
    setMonto(m)
    const normalized = c.trim().toLowerCase()
    const match = catalogo.find(item => item.concepto.trim().toLowerCase() === normalized)
    setSelectedItemId(match ? match.id : null)
  }
  const reset = () => {
    setConcepto('')
    setMonto('')
    setGuardarEnCatalogo(false)
    setSelectedItemId(undefined)
  }

  /** Si procede, persiste el concepto libre en el catálogo (concepto + monto escrito). */
  const debeGuardarEnCatalogo = guardarEnCatalogo && esConceptoNuevo

  return {
    concepto,
    setConcepto,
    monto,
    setMonto,
    guardarEnCatalogo,
    setGuardarEnCatalogo,
    comboOpen,
    setComboOpen,
    selectedItemId,
    setSelectedItemId,
    existeEnCatalogo,
    esConceptoNuevo,
    mostrarGuardar,
    debeGuardarEnCatalogo,
    onPick,
    onCreate,
    prefill,
    reset,
  }
}
