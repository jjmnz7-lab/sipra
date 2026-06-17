'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Copy, RefreshCw, Lock, Unlock, Link2, Loader2, AlertTriangle } from 'lucide-react'
import {
  regenerarEnlaceHistorialAction,
  toggleBloqueoEnlaceAction,
} from '@/app/(app)/seguimiento/actions'
import { buildShareLink } from '@/lib/utils/whatsapp'

type Props = {
  personaId: string
  alumnoNombre: string
  shareCode: string
  bloqueado: boolean
  suspendido: boolean
  onToast: (msg: string) => void
  /** Vuelve al menú principal del kebab. */
  onBack: () => void
  /** Cierra el bottom sheet por completo. */
  onClose: () => void
}

/**
 * Panel de gestión del enlace (subvista del bottom sheet de acciones).
 * "Copiar enlace" es la acción principal; "Regenerar" y "Bloquear" son
 * sensibles (color de precaución) y exigen confirmación inline.
 */
export function EnlaceHistorialPanel({
  personaId,
  alumnoNombre,
  shareCode,
  bloqueado,
  suspendido,
  onToast,
  onBack,
  onClose,
}: Props) {
  const [code, setCode] = useState(shareCode)
  const [bloq, setBloq] = useState(bloqueado)
  const [origin] = useState(() => (typeof window !== 'undefined' ? window.location.origin : ''))
  const [confirm, setConfirm] = useState<null | 'regen' | 'bloq'>(null)
  const [loading, setLoading] = useState<null | 'regen' | 'bloq'>(null)

  const link = buildShareLink(code, origin)

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(buildShareLink(code, window.location.origin))
      onToast('Enlace copiado.')
      onClose()
    } catch {
      onToast('No se pudo copiar.')
    }
  }

  const regenerar = async () => {
    setLoading('regen')
    const res = await regenerarEnlaceHistorialAction(personaId)
    setLoading(null)
    setConfirm(null)
    if (res.success && res.code) {
      setCode(res.code)
      onToast('Enlace regenerado.')
    } else {
      onToast(res.message ?? 'No se pudo regenerar.')
    }
  }

  const toggleBloqueo = async (target: boolean) => {
    setLoading('bloq')
    const res = await toggleBloqueoEnlaceAction(personaId, target)
    setLoading(null)
    setConfirm(null)
    if (res.success) {
      setBloq(target)
      onToast(target ? 'Enlace bloqueado.' : 'Enlace desbloqueado.')
    } else {
      onToast(res.message ?? 'No se pudo actualizar.')
    }
  }

  return (
    <div className="pb-2">
      {/* Header con volver */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <button
          type="button"
          onClick={onBack}
          className="p-1.5 -ml-1.5 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors flex-shrink-0"
          aria-label="Volver"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Link2 className="h-4 w-4 text-[#22887c]" /> Enlace a historial
          </h3>
          <p className="text-xs text-muted-foreground truncate">{alumnoNombre}</p>
        </div>
      </div>

      <div className="px-4 space-y-3">
        {/* Vista previa del enlace (tap = copiar) */}
        <button
          type="button"
          onClick={copiar}
          className="w-full text-left rounded-xl border border-border bg-muted/40 px-3 py-2.5 hover:bg-muted transition-colors"
          title="Copiar enlace"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Enlace seguro</p>
          <p className="text-xs font-mono text-foreground/80 truncate mt-0.5">{link}</p>
        </button>

        {/* Estado del enlace */}
        {bloq && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs font-medium text-amber-700">
            <Lock className="h-3.5 w-3.5 flex-shrink-0" />
            El enlace está bloqueado: quien lo abra verá «no disponible».
          </div>
        )}
        {suspendido && !bloq && (
          <div className="flex items-center gap-2 rounded-lg bg-muted border border-border px-3 py-2 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5 flex-shrink-0" />
            El alumno está suspendido: el enlace permanece inactivo.
          </div>
        )}

        {confirm ? (
          /* Confirmación (igual para regenerar y bloquear) */
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 space-y-2.5">
            <p className="flex items-start gap-2 text-xs font-medium text-amber-700">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              {confirm === 'regen'
                ? 'Esto invalidará el enlace actual. Quien tenga el anterior dejará de poder abrirlo.'
                : 'Se bloqueará el enlace: quien lo abra verá «no disponible» hasta que lo desbloquees.'}
            </p>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="flex-1 h-10"
                onClick={() => setConfirm(null)}
                disabled={loading !== null}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 h-10 bg-amber-600 hover:bg-amber-700 text-white"
                onClick={() => (confirm === 'regen' ? regenerar() : toggleBloqueo(true))}
                disabled={loading !== null}
              >
                {loading !== null ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : confirm === 'regen' ? (
                  'Regenerar'
                ) : (
                  'Bloquear'
                )}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Acción principal: copiar */}
            <Button
              onClick={copiar}
              className="w-full h-12 bg-[#22887c] hover:bg-[#1a6b62] text-white text-sm font-semibold"
            >
              <Copy className="mr-2 h-4 w-4" /> Copiar enlace
            </Button>

            {/* Separador sutil hacia las acciones sensibles */}
            <div className="flex items-center gap-2 pt-1">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                Acciones sensibles
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setConfirm('regen')}
                disabled={suspendido || loading === 'regen'}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-amber-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className="h-5 w-5 text-amber-600 flex-shrink-0" />
                <span className="text-sm font-medium text-amber-700">Regenerar enlace</span>
              </button>

              <button
                type="button"
                onClick={() => (bloq ? toggleBloqueo(false) : setConfirm('bloq'))}
                disabled={suspendido || loading === 'bloq'}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-amber-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading === 'bloq' ? (
                  <Loader2 className="h-5 w-5 animate-spin text-amber-600 flex-shrink-0" />
                ) : bloq ? (
                  <Unlock className="h-5 w-5 text-amber-600 flex-shrink-0" />
                ) : (
                  <Lock className="h-5 w-5 text-amber-600 flex-shrink-0" />
                )}
                <span className="text-sm font-medium text-amber-700">
                  {bloq ? 'Desbloquear enlace' : 'Bloquear enlace'}
                </span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
