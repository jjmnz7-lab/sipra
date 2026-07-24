'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RecargosBlock } from '@/components/domain/configuracion/pagos-atrasados-form'
import { ProrrateoBlock } from '@/components/domain/configuracion/cobranza-form-section'

/**
 * Sección Recargos: recargos por pago tardío de mensualidad (config_recargos).
 */
export function RecargosSection({ initialConfig }: { initialConfig: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recargos</CardTitle>
      </CardHeader>
      <CardContent>
        <RecargosBlock initialConfig={initialConfig} />
      </CardContent>
    </Card>
  )
}

/** Compat alias */
export const RecargosExcepcionesSection = ({ initialRecargos }: { initialRecargos: any; initialCobro?: any }) => (
  <RecargosSection initialConfig={initialRecargos} />
)
