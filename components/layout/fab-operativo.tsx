'use client'

import { useMemo, useState } from 'react'
import {
  Plus, Search, ChevronRight, ArrowLeft, FileText, Users, Ticket,
} from 'lucide-react'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { BilleteDollarIcon } from '@/components/ui/billete-dollar-icon'
import { formatCurrency } from '@/lib/utils/currency'
import {
  VisitaExpressDrawer,
  type AlumnoLite,
  type PlanVisita,
} from '@/components/domain/cargo/visita-express-drawer'
import { RegistrarPagoDrawer } from '@/components/domain/cargo/registrar-pago-drawer'
import { CrearCargoIndividualDrawer } from '@/components/domain/cargo/crear-cargo-individual-drawer'
import { MassCargoDrawer } from '@/components/domain/grupo/mass-cargo-drawer'

type AlumnoDeuda = {
  persona_id: string
  nombre: string
  apellido: string
  cargoIds: string[]
  saldoTotal: number
}

type GrupoCargo = {
  id: string
  nombre: string
  color: string | null
  inscripciones: { persona: { id: string; nombre: string; apellido: string | null } }[]
}

type Step = 'menu' | 'cobro' | 'cargo' | 'grupo'

export function FabOperativo({
  alumnos,
  alumnosConDeuda = [],
  grupos = [],
  planesPorVisita = [],
  allowPartial = true,
}: {
  alumnos: AlumnoLite[]
  alumnosConDeuda?: AlumnoDeuda[]
  grupos?: GrupoCargo[]
  planesPorVisita?: PlanVisita[]
  allowPartial?: boolean
}) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [step, setStep] = useState<Step>('menu')

  // Acción seleccionada + drawer destino
  const [cobroSel, setCobroSel] = useState<AlumnoDeuda | null>(null)
  const [cobroOpen, setCobroOpen] = useState(false)
  const [cargoSel, setCargoSel] = useState<AlumnoLite | null>(null)
  const [cargoOpen, setCargoOpen] = useState(false)
  const [grupoSel, setGrupoSel] = useState<GrupoCargo | null>(null)
  const [masivoOpen, setMasivoOpen] = useState(false)
  const [visitaOpen, setVisitaOpen] = useState(false)

  const abrirMenu = () => { setStep('menu'); setSheetOpen(true) }
  const cerrarSheet = () => setSheetOpen(false)

  const elegirCobro = (a: AlumnoDeuda) => {
    setCobroSel(a); setSheetOpen(false); setCobroOpen(true)
  }
  const elegirCargo = (a: AlumnoLite) => {
    setCargoSel(a); setSheetOpen(false); setCargoOpen(true)
  }
  const elegirGrupo = (g: GrupoCargo) => {
    setGrupoSel(g); setSheetOpen(false); setMasivoOpen(true)
  }

  const opciones = [
    {
      key: 'cobro' as const,
      icon: <BilleteDollarIcon className="h-5 w-5" />,
      color: '#15435a',
      titulo: 'Registrar cobro',
      desc: 'Registra un pago recibido de un alumno.',
      onClick: () => setStep('cobro'),
    },
    {
      key: 'cargo' as const,
      icon: <FileText className="h-5 w-5" />,
      color: '#15435a',
      titulo: 'Cargo individual',
      desc: 'Asigna un cargo adicional a un alumno.',
      onClick: () => setStep('cargo'),
    },
    {
      key: 'masivo' as const,
      icon: <Users className="h-5 w-5" />,
      color: '#15435a',
      titulo: 'Cargo masivo',
      desc: 'Asigna un cargo adicional para varios alumnos.',
      onClick: () => setStep('grupo'),
    },
    {
      key: 'visita' as const,
      icon: <Ticket className="h-5 w-5" />,
      color: '#22887c',
      titulo: 'Registrar visita',
      desc: 'Carga y cobra un pago por visita.',
      onClick: () => { setSheetOpen(false); setVisitaOpen(true) },
    },
  ]

  const cobroItems = useMemo(
    () => alumnosConDeuda.map(a => ({
      id: a.persona_id,
      nombre: a.nombre,
      apellido: a.apellido,
      subtitle: a.saldoTotal > 0 ? formatCurrency(a.saldoTotal) : 'Al corriente',
    })),
    [alumnosConDeuda],
  )
  const cargoItems = useMemo(
    () => alumnos.map(a => ({ id: a.id, nombre: a.nombre, apellido: a.apellido ?? '' })),
    [alumnos],
  )
  const grupoItems = useMemo(
    () => grupos.map(g => ({
      id: g.id,
      nombre: g.nombre,
      subtitle: `${g.inscripciones.length} ${g.inscripciones.length === 1 ? 'alumno' : 'alumnos'}`,
    })),
    [grupos],
  )

  return (
    <>
      {/* FAB */}
      <div className="fixed bottom-20 right-4 z-50">
        <button
          onClick={abrirMenu}
          className="bg-[#15435a] hover:bg-[#0f3245] text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg transition-all active:scale-95"
          aria-label="Acciones"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

      {/* Bottom sheet de acciones (menú + selectores) */}
      <Drawer open={sheetOpen} onOpenChange={setSheetOpen}>
        <DrawerContent className="max-h-[88vh]">
          <div className="mx-auto w-full max-w-md flex flex-col overflow-hidden pb-6">
            {step === 'menu' && (
              <>
                <DrawerHeader className="text-left">
                  <DrawerTitle>¿Qué quieres registrar?</DrawerTitle>
                </DrawerHeader>
                <div className="px-4 space-y-2">
                  {opciones.map(op => (
                    <button
                      key={op.key}
                      type="button"
                      onClick={op.onClick}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl border border-border hover:bg-accent transition-colors text-left"
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
              </>
            )}

            {step === 'cobro' && (
              <PickerStep
                titulo="Registrar cobro"
                placeholder="Buscar alumno…"
                items={cobroItems}
                emptyText="No hay alumnos."
                onBack={() => setStep('menu')}
                onSelect={(id) => {
                  const a = alumnosConDeuda.find(x => x.persona_id === id)
                  if (a) elegirCobro(a)
                }}
              />
            )}

            {step === 'cargo' && (
              <PickerStep
                titulo="Cargo individual"
                placeholder="Buscar alumno…"
                items={cargoItems}
                emptyText="No hay alumnos activos."
                onBack={() => setStep('menu')}
                onSelect={(id) => {
                  const a = alumnos.find(x => x.id === id)
                  if (a) elegirCargo(a)
                }}
              />
            )}

            {step === 'grupo' && (
              <PickerStep
                titulo="Cargo masivo"
                placeholder="Buscar grupo…"
                items={grupoItems}
                emptyText="No hay grupos activos."
                onBack={() => setStep('menu')}
                onSelect={(id) => {
                  const g = grupos.find(x => x.id === id)
                  if (g) elegirGrupo(g)
                }}
              />
            )}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Drawers destino */}
      {cobroSel && (
        <RegistrarPagoDrawer
          open={cobroOpen}
          onOpenChange={setCobroOpen}
          personaId={cobroSel.persona_id}
          personaNombre={`${cobroSel.nombre} ${cobroSel.apellido}`.trim()}
          cargoIds={cobroSel.cargoIds}
          saldoTotal={cobroSel.saldoTotal}
          allowPartial={allowPartial}
        />
      )}

      {cargoSel && (
        <CrearCargoIndividualDrawer
          open={cargoOpen}
          onOpenChange={setCargoOpen}
          personaId={cargoSel.id}
          tituloDrawer={`Nuevo cargo · ${cargoSel.nombre} ${cargoSel.apellido ?? ''}`.trim()}
        />
      )}

      {grupoSel && (
        <MassCargoDrawer
          open={masivoOpen}
          onOpenChange={setMasivoOpen}
          grupoId={grupoSel.id}
          inscripciones={grupoSel.inscripciones}
        />
      )}

      <VisitaExpressDrawer
        open={visitaOpen}
        onOpenChange={setVisitaOpen}
        alumnos={alumnos}
        planesPorVisita={planesPorVisita}
      />
    </>
  )
}

type PickItem = { id: string; nombre: string; apellido?: string | null; subtitle?: string }

function PickerStep({
  titulo,
  placeholder,
  items,
  emptyText,
  onBack,
  onSelect,
}: {
  titulo: string
  placeholder: string
  items: PickItem[]
  emptyText: string
  onBack: () => void
  onSelect: (id: string) => void
}) {
  const [query, setQuery] = useState('')
  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = q
      ? items.filter(a => `${a.nombre} ${a.apellido ?? ''}`.toLowerCase().includes(q))
      : items
    return base.slice(0, 40)
  }, [items, query])

  return (
    <>
      <DrawerHeader className="text-left flex flex-row items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="p-1.5 -ml-1.5 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          aria-label="Volver"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <DrawerTitle>{titulo}</DrawerTitle>
      </DrawerHeader>

      <div className="px-4">
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="h-11 pl-9"
            autoFocus
          />
        </div>

        <div className="max-h-[55vh] overflow-y-auto space-y-1 rounded-lg border border-border p-1.5">
          {filtrados.map(a => (
            <button
              key={a.id}
              type="button"
              onClick={() => onSelect(a.id)}
              className="w-full flex items-center justify-between gap-2 px-2.5 py-2.5 rounded-md text-left hover:bg-accent transition-colors"
            >
              <span className="text-sm text-foreground truncate">
                {a.nombre} {a.apellido ?? ''}
              </span>
              {a.subtitle && (
                <span className="text-xs font-semibold flex-shrink-0 text-[#15435a]">
                  {a.subtitle}
                </span>
              )}
            </button>
          ))}
          {filtrados.length === 0 && (
            <p className="text-xs text-muted-foreground px-2 py-3 text-center">{emptyText}</p>
          )}
        </div>
      </div>
    </>
  )
}
