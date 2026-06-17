'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Pencil } from 'lucide-react'
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
}

/** Devuelve true si el string es exactamente un carácter emoji (o secuencia de emoji única). */
function isValidEmoji(value: string): boolean {
  if (!value) return false
  // Usar Intl.Segmenter si está disponible para contar segmentos gráficos
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new (Intl as any).Segmenter(undefined, { granularity: 'grapheme' })
    const segments = [...segmenter.segment(value)]
    if (segments.length !== 1) return false
    const char = segments[0]?.segment ?? ''
    // Verificar que contenga al menos un codepoint emoji
    return /\p{Emoji}/u.test(char) && !/^[\d#*]$/.test(char)
  }
  // Fallback: regex básica de emoji
  return /^\p{Emoji}+$/u.test(value) && !/^[\d#*]$/.test(value)
}

/**
 * Bloque homogéneo de "apariencia" para Nuevo grupo y Editar grupo.
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
}: Props) {
  const previewColor = colorPorSlug(colorSlug)

  // Estado interno del input personalizado.
  // Si el emoji inicial no es predefinido, pre-cargarlo en el input.
  const [customEmoji, setCustomEmoji] = useState(() =>
    emoji && !EMOJIS_GRUPO.includes(emoji) ? emoji : ''
  )
  const inputRef = useRef<HTMLInputElement>(null)

  // Sincronizar si el emoji externo cambia (p.ej. al abrir el drawer con datos distintos)
  useEffect(() => {
    if (!emoji || EMOJIS_GRUPO.includes(emoji)) {
      setCustomEmoji('')
    } else {
      setCustomEmoji(emoji)
    }
  }, [emoji])

  const isCustomSelected = !!customEmoji && emoji === customEmoji

  function handlePredefinedClick(em: string) {
    setCustomEmoji('')
    onEmojiChange(em)
  }

  function handleCustomInput(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    if (!raw) {
      setCustomEmoji('')
      // Si el emoji activo era el personalizado, limpiarlo
      if (isCustomSelected) onEmojiChange('')
      return
    }

    // Extraer solo el último grapheme válido
    let candidate = raw
    if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
      const segmenter = new (Intl as any).Segmenter(undefined, { granularity: 'grapheme' })
      const segments = [...segmenter.segment(raw)]
      candidate = segments[segments.length - 1]?.segment ?? ''
    }

    if (isValidEmoji(candidate)) {
      setCustomEmoji(candidate)
      onEmojiChange(candidate)
    }
    // Si no es emoji válido, restaurar el valor previo
    e.target.value = customEmoji
  }

  return (
    <>
      {/* Color — 10 círculos en 2 filas de 5 */}
      <div className="space-y-2">
        <Label>Color</Label>
        <div className="grid grid-cols-5 gap-2">
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
                className="relative aspect-square rounded-full flex items-center justify-center transition-all active:scale-95"
                style={{
                  backgroundColor: c.bg,
                  border: `2px solid ${c.border}`,
                  ...(selected && {
                    boxShadow: `0 0 0 2px var(--background), 0 0 0 4px ${c.border}`,
                  }),
                }}
              >
                {selected && <Check className="h-4 w-4" style={{ color: c.textLight }} />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Emoji */}
      <div className="space-y-2">
        <Label>Emoji</Label>
        {/* grid-cols-8: 15 predefinidos + 1 input personalizado = 16 celdas */}
        <div className="grid grid-cols-8 gap-1.5">
          {EMOJIS_GRUPO.map((em) => {
            const selected = em === emoji
            return (
              <button
                type="button"
                key={em}
                onClick={() => handlePredefinedClick(em)}
                className={`h-9 rounded-md text-lg transition-all active:scale-90 ${
                  selected ? 'bg-primary/15 ring-2 ring-primary' : 'hover:bg-accent'
                }`}
              >
                {em}
              </button>
            )
          })}

          {/* Input de emoji personalizado — última celda */}
          <div className="relative">
            {!customEmoji && (
              <Pencil
                className="absolute inset-0 m-auto h-4 w-4 text-muted-foreground/50 pointer-events-none"
                aria-hidden="true"
              />
            )}
            <input
              ref={inputRef}
              type="text"
              inputMode="text"
              value={customEmoji}
              onChange={handleCustomInput}
              aria-label="Emoji personalizado"
              className={`h-9 w-full rounded-md text-lg text-center transition-all outline-none cursor-text bg-transparent ${
                isCustomSelected
                  ? 'bg-primary/15 ring-2 ring-primary'
                  : 'hover:bg-accent ring-1 ring-border'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Vista previa — label afuera, círculo con halo (sin fondo). Altura reducida ~20%. */}
      <div className="space-y-2">
        <Label>Vista previa</Label>
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/40 border border-border">
          <div
            className="h-10 w-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
            style={{ backgroundColor: previewColor.bg, border: `2px solid ${previewColor.border}` }}
            aria-hidden="true"
          >
            {emoji}
          </div>
          <p className="text-sm font-bold truncate" style={{ color: previewColor.textLight }}>
            {nombre || placeholderNombre}
          </p>
        </div>
      </div>
    </>
  )
}
