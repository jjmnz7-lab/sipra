'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RecargosBlock } from '@/components/domain/configuracion/pagos-atrasados-form'
import { ProrrateoBlock } from '@/components/domain/configuracion/cobranza-form-section'

/**
 * Sección unificada: primero los recargos por pago tardío (config_recargos) y
 * luego el prorrateo / régimen de alta (config_cobro). Cada bloque conserva su
 * propio guardado independiente.
 */
export function RecargosExcepcionesSection({
  initialRecargos,
  initialCobro,
}: {
  initialRecargos: any
  initialCobro: any
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recargos y Excepciones</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <RecargosBlock initialConfig={initialRecargos} />
        <div className="border-t border-border" />
        <ProrrateoBlock initialConfig={initialCobro} />
      </CardContent>
    </Card>
  )
}
