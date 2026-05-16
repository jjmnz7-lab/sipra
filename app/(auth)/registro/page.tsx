'use client'

import { useActionState } from 'react'
import { registroAction, type RegistroState } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { useFormStatus } from 'react-dom'

const initialState: RegistroState = {}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full h-11" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {pending ? 'Creando academia...' : 'Comenzar (Prueba de 14 días)'}
    </Button>
  )
}

export default function RegistroPage() {
  const [state, formAction] = useActionState(registroAction, initialState)

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">Crea tu Academia</CardTitle>
        <CardDescription className="text-slate-600">
          Registra tus datos para iniciar tu prueba gratuita
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          
          <div className="space-y-2">
            <Label htmlFor="nombreAcademia">Nombre de la Academia</Label>
            <Input
              id="nombreAcademia"
              name="nombreAcademia"
              type="text"
              placeholder="Ej. Centro de Danza SIPRA"
              required
              className="h-11"
            />
            {state?.errors?.nombreAcademia && (
              <p className="text-sm text-red-600">{state.errors.nombreAcademia[0]}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nombreOwner">Tu Nombre</Label>
              <Input
                id="nombreOwner"
                name="nombreOwner"
                type="text"
                placeholder="Juan"
                required
                className="h-11"
              />
              {state?.errors?.nombreOwner && (
                <p className="text-sm text-red-600">{state.errors.nombreOwner[0]}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="apellidoOwner">Tu Apellido</Label>
              <Input
                id="apellidoOwner"
                name="apellidoOwner"
                type="text"
                placeholder="Pérez"
                className="h-11"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Correo Electrónico</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="tu@correo.com"
              required
              className="h-11"
            />
            {state?.errors?.email && (
              <p className="text-sm text-red-600">{state.errors.email[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña segura</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              className="h-11"
            />
            {state?.errors?.password && (
              <p className="text-sm text-red-600">{state.errors.password[0]}</p>
            )}
          </div>

          {state?.errors?.general && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
              {state.errors.general}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <SubmitButton />
          <div className="text-center text-sm text-slate-600">
            ¿Ya tienes una cuenta?{' '}
            <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
              Inicia sesión aquí
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}
