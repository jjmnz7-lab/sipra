'use client'

import * as React from 'react'
import { startTransition, useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { registroAction, type RegistroState } from '@/app/(auth)/registro/actions'
import { guardarLogoAction } from '@/app/(app)/configuracion/actions'
import { createClient } from '@/lib/supabase/client'
import { resizeImage } from '@/lib/utils/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Loader2,
  Camera,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Volleyball,
  Sparkles,
  Receipt,
  Check,
} from 'lucide-react'

const initialState: RegistroState = {}

type Modelo = 'simple' | 'avanzado' | 'manual' | ''

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const TOTAL_PASOS = 3

export function OnboardingWizard() {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(registroAction, initialState)

  const [step, setStep] = useState(1)
  const [dir, setDir] = useState<'fwd' | 'back'>('fwd')

  // Paso 1 — cuenta
  const [nombreOwner, setNombreOwner] = useState('')
  const [apellidoOwner, setApellidoOwner] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Paso 2 — academia
  const [nombreAcademia, setNombreAcademia] = useState('')
  const [telefono, setTelefono] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Paso 3 — modelo
  const [modelo, setModelo] = useState<Modelo>('')
  const [montoMensualidad, setMontoMensualidad] = useState('')

  // Errores de validación cliente por paso
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({})

  // Estado de finalización
  const [finalizing, setFinalizing] = useState(false)
  const navigatedRef = useRef(false)

  // Al confirmar el alta: subir logo opcional (cliente) y navegar.
  useEffect(() => {
    if (!state.success || navigatedRef.current) return
    navigatedRef.current = true
    setFinalizing(true)

    const run = async () => {
      const academiaId = state.academiaId
      if (logoFile && academiaId) {
        try {
          const resized = await resizeImage(logoFile, 128)
          const supabase = createClient()
          const path = `${academiaId}/logo.webp`
          const { error } = await supabase.storage
            .from('logos')
            .upload(path, resized, { contentType: 'image/webp', upsert: true })
          if (!error) {
            const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path)
            await guardarLogoAction(`${urlData.publicUrl}?v=${Date.now()}`)
          }
        } catch {
          // El logo es opcional; si falla, se podrá configurar luego.
        }
      }
      // Avanzado → Configuración para crear planes. Simple y Manual → operación directa.
      router.push(state.modelo === 'avanzado' ? '/configuracion?onboarding=planes' : '/inicio')
    }
    void run()
  }, [state.success, state.academiaId, state.modelo, logoFile, router])

  const goNext = () => {
    const errs: Record<string, string> = {}
    if (step === 1) {
      if (nombreOwner.trim().length < 2) errs.nombreOwner = 'Ingresa tu nombre (mín. 2 caracteres).'
      if (!EMAIL_RE.test(email)) errs.email = 'Ingresa un email válido.'
      if (password.length < 6) errs.password = 'Mínimo 6 caracteres.'
    } else if (step === 2) {
      if (nombreAcademia.trim().length < 3) errs.nombreAcademia = 'Mínimo 3 caracteres.'
    }
    setLocalErrors(errs)
    if (Object.keys(errs).length > 0) return
    setDir('fwd')
    setStep((s) => Math.min(TOTAL_PASOS, s + 1))
  }

  const goBack = () => {
    setLocalErrors({})
    setDir('back')
    setStep((s) => Math.max(1, s - 1))
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Validación del paso 3
    const errs: Record<string, string> = {}
    if (modelo !== 'simple' && modelo !== 'avanzado' && modelo !== 'manual') {
      errs.modelo = 'Elige un modelo de cobro.'
    } else if (modelo === 'simple' && (!montoMensualidad || Number(montoMensualidad) <= 0)) {
      errs.montoMensualidad = 'Define la mensualidad general (mayor a 0).'
    }
    setLocalErrors(errs)
    if (Object.keys(errs).length > 0) return

    const fd = new FormData()
    fd.set('nombreOwner', nombreOwner)
    fd.set('apellidoOwner', apellidoOwner)
    fd.set('email', email)
    fd.set('password', password)
    fd.set('nombreAcademia', nombreAcademia)
    fd.set('telefono', telefono)
    fd.set('modelo', modelo)
    if (modelo === 'simple') fd.set('montoMensualidad', montoMensualidad)
    // React 19: el action devuelto por useActionState debe invocarse dentro de una transición.
    startTransition(() => formAction(fd))
  }

  const panelAnim =
    dir === 'fwd'
      ? 'animate-in fade-in slide-in-from-right-6 duration-300'
      : 'animate-in fade-in slide-in-from-left-6 duration-300'

  const busy = isPending || finalizing

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="space-y-3">
        <StepIndicator step={step} />
        <div className="text-center">
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
            {step === 1 && 'Crea tu cuenta'}
            {step === 2 && 'Tu academia'}
            {step === 3 && '¿Cómo cobras?'}
          </CardTitle>
          <CardDescription className="text-slate-600">
            {step === 1 && 'Datos de acceso del titular'}
            {step === 2 && 'Información básica de tu academia'}
            {step === 3 && 'Elige el modelo que mejor describe tu operación'}
          </CardDescription>
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div key={step} className={panelAnim}>
            {/* ---------------------------------------------------------------- */}
            {/* PASO 1 — Cuenta                                                  */}
            {/* ---------------------------------------------------------------- */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombreOwner">Tu nombre</Label>
                    <Input
                      id="nombreOwner"
                      value={nombreOwner}
                      onChange={(e) => setNombreOwner(e.target.value)}
                      placeholder="Juan"
                      className="h-11"
                      autoFocus
                    />
                    {localErrors.nombreOwner && <p className="text-sm text-red-600">{localErrors.nombreOwner}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="apellidoOwner">Tu apellido</Label>
                    <Input
                      id="apellidoOwner"
                      value={apellidoOwner}
                      onChange={(e) => setApellidoOwner(e.target.value)}
                      placeholder="Pérez"
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Correo electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    className="h-11"
                  />
                  {localErrors.email && <p className="text-sm text-red-600">{localErrors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña segura</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="h-11"
                  />
                  {localErrors.password && <p className="text-sm text-red-600">{localErrors.password}</p>}
                </div>
              </div>
            )}

            {/* ---------------------------------------------------------------- */}
            {/* PASO 2 — Academia                                                */}
            {/* ---------------------------------------------------------------- */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="relative w-20 h-20 rounded-full border-2 border-dashed border-slate-300 hover:border-[#15435a]/60 transition-colors flex items-center justify-center overflow-hidden bg-slate-50 group"
                  >
                    {logoPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="h-7 w-7 text-slate-400 group-hover:text-[#15435a]/80 transition-colors" />
                    )}
                  </button>
                  <p className="text-xs text-slate-500">{logoPreview ? 'Toca para cambiar' : 'Agregar logo (opcional)'}</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nombreAcademia">Nombre de la academia</Label>
                  <Input
                    id="nombreAcademia"
                    value={nombreAcademia}
                    onChange={(e) => setNombreAcademia(e.target.value)}
                    placeholder="Ej. Centro de Danza SIPRA"
                    className="h-11"
                    autoFocus
                  />
                  {localErrors.nombreAcademia && <p className="text-sm text-red-600">{localErrors.nombreAcademia}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono de contacto (opcional)</Label>
                  <Input
                    id="telefono"
                    type="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="10 dígitos"
                    className="h-11"
                  />
                </div>
              </div>
            )}

            {/* ---------------------------------------------------------------- */}
            {/* PASO 3 — Modelo de negocio                                       */}
            {/* ---------------------------------------------------------------- */}
            {step === 3 && (
              <div className="space-y-3">
                <ModeloCard
                  selected={modelo === 'simple'}
                  onSelect={() => setModelo('simple')}
                  icon={<Volleyball className="h-6 w-6" />}
                  accent="emerald"
                  titulo="Tarifa fija"
                  descripcion="Cobro una mensualidad igual para casi todos mis alumnos."
                />

                {modelo === 'simple' && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-200 space-y-2 rounded-lg border border-[#22887c]/20 bg-[#22887c]/5 p-3">
                    <Label htmlFor="montoMensualidad" className="text-sm font-semibold text-slate-800">
                      Mensualidad general
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">$</span>
                      <Input
                        id="montoMensualidad"
                        type="number"
                        step="0.01"
                        min="0"
                        inputMode="decimal"
                        value={montoMensualidad}
                        onChange={(e) => setMontoMensualidad(e.target.value)}
                        placeholder="0.00"
                        className="h-11 pl-7 bg-white"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Crearemos un plan &ldquo;Mensualidad General&rdquo; con este monto.
                    </p>
                    {localErrors.montoMensualidad && (
                      <p className="text-sm text-red-600">{localErrors.montoMensualidad}</p>
                    )}
                  </div>
                )}

                <ModeloCard
                  selected={modelo === 'avanzado'}
                  onSelect={() => setModelo('avanzado')}
                  icon={<Sparkles className="h-6 w-6" />}
                  accent="indigo"
                  titulo="Múltiples tarifas"
                  descripcion="Manejo varios precios, clases por visita, horarios o actividades temporales."
                />

                {modelo === 'avanzado' && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-200 rounded-lg border border-[#15435a]/20 bg-[#15435a]/5 p-3">
                    <p className="text-xs text-slate-600">
                      Activaremos el modo avanzado y los abonos parciales. Al terminar te llevaremos a
                      <span className="font-semibold"> Configuración </span>
                      para crear tu primer plan de cobro.
                    </p>
                  </div>
                )}

                <ModeloCard
                  selected={modelo === 'manual'}
                  onSelect={() => setModelo('manual')}
                  icon={<Receipt className="h-6 w-6" />}
                  accent="amber"
                  titulo="Solo cargos manuales"
                  descripcion="Cobro por evento o visita. Sin mensualidades automáticas; yo registro cada cargo."
                />

                {modelo === 'manual' && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-200 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                    <p className="text-xs text-slate-600">
                      Desactivaremos la generación automática de mensualidades. Operarás 100%
                      transaccional: registra cargos y visitas cuando ocurran.
                    </p>
                  </div>
                )}

                {localErrors.modelo && <p className="text-sm text-red-600">{localErrors.modelo}</p>}
              </div>
            )}
          </div>

          {state?.errors?.general && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
              {state.errors.general}
            </div>
          )}
        </CardContent>

        {/* Footer de navegación */}
        <div className="flex flex-col gap-4 px-6 pb-6">
          <div className="flex gap-3">
            {step > 1 && (
              <Button type="button" variant="outline" className="h-11 flex-1" onClick={goBack} disabled={busy}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Atrás
              </Button>
            )}

            {step < TOTAL_PASOS ? (
              <Button type="button" className="h-11 flex-1" onClick={goNext}>
                Continuar <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" className="h-11 flex-1 bg-[#22887c] hover:bg-[#1a6b62]" disabled={busy}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                {busy ? 'Creando academia...' : 'Crear academia'}
              </Button>
            )}
          </div>

          {step === 1 && (
            <div className="text-center text-sm text-slate-600">
              ¿Ya tienes una cuenta?{' '}
              <Link href="/login" className="font-semibold text-[#15435a] hover:text-[#15435a]/80">
                Inicia sesión aquí
              </Link>
            </div>
          )}
        </div>
      </form>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Sub-componentes                                                            */
/* -------------------------------------------------------------------------- */

function StepIndicator({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-2" aria-label={`Paso ${step} de ${TOTAL_PASOS}`}>
      {Array.from({ length: TOTAL_PASOS }, (_, i) => i + 1).map((n) => {
        const done = n < step
        const active = n === step
        return (
          <div key={n} className="flex items-center gap-2">
            <div
              className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                active
                  ? 'bg-[#15435a] text-white'
                  : done
                  ? 'bg-[#22887c] text-white'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {done ? <Check className="h-4 w-4" /> : n}
            </div>
            {n < TOTAL_PASOS && (
              <div className={`h-0.5 w-6 rounded-full transition-colors ${n < step ? 'bg-[#22887c]' : 'bg-slate-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function ModeloCard({
  selected,
  onSelect,
  icon,
  accent,
  titulo,
  descripcion,
}: {
  selected: boolean
  onSelect: () => void
  icon: React.ReactNode
  accent: 'emerald' | 'indigo' | 'amber'
  titulo: string
  descripcion: string
}) {
  const accentRing =
    accent === 'emerald' ? 'border-[#22887c] ring-[#22887c]/30'
    : accent === 'amber' ? 'border-amber-500 ring-amber-500/30'
    : 'border-[#15435a] ring-[#15435a]/30'
  const accentIcon =
    accent === 'emerald' ? 'bg-[#22887c]/10 text-[#22887c]'
    : accent === 'amber' ? 'bg-amber-100 text-amber-600'
    : 'bg-[#15435a]/10 text-[#15435a]'

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`w-full text-left rounded-xl border-2 p-4 transition-all flex items-start gap-3 ${
        selected ? `${accentRing} ring-2 bg-white` : 'border-slate-200 hover:border-slate-300 bg-white'
      }`}
    >
      <div className={`h-12 w-12 rounded-lg flex items-center justify-center flex-shrink-0 ${accentIcon}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold text-slate-900">{titulo}</h3>
          {selected && (
            <CheckCircle2
              className={
                accent === 'emerald' ? 'h-5 w-5 text-[#22887c]'
                : accent === 'amber' ? 'h-5 w-5 text-amber-600'
                : 'h-5 w-5 text-[#15435a]'
              }
            />
          )}
        </div>
        <p className="text-sm text-slate-600 mt-0.5 leading-snug">{descripcion}</p>
      </div>
    </button>
  )
}
