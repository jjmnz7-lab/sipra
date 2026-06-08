'use client'

import { Check, CalendarDays, Users } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { COLORES_GRUPO, EMOJIS_GRUPO, colorPorSlug } from '@/lib/constants/grupo-apariencia'

type Props = {
  colorSlug: string
  emoji: string
  nombre: string
  onColorChange: (slug: string) => void
  onEmojiChange: (emoji: string) => void
  /** Etiqueta opcional para el placeholder cuando el nombre está vacío. */
  placeholderNombre?: string
  esTaller?: boolean
}

/**
 * Bloque homogéneo de "apariencia" para Nuevo grupo, Editar grupo y Nuevo taller.
 * Render en este orden: Color → Emoji → Vista previa.
 *
 * - Paleta de color: círculos con halo (borde) del color elegido, sin fondo.
 * - Vista previa: círculo del grupo con el mismo halo (no fondo) usado en todas
 *   las demás pantallas. La etiqueta "Vista previa" vive afuera (como Label) y
 *   altura reducida ~20% respecto al diseño anterior.
 */
export function AparienciaGrupoFields({
  colorSlug,
  emoji,
  nombre,
  onColorChange,
  onEmojiChange,
  placeholderNombre = 'Nombre del grupo',
  esTaller = false,
}: Props) {
  const previewColor = colorPorSlug(colorSlug)

  return (
    <>
      {/* Color — paleta de círculos con halo */}
      <div className="space-y-2">
        <Label>Color</Label>
        <div className="grid grid-cols-4 gap-2">
          {COLORES_GRUPO.map((c) => {
            const selected = c.slug === colorSlug
            return (
              <button
                type="button"
                key={c.slug}
                onClick={() => onColorChange(c.slug)}
                title={c.label}
                aria-label={c.label}
                aria-pressed={selected}
                className={`relative h-12 rounded-full flex items-center justify-center transition-all active:scale-95 bg-transparent ${
                  selected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
                }`}
                style={{ border: `4px solid ${c.hex}` }}
              >
                {selected && <Check className="h-5 w-5" style={{ color: c.hex }} />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Emoji */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Emoji (opcional)</Label>
          {emoji && (
            <button
              type="button"
              onClick={() => onEmojiChange('')}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Quitar
            </button>
          )}
        </div>
        <div className="grid grid-cols-8 gap-1.5">
          {EMOJIS_GRUPO.map((em) => {
            const selected = em === emoji
            return (
              <button
                type="button"
                key={em}
                onClick={() => onEmojiChange(selected ? '' : em)}
                className={`h-9 rounded-md text-lg transition-all active:scale-90 ${
                  selected ? 'bg-primary/15 ring-2 ring-primary' : 'hover:bg-accent'
                }`}
              >
                {em}
              </button>
            )
          })}
        </div>
      </div>

      {/* Vista previa — label afuera, círculo con halo (sin fondo). Altura reducida ~20%. */}
      <div className="space-y-2">
        <Label>Vista previa</Label>
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/40 border border-border">
          <div className="relative flex-shrink-0">
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center text-lg bg-transparent"
              style={{ border: `3px solid ${previewColor.hex}` }}
              aria-hidden="true"
            >
              {emoji}
            </div>
            <span className="absolute top-1/2 -translate-y-1/2 -right-1 bg-card border border-border rounded-full p-0.5 shadow-sm flex items-center justify-center h-4 w-4 z-10">
              {esTaller ? (
                <CalendarDays className="h-2.5 w-2.5 text-[#22887c]" />
              ) : (
                <Users className="h-2.5 w-2.5 text-primary" />
              )}
            </span>
          </div>
          <p className="text-sm font-bold text-foreground truncate">
            {nombre || placeholderNombre}
          </p>
        </div>
      </div>
    </>
  )
}
