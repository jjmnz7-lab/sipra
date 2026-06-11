'use client'

import { Label } from '@/components/ui/label'
import { EMOJIS_ACTIVIDAD } from '@/lib/constants/actividad-apariencia'

type Props = {
  emoji: string
  nombre: string
  onEmojiChange: (emoji: string) => void
  /** Etiqueta opcional para el placeholder cuando el nombre está vacío. */
  placeholderNombre?: string
}

/**
 * Bloque de "apariencia" para Nueva actividad y Editar actividad.
 * Las actividades no tienen color: solo emoji (obligatorio) y vista previa
 * con círculo de borde neutro.
 */
export function AparienciaActividadFields({
  emoji,
  nombre,
  onEmojiChange,
  placeholderNombre = 'Nombre de la actividad',
}: Props) {
  return (
    <>
      {/* Emoji (obligatorio: no se puede deseleccionar) */}
      <div className="space-y-2">
        <Label>Emoji *</Label>
        <div className="grid grid-cols-8 gap-1.5">
          {EMOJIS_ACTIVIDAD.map((em) => {
            const selected = em === emoji
            return (
              <button
                type="button"
                key={em}
                onClick={() => onEmojiChange(em)}
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

      {/* Vista previa — círculo con borde neutro (las actividades no llevan color) */}
      <div className="space-y-2">
        <Label>Vista previa</Label>
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/40 border border-border">
          <div
            className="h-10 w-10 rounded-full flex items-center justify-center text-lg bg-card border-[3px] border-border flex-shrink-0"
            aria-hidden="true"
          >
            {emoji}
          </div>
          <p className="text-sm font-bold text-foreground truncate">
            {nombre || placeholderNombre}
          </p>
        </div>
      </div>
    </>
  )
}
