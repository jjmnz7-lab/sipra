'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { GraduationCap, BarChart3, Settings, ChevronRight } from 'lucide-react'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { useAcademia } from '@/lib/contexts/academia-context'
import { cn } from '@/lib/utils'

export function AcademiaMenu() {
  const router = useRouter()
  const pathname = usePathname()
  const { academiaNombre, academiaLogoUrl } = useAcademia()
  const [open, setOpen] = useState(false)

  // Resalta el avatar cuando el usuario está en alguna de las secciones del menú.
  const enSeccion =
    pathname.startsWith('/mi-academia') ||
    pathname.startsWith('/reportes') ||
    pathname.startsWith('/configuracion')

  const logo = academiaLogoUrl ? (
    <img
      src={academiaLogoUrl}
      alt="Logo"
      className={cn(
        'h-10 w-10 rounded-full object-cover flex-shrink-0 shadow-sm border',
        enSeccion ? 'border-2 border-[#22887c]' : 'border-border',
      )}
    />
  ) : (
    <div
      className={cn(
        'h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 shadow-sm border',
        enSeccion ? 'border-2 border-[#22887c]' : 'border-primary/20',
      )}
    >
      <span className="text-primary font-bold text-lg">
        {academiaNombre.charAt(0).toUpperCase()}
      </span>
    </div>
  )

  const irA = (href: string) => {
    if (pathname === href) {
      setOpen(false)
      return
    }
    setOpen(false)
    router.push(href)
  }

  const opciones = [
    {
      key: 'reportes',
      icon: <BarChart3 className="h-5 w-5" />,
      color: '#15435a',
      titulo: 'Reportes',
      desc: 'Ingresos y control de cargos grupales.',
      href: '/reportes',
    },
    {
      key: 'mi-academia',
      icon: <GraduationCap className="h-5 w-5" />,
      color: '#15435a',
      titulo: 'Mi academia',
      desc: 'Logo, nombre, alumnos y cierre de sesión.',
      href: '/mi-academia',
    },
    {
      key: 'configuracion',
      icon: <Settings className="h-5 w-5" />,
      color: '#22887c',
      titulo: 'Configuración',
      desc: 'Cobranza, planes y pagos atrasados.',
      href: '/configuracion',
    },
  ]

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Menú de la academia"
        className="block flex-shrink-0 rounded-full transition-[transform,box-shadow] duration-150 hover:opacity-90 active:scale-90 active:ring-2 active:ring-[#22887c]/60 active:shadow-[0_0_0_3px_rgba(34,136,124,0.18),0_8px_20px_rgba(34,136,124,0.10)]"
      >
        {logo}
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-md flex flex-col overflow-hidden pb-6">
            <DrawerHeader className="text-left">
              <DrawerTitle className="truncate">{academiaNombre}</DrawerTitle>
            </DrawerHeader>

            <div className="px-4 space-y-2">
              {opciones.map((op) => (
                <button
                  key={op.key}
                  type="button"
                  onClick={() => irA(op.href)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl border border-border hover:bg-accent transition-colors text-left active:scale-[0.985]"
                >
                  <span
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
                    style={{ color: op.color, backgroundColor: `${op.color}14` }}
                  >
                    {op.icon}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-foreground">{op.titulo}</span>
                    <span className="block text-xs text-muted-foreground">{op.desc}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}
