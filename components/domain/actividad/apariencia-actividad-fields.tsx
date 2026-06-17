'use client'

import { useEffect, useRef, useState } from 'react'
import { Pencil } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { EMOJIS_ACTIVIDAD } from '@/lib/constants/actividad-apariencia'

type Props = {
  emoji: string
  nombre: string
  onEmojiChange: (emoji: string) => void
  /** Etiqueta opcional para el placeholder cuando el nombre está vacío. */
  placeholderNombre?: string
}

/** Devuelve true si el string es exactamente un carácter emoji (o secuencia de emoji única). */
function isValidEmoji(value: string): boolean {
  if (!value) return false
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new (Intl as any).Segmenter(undefined, { granularity: 'grapheme' })
    const segments = [...segmenter.segment(value)]
    if (segments.length !== 1) return false
    const char = segments[0]?.segment ?? ''
    return /\p{Emoji}/u.test(char) && !/^[\d#*]$/.test(char)
  }
  return /^\p{Emoji}+$/u.test(value) && !/^[\d#*]$/.test(value)
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
  // Estado interno del input personalizado.
  // Si el emoji inicial no es predefinido, pre-cargarlo en el input.
  const [customEmoji, setCustomEmoji] = useState(() =>
    emoji && !EMOJIS_ACTIVIDAD.includes(emoji) ? emoji : ''
  )
  const inputRef = useRef<HTMLInputElement>(null)

  // Sincronizar si el emoji externo cambia (p.ej. al abrir el drawer con datos distintos)
  useEffect(() => {
    if (!emoji || EMOJIS_ACTIVIDAD.includes(emoji)) {
      setCustomEmoji('')
    } else {
      setCustomEmoji(emoji)
    }
  }, [emoji])

  const isCustomSelected = !!customEmoji && emoji === customEmoji

  function handlePredefinedClick(em: string) {
    // Limpiar el input personalizado cuando se elige un emoji predefinido
    setCustomEmoji('')
    onEmojiChange(em)
  }

  function handleCustomInput(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    if (!raw) {
      setCustomEmoji('')
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
      {/* Emoji (obligatorio: no se puede deseleccionar) */}
      <div className="space-y-2">
        <Label>Emoji *</Label>
        {/* grid-cols-8: 15 predefinidos + 1 input personalizado = 16 celdas */}
        <div className="grid grid-cols-8 gap-1.5">
          {EMOJIS_ACTIVIDAD.map((em) => {
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

      {/* Vista previa — círculo con borde neutro (las actividades no llevan color) */}
      <div className="space-y-2">
        <Label>Vista previa</Label>
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/40 border border-border">
          <div
            className="h-10 w-10 rounded-full flex items-center justify-center text-lg bg-card border border-border flex-shrink-0"
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
