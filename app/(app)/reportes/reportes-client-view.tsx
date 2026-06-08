'use client'

import { useRouter } from 'next/navigation'
import { PageSubheader } from '@/components/layout/page-subheader'
import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency'
import { cn } from '@/lib/utils'

const HEX = {
  cobrado: '#5C8F78',
  pendiente: '#D2A45C',
  atrasado: '#B85C50',
  urgente: '#7A2F38',
}

export function ReportesClientView({
  esperadoMes,
  cobradoMes,
  pendienteMes,
  ingresosMesActual,
  ingresosMesAnterior,
  deudaPendiente,
  deudaAtrasada,
  deudaUrgente,
  deudaTotal,
}: {
  esperadoMes: number
  cobradoMes: number
  pendienteMes: number
  ingresosMesActual: number
  ingresosMesAnterior: number
  deudaPendiente: number
  deudaAtrasada: number
  deudaUrgente: number
  deudaTotal: number
}) {
  const router = useRouter()

  const now = new Date()
  const mesActualLabel = now.toLocaleDateString('es-MX', { month: 'long' })
  const mesAnteriorLabel = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    .toLocaleDateString('es-MX', { month: 'long' })

  const pctCobrado = esperadoMes > 0 ? Math.round((cobradoMes / esperadoMes) * 100) : 0

  // Delta de ingresos vs mes anterior
  const delta = ingresosMesActual - ingresosMesAnterior
  const deltaPct = ingresosMesAnterior > 0
    ? Math.round((delta / ingresosMesAnterior) * 100)
    : null

  const segmentos = [
    { label: 'Pendiente', monto: deudaPendiente, hex: HEX.pendiente },
    { label: 'Atrasada', monto: deudaAtrasada, hex: HEX.atrasado },
    { label: 'Urgente', monto: deudaUrgente, hex: HEX.urgente },
  ]

  return (
    <div className="flex flex-col h-full min-h-screen bg-background pb-20">
      <PageSubheader title="Reportes" onBack={() => router.back()} />

      <div className="p-4 space-y-6">
        {/* Cobranza del mes — barra esperado vs cobrado */}
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-foreground">Cobranza de {mesActualLabel}</h2>
            <span className="text-xs font-semibold text-muted-foreground">{pctCobrado}% cobrado</span>
          </div>

          <Card>
            <CardContent className="p-4 space-y-3">
              <div
                className="w-full h-3 rounded-full flex overflow-hidden bg-muted"
                title={`Cobrado ${formatCurrency(cobradoMes)} de ${formatCurrency(esperadoMes)}`}
              >
                {esperadoMes > 0 && (
                  <div
                    className="h-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (cobradoMes / esperadoMes) * 100)}%`, backgroundColor: HEX.cobrado }}
                  />
                )}
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: HEX.cobrado }} />
                  <span className="text-muted-foreground">Cobrado</span>
                  <span className="font-semibold text-foreground">{formatCurrency(cobradoMes)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full flex-shrink-0 bg-muted-foreground/40" />
                  <span className="text-muted-foreground">Pendiente</span>
                  <span className="font-semibold text-foreground">{formatCurrency(pendienteMes)}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Esperado del mes</span>
                <span className="font-bold text-foreground">{formatCurrency(esperadoMes)}</span>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Ingresos mes actual vs anterior */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Ingresos recibidos</h2>
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground capitalize">{mesActualLabel}</p>
                <p className="text-xl font-bold text-foreground mt-1">{formatCurrency(ingresosMesActual)}</p>
                <div className={cn(
                  'flex items-center gap-1 mt-2 text-xs font-semibold',
                  delta > 0 ? 'text-[#5C8F78]' : delta < 0 ? 'text-[#B85C50]' : 'text-muted-foreground',
                )}>
                  {delta > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : delta < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                  <span>
                    {deltaPct !== null
                      ? `${delta >= 0 ? '+' : ''}${deltaPct}% vs mes anterior`
                      : delta > 0 ? 'Nuevo ingreso' : 'Sin cambios'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground capitalize">{mesAnteriorLabel}</p>
                <p className="text-xl font-bold text-muted-foreground mt-1">{formatCurrency(ingresosMesAnterior)}</p>
                <p className="text-xs text-muted-foreground mt-2">Mes anterior</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Deuda acumulada */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Deuda acumulada</h2>
          <Card>
            <CardContent className="p-4 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Total que te deben los alumnos</p>
                <p className="text-2xl font-bold text-foreground mt-0.5">{formatCurrency(deudaTotal)}</p>
              </div>

              {/* Barra segmentada sutil */}
              <div className="w-full h-2 rounded-full flex overflow-hidden bg-muted">
                {deudaTotal > 0 && segmentos.map((s) =>
                  s.monto > 0 ? (
                    <div
                      key={s.label}
                      className="h-full"
                      style={{ width: `${(s.monto / deudaTotal) * 100}%`, backgroundColor: s.hex }}
                    />
                  ) : null,
                )}
              </div>

              {/* Desglose */}
              <div className="space-y-1.5 pt-1">
                {segmentos.map((s) => (
                  <div key={s.label} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.hex }} />
                      <span className="text-muted-foreground">{s.label}</span>
                    </div>
                    <span className="font-semibold text-foreground">{formatCurrency(s.monto)}</span>
                  </div>
                ))}
              </div>

              {deudaTotal === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Sin deuda pendiente. ✅
                </p>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}
