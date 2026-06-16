'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Info, ChevronRight } from 'lucide-react'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { cn } from '@/lib/utils'
import type { AlertasOperativas } from '@/lib/alertas/operativas'

const SEEN_KEY = 'sipra_alertas_seen_at'
const SESSION_KEY = 'sipra_alertas_session'
const AUSENCIA_MS = 30 * 60 * 1000 // 30 min

type Fila = {
  key: keyof AlertasOperativas
  tipo: 'warning' | 'info'
  count: number
  texto: (n: number) => string
  href: string | ((alertas: AlertasOperativas) => string)
}

type ClaveContador = Exclude<keyof AlertasOperativas, 'actividadesVencidasIds' | 'actividadesFinalizanHoyIds' | 'actividadesPorFinalizarIds'>

const DEF_FILAS: Omit<Fila & { key: ClaveContador }, 'count'>[] = [
  {
    key: 'sinGrupo',
    tipo: 'warning',
    texto: (n) => `${n} ${n === 1 ? 'alumno' : 'alumnos'} no ${n === 1 ? 'tiene' : 'tienen'} ningún Grupo asignado`,
    href: '/alumnos?filtro=huerfanos',
  },
  {
    key: 'sinPlan',
    tipo: 'warning',
    texto: (n) => `${n} ${n === 1 ? 'alumno regular' : 'alumnos regulares'} no ${n === 1 ? 'tiene' : 'tienen'} un Plan de Cobro`,
    href: '/alumnos?filtro=huerfanos',
  },
  {
    key: 'adeudoSinTelefono',
    tipo: 'warning',
    texto: (n) => `${n} ${n === 1 ? 'alumno' : 'alumnos'} con adeudo no ${n === 1 ? 'tiene' : 'tienen'} Teléfono/WhatsApp registrado`,
    href: '/alumnos',
  },
  {
    key: 'planInactivo',
    tipo: 'warning',
    texto: (n) => `${n} ${n === 1 ? 'alumno tiene' : 'alumnos tienen'} asignado un Plan de Cobro inactivo o archivado`,
    href: '/alumnos',
  },
  {
    key: 'actividadesVencidas',
    tipo: 'warning',
    texto: (n) => `${n} ${n === 1 ? 'Actividad ha superado' : 'Actividades han superado'} su fecha de fin y ${n === 1 ? 'sigue activa' : 'siguen activas'}`,
    href: (alertas) => {
      const ids = alertas.actividadesVencidasIds ?? []
      if (ids.length === 1) {
        return `/actividades/${ids[0]}?abrir_archiva=true`
      }
      return '/actividades?filtro=vencidas'
    },
  },
  {
    key: 'actividadesFinalizanHoy',
    tipo: 'info',
    texto: (n) => `${n} ${n === 1 ? 'Actividad finaliza' : 'Actividades finalizan'} hoy`,
    href: (alertas) => {
      const ids = alertas.actividadesFinalizanHoyIds ?? []
      return ids.length === 1 ? `/actividades/${ids[0]}` : '/actividades'
    },
  },
  {
    key: 'actividadesPorFinalizar',
    tipo: 'info',
    texto: (n) => `${n} ${n === 1 ? 'Actividad finaliza' : 'Actividades finalizan'} mañana`,
    href: (alertas) => {
      const ids = alertas.actividadesPorFinalizarIds ?? []
      return ids.length === 1 ? `/actividades/${ids[0]}` : '/actividades'
    },
  },
  {
    key: 'sinAdeudoSinTelefono',
    tipo: 'info',
    texto: (n) => `${n} ${n === 1 ? 'alumno' : 'alumnos'} sin adeudo no ${n === 1 ? 'tiene' : 'tienen'} Teléfono/WhatsApp registrado`,
    href: '/alumnos',
  },
  {
    key: 'suspendidosSaldoCero',
    tipo: 'info',
    texto: (n) => `${n} ${n === 1 ? 'alumno está' : 'alumnos están'} en estatus Suspendido con saldo actual en $0`,
    href: '/alumnos',
  },
]

export function AlertCenter({ alertas }: { alertas: AlertasOperativas }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [animate, setAnimate] = useState(false)
  const animationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const filas = useMemo<Fila[]>(
    () => DEF_FILAS.map((f) => ({ ...f, count: alertas[f.key] })).filter((f) => f.count > 0),
    [alertas],
  )

  const hayAlertas = filas.length > 0
  const hayWarnings = filas.some((f) => f.tipo === 'warning')
  const total = filas.length // se cuentan alertas, no casos

  // La animación de atención solo aplica al badge rojo (cuando hay advertencias).
  // Se dispara al entrar al sistema (sesión nueva) o tras una ausencia larga.
  useEffect(() => {
    if (!hayWarnings) return
    let debeAnimar = false
    try {
      const now = Date.now()
      const last = Number(localStorage.getItem(SEEN_KEY) || 0)
      const sesion = sessionStorage.getItem(SESSION_KEY)
      if (!sesion || now - last > AUSENCIA_MS) debeAnimar = true
      sessionStorage.setItem(SESSION_KEY, '1')
      localStorage.setItem(SEEN_KEY, String(now))
    } catch { /* noop */ }
    if (debeAnimar) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- disparo único de la animación de atención
      setAnimate(true)
      animationTimeoutRef.current = setTimeout(() => {
        setAnimate(false)
        animationTimeoutRef.current = null
      }, 2600)
      return () => {
        if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current)
        animationTimeoutRef.current = null
      }
    }
  }, [hayWarnings])

  // Reanima si el usuario regresa a la pestaña tras una ausencia larga (solo si hay advertencias).
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== 'visible' || !hayWarnings) return
      try {
        const now = Date.now()
        const last = Number(localStorage.getItem(SEEN_KEY) || 0)
        if (now - last > AUSENCIA_MS) {
          if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current)
          setAnimate(true)
          animationTimeoutRef.current = setTimeout(() => {
            setAnimate(false)
            animationTimeoutRef.current = null
          }, 2600)
        }
        localStorage.setItem(SEEN_KEY, String(now))
      } catch { /* noop */ }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [hayWarnings])

  const handleOpen = () => {
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current)
      animationTimeoutRef.current = null
    }
    setAnimate(false)
    setOpen(true)
  }

  const irA = (href: string | ((alertas: AlertasOperativas) => string)) => {
    const destino = typeof href === 'function' ? href(alertas) : href
    setOpen(false)
    router.push(destino)
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label={hayAlertas ? `Alertas operativas: ${total}` : 'Alertas operativas'}
        className={cn(
          'relative p-2 rounded-full transition-colors hover:bg-accent',
          // Ícono amarillo cuando hay notificaciones; gris neutro cuando no hay.
          hayAlertas ? 'text-amber-500' : 'text-muted-foreground/40',
        )}
      >
        <AlertTriangle className="h-5 w-5" strokeWidth={hayAlertas ? 2.25 : 2} />
        {hayAlertas && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center">
            {hayWarnings && animate && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500/70" />
            )}
            <span
              className={cn(
                'relative inline-flex min-w-[18px] h-[18px] px-1 items-center justify-center rounded-full text-[10px] font-bold leading-none text-white ring-2 ring-card',
                hayWarnings ? 'bg-red-500' : 'bg-blue-500',
              )}
            >
              {total}
            </span>
          </span>
        )}
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="max-h-[85vh]">
          <div className="mx-auto w-full max-w-md flex flex-col overflow-hidden pb-6">
            <DrawerHeader className="text-left">
              <DrawerTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />
                Alertas operativas
              </DrawerTitle>
            </DrawerHeader>

            <div className="px-4 space-y-2 overflow-y-auto">
              {filas.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Todo en orden. No hay alertas operativas. ✅
                </p>
              )}

              {filas.map((f) => {
                const esInfo = f.tipo === 'info'
                return (
                  <button
                    key={f.key as string}
                    type="button"
                    onClick={() => irA(f.href)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-3 rounded-xl border text-left transition-colors',
                      esInfo
                        ? 'border-blue-200 bg-blue-50/60 hover:bg-blue-50'
                        : 'border-amber-200 bg-amber-50/60 hover:bg-amber-50',
                    )}
                  >
                    <span className="flex-shrink-0 mt-0.5">
                      {esInfo ? (
                        <Info className="h-5 w-5 text-blue-500" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                      )}
                    </span>
                    <span className={cn('flex-1 text-sm leading-snug', esInfo ? 'text-blue-900' : 'text-amber-900')}>
                      {f.texto(f.count)}
                    </span>
                    <ChevronRight className={cn('h-4 w-4 flex-shrink-0', esInfo ? 'text-blue-400' : 'text-amber-400')} />
                  </button>
                )
              })}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}
