'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useAcademia } from '@/lib/contexts/academia-context'
import { AlertCenter } from '@/components/layout/alert-center'
import type { AlertasOperativas } from '@/lib/alertas/operativas'
import { cn } from '@/lib/utils'
import logoSipra from '@/logo sipra.png'

export function GlobalHeader({ alertas }: { alertas: AlertasOperativas }) {
  const pathname = usePathname()
  const { academiaNombre, academiaLogoUrl } = useAcademia()
  const isConfig = pathname.startsWith('/configuracion')

  const academiaLogo = academiaLogoUrl ? (
    <img
      src={academiaLogoUrl}
      alt="Logo"
      className={cn(
        "h-10 w-10 rounded-full object-cover flex-shrink-0 shadow-sm border",
        isConfig ? "border-2 border-[#22887c]" : "border-border"
      )}
    />
  ) : (
    <div className={cn(
      "h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 shadow-sm border",
      isConfig ? "border-2 border-[#22887c]" : "border-primary/20"
    )}>
      <span className="text-primary font-bold text-lg">{academiaNombre.charAt(0).toUpperCase()}</span>
    </div>
  )

  const academiaBrand = isConfig ? (
    <div className="cursor-default flex-shrink-0">{academiaLogo}</div>
  ) : (
    <Link href="/configuracion" className="hover:opacity-80 transition-opacity active:scale-95 block flex-shrink-0">
      {academiaLogo}
    </Link>
  )

  return (
    <header className="sticky top-0 z-30 bg-card border-b border-border h-14 flex items-center px-4 w-full">
      <div className="flex items-center justify-between gap-4 w-full max-w-4xl mx-auto">
        <div className="flex items-center space-x-3 min-w-0">
          {academiaBrand}
          <h1
            className="text-lg font-extrabold tracking-tight truncate text-transparent bg-clip-text bg-gradient-to-br from-foreground to-foreground/70"
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
              src={logoSipra}
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
