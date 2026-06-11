'use client'

import { useRouter } from 'next/navigation'
import { PageSubheader } from '@/components/layout/page-subheader'
import { Card, CardContent } from '@/components/ui/card'
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
  countAlDia,
  countPendiente,
  countAtrasado,
  countUrgente,
  totalAlumnos,
}: {
  esperadoMes: number
  cobradoMes: number
  pendienteMes: number
  countAlDia: number
  countPendiente: number
  countAtrasado: number
  countUrgente: number
  totalAlumnos: number
}) {
  const router = useRouter()

  const now = new Date()
  const mesActualLabel = now.toLocaleDateString('es-MX', { month: 'long' })
  const mesAnteriorLabel = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    .toLocaleDateString('es-MX', { month: 'long' })

  const pctCobrado = esperadoMes > 0 ? Math.round((cobradoMes / esperadoMes) * 100) : 0

  const segmentsAlumnos = [
    { label: 'al día', slug: 'al_dia', count: countAlDia, hex: HEX.cobrado },
    { label: 'pendiente', slug: 'pendiente', count: countPendiente, hex: HEX.pendiente },
    { label: 'atrasado', slug: 'atrasado', count: countAtrasado, hex: HEX.atrasado },
    { label: 'urgente', slug: 'urgente', count: countUrgente, hex: HEX.urgente },
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

        {/* Estado financiero de alumnos */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Estado financiero de alumnos</h2>
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">Distribución de estados de cobro</p>
                <p className="text-2xl font-bold text-foreground mt-0.5">
                  {totalAlumnos} {totalAlumnos === 1 ? 'alumno' : 'alumnos'}
                </p>
              </div>

              {/* Barra segmentada */}
              <div className="w-full h-2 rounded-full flex overflow-hidden bg-muted">
                {totalAlumnos > 0 && segmentsAlumnos.map((s) =>
                  s.count > 0 ? (
                    <div
                      key={s.label}
                      className="h-full"
                      style={{ width: `${(s.count / totalAlumnos) * 100}%`, backgroundColor: s.hex }}
                    />
                  ) : null,
                )}
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                {segmentsAlumnos.map((s) => {
                  const pct = totalAlumnos > 0 ? Math.round((s.count / totalAlumnos) * 100) : 0
                  return (
                    <div 
                      key={s.slug}
                      onClick={() => router.push(`/alumnos?estado=${s.slug}`)}
                      className="p-3 rounded-lg border border-border bg-card flex flex-col justify-between min-h-[72px] cursor-pointer hover:bg-accent/50 active:scale-95 transition-all"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.hex }} />
                        <span className="text-xs font-medium text-muted-foreground capitalize">{s.label}</span>
                      </div>
                      <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-lg font-normal text-foreground">{s.count} {s.count === 1 ? 'alumno' : 'alumnos'}</span>
                        <span className="text-xs text-muted-foreground">({pct}%)</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </section>

      </div>
    </div>
  )
}
