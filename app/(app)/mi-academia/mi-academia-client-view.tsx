'use client'

import { useRouter } from 'next/navigation'
import { PageSubheader } from '@/components/layout/page-subheader'
import { MiAcademiaForm } from '@/components/domain/configuracion/mi-academia-form'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { UserCheck, UserX } from 'lucide-react'
import { logoutAction } from '@/app/(app)/configuracion/actions'

export function MiAcademiaClientView({
  nombre,
  academiaId,
  logoUrl,
  activos,
  suspendidos,
}: {
  nombre: string
  academiaId: string
  logoUrl: string | null
  activos: number
  suspendidos: number
}) {
  const router = useRouter()

  return (
    <div className="flex flex-col h-full min-h-screen bg-background pb-20">
      <PageSubheader title="Mi academia" onBack={() => router.back()} />

      <div className="p-4 space-y-6">
        <MiAcademiaForm
          initialNombre={nombre}
          academiaId={academiaId}
          logoUrl={logoUrl}
        />

        {/* Conteo de alumnos */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="justify-center">
            <CardContent className="flex items-center gap-3 px-4">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#5C8F78]/12 text-[#5C8F78]">
                <UserCheck className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-2xl font-bold leading-none text-foreground">{activos}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {activos === 1 ? 'Alumno activo' : 'Alumnos activos'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="justify-center">
            <CardContent className="flex items-center gap-3 px-4">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <UserX className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-2xl font-bold leading-none text-foreground">{suspendidos}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {suspendidos === 1 ? 'Alumno suspendido' : 'Alumnos suspendidos'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cerrar Sesión */}
        <div className="flex justify-between items-center p-4 bg-muted/30 border border-border rounded-lg">
          <p className="text-xs text-muted-foreground">Salir de tu cuenta de forma segura.</p>
          <form action={logoutAction}>
            <Button type="submit" variant="destructive" size="sm">
              Cerrar Sesión
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
