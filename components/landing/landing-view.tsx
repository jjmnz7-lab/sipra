'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  MessageSquare,
  Send,
  Smile,
  Briefcase,
  AlertTriangle,
  FileText,
  Clock,
  Sparkles,
  Users,
  Zap,
  Award,
  DollarSign,
  Check,
  LogIn,
  Download,
  BarChart3,
  CheckCircle2
} from 'lucide-react'

// Número centralizado de WhatsApp (con fallback configurable)
export const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '5216691005972'
export const WHATSAPP_MSG = encodeURIComponent('Hola, me interesa SIPRA para mi academia')
export const WA_LINK = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MSG}`

type TonoDemo = 'amigable' | 'formal' | 'urgente'

const MESSAGES_DEMO: Record<TonoDemo, string> = {
  amigable:
    'Hola, te escribimos de Academia Aurora 👋 para recordarte que tenemos un saldo pendiente de $450 de *ANA TORRES*. ¡Cualquier duda quedamos a tus órdenes, gracias!',
  formal:
    'Buen día. Por medio del presente le informamos de parte de Academia Aurora que se registra un saldo pendiente de $450 para el alumno *ANA TORRES*. Le invitamos a regularizar su situación a la brevedad posible. Quedamos a su disposición para cualquier duda.',
  urgente:
    'Aviso importante de Academia Aurora. Se registra un adeudo vencido de $450 en la cuenta de *ANA TORRES*. Es necesario regularizar el pago a la brevedad para evitar afectaciones. Por favor contáctanos lo antes posible.',
}

export function LandingView() {
  const [tone, setTone] = useState<TonoDemo>('amigable')
  const [flashKey, setFlashKey] = useState<number>(0)

  const handleToneChange = (newTone: TonoDemo) => {
    setTone(newTone)
    setFlashKey((prev) => prev + 1)
  }

  return (
    <div className="min-h-screen bg-[#F6F7F9] text-[#16232E] font-sans selection:bg-[#22887c]/20 selection:text-[#15435a]">
      {/* ============ NAV ============ */}
      <header className="sticky top-0 z-50 bg-[#F6F7F9]/90 backdrop-blur-md border-b border-[#E3E7EC]">
        <div className="max-w-[1120px] mx-auto px-5 py-3.5 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5 text-[#16232E] no-underline">
            <Image
              src="/logos/isotipo-sipra.png"
              alt="SIPRA"
              width={30}
              height={30}
              className="h-[30px] w-auto object-contain"
              priority
            />
            <strong className="font-extrabold text-xl tracking-tight text-[#15435a]">
              SIPRA
            </strong>
          </Link>

          <nav className="hidden md:flex items-center gap-6 font-semibold text-sm text-[#5B6B7A]">
            <a href="#caracteristicas" className="hover:text-[#22887c] transition-colors">
              Características
            </a>
            <a href="#como-funciona" className="hover:text-[#22887c] transition-colors">
              Cómo funciona
            </a>
            <a href="#preguntas" className="hover:text-[#22887c] transition-colors">
              Preguntas
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 font-semibold text-xs md:text-sm px-3.5 py-2 rounded-lg text-[#15435a] hover:bg-[#15435a]/5 transition-colors border border-transparent"
            >
              <LogIn className="w-4 h-4 text-[#22887c]" />
              <span>Iniciar sesión</span>
            </Link>

            <a
              href={WA_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 font-bold text-xs md:text-sm px-4 py-2 rounded-lg bg-[#22887c] text-white hover:bg-[#1a6b61] transition-all shadow-sm active:scale-95"
            >
              Escríbenos
            </a>
          </div>
        </div>
      </header>

      <main>
        {/* ============ HERO ============ */}
        <section className="pt-9 pb-14 md:py-20">
          <div className="max-w-[1120px] mx-auto px-5 grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] items-center gap-9 lg:gap-13">
            <div>
              <span className="inline-flex items-center gap-1.5 bg-[#E7F2F0] text-[#1a6b61] px-3.5 py-1.5 rounded-full text-xs font-semibold mb-4">
                Para academias y clubes deportivos
              </span>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#15435a] leading-[1.15] tracking-tight">
                Deja el Excel{' '}
                <span className="text-[#22887c]">(y el cuaderno)</span>. Cobra sin perseguir a nadie.
              </h1>
              <p className="mt-4 text-base md:text-lg text-[#5B6B7A] max-w-[48ch] leading-relaxed">
                SIPRA organiza a tus alumnos y grupos, genera las mensualidades solas cada mes, y te arma el recordatorio de WhatsApp — tú eliges el tono y tú das clic en enviar.
              </p>
              <div className="mt-7 flex flex-col items-start gap-2.5">
                <a
                  href={WA_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2.5 font-bold text-base px-6 py-3.5 rounded-lg bg-[#22887c] text-white hover:bg-[#1a6b61] transition-all shadow-md hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Send className="w-5 h-5" />
                  Escríbenos por WhatsApp
                </a>
                <p className="text-xs text-[#5B6B7A]">
                  <strong className="text-[#16232E]">Nosotros activamos tu academia</strong> — con período de prueba incluido.
                </p>
              </div>
            </div>

            {/* DEMO CARD */}
            <div className="bg-white border border-[#E3E7EC] rounded-2xl p-5 md:p-6 shadow-xl shadow-[#15435a]/10 max-w-[420px] mx-auto w-full">
              <div className="w-10 h-1 bg-[#E3E7EC] rounded-full mx-auto mb-4" />
              <div className="flex items-center gap-2.5 mb-1">
                <MessageSquare className="w-5 h-5 text-[#22887c]" />
                <h3 className="font-extrabold text-lg text-[#16232E]">Enviar Recordatorio</h3>
              </div>
              <p className="text-xs font-bold tracking-wider text-[#5B6B7A] uppercase ml-7 mb-4">
                ANA TORRES
              </p>

              <div className="flex justify-between items-baseline text-xs font-bold text-[#16232E] mb-2.5">
                <b>Tono del mensaje</b>
                <span className="font-normal text-[#5B6B7A]">
                  Sugerido: {tone.charAt(0).toUpperCase() + tone.slice(1)}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4" role="tablist" aria-label="Elige el tono del recordatorio">
                <button
                  type="button"
                  onClick={() => handleToneChange('amigable')}
                  className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border-2 transition-all min-h-[78px] ${
                    tone === 'amigable'
                      ? 'border-[#22887c] bg-[#E7F2F0]/30'
                      : 'border-[#E3E7EC] hover:border-[#22887c]/40'
                  }`}
                  role="tab"
                  aria-selected={tone === 'amigable'}
                >
                  <div className="w-7 h-7 rounded-full border-2 border-[#22887c] flex items-center justify-center text-[#22887c]">
                    <Smile className="w-4 h-4" />
                  </div>
                  <span className={`text-xs font-semibold ${tone === 'amigable' ? 'text-[#22887c] font-bold' : 'text-[#5B6B7A]'}`}>
                    Amigable
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToneChange('formal')}
                  className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border-2 transition-all min-h-[78px] ${
                    tone === 'formal'
                      ? 'border-[#22887c] bg-[#E7F2F0]/30'
                      : 'border-[#E3E7EC] hover:border-[#15435a]/40'
                  }`}
                  role="tab"
                  aria-selected={tone === 'formal'}
                >
                  <div className="w-7 h-7 rounded-full border-2 border-[#15435a] flex items-center justify-center text-[#15435a]">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <span className={`text-xs font-semibold ${tone === 'formal' ? 'text-[#22887c] font-bold' : 'text-[#5B6B7A]'}`}>
                    Formal
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToneChange('urgente')}
                  className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border-2 transition-all min-h-[78px] ${
                    tone === 'urgente'
                      ? 'border-[#22887c] bg-[#E7F2F0]/30'
                      : 'border-[#E3E7EC] hover:border-[#C9812E]/40'
                  }`}
                  role="tab"
                  aria-selected={tone === 'urgente'}
                >
                  <div className="w-7 h-7 rounded-full border-2 border-[#C9812E] flex items-center justify-center text-[#C9812E]">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <span className={`text-xs font-semibold ${tone === 'urgente' ? 'text-[#22887c] font-bold' : 'text-[#5B6B7A]'}`}>
                    Urgente
                  </span>
                </button>
              </div>

              <p className="text-xs font-bold text-[#16232E] mb-1.5">Mensaje</p>
              <div className="bg-[#F6F7F9] border border-[#E3E7EC] rounded-lg p-3 text-sm text-[#16232E] min-h-[92px]">
                <p key={flashKey} className="animate-in fade-in duration-200">
                  {MESSAGES_DEMO[tone]}
                </p>
              </div>

              <button
                type="button"
                disabled
                className="w-full mt-3.5 py-3 rounded-lg bg-[#22887c] text-white font-bold text-sm opacity-60 cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Enviar por WhatsApp
              </button>
              <p className="text-center text-[11px] text-[#5B6B7A] mt-2.5 italic">
                Así se ve dentro de la app — tú decides cuándo mandarlo.
              </p>
            </div>
          </div>
        </section>

        {/* ============ AUDIENCE ============ */}
        <section className="py-7 md:py-10">
          <div className="max-w-[1120px] mx-auto px-5">
            <p className="text-base md:text-lg max-w-[58ch] mb-5 text-[#16232E] font-medium">
              Si hoy llevas las cuentas en Excel, en un cuaderno, o en notas sueltas de WhatsApp, SIPRA es para ti.
            </p>
            <div className="flex flex-wrap gap-2.5">
              {[
                'Fútbol',
                'Danza y ballet',
                'Karate y artes marciales',
                'Natación',
                'Gimnasia',
                'Música',
                'Yoga y pilates',
                'Box y crossfit',
                'Talleres y regularización',
              ].map((tag) => (
                <span
                  key={tag}
                  className="text-xs font-semibold text-[#1a6b61] bg-[#E7F2F0] rounded-full px-3.5 py-1.5"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ============ HOW IT WORKS ============ */}
        <section className="py-14 md:py-24" id="como-funciona">
          <div className="max-w-[1120px] mx-auto px-5">
            <div className="max-w-[60ch] mb-9">
              <span className="font-mono text-xs tracking-wider uppercase text-[#1a6b61] mb-2 block font-semibold">
                Cómo funciona
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#15435a]">
                Tres pasos, ningún enredo.
              </h2>
            </div>

            {/* MINI DASHBOARD PREVIEW */}
            <div className="bg-white border border-[#E3E7EC] rounded-2xl p-3.5 mb-11">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2.5 p-3 rounded-lg bg-[#F6F7F9] border-l-4 border-l-[#D2A45C]">
                  <div className="min-w-0">
                    <strong className="block text-sm text-[#16232E]">Sofía Ramírez</strong>
                    <span className="hidden sm:inline-block mt-1 text-[11px] bg-white border border-[#E3E7EC] rounded-full px-2.5 py-0.5 text-[#5B6B7A]">
                      ⚽ Fútbol Sub-12
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="block font-mono text-[10px] font-semibold tracking-wider text-[#D2A45C]">
                      PENDIENTE
                    </span>
                    <span className="font-bold text-sm text-[#16232E]">$500</span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <span className="w-7 h-7 rounded-full bg-white border border-[#E3E7EC] flex items-center justify-center text-[#22887c]">
                      <MessageSquare className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2.5 p-3 rounded-lg bg-[#F6F7F9] border-l-4 border-l-[#B85C50]">
                  <div className="min-w-0">
                    <strong className="block text-sm text-[#16232E]">Diego Manríquez</strong>
                    <span className="hidden sm:inline-block mt-1 text-[11px] bg-white border border-[#E3E7EC] rounded-full px-2.5 py-0.5 text-[#5B6B7A]">
                      🩰 Ballet Infantil
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="block font-mono text-[10px] font-semibold tracking-wider text-[#B85C50]">
                      ATRASADO
                    </span>
                    <span className="font-bold text-sm text-[#16232E]">$650</span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <span className="w-7 h-7 rounded-full bg-white border border-[#E3E7EC] flex items-center justify-center text-[#22887c]">
                      <MessageSquare className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2.5 p-3 rounded-lg bg-[#F6F7F9] border-l-4 border-l-[#7A2F38]">
                  <div className="min-w-0">
                    <strong className="block text-sm text-[#16232E]">Luis Ochoa</strong>
                    <span className="hidden sm:inline-block mt-1 text-[11px] bg-white border border-[#E3E7EC] rounded-full px-2.5 py-0.5 text-[#5B6B7A]">
                      🥋 Karate Adultos
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="block font-mono text-[10px] font-semibold tracking-wider text-[#7A2F38]">
                      URGENTE
                    </span>
                    <span className="font-bold text-sm text-[#16232E]">$1,200</span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <span className="w-7 h-7 rounded-full bg-white border border-[#E3E7EC] flex items-center justify-center text-[#22887c]">
                      <MessageSquare className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#E3E7EC]">
              <div className="py-5 md:py-0 md:px-6 first:pl-0">
                <span className="font-mono text-xs text-[#1a6b61] font-semibold block mb-2">PASO 1</span>
                <h3 className="text-lg font-bold text-[#16232E] mb-2">Da de alta tu academia</h3>
                <p className="text-sm text-[#5B6B7A] leading-relaxed">
                  Agrega tus grupos u horarios, y a tus alumnos con su plan de pago.
                </p>
              </div>

              <div className="py-5 md:py-0 md:px-6">
                <span className="font-mono text-xs text-[#1a6b61] font-semibold block mb-2">PASO 2</span>
                <h3 className="text-lg font-bold text-[#16232E] mb-2">Deja que SIPRA cobre por calendario</h3>
                <p className="text-sm text-[#5B6B7A] leading-relaxed">
                  Cada mes se generan solas las mensualidades que tocan, cobrando solo la parte que corresponde si alguien entra a media quincena.
                </p>
              </div>

              <div className="py-5 md:py-0 md:px-6 last:pr-0">
                <span className="font-mono text-xs text-[#1a6b61] font-semibold block mb-2">PASO 3</span>
                <h3 className="text-lg font-bold text-[#16232E] mb-2">Recuerda y registra</h3>
                <p className="text-sm text-[#5B6B7A] leading-relaxed">
                  Cuando alguien se atrasa, eliges el tono, mandas el WhatsApp con un toque, y registras el pago en cuanto te llegue.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ============ STUDENT VIEW ============ */}
        <section className="py-14 md:py-24">
          <div className="max-w-[1120px] mx-auto px-5 grid grid-cols-1 lg:grid-cols-2 items-center gap-8 lg:gap-13">
            <div>
              <span className="font-mono text-xs tracking-wider uppercase text-[#1a6b61] mb-2 block font-semibold">
                Del otro lado
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#15435a]">
                Esto es lo que ve tu alumno.
              </h2>
              <p className="mt-4 text-base text-[#5B6B7A] max-w-[48ch] leading-relaxed">
                Cuando compartes el enlace de historial, tu alumno o el papá ve su cuenta clara — sin contraseña, sin tener que llamarte a preguntar cuánto debe.
              </p>
              <ul className="mt-5 space-y-2.5 list-none p-0">
                <li className="relative pl-5 text-sm md:text-base font-medium text-[#16232E] before:content-[''] before:absolute before:left-0 before:top-2.5 before:w-2 before:h-2 before:rounded-full before:bg-[#22887c]">
                  Sin contraseña ni cuenta que crear — es solo un enlace.
                </li>
                <li className="relative pl-5 text-sm md:text-base font-medium text-[#16232E] before:content-[''] before:absolute before:left-0 before:top-2.5 before:w-2 before:h-2 before:rounded-full before:bg-[#22887c]">
                  Se actualiza al instante en cuanto registras un pago.
                </li>
                <li className="relative pl-5 text-sm md:text-base font-medium text-[#16232E] before:content-[''] before:absolute before:left-0 before:top-2.5 before:w-2 before:h-2 before:rounded-full before:bg-[#22887c]">
                  Tú decides cuándo compartirlo, alumno por alumno.
                </li>
                <li className="relative pl-5 text-sm md:text-base font-medium text-[#16232E] before:content-[''] before:absolute before:left-0 before:top-2.5 before:w-2 before:h-2 before:rounded-full before:bg-[#22887c]">
                  Si quieres, le mandas la confirmación por WhatsApp en cuanto registras su pago.
                </li>
              </ul>
            </div>

            {/* PHONE PREVIEW */}
            <div className="max-w-[340px] mx-auto w-full">
              <div className="text-center pb-4">
                <Image
                  src="/logos/academia-aurora-logo.png"
                  alt="Academia Aurora"
                  width={56}
                  height={56}
                  className="w-14 h-14 rounded-2xl object-cover shadow-sm ring-1 ring-[#E3E7EC] mx-auto mb-2.5"
                />
                <p className="font-extrabold text-[#16232E] text-base">Academia Aurora</p>
              </div>

              <div className="bg-white border border-[#E3E7EC] rounded-2xl p-4.5 shadow-lg shadow-[#15435a]/5 mb-3.5">
                <div className="flex justify-between items-start mb-1.5">
                  <span className="font-mono text-[10px] tracking-wider uppercase text-[#5B6B7A] font-semibold">
                    Estado de cuenta
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border border-[#D2A45C] text-[#D2A45C] bg-[#D2A45C]/10">
                    Pendiente
                  </span>
                </div>
                <h4 className="text-lg font-extrabold text-[#16232E] mb-3">Ana Torres</h4>
                <hr className="border-t border-[#E3E7EC] mb-3.5" />
                <p className="text-xs text-[#5B6B7A] mb-0.5">Saldo</p>
                <p className="text-3xl font-extrabold text-[#D2A45C] mb-2">$450</p>
                <p className="text-xs text-[#5B6B7A]">🛡️ Información actualizada en tiempo real</p>
              </div>

              <div className="bg-white border border-[#E3E7EC] rounded-2xl p-4.5 shadow-lg shadow-[#15435a]/5">
                <div className="flex items-center gap-2 font-bold text-[#16232E] mb-3.5 text-sm">
                  <FileText className="w-4 h-4 text-[#5B6B7A]" />
                  Historial de pagos
                </div>

                <div className="space-y-3.5">
                  <div className="flex items-start gap-2.5">
                    <span className="w-8 h-8 rounded-full border-1.5 border-current text-[#15435a] flex items-center justify-center shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <strong className="block text-xs font-bold text-[#16232E]">Mensualidad Agosto 2026</strong>
                      <span className="block text-[11px] text-[#5B6B7A]">Cargo recurrente generado automáticamente</span>
                      <small className="block text-[10px] text-[#5B6B7A] mt-0.5">1 ago</small>
                    </div>
                    <span className="font-bold text-xs text-[#15435a] shrink-0">+$450</span>
                  </div>

                  <div className="flex items-start gap-2.5 pt-3.5 border-t border-[#E3E7EC]">
                    <span className="w-8 h-8 rounded-full border-1.5 border-current text-[#15435a] flex items-center justify-center shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <strong className="block text-xs font-bold text-[#16232E]">Cargo grupal</strong>
                      <span className="block text-[11px] text-[#5B6B7A]">Torneo Relámpago · Fútbol Sub-12</span>
                      <small className="block text-[10px] text-[#5B6B7A] mt-0.5">18 jul</small>
                    </div>
                    <span className="font-bold text-xs text-[#15435a] shrink-0">+$150</span>
                  </div>

                  <div className="flex items-start gap-2.5 pt-3.5 border-t border-[#E3E7EC]">
                    <span className="w-8 h-8 rounded-full border-1.5 border-current text-[#22887c] flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <strong className="block text-xs font-bold text-[#16232E]">Pago recibido</strong>
                      <span className="block text-[11px] text-[#5B6B7A]">Pago · transferencia</span>
                      <small className="block text-[10px] text-[#5B6B7A] mt-0.5">14 jul</small>
                    </div>
                    <span className="font-bold text-xs text-[#22887c] shrink-0">−$150</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ FEATURES ============ */}
        <section className="py-14 md:py-24" id="caracteristicas">
          <div className="max-w-[1120px] mx-auto px-5">
            <div className="max-w-[60ch] mb-9">
              <span className="font-mono text-xs tracking-wider uppercase text-[#1a6b61] mb-2 block font-semibold">
                Características
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#15435a]">
                Todo lo que ya haces a mano, pero sin la parte tediosa.
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* TARJETA DESTACADA: CARGOS EXTRAORDINARIOS CON MINI-DEMO */}
              <div className="col-span-1 sm:col-span-2 lg:col-span-3 bg-white border border-[#E3E7EC] rounded-2xl p-5 md:p-6 hover:shadow-lg hover:shadow-[#15435a]/5 transition-all">
                <div className="flex flex-col lg:flex-row lg:items-center gap-6 justify-between">
                  <div className="max-w-[54ch]">
                    <div className="w-9 h-9 rounded-lg bg-[#E7F2F0] text-[#1a6b61] flex items-center justify-center mb-3.5">
                      <FileText className="w-4.5 h-4.5" />
                    </div>
                    <h3 className="text-base font-bold text-[#16232E] mb-1.5">Cargos extraordinarios</h3>
                    <p className="text-sm text-[#5B6B7A] leading-relaxed">
                      Cobra uniformes, materiales o inscripciones a un alumno, un grupo, o varios grupos a la vez — excluye a quien no aplique en un par de clics, y dale seguimiento al avance de cobro. Cuando quieras, mándale a todo el grupo un resumen del avance por WhatsApp.
                    </p>
                  </div>

                  {/* Mini-demo visual */}
                  <div className="w-full lg:w-[380px] bg-[#F6F7F9] border border-[#E3E7EC] rounded-xl p-4 shrink-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className="font-extrabold text-sm text-[#16232E]">Uniformes temporada 2026</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E7F2F0] text-[#1a6b61]">
                        Grupal
                      </span>
                    </div>
                    <p className="text-xs text-[#5B6B7A] mb-3">
                      Fútbol Sub-12 · 23 de 25 alumnos (2 excluidos)
                    </p>
                    
                    {/* Barra de progreso al 78% */}
                    <div className="w-full bg-[#E3E7EC] h-2.5 rounded-full overflow-hidden mb-2">
                      <div className="bg-[#22887c] h-full rounded-full" style={{ width: '78%' }} />
                    </div>

                    <div className="flex justify-between items-center text-xs font-bold text-[#16232E]">
                      <span>18 de 23 pagado</span>
                      <span>$2,700 de $3,450</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-[#E3E7EC] rounded-2xl p-5 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#15435a]/5 transition-all">
                <div className="w-9 h-9 rounded-lg bg-[#E7F2F0] text-[#1a6b61] flex items-center justify-center mb-3.5">
                  <FileText className="w-4.5 h-4.5" />
                </div>
                <h3 className="text-base font-bold text-[#16232E] mb-1.5">Panel de pendientes</h3>
                <p className="text-sm text-[#5B6B7A] leading-relaxed">
                  Abre la app y ve al instante quién debe, cuánto, y qué tan urgente es — sin revisar alumno por alumno.
                </p>
              </div>

              <div className="bg-white border border-[#E3E7EC] rounded-2xl p-5 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#15435a]/5 transition-all">
                <div className="w-9 h-9 rounded-lg bg-[#E7F2F0] text-[#1a6b61] flex items-center justify-center mb-3.5">
                  <Clock className="w-4.5 h-4.5" />
                </div>
                <h3 className="text-base font-bold text-[#16232E] mb-1.5">Mensualidades automáticas</h3>
                <p className="text-sm text-[#5B6B7A] leading-relaxed">
                  Los cargos del mes se generan solos según el plan de cada alumno, cobrando solo la parte que toca si entra a mitad de mes.
                </p>
              </div>

              <div className="bg-white border border-[#E3E7EC] rounded-2xl p-5 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#15435a]/5 transition-all">
                <div className="w-9 h-9 rounded-lg bg-[#E7F2F0] text-[#1a6b61] flex items-center justify-center mb-3.5">
                  <MessageSquare className="w-4.5 h-4.5" />
                </div>
                <h3 className="text-base font-bold text-[#16232E] mb-1.5">Recordatorio por WhatsApp, 3 tonos</h3>
                <p className="text-sm text-[#5B6B7A] leading-relaxed">
                  Amigable, formal o urgente — tú eliges, tú revisas, tú das clic en enviar. Puedes incluir el desglose del saldo o el enlace al historial si quieres.
                </p>
              </div>

              <div className="bg-white border border-[#E3E7EC] rounded-2xl p-5 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#15435a]/5 transition-all">
                <div className="w-9 h-9 rounded-lg bg-[#E7F2F0] text-[#1a6b61] flex items-center justify-center mb-3.5">
                  <Users className="w-4.5 h-4.5" />
                </div>
                <h3 className="text-base font-bold text-[#16232E] mb-1.5">Historial digital por alumno</h3>
                <p className="text-sm text-[#5B6B7A] leading-relaxed">
                  Cada alumno o papá recibe un enlace propio para ver su saldo y pagos, sin contraseña ni apps que instalar.
                </p>
              </div>

              <div className="bg-white border border-[#E3E7EC] rounded-2xl p-5 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#15435a]/5 transition-all">
                <div className="w-9 h-9 rounded-lg bg-[#E7F2F0] text-[#1a6b61] flex items-center justify-center mb-3.5">
                  <CheckCircle2 className="w-4.5 h-4.5" />
                </div>
                <h3 className="text-base font-bold text-[#16232E] mb-1.5">Confirmación de pago automática</h3>
                <p className="text-sm text-[#5B6B7A] leading-relaxed">
                  Cuando registras un pago, le puedes mandar al alumno o al papá una confirmación por WhatsApp con el enlace a su historial — así ambos tienen certeza de que quedó registrado, sin lugar a discusiones.
                </p>
              </div>

              <div className="bg-white border border-[#E3E7EC] rounded-2xl p-5 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#15435a]/5 transition-all">
                <div className="w-9 h-9 rounded-lg bg-[#E7F2F0] text-[#1a6b61] flex items-center justify-center mb-3.5">
                  <BarChart3 className="w-4.5 h-4.5" />
                </div>
                <h3 className="text-base font-bold text-[#16232E] mb-1.5">Reportes de ingresos</h3>
                <p className="text-sm text-[#5B6B7A] leading-relaxed">
                  Ve cuánto llevas cobrado hoy y en el mes, desglosado por efectivo y transferencia, además el historial de meses anteriores.
                </p>
              </div>

              <div className="bg-white border border-[#E3E7EC] rounded-2xl p-5 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#15435a]/5 transition-all">
                <div className="w-9 h-9 rounded-lg bg-[#E7F2F0] text-[#1a6b61] flex items-center justify-center mb-3.5">
                  <Download className="w-4.5 h-4.5" />
                </div>
                <h3 className="text-base font-bold text-[#16232E] mb-1.5">Exportación de tus datos</h3>
                <p className="text-sm text-[#5B6B7A] leading-relaxed">
                  Descarga tu información en CSV cuando quieras — alumnos, grupos, pagos y cargos. Es tu información.
                </p>
              </div>

              <div className="bg-white border border-[#E3E7EC] rounded-2xl p-5 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#15435a]/5 transition-all">
                <div className="w-9 h-9 rounded-lg bg-[#E7F2F0] text-[#1a6b61] flex items-center justify-center mb-3.5">
                  <Award className="w-4.5 h-4.5" />
                </div>
                <h3 className="text-base font-bold text-[#16232E] mb-1.5">Grupos y actividades</h3>
                <p className="text-sm text-[#5B6B7A] leading-relaxed">
                  Organiza tus clases por horario y cupo, y separa torneos o cursos como actividades con su propio cobro.
                </p>
              </div>

              <div className="bg-white border border-[#E3E7EC] rounded-2xl p-5 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#15435a]/5 transition-all">
                <div className="w-9 h-9 rounded-lg bg-[#E7F2F0] text-[#1a6b61] flex items-center justify-center mb-3.5">
                  <Zap className="w-4.5 h-4.5" />
                </div>
                <h3 className="text-base font-bold text-[#16232E] mb-1.5">Cobro de visitas y clases sueltas</h3>
                <p className="text-sm text-[#5B6B7A] leading-relaxed">
                  Cobra una clase de prueba en segundos, aunque la persona todavía no esté registrada como alumno.
                </p>
              </div>

              <div className="bg-white border border-[#E3E7EC] rounded-2xl p-5 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#15435a]/5 transition-all">
                <div className="w-9 h-9 rounded-lg bg-[#E7F2F0] text-[#1a6b61] flex items-center justify-center mb-3.5">
                  <Sparkles className="w-4.5 h-4.5" />
                </div>
                <h3 className="text-base font-bold text-[#16232E] mb-1.5">Becas y descuentos automáticos</h3>
                <p className="text-sm text-[#5B6B7A] leading-relaxed">
                  Marca un descuento de hermanos o una beca por porcentaje, y se aplica solo, cada mes.
                </p>
              </div>

              <div className="bg-white border border-[#E3E7EC] rounded-2xl p-5 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#15435a]/5 transition-all">
                <div className="w-9 h-9 rounded-lg bg-[#E7F2F0] text-[#1a6b61] flex items-center justify-center mb-3.5">
                  <DollarSign className="w-4.5 h-4.5" />
                </div>
                <h3 className="text-base font-bold text-[#16232E] mb-1.5">Pagos parciales y saldo a favor</h3>
                <p className="text-sm text-[#5B6B7A] leading-relaxed">
                  Si alguien abona una parte, el sistema lleva la cuenta exacta; si paga de más, el resto se aplica al siguiente cobro.
                </p>
              </div>

              <div className="bg-white border border-[#E3E7EC] rounded-2xl p-5 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#15435a]/5 transition-all">
                <div className="w-9 h-9 rounded-lg bg-[#E7F2F0] text-[#1a6b61] flex items-center justify-center mb-3.5">
                  <AlertTriangle className="w-4.5 h-4.5" />
                </div>
                <h3 className="text-base font-bold text-[#16232E] mb-1.5">Recargos y promesas de pago</h3>
                <p className="text-sm text-[#5B6B7A] leading-relaxed">
                  Configura recargos automáticos tras días de gracia, y deja anotado cuando un alumno promete pagar después.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ============ TRUST ============ */}
        <section className="py-14 md:py-24">
          <div className="max-w-[1120px] mx-auto px-5">
            <div className="max-w-[60ch] mb-9">
              <span className="font-mono text-xs tracking-wider uppercase text-[#1a6b61] mb-2 block font-semibold">
                De confianza
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#15435a]">
                El control sigue siendo tuyo.
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4.5">
              <div className="flex gap-3 items-start">
                <span className="w-6 h-6 rounded-full bg-[#E7F2F0] text-[#1a6b61] flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-4 h-4 stroke-[3]" />
                </span>
                <p className="font-semibold text-[#16232E] text-base">
                  Tú mandas cada mensaje — nada se envía automático ni masivo.
                </p>
              </div>

              <div className="flex gap-3 items-start">
                <span className="w-6 h-6 rounded-full bg-[#E7F2F0] text-[#1a6b61] flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-4 h-4 stroke-[3]" />
                </span>
                <p className="font-semibold text-[#16232E] text-base">
                  La información de tu academia está separada de cualquier otra que use SIPRA.
                </p>
              </div>

              <div className="flex gap-3 items-start">
                <span className="w-6 h-6 rounded-full bg-[#E7F2F0] text-[#1a6b61] flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-4 h-4 stroke-[3]" />
                </span>
                <p className="font-semibold text-[#16232E] text-base">
                  No instalas nada — funciona desde el navegador de tu celular o computadora.
                </p>
              </div>

              <div className="flex gap-3 items-start">
                <span className="w-6 h-6 rounded-full bg-[#E7F2F0] text-[#1a6b61] flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-4 h-4 stroke-[3]" />
                </span>
                <p className="font-semibold text-[#16232E] text-base">
                  Ningún cobro se borra: todo tu historial de pagos queda guardado y ordenado.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ============ PRICING ============ */}
        <section className="py-14 md:py-24 bg-white border-y border-[#E3E7EC]">
          <div className="max-w-[1120px] mx-auto px-5 text-center">
            <span className="font-mono text-xs tracking-wider uppercase text-[#1a6b61] mb-2 block font-semibold">
              Precio
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#15435a]">
              Un precio, sin letra chiquita.
            </h2>

            <div className="mt-6 mb-6">
              <span className="text-4xl sm:text-5xl md:text-6xl font-black text-[#15435a]">
                $299 MXN
              </span>
              <span className="text-base sm:text-xl font-medium text-[#5B6B7A] ml-2">
                /mes
              </span>
            </div>

            <div className="max-w-[620px] mx-auto p-4 sm:p-5 rounded-2xl bg-[#E7F2F0] border border-[#22887c]/20 mb-8">
              <p className="text-sm sm:text-base font-semibold text-[#1a6b61] leading-relaxed">
                "Si te ayuda a recuperar una sola mensualidad que se te hubiera pasado, el sistema ya se pagó solo ese mes."
              </p>
            </div>

            <div className="flex justify-center">
              <a
                href={WA_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2.5 font-bold text-base px-6 py-3.5 rounded-lg bg-[#22887c] text-white hover:bg-[#1a6b61] transition-all shadow-md hover:-translate-y-0.5 active:translate-y-0"
              >
                <Send className="w-5 h-5" />
                Escríbenos por WhatsApp
              </a>
            </div>
          </div>
        </section>

        {/* ============ FAQ ============ */}
        <section className="py-14 md:py-24" id="preguntas">
          <div className="max-w-[1120px] mx-auto px-5">
            <div className="max-w-[60ch] mb-9">
              <span className="font-mono text-xs tracking-wider uppercase text-[#1a6b61] mb-2 block font-semibold">
                Preguntas frecuentes
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#15435a]">
                Lo que normalmente preguntan.
              </h2>
            </div>

            <div className="divide-y divide-[#E3E7EC] border-t border-[#E3E7EC]">
              <details className="py-4.5 group" open>
                <summary className="cursor-pointer font-bold text-base md:text-lg text-[#16232E] flex justify-between items-center gap-4 list-none">
                  <span>¿Cómo empiezo?</span>
                  <span className="text-xl font-bold text-[#22887c] group-open:rotate-45 transition-transform">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm md:text-base text-[#5B6B7A] max-w-[68ch] leading-relaxed">
                  Nosotros activamos cada academia directamente, para asegurarnos de que arranque bien configurada. Escríbenos por WhatsApp y en minutos tienes acceso, con período de prueba incluido.
                </p>
              </details>

              <details className="py-4.5 group">
                <summary className="cursor-pointer font-bold text-base md:text-lg text-[#16232E] flex justify-between items-center gap-4 list-none">
                  <span>¿Cuánto cuesta?</span>
                  <span className="text-xl font-bold text-[#22887c] group-open:rotate-45 transition-transform">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm md:text-base text-[#5B6B7A] max-w-[68ch] leading-relaxed">
                  $299 MXN al mes, un solo plan, sin funciones escondidas. Si te ayuda a recuperar aunque sea una mensualidad que se te hubiera pasado, ya se pagó solo.
                </p>
              </details>

              <details className="py-4.5 group">
                <summary className="cursor-pointer font-bold text-base md:text-lg text-[#16232E] flex justify-between items-center gap-4 list-none">
                  <span>¿Los WhatsApp se mandan solos?</span>
                  <span className="text-xl font-bold text-[#22887c] group-open:rotate-45 transition-transform">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm md:text-base text-[#5B6B7A] max-w-[68ch] leading-relaxed">
                  No. SIPRA prepara el mensaje con el tono que elijas y te abre WhatsApp listo para enviar — el clic final siempre es tuyo. Nada se manda de forma automática ni masiva.
                </p>
              </details>

              <details className="py-4.5 group">
                <summary className="cursor-pointer font-bold text-base md:text-lg text-[#16232E] flex justify-between items-center gap-4 list-none">
                  <span>¿SIPRA cobra el dinero por mí, como una pasarela de pago?</span>
                  <span className="text-xl font-bold text-[#22887c] group-open:rotate-45 transition-transform">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm md:text-base text-[#5B6B7A] max-w-[68ch] leading-relaxed">
                  No. Tú sigues cobrando como ya lo haces, en efectivo o transferencia. SIPRA lleva la cuenta de cuánto debe cada quien y te ayuda a recordar y registrar el pago, pero no mueve el dinero.
                </p>
              </details>

              <details className="py-4.5 group">
                <summary className="cursor-pointer font-bold text-base md:text-lg text-[#16232E] flex justify-between items-center gap-4 list-none">
                  <span>¿Tengo que instalar algo?</span>
                  <span className="text-xl font-bold text-[#22887c] group-open:rotate-45 transition-transform">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm md:text-base text-[#5B6B7A] max-w-[68ch] leading-relaxed">
                  No. SIPRA funciona directo desde el navegador de tu celular o computadora. Si quieres, puedes agregarla a tu pantalla de inicio para que se sienta como una app, pero no es obligatorio.
                </p>
              </details>

              <details className="py-4.5 group">
                <summary className="cursor-pointer font-bold text-base md:text-lg text-[#16232E] flex justify-between items-center gap-4 list-none">
                  <span>¿Qué pasa si un alumno paga solo una parte?</span>
                  <span className="text-xl font-bold text-[#22887c] group-open:rotate-45 transition-transform">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm md:text-base text-[#5B6B7A] max-w-[68ch] leading-relaxed">
                  Registras el abono y el sistema deja ver cuánto sigue pendiente. Si alguien paga de más, ese excedente queda a su favor para el siguiente cobro.
                </p>
              </details>

              <details className="py-4.5 group">
                <summary className="cursor-pointer font-bold text-base md:text-lg text-[#16232E] flex justify-between items-center gap-4 list-none">
                  <span>¿Sirve si tengo alumnos con beca o descuento de hermanos?</span>
                  <span className="text-xl font-bold text-[#22887c] group-open:rotate-45 transition-transform">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm md:text-base text-[#5B6B7A] max-w-[68ch] leading-relaxed">
                  Sí. Marcas el descuento en la ficha del alumno — monto fijo o porcentaje — y se aplica solo, cada mes.
                </p>
              </details>

              <details className="py-4.5 group">
                <summary className="cursor-pointer font-bold text-base md:text-lg text-[#16232E] flex justify-between items-center gap-4 list-none">
                  <span>¿Mis alumnos van a poder ver cuánto deben?</span>
                  <span className="text-xl font-bold text-[#22887c] group-open:rotate-45 transition-transform">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm md:text-base text-[#5B6B7A] max-w-[68ch] leading-relaxed">
                  Solo si tú les compartes su enlace de historial — es opcional, y lo decides alumno por alumno.
                </p>
              </details>
            </div>
          </div>
        </section>

        {/* ============ FINAL CTA ============ */}
        <section className="py-16 md:py-24 bg-[#15435a] text-white text-center">
          <div className="max-w-[1120px] mx-auto px-5">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white">
              ¿Listo para dejar el Excel?
            </h2>
            <p className="mt-3 text-base md:text-lg text-white/85 max-w-[48ch] mx-auto">
              Escríbenos y activamos tu academia con período de prueba incluido.
            </p>
            <div className="mt-7 flex justify-center">
              <a
                href={WA_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2.5 font-bold text-base px-6 py-3.5 rounded-lg bg-[#22887c] text-white hover:bg-[#1a6b61] transition-all shadow-lg shadow-black/20 hover:-translate-y-0.5 active:translate-y-0"
              >
                <Send className="w-5 h-5" />
                Escríbenos por WhatsApp
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* ============ FOOTER ============ */}
      <footer className="py-9 text-center">
        <div className="max-w-[1120px] mx-auto px-5">
          <Link href="/" className="inline-flex items-center gap-2 text-[#16232E] no-underline mb-2">
            <Image
              src="/logos/isotipo-sipra.png"
              alt="SIPRA"
              width={26}
              height={26}
              className="h-[26px] w-auto object-contain"
            />
            <strong className="font-extrabold text-lg text-[#15435a]">SIPRA</strong>
          </Link>
          <p className="text-xs text-[#5B6B7A]">
            Sistema de Pagos y Recordatorios para Academias · © 2026
          </p>
        </div>
      </footer>
    </div>
  )
}
