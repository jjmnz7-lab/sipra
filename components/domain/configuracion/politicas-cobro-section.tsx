'use client'

import * as React from 'react'
import { useMemo, useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ToggleRow } from '@/components/domain/configuracion/toggle-row'
import { DirtyFooter } from '@/components/domain/configuracion/dirty-footer'
import { useDirtySection } from '@/components/domain/configuracion/use-dirty-section'
import { useToast } from '@/components/ui/use-toast'
import { guardarPoliticasCobroAction } from '@/app/(app)/configuracion/actions'

export function PoliticasCobroSection({
  initialAllowPartial,
  initialAllowOverpayment,
}: {
  initialAllowPartial: boolean
  initialAllowOverpayment: boolean
}) {
  const initial = useMemo(
    () => ({ allowPartial: initialAllowPartial, allowOverpayment: initialAllowOverpayment }),
    [initialAllowPartial, initialAllowOverpayment]
  )

  const [allowPartial, setAllowPartial] = useState(initial.allowPartial)
  const [allowOverpayment, setAllowOverpayment] = useState(initial.allowOverpayment)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const { showToast, toast } = useToast()

  const current = { allowPartial, allowOverpayment }
  const { dirty, snapshot, commitSnapshot } = useDirtySection(current, initial)

  const onCancel = () => {
    setAllowPartial(snapshot.allowPartial)
    setAllowOverpayment(snapshot.allowOverpayment)
    setError(null)
  }

  const onSave = () => {
    setError(null)
    startTransition(async () => {
      const res = await guardarPoliticasCobroAction({ allowPartial, allowOverpayment })
      if (!res.success) {
        setError(res.message ?? 'No se pudo guardar.')
        return
      }
      commitSnapshot()
      showToast('Políticas de cobro guardadas.')
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Políticas de Cobro</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <ToggleRow
          id="permitir_pagos_parciales"
          checked={allowPartial}
          onCheckedChange={setAllowPartial}
          label="Permitir pagos parciales (abonos)"
          description="Si se desactiva, cada cobro deberá cubrir el total del adeudo seleccionado."
        />
        <ToggleRow
          id="permitir_saldo_a_favor"
          checked={allowOverpayment}
          onCheckedChange={setAllowOverpayment}
          label="Permitir pagos mayores al saldo pendiente (saldo a favor)"
          description="Si se desactiva, no se podrán registrar montos por encima del saldo ni anticipos."
        />

        <DirtyFooter
          dirty={dirty}
          pending={isPending}
          onCancel={onCancel}
          onSave={onSave}
          errorMessage={error}
        />
      </CardContent>
      {toast}
    </Card>
  )
}
