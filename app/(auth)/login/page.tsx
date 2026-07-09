'use client'

import { useActionState } from 'react'
import { loginAction, type LoginState } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from '@/components/ui/card'
import Link from 'next/link'
import Image from 'next/image'
import { Loader2 } from 'lucide-react'
import { useFormStatus } from 'react-dom'
import logoSipra from '@/public/logos/imagotipo-sipra.png'

const initialState: LoginState = {}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full h-11 bg-[#15435a] hover:bg-[#15435a]/90" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {pending ? 'Entrando...' : 'Ingresar'}
    </Button>
  )
}

export default function LoginPage() {
  const [state, formAction] = useActionState(loginAction, initialState)

  return (
    <>
      <div className="flex justify-center">
        <Image
          src={logoSipra}
          alt="SIPRA"
          className="h-20 w-auto"
          priority
        />
      </div>
      <Card className="w-full border-[#22887c]">
        <CardHeader className="space-y-1 text-center">
          <CardDescription className="text-slate-700">
            Ingresa tus credenciales para acceder
          </CardDescription>
        </CardHeader>
        <form action={formAction}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700 font-semibold">Correo Electrónico</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                className="sipra-auth-input h-11 border-slate-300 text-center text-lg font-bold text-[#22887c] placeholder:text-[#22887c]/35 focus-visible:border-[#22887c] focus-visible:ring-3 focus-visible:ring-[#22887c]/50"
              />
              {state?.errors?.email && (
                <p className="text-sm text-red-600">{state.errors.email[0]}</p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-slate-700 font-semibold">Contraseña</Label>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                required
                className="sipra-auth-input h-11 border-slate-300 text-center text-lg font-bold text-[#22887c] focus-visible:border-[#22887c] focus-visible:ring-3 focus-visible:ring-[#22887c]/50"
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
          <CardFooter className="flex flex-col gap-4 border-t-0 bg-transparent">
            <SubmitButton />
          </CardFooter>
        </form>
      </Card>
    </>
  )
}
