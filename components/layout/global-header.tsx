'use client'

import Image from 'next/image'
import { useAcademia } from '@/lib/contexts/academia-context'
import { AlertCenter } from '@/components/layout/alert-center'
import { AcademiaMenu } from '@/components/layout/academia-menu'
import type { AlertasOperativas } from '@/lib/alertas/operativas'
import isotipoSipra from '@/public/logos/isotipo-sipra.png'

export function GlobalHeader({ alertas }: { alertas: AlertasOperativas }) {
  const { academiaNombre } = useAcademia()

  return (
    <header className="sticky top-0 z-30 bg-card border-b border-border h-14 flex items-center px-4 w-full">
      <div className="flex items-center justify-between gap-4 w-full max-w-4xl mx-auto">
        <div className="flex items-center space-x-3 min-w-0">
          <AcademiaMenu />
          <h1
            className="text-lg font-extrabold tracking-tight truncate text-foreground"
            style={{ fontFamily: 'var(--font-sans), sans-serif', letterSpacing: '-0.02em' }}
          >
            {academiaNombre}
          </h1>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Centro de alertas — a la izquierda del separador vertical */}
          <AlertCenter alertas={alertas} />

          <div className="flex items-center border-l border-[#E0E0E0]/70 pl-3 lg:hidden">
            <Image
              src={isotipoSipra}
              alt="SIPRA"
              className="h-7 w-auto"
              priority
            />
          </div>
        </div>
      </div>
    </header>
  )
}
