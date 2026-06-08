'use client'

import { useCallback, useMemo, useRef, useState } from 'react'

/**
 * Hook que trackea si el estado actual de una sección difiere del snapshot
 * inicial (o del último guardado). Sirve para mostrar/ocultar el par
 * "Guardar / Cancelar" por sección.
 *
 * Uso:
 *   const dirtyState = useDirtySection({ regimen, redondeo, reglas }, initial)
 *   ...
 *   if (state.success) dirtyState.commitSnapshot()   // tras guardar OK
 *   <SectionFooter dirty={dirtyState.dirty} onCancel={() => {
 *      const snap = dirtyState.snapshot
 *      setRegimen(snap.regimen)
 *      ...
 *   }} />
 *
 * Deep-equal con JSON.stringify (suficiente para JSON-serializables).
 */
export function useDirtySection<T>(current: T, initial: T) {
  // Snapshot mutable. Inicialmente clonamos `initial` para no compartir
  // referencias con el caller.
  const [snapshot, setSnapshot] = useState<T>(() => structuredClone(initial))
  const lastCurrentRef = useRef<T>(current)
  lastCurrentRef.current = current

  const dirty = useMemo(
    () => JSON.stringify(current) !== JSON.stringify(snapshot),
    [current, snapshot]
  )

  /** Llamar tras un guardado exitoso para fijar el estado actual como nuevo baseline. */
  const commitSnapshot = useCallback(() => {
    setSnapshot(structuredClone(lastCurrentRef.current))
  }, [])

  /** Reset manual del baseline (raramente útil; expuesto por completitud). */
  const resetSnapshot = useCallback((nuevo: T) => {
    setSnapshot(structuredClone(nuevo))
  }, [])

  return { dirty, snapshot, commitSnapshot, resetSnapshot }
}
