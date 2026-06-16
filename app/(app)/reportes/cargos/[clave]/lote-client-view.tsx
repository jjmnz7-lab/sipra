'use client'

import { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Users, FileText, MessageCircle } from 'lucide-react'
import { PageSubheader } from '@/components/layout/page-subheader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { formatCurrency, formatCurrencyCompact } from '@/lib/utils/currency'
import { formatFechaCorta } from '@/lib/utils/format-fecha'
import { buildWhatsAppShareUrl } from '@/lib/utils/whatsapp'
import { cn } from '@/lib/utils'
import type { AlumnoEnLote, LoteCargos } from '@/lib/reportes/cargos-grupales'

const AZUL_PROGRESO = '#15435a'

type TabKey = 'pendientes' | 'liquidados'

export function LoteClientView({ lote }: { lote: LoteCargos }) {
  const router = useRouter()
  const [isExiting, setIsExiting] = useState(false)
  const [tab, setTab] = useState<TabKey>('pendientes')
  const [shareOpen, setShareOpen] = useState(false)
  const [incluirLiquidados, setIncluirLiquidados] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [edited, setEdited] = useState(false)

  const handleBack = () => {
    setIsExiting(true)
    setTimeout(() => router.back(), 200)
  }

  const { pendientes, liquidados } = useMemo(() => {
    const p: AlumnoEnLote[] = []
    const l: AlumnoEnLote[] = []
    for (const a of lote.alumnos) {
      if (a.saldoPendiente > 0) p.push(a)
      else l.push(a)
    }
    // Pendientes: activos primero, suspendidos al final (mismo orden alfabético interno).
    p.sort((a, b) => {
      const sa = a.estadoRegistro === 'activo' ? 0 : 1
      const sb = b.estadoRegistro === 'activo' ? 0 : 1
      return sa - sb
    })
    return { pendientes: p, liquidados: l }
  }, [lote.alumnos])

  const lista = tab === 'pendientes' ? pendientes : liquidados

  const TABS: { key: TabKey; label: string; count: number }[] = [
    { key: 'pendientes', label: 'Pendientes', count: pendientes.length },
    { key: 'liquidados', label: 'Liquidados', count: liquidados.length },
  ]

  const mensajeResumen = useMemo(() => {
    let msg = `*${lote.titulo}${lote.contexto ? ` • ${lote.contexto}` : ''}*`
    
    msg += `\n\n*Pendientes de pago (${pendientes.length}):*`
    if (pendientes.length === 0) {
      msg += `\n• Ninguno`
    } else {
      pendientes.forEach((a) => {
        msg += `\n• ${a.nombre} ${a.apellido ?? ''}: ${formatCurrency(a.saldoPendiente)}`
      })
    }

    if (incluirLiquidados) {
      msg += `\n\n*Liquidados (${liquidados.length}):*`
      if (liquidados.length === 0) {
        msg += `\n• Ninguno`
      } else {
        liquidados.forEach((a) => {
          msg += `\n• ${a.nombre} ${a.apellido ?? ''}`
        })
      }
    }

    return msg
  }, [lote.titulo, lote.contexto, pendientes, liquidados, incluirLiquidados])

  useEffect(() => {
    if (!edited) {
      setMensaje(mensajeResumen)
    }
  }, [mensajeResumen, edited])

  const esCargoMensualOManual = lote.familia === 'mensualidad' || lote.familia === 'grupal'
  const subtituloText = esCargoMensualOManual
    ? `${lote.contexto ? `${lote.contexto} • ` : ''}cargo generado el ${formatFechaCorta(lote.fechaLote.slice(0, 10))}`
    : lote.contexto || ''

  return (
    <div
      className={`flex flex-col h-full min-h-screen bg-background pb-24 transition-all duration-200 ${
        isExiting ? 'animate-out slide-out-to-right fade-out' : 'animate-in slide-in-from-right'
      }`}
    >
      <PageSubheader
        title={
          <div className="min-w-0">
            <span className="block truncate">{lote.titulo}</span>
            <span className="block text-xs font-medium text-muted-foreground truncate -mt-0.5">
              {subtituloText}
            </span>
          </div>
        }
        onBack={handleBack}
        actions={
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="flex items-center gap-2 text-[11px] font-semibold text-[#22887c] hover:underline leading-tight text-left"
          >
            <WhatsappSummaryIcon className="flex-shrink-0" />
            <span className="flex flex-col">
              <span>Enviar</span>
              <span>resumen</span>
            </span>
          </button>
        }
      />

      <div className="p-4 space-y-4">
        {/* Resumen del lote: strip de progreso + fracción */}
        <Card>
          <CardContent className="px-3 pt-0.5 pb-1 space-y-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-semibold text-foreground">{lote.pct}% cobrado</span>
            </div>
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, lote.pct)}%`, backgroundColor: AZUL_PROGRESO }}
              />
            </div>
            <div className="flex items-center justify-end text-xs">
              <span className="font-semibold text-foreground tabular-nums">
                {formatCurrencyCompact(lote.cobrado)}
                <span className="font-normal text-muted-foreground"> / {formatCurrencyCompact(lote.total)}</span>
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Pestañas Pendientes / Liquidados */}
        <div className="flex items-center justify-center gap-1">
          {TABS.map((t) => {
            const selected = tab === t.key
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  'flex items-center justify-center gap-1 rounded-full h-8 px-4 text-[10px] font-semibold border transition-colors',
                  selected
                    ? 'bg-[#15435a] text-white border-transparent'
                    : 'bg-secondary text-muted-foreground border-transparent hover:bg-accent',
                )}
              >
                <span className="truncate">{t.label}</span>
                <span className="flex-shrink-0 tabular-nums">({t.count})</span>
              </button>
            )
          })}
        </div>

        {/* Lista de alumnos del tab activo */}
        <div className="space-y-2">
          {lista.map((a) => (
            <AlumnoLoteRow key={a.personaId} alumno={a} liquidado={tab === 'liquidados'} />
          ))}

          {lista.length === 0 && (
            <div className="text-center py-12 px-4 border border-dashed border-border rounded-xl bg-muted/20">
              <Users className="h-7 w-7 text-muted-foreground/60 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {tab === 'pendientes'
                  ? 'Nadie debe este cargo: todos los alumnos lo han liquidado.'
                  : 'Aún nadie ha liquidado este cargo por completo.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Drawer para enviar resumen */}
      <Drawer open={shareOpen} onOpenChange={(open) => {
          setShareOpen(open)
          if (!open) setEdited(false)
        }}>
          <DrawerContent>
            <div className="mx-auto w-full max-w-sm">
              <DrawerHeader className="text-left">
                <DrawerTitle className="flex items-center text-foreground">
                  <MessageCircle className="mr-2 h-5 w-5 text-[#22887c]" /> Enviar Resumen
                </DrawerTitle>
                <DrawerDescription>
                  Resumen de cobranza del cargo grupal para compartir.
                </DrawerDescription>
              </DrawerHeader>

              <div className="p-4 space-y-4">
                {/* Toggle para incluir liquidados */}
                <div
                  className="flex items-center space-x-3 p-3 bg-secondary/35 rounded-xl border border-border/60 hover:bg-secondary/50 transition-colors select-none cursor-pointer"
                  onClick={() => setIncluirLiquidados(!incluirLiquidados)}
                >
                  <Switch
                    id="liquidados-toggle"
                    checked={incluirLiquidados}
                    onCheckedChange={(checked) => setIncluirLiquidados(!!checked)}
                    onClick={(e) => e.stopPropagation()}
                    className="data-checked:!bg-[#22887c]"
                  />
                  <div className="flex flex-col gap-0.5 pointer-events-none">
                    <Label htmlFor="liquidados-toggle" className="text-xs font-bold text-muted-foreground">
                      Incluir alumnos liquidados
                    </Label>
                  </div>
                </div>

                {/* Textarea con el mensaje */}
                <div className="space-y-1.5">
                  <Label htmlFor="mensaje-resumen" className="text-xs font-bold text-muted-foreground">
                    Mensaje a enviar
                  </Label>
                  <Textarea
                    id="mensaje-resumen"
                    value={mensaje}
                    onChange={(e) => {
                      setMensaje(e.target.value)
                      setEdited(true)
                    }}
                    className="min-h-[160px] text-xs font-sans resize-none"
                  />
                </div>
              </div>

              <DrawerFooter className="flex flex-row gap-2 mt-4 pt-2">
                <Button
                  type="button"
                  onClick={() => {
                    const url = buildWhatsAppShareUrl(undefined, mensaje)
                    window.open(url, '_blank', 'noopener,noreferrer')
                    setShareOpen(false)
                  }}
                  className="flex-1 h-11 bg-[#22887c] hover:bg-[#22887c]/90 text-white font-semibold"
                >
                  Compartir por WhatsApp
                </Button>
                <DrawerClose asChild>
                  <Button type="button" variant="ghost" className="flex-1 h-11">
                    Cancelar
                  </Button>
                </DrawerClose>
              </DrawerFooter>
            </div>
          </DrawerContent>
        </Drawer>
    </div>
  )
}

function WhatsappSummaryIcon({ className }: { className?: string }) {
  return (
    <span className={cn('relative inline-flex h-5 w-5 flex-shrink-0 items-center justify-center', className)}>
      <MessageCircle className="h-4 w-4" />
      <span className="absolute -bottom-1 -right-1 inline-flex items-center justify-center rounded-full bg-[#22887c] p-[1px] border border-white">
        <FileText className="h-2 w-2 text-white" strokeWidth={3} />
      </span>
    </span>
  )
}

function AlumnoLoteRow({ alumno, liquidado }: { alumno: AlumnoEnLote; liquidado: boolean }) {
  const suspendido = alumno.estadoRegistro !== 'activo'
  const abonado = alumno.montoOriginal - alumno.saldoPendiente

  return (
    <Link href={`/seguimiento/${alumno.personaId}`} className="block">
      <div
        className={cn(
          'border rounded-lg px-3 py-2.5 flex items-center gap-2 transition-[transform,border-color] duration-150 hover:border-primary/50 active:scale-[0.985] min-h-[48px]',
          suspendido && !liquidado ? 'bg-card/65 border-border/65' : 'bg-card border-border',
        )}
      >
        <p
          className={cn(
            'flex-1 min-w-0 text-sm font-semibold truncate',
            suspendido && !liquidado ? 'text-muted-foreground/65' : 'text-foreground',
          )}
        >
          {alumno.nombre} {alumno.apellido}
        </p>

        {liquidado ? (
          <span className="flex-shrink-0 inline-flex items-center text-[10px] font-semibold rounded-full border px-2 py-0.5 whitespace-nowrap border-[#22887c]/30 bg-[#22887c]/10 text-[#22887c]">
            Liquidado
          </span>
        ) : suspendido ? (
          <span className="flex-shrink-0 inline-flex items-center text-[10px] font-semibold rounded-full border px-2 py-0.5 whitespace-nowrap border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
            Suspendido • {formatCurrencyCompact(alumno.saldoPendiente)}
          </span>
        ) : abonado > 0 ? (
          <span className="flex-shrink-0 inline-flex items-center text-[10px] font-semibold rounded-full border px-2 py-0.5 whitespace-nowrap border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-600/60 dark:bg-amber-900/40 dark:text-amber-200">
            Abonó {formatCurrencyCompact(abonado)} (Resta {formatCurrencyCompact(alumno.saldoPendiente)})
          </span>
        ) : (
          <span className="flex-shrink-0 inline-flex items-center text-[10px] font-semibold rounded-full border px-2 py-0.5 whitespace-nowrap border-red-200 bg-red-50 text-red-600 dark:border-red-800/50 dark:bg-red-900/25 dark:text-red-400">
            Pendiente {formatCurrencyCompact(alumno.saldoPendiente)}
          </span>
        )}
      </div>
    </Link>
  )
}
