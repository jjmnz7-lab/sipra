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
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { normalizeWholeMoneyInput, preventMoneyWheel } from '@/lib/utils/money-input'
import { cn } from '@/lib/utils/index'
import {
  Loader2,
  Camera,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react'

const initialState: RegistroState = {}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const TOTAL_PASOS = 3

const MESES = [
  { num: 1, label: 'Ene' },
  { num: 2, label: 'Feb' },
  { num: 3, label: 'Mar' },
  { num: 4, label: 'Abr' },
  { num: 5, label: 'May' },
  { num: 6, label: 'Jun' },
  { num: 7, label: 'Jul' },
  { num: 8, label: 'Ago' },
  { num: 9, label: 'Sep' },
  { num: 10, label: 'Oct' },
  { num: 11, label: 'Nov' },
  { num: 12, label: 'Dic' },
]

export function OnboardingWizard() {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(registroAction, initialState)

  const [step, setStep] = useState(0) // 0 to 4
  const [dir, setDir] = useState<'fwd' | 'back'>('fwd')

  // Paso Cuenta (0)
  const [nombreOwner, setNombreOwner] = useState('')
  const [apellidoOwner, setApellidoOwner] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Paso 0: Identidad (1)
  const [nombreAcademia, setNombreAcademia] = useState('')
  const [telefono, setTelefono] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Paso 1: Primer Plan (2)
  const [planNombre, setPlanNombre] = useState('')
  const [planMonto, setPlanMonto] = useState('')
  const [cobraTodoElAno, setCobraTodoElAno] = useState(true)
  const [mesesCobro, setMesesCobro] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])

  // Paso 2: Recargos y Excepciones (3)
  const [criticoActivo, setCriticoActivo] = useState(false)
  const [criticoDia, setCriticoDia] = useState(10)
  const [regimenAlta, setRegimenAlta] = useState<'completo' | 'proporcional' | 'no_cobrar'>('completo')

  // Paso 3: Políticas (4)
  const [allowPartial, setAllowPartial] = useState(true)
  const [allowOverpayment, setAllowOverpayment] = useState(true)

  // Errores de validación local
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({})

  // Estado de finalización
  const [finalizing, setFinalizing] = useState(false)
  const navigatedRef = useRef(false)

  // Al confirmar el alta: subir logo opcional y navegar.
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
          // El logo es opcional
        }
      }
      router.push('/inicio')
    }
    void run()
  }, [state.success, state.academiaId, logoFile, router])

  const goNext = () => {
    const errs: Record<string, string> = {}
    if (step === 0) {
      if (nombreOwner.trim().length < 2) errs.nombreOwner = 'Ingresa tu nombre (mín. 2 caracteres).'
      if (!EMAIL_RE.test(email)) errs.email = 'Ingresa un email válido.'
      if (password.length < 6) errs.password = 'Mínimo 6 caracteres.'
    } else if (step === 1) {
      if (nombreAcademia.trim().length < 3) errs.nombreAcademia = 'Mínimo 3 caracteres.'
    } else if (step === 2) {
      if (!planMonto || Number(planMonto) < 0) errs.planMonto = 'Ingresa un monto válido.'
    } else if (step === 3) {
      if (criticoActivo && (criticoDia < 6 || criticoDia > 25)) {
        errs.criticoDia = 'El día debe estar entre 6 y 25.'
      }
    }

    setLocalErrors(errs)
    if (Object.keys(errs).length > 0) return
    setDir('fwd')
    setStep((s) => Math.min(4, s + 1))
  }

  const goBack = () => {
    setLocalErrors({})
    setDir('back')
    setStep((s) => Math.max(0, s - 1))
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

  const toggleMonth = (m: number) => {
    setMesesCobro((prev) =>
      prev.includes(m) ? prev.filter((val) => val !== m) : [...prev, m].sort((a, b) => a - b)
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validar paso final
    const errs: Record<string, string> = {}
    setLocalErrors(errs)

    const fd = new FormData()
    fd.set('nombreOwner', nombreOwner)
    fd.set('apellidoOwner', apellidoOwner)
    fd.set('email', email)
    fd.set('password', password)
    fd.set('nombreAcademia', nombreAcademia)
    fd.set('telefono', telefono)
    fd.set('planNombre', planNombre || 'Mensualidad Regular')
    fd.set('planMonto', planMonto || '300')

    // Si cobra todo el año, la lista de meses sin cobro está vacía.
    // De lo contrario, los meses sin cobro son los que NO están en mesesCobro.
    const mesesExentos = cobraTodoElAno
      ? []
      : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter((m) => !mesesCobro.includes(m))
    fd.set('mesesSinCobro', JSON.stringify(mesesExentos))

    fd.set('criticoActivo', String(criticoActivo))
    fd.set('criticoDia', String(criticoDia))
    fd.set('regimenAlta', regimenAlta)
    fd.set('allowPartial', String(allowPartial))
    fd.set('allowOverpayment', String(allowOverpayment))

    startTransition(() => formAction(fd))
  }

  const panelAnim =
    dir === 'fwd'
      ? 'animate-in fade-in slide-in-from-right-6 duration-300'
      : 'animate-in fade-in slide-in-from-left-6 duration-300'

  const busy = isPending || finalizing

  // Validaciones del botón continuar para habilitación rápida/deshabilitación táctil
  const isContinueDisabled = () => {
    if (step === 0) {
      return nombreOwner.trim().length < 2 || !EMAIL_RE.test(email) || password.length < 6
    }
    if (step === 1) {
      return nombreAcademia.trim().length < 3
    }
    if (step === 2) {
      return planMonto === '' || Number(planMonto) < 0
    }
    if (step === 3) {
      if (criticoActivo) {
        return criticoDia < 6 || criticoDia > 25
      }
    }
    return false
  }

  return (
    <Card className="w-full overflow-hidden max-w-md md:max-w-lg mx-auto shadow-lg border border-border">
      {/* Barra de progreso superior en pasos 1, 2, 3, 4 */}
      {step > 0 && (
        <div className="w-full bg-slate-100 h-1.5 overflow-hidden">
          <div
            className="bg-[#22887c] h-full transition-all duration-500 ease-out"
            style={{ width: `${((step - 1) / 3) * 100}%` }}
          />
        </div>
      )}

      <CardHeader className="space-y-2 pt-6">
        {step > 0 && (
          <div className="text-center">
            <span className="text-[10px] md:text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Paso {step - 1} de {TOTAL_PASOS}
            </span>
          </div>
        )}
        <div className="text-center">
          <CardTitle className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
            {step === 0 && 'Crea tu cuenta'}
            {step === 1 && 'Identidad de la Academia'}
            {step === 2 && 'Tu Primer Plan Mensual'}
            {step === 3 && 'Recargos y Excepciones'}
            {step === 4 && 'Políticas de Caja'}
          </CardTitle>
          <CardDescription className="text-slate-600 text-xs md:text-sm">
            {step === 0 && 'Ingresa tus datos de acceso como propietario.'}
            {step === 1 && 'Nombre y marca de tu nueva academia.'}
            {step === 2 && 'Define el plan base con el que vas a arrancar.'}
            {step === 3 && 'Configura las reglas financieras basadas en el tiempo.'}
            {step === 4 && 'Establece los candados de seguridad en los cobros.'}
          </CardDescription>
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 px-6 pb-6">
          <div key={step} className={panelAnim}>
            {/* ---------------------------------------------------------------- */}
            {/* PASO PRELIMINAR: Cuenta                                          */}
            {/* ---------------------------------------------------------------- */}
            {step === 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="nombreOwner">Tu nombre</Label>
                    <Input
                      id="nombreOwner"
                      value={nombreOwner}
                      onChange={(e) => setNombreOwner(e.target.value)}
                      placeholder="Juan"
                      className="h-11"
                      autoFocus
                    />
                    {localErrors.nombreOwner && <p className="text-xs text-red-600">{localErrors.nombreOwner}</p>}
                  </div>
                  <div className="space-y-1.5">
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

                <div className="space-y-1.5">
                  <Label htmlFor="email">Correo electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    className="h-11"
                  />
                  {localErrors.email && <p className="text-xs text-red-600">{localErrors.email}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password">Contraseña segura</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="h-11"
                  />
                  {localErrors.password && <p className="text-xs text-red-600">{localErrors.password}</p>}
                </div>
              </div>
            )}

            {/* ---------------------------------------------------------------- */}
            {/* PASO 0: Identidad de la Academia                                 */}
            {/* ---------------------------------------------------------------- */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="relative w-24 h-24 rounded-full border-2 border-dashed border-slate-300 hover:border-[#22887c]/60 transition-all flex items-center justify-center overflow-hidden bg-slate-50 group shadow-inner"
                  >
                    {logoPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="h-8 w-8 text-slate-400 group-hover:text-[#22887c]/80 transition-colors" />
                    )}
                  </button>
                  <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                    {logoPreview ? 'Toca para cambiar logo' : 'Subir Logotipo'}
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoChange}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="nombreAcademia">Nombre de la academia</Label>
                  <Input
                    id="nombreAcademia"
                    value={nombreAcademia}
                    onChange={(e) => setNombreAcademia(e.target.value)}
                    placeholder="Ej. Centro de Danza SIPRA"
                    className="h-11"
                    autoFocus
                  />
                  {localErrors.nombreAcademia && <p className="text-xs text-red-600">{localErrors.nombreAcademia}</p>}
                </div>

                <div className="space-y-1.5">
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
            {/* PASO 1: Primer Plan Mensual                                     */}
            {/* ---------------------------------------------------------------- */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="planNombre">Nombre del Plan</Label>
                  <Input
                    id="planNombre"
                    value={planNombre}
                    onChange={(e) => setPlanNombre(e.target.value)}
                    placeholder="Mensualidad Regular"
                    className="h-11"
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="planMonto">Monto Mensual</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 font-bold">$</span>
                    <Input
                      id="planMonto"
                      type="number"
                      step="1"
                      min="0"
                      inputMode="numeric"
                      value={planMonto}
                      onChange={(e) => setPlanMonto(normalizeWholeMoneyInput(e.target.value))}
                      onWheel={preventMoneyWheel}
                      placeholder="300"
                      className="h-11 pl-7 bg-white"
                    />
                  </div>
                  {localErrors.planMonto && <p className="text-xs text-red-600">{localErrors.planMonto}</p>}
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <Label className="text-sm font-semibold">Meses de Cobro</Label>
                  <p className="text-xs text-muted-foreground leading-normal">
                    ¿Esta mensualidad se cobra todos los meses del año?
                  </p>
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setCobraTodoElAno(true)}
                      className={cn(
                        "flex-1 py-2.5 px-4 text-xs font-bold rounded-xl border-2 transition-all text-center cursor-pointer",
                        cobraTodoElAno
                          ? "border-[#22887c] bg-[#22887c]/5 text-[#22887c]"
                          : "border-slate-200 text-slate-600 hover:border-slate-300"
                      )}
                    >
                      Sí, los 12 meses
                    </button>
                    <button
                      type="button"
                      onClick={() => setCobraTodoElAno(false)}
                      className={cn(
                        "flex-1 py-2.5 px-4 text-xs font-bold rounded-xl border-2 transition-all text-center cursor-pointer",
                        !cobraTodoElAno
                          ? "border-[#22887c] bg-[#22887c]/5 text-[#22887c]"
                          : "border-slate-200 text-slate-600 hover:border-slate-300"
                      )}
                    >
                      No, exentar meses
                    </button>
                  </div>

                  {!cobraTodoElAno && (
                    <div className="grid grid-cols-4 gap-1.5 mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 animate-in fade-in slide-in-from-top-2 duration-300">
                      {MESES.map((m) => {
                        const isCharged = mesesCobro.includes(m.num)
                        return (
                          <button
                            key={m.num}
                            type="button"
                            onClick={() => toggleMonth(m.num)}
                            className={cn(
                              "py-2 text-[11px] font-bold rounded-lg border transition-all duration-200 text-center cursor-pointer",
                              isCharged
                                ? "bg-white border-[#22887c] text-[#22887c] shadow-sm"
                                : "bg-slate-100 border-transparent text-slate-400 line-through opacity-70"
                            )}
                          >
                            {m.label}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ---------------------------------------------------------------- */}
            {/* PASO 2: Recargos y Excepciones                                   */}
            {/* ---------------------------------------------------------------- */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <Label htmlFor="switch-critico" className="text-sm font-semibold text-foreground cursor-pointer">
                        Estatus Crítico Automático
                      </Label>
                      <p className="text-xs text-muted-foreground leading-normal">
                        Marca automáticamente a los alumnos como &ldquo;Crítico&rdquo; si tienen adeudos.
                      </p>
                    </div>
                    <Switch
                      id="switch-critico"
                      checked={criticoActivo}
                      onCheckedChange={setCriticoActivo}
                      className="mt-0.5"
                    />
                  </div>

                  {criticoActivo && (
                    <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-slate-100 animate-in fade-in slide-in-from-top-2 duration-300">
                      <span className="text-xs text-slate-700 font-medium">Se activará si supera el día:</span>
                      <Input
                        type="number"
                        min={6}
                        max={25}
                        value={criticoDia}
                        onChange={(e) => setCriticoDia(Number(e.target.value) || 10)}
                        className="w-16 h-9 text-center font-bold text-[#22887c] border-[#cbd5e1] focus-visible:border-[#22887c]"
                      />
                      <span className="text-xs text-slate-700 font-medium">sin registrar pago.</span>
                      {localErrors.criticoDia && <p className="text-xs text-red-600 block mt-1">{localErrors.criticoDia}</p>}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Ingreso a mitad de mes</Label>
                  <p className="text-xs text-muted-foreground leading-normal">
                    ¿Qué pasa si un alumno se inscribe con el mes ya iniciado?
                  </p>
                  <div className="space-y-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setRegimenAlta('completo')}
                      className={cn(
                        "w-full text-left rounded-xl border-2 p-4 transition-all duration-200 flex flex-col gap-1 cursor-pointer",
                        regimenAlta === 'completo'
                          ? "border-[#22887c] bg-[#22887c]/5 ring-2 ring-[#22887c]/10"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      )}
                    >
                      <span className="font-bold text-sm text-foreground">Cobrar mensualidad completa</span>
                      <span className="text-xs text-muted-foreground">Se genera el cobro del 100% sin importar el día de ingreso.</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRegimenAlta('proporcional')}
                      className={cn(
                        "w-full text-left rounded-xl border-2 p-4 transition-all duration-200 flex flex-col gap-1 cursor-pointer",
                        regimenAlta === 'proporcional'
                          ? "border-[#22887c] bg-[#22887c]/5 ring-2 ring-[#22887c]/10"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      )}
                    >
                      <span className="font-bold text-sm text-foreground">Calcular proporcional según los días restantes</span>
                      <span className="text-xs text-muted-foreground">El sistema prorratea el monto según la fecha exacta de ingreso.</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRegimenAlta('no_cobrar')}
                      className={cn(
                        "w-full text-left rounded-xl border-2 p-4 transition-all duration-200 flex flex-col gap-1 cursor-pointer",
                        regimenAlta === 'no_cobrar'
                          ? "border-[#22887c] bg-[#22887c]/5 ring-2 ring-[#22887c]/10"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      )}
                    >
                      <span className="font-bold text-sm text-foreground">No cobrar este mes, iniciar el día 1 del siguiente</span>
                      <span className="text-xs text-muted-foreground">El período en curso queda gratis y se factura a partir del próximo mes.</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ---------------------------------------------------------------- */}
            {/* PASO 3: Políticas de Caja                                        */}
            {/* ---------------------------------------------------------------- */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl border-2 border-slate-100 bg-white space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="switch-partial" className="text-sm font-bold text-slate-800 cursor-pointer">
                        Permitir pagos parciales (abonos)
                      </Label>
                      <p className="text-xs text-muted-foreground leading-normal">
                        Permite abonos parciales a los cargos o al saldo total.
                      </p>
                    </div>
                    <Switch
                      id="switch-partial"
                      checked={allowPartial}
                      onCheckedChange={setAllowPartial}
                      className="mt-0.5"
                    />
                  </div>

                  <div className="border-t border-slate-100 my-2" />

                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="switch-overpayment" className="text-sm font-bold text-slate-800 cursor-pointer">
                        Permitir pagos mayores al saldo pendiente (saldo a favor)
                      </Label>
                      <p className="text-xs text-muted-foreground leading-normal">
                        Permite registrar montos por encima del adeudo o anticipos para futuras mensualidades.
                      </p>
                    </div>
                    <Switch
                      id="switch-overpayment"
                      checked={allowOverpayment}
                      onCheckedChange={setAllowOverpayment}
                      className="mt-0.5"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {state?.errors?.general && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-md border border-red-200">
              {state.errors.general}
            </div>
          )}
        </CardContent>

        {/* Footer de navegación */}
        <div className="flex flex-col gap-3 px-6 pb-6 pt-2 border-t border-slate-50 bg-slate-50/50">
          <div className="flex gap-2">
            {step > 0 && (
              <Button type="button" variant="outline" className="h-11 flex-1 font-semibold" onClick={goBack} disabled={busy}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Atrás
              </Button>
            )}

            {step < 4 ? (
              <Button
                type="button"
                className="h-11 flex-1 bg-[#15435a] hover:bg-[#15435a]/90 font-semibold"
                onClick={goNext}
                disabled={isContinueDisabled()}
              >
                Continuar <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                className="h-11 flex-1 bg-[#22887c] hover:bg-[#1a6b62] font-semibold"
                disabled={busy}
              >
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                {busy ? 'Creando academia...' : 'Finalizar y Crear'}
              </Button>
            )}
          </div>

          {step === 0 && (
            <div className="text-center text-xs text-slate-600 pt-1">
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
