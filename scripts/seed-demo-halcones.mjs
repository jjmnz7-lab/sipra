// ============================================================================
// Seed de datos demo — Academia Taekwondo Halcones 🦅 (Supabase CLOUD)
// Uso:
//   $env:SUPABASE_SERVICE_ROLE_KEY = "<clave service_role de la nube>"
//   node scripts/seed-demo-halcones.mjs
//
// Solo INSERTa filas nuevas, todas bajo un academia_id nuevo y aislado.
// No toca ninguna academia existente. Ver plan en
// C:\Users\juan_\.claude\plans\delegated-twirling-waffle.md
// ============================================================================

import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gbimkrnsmeqsitbaxnrk.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
// Clave anon: pública por diseño (NEXT_PUBLIC_*), solo se usa aquí para el login de prueba final.
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdiaW1rcm5zbWVxc2l0YmF4bnJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5Mzc5OTYsImV4cCI6MjA5NDUxMzk5Nn0.qoT8WRR5j-Y_SWpDhAuku2rXDMm-KI3wWTrYAGsNhS4'

if (!SERVICE_KEY) {
  console.error('Falta SUPABASE_SERVICE_ROLE_KEY en el entorno. Aborta.')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

// ----------------------------------------------------------------------------
// Helpers de fecha
// ----------------------------------------------------------------------------
const MES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const pad = (n) => String(n).padStart(2, '0')
const ymd = (y, m, d = 1) => `${y}-${pad(m)}-${pad(d)}`
const ultimoDiaMes = (y, m) => ymd(y, m, new Date(Date.UTC(y, m, 0)).getUTCDate())
const at = (dateStr) => `${dateStr}T18:00:00.000Z` // mediodía Mazatlán aprox., evita corrimientos de día
const uid = () => randomUUID()

const TODAY = '2026-07-03'

// ----------------------------------------------------------------------------
// Identidad de la cuenta
// ----------------------------------------------------------------------------
const ACADEMIA_ID = uid()
const OWNER_EMAIL = 'owner5@sipra.dev'
const STAFF_EMAIL = 'coordinacion.halcones@sipra.dev'
const PASSWORD = 'Sipra2025!'

// ----------------------------------------------------------------------------
// Catálogos
// ----------------------------------------------------------------------------
const PLANES = {
  regular:     { id: uid(), nombre: 'Mensualidad Regular',     monto: 650 },
  competencia: { id: uid(), nombre: 'Mensualidad Competencia', monto: 850 },
}

const GRUPOS = {
  peq:  { id: uid(), nombre: 'Pequeños Guerreros (4-6 años)',        emoji: '🐣', color: 'amber',  dias: [1,3,5], hi: '17:00', hf: '17:45', cupo: 20, plan: 'regular' },
  inf:  { id: uid(), nombre: 'Infantil Cintas de Color (7-12 años)', emoji: '⭐', color: 'cyan',   dias: [1,3,5], hi: '18:00', hf: '19:00', cupo: 25, plan: 'regular' },
  juv:  { id: uid(), nombre: 'Juvenil y Adultos',                    emoji: '💎', color: 'indigo', dias: [2,4],   hi: '19:00', hf: '20:15', cupo: 25, plan: 'regular' },
  neg:  { id: uid(), nombre: 'Cinta Negra / Avanzados',              emoji: '👑', color: 'purple', dias: [6],     hi: '09:00', hf: '10:30', cupo: 15, plan: 'regular' },
  comp: { id: uid(), nombre: 'Equipo de Competencia',                emoji: '🏆', color: 'rose',   dias: [2,4,6], hi: '20:15', hf: '21:30', cupo: 12, plan: 'competencia' },
}

const ACTIVIDADES = {
  examen:    { id: uid(), nombre: 'Examen de Cinta — Julio 2026', emoji: '🎓', fecha: '2026-07-26', costo: 400 },
  seminario: { id: uid(), nombre: 'Seminario Maestro Invitado',   emoji: '🎤', fecha: '2026-07-19', costo: 300 },
  torneo:    { id: uid(), nombre: 'Torneo Interno de Verano',     emoji: '🎉', fecha: '2026-08-09', costo: 250 },
}

const INSCRIPCIONES_ACTIVIDAD = {
  examen:    ['p06','p07','p09','p14','p17','p21','p29'],
  seminario: ['p14','p17','p21','p23','p30'],
  torneo:    ['p25','p26','p27','p28','p21','p23'],
}

const METODOS = ['efectivo', 'transferencia', 'tarjeta', 'deposito']
const metodoPago = (i) => METODOS[i % METODOS.length]

// ----------------------------------------------------------------------------
// Roster (30 alumnos)
// ----------------------------------------------------------------------------
const ROSTER = [
  { key: 'p01', nombre: 'Emilio',       apellido: 'Duarte Rosales',    grupo: 'peq', plan: 'regular', caso: 'al_dia',            altaDiasAtras: 40 },
  { key: 'p02', nombre: 'Valentina',    apellido: 'Cruz Miranda',      grupo: 'peq', plan: 'regular', caso: 'pendiente',         altaDiasAtras: 35 },
  { key: 'p03', nombre: 'Santiago',     apellido: 'Beltrán Osuna',     grupo: 'peq', plan: 'regular', caso: 'al_dia',            altaDiasAtras: 21, hermanos: 100, inscripcion: true },
  { key: 'p04', nombre: 'Regina',       apellido: 'Beltrán Osuna',     grupo: 'peq', plan: 'regular', caso: 'pendiente',         altaDiasAtras: 21, hermanos: 100, inscripcion: true },
  { key: 'p05', nombre: 'Dante',        apellido: 'Ibarra Cota',       grupo: 'peq', plan: 'regular', caso: 'atrasado',          altaDiasAtras: 55 },
  { key: 'p06', nombre: 'Ximena',       apellido: 'Sarabia Lugo',      grupo: 'inf', plan: 'regular', caso: 'al_dia',            historicoMeses: 6 },
  { key: 'p07', nombre: 'Bruno',        apellido: 'Castañeda Ríos',    grupo: 'inf', plan: 'regular', caso: 'al_dia',            altaDiasAtras: 60, beca: 50 },
  { key: 'p08', nombre: 'Fernanda',     apellido: 'López Guerrero',    grupo: 'inf', plan: 'regular', caso: 'pendiente',         altaDiasAtras: 30 },
  { key: 'p09', nombre: 'Kevin',        apellido: 'Armenta Sotelo',    grupo: 'inf', plan: 'regular', caso: 'atrasado',          altaDiasAtras: 70, cargoAnulado: true, mensajeAuto: true },
  { key: 'p10', nombre: 'Camila',       apellido: 'Rentería Duarte',   grupo: 'inf', plan: 'regular', caso: 'urgente_2m',        altaDiasAtras: 100 },
  { key: 'p11', nombre: 'Diego',        apellido: 'Osuna Valdez',      grupo: 'inf', plan: null,      caso: 'huerfano_sin_plan', altaDiasAtras: 5 },
  { key: 'p12', nombre: 'Paola',        apellido: 'Miranda Sánchez',   grupo: 'inf', plan: 'regular', caso: 'al_dia',            altaDiasAtras: 18, hermanos: 100 },
  { key: 'p13', nombre: 'Emiliano',     apellido: 'Miranda Sánchez',   grupo: 'inf', plan: 'regular', caso: 'pendiente',         altaDiasAtras: 18, hermanos: 100 },
  { key: 'p14', nombre: 'Andrea',       apellido: 'Zazueta Beltrán',   grupo: 'juv', plan: 'regular', caso: 'al_dia',            historicoMeses: 11, pagoAnulado: true },
  { key: 'p15', nombre: 'Jonathan',     apellido: 'Pérez Castro',      grupo: 'juv', plan: 'regular', caso: 'pendiente',         altaDiasAtras: 25 },
  { key: 'p16', nombre: 'Melissa',      apellido: 'Cota Ibarra',       grupo: 'juv', plan: 'regular', caso: 'atrasado',          altaDiasAtras: 58, mensajeAuto: true },
  { key: 'p17', nombre: 'Ricardo',      apellido: 'Salazar Núñez',     grupo: 'juv', plan: 'regular', caso: 'al_dia',            altaDiasAtras: 90, beca: 25 },
  { key: 'p18', nombre: 'Daniela',      apellido: 'Osuna Reyes',       grupo: null,  plan: 'regular', caso: 'pendiente',         altaDiasAtras: 65 },
  { key: 'p19', nombre: 'Luis Ángel',   apellido: 'Verdugo',           grupo: 'juv', plan: 'regular', caso: 'parcial',           altaDiasAtras: 33 },
  { key: 'p20', nombre: 'Karla',        apellido: 'Beltrán Ruiz',      grupo: 'juv', plan: 'regular', caso: 'saldo_favor',       altaDiasAtras: 45 },
  { key: 'p21', nombre: 'Sergio',       apellido: 'Armenta Valdez',    grupo: 'neg', plan: 'regular', caso: 'al_dia',            historicoMeses: 11 },
  { key: 'p22', nombre: 'Brenda',       apellido: 'Lizárraga Cota',    grupo: 'neg', plan: 'regular', caso: 'atrasado',          altaDiasAtras: 62, recargoHistorico: true },
  { key: 'p23', nombre: 'Iván',         apellido: 'Camacho Rubio',     grupo: 'neg', plan: 'regular', caso: 'al_dia',            altaDiasAtras: 50 },
  { key: 'p24', nombre: 'Sofía',        apellido: 'Trasviña Gil',      grupo: 'neg', plan: 'regular', caso: 'urgente_antiguo',   altaDiasAtras: 95, notaInterna: 'Familia solicitó plan de pagos; contactar antes de suspender del equipo.' },
  { key: 'p25', nombre: 'Alexa',        apellido: 'Rodríguez Peña',    grupo: 'comp',plan: 'competencia', caso: 'al_dia',        altaDiasAtras: 48 },
  { key: 'p26', nombre: 'Matías',       apellido: 'Guerrero Lugo',     grupo: 'comp',plan: 'competencia', caso: 'pendiente',     altaDiasAtras: 28 },
  { key: 'p27', nombre: 'Naomi',        apellido: 'Félix Rentería',    grupo: 'comp',plan: 'competencia', caso: 'beca100',       altaDiasAtras: 80, beca: 100 },
  { key: 'p28', nombre: 'Diego Armando',apellido: 'Cazares',           grupo: 'comp',plan: 'competencia', caso: 'atrasado',      altaDiasAtras: 66 },
  { key: 'p29', nombre: 'Renata',       apellido: 'Sarmiento Cota',    grupo: null,  plan: null,      caso: 'walkin',            altaDiasAtras: 2 },
  { key: 'p30', nombre: 'Héctor Manuel',apellido: 'Domínguez',         grupo: null,  plan: null,      caso: 'walkin_visita',     altaDiasAtras: 1 },
]

// ----------------------------------------------------------------------------
// Construcción en memoria (todas las tablas dependientes de cargo/movimiento)
// ----------------------------------------------------------------------------
const personas = []
const alumnoPlanes = []
const personaGrupo = []
const cargos = []
const movimientos = []
const aplicaciones = []
const eventos = []

let pagoSeq = 0

function diasAtras(n) {
  const d = new Date(`${TODAY}T12:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}

function evento({ personaId, categoria, tipo, titulo, descripcion, monto = null, fecha, actorId = null, actorNombre = 'Sistema (cron)', metadata = {} }) {
  eventos.push({
    id: uid(), academia_id: ACADEMIA_ID, persona_id: personaId,
    categoria, tipo, titulo, descripcion, monto,
    fecha_evento: at(fecha), actor_id: actorId, actor_nombre: actorNombre,
    metadata,
  })
}

function nuevoCargo({ personaId, grupoId = null, concepto, monto, saldo, estado, fechaVenc, origen, fechaCreacion, metadata = {}, ownerId }) {
  const id = uid()
  cargos.push({
    id, academia_id: ACADEMIA_ID, persona_id: personaId, grupo_id_origen: grupoId,
    concepto, monto_original: monto, saldo_pendiente: saldo, estado_financiero: estado,
    fecha_vencimiento: fechaVenc, origen, metadata, created_by: ownerId,
    fecha_creacion: at(fechaCreacion),
  })
  return id
}

function nuevoPago({ personaId, cargoId, monto, metodo, fecha, ownerId, sobrante = 0, descripcion }) {
  pagoSeq += 1
  const movId = uid()
  movimientos.push({
    id: movId, academia_id: ACADEMIA_ID, persona_id: personaId,
    monto_total: monto, monto_disponible: sobrante, metodo_pago: metodo,
    estado: 'registrado', idempotency_key: `seed-halcones-${pagoSeq}`,
    fecha_pago: at(fecha), created_by: ownerId, created_at: at(fecha),
  })
  const aplicado = monto - sobrante
  if (cargoId && aplicado > 0) {
    aplicaciones.push({ academia_id: ACADEMIA_ID, movimiento_id: movId, cargo_id: cargoId, monto_aplicado: aplicado, estado: 'activa' })
  }
  evento({
    personaId, categoria: 'FINANZAS', tipo: 'PAGO_ABONO', titulo: 'Pago recibido',
    descripcion: descripcion || `Pago · ${metodo}`, monto, fecha, actorId: ownerId, actorNombre: 'Sistema',
    metadata: { movimiento_id: movId, monto, metodo },
  })
  return movId
}

// Mensualidad con posible descuento (hermanos/beca), replicando el shape real
// de generar_cargos_recurrentes_v1 (20260630000000_descuentos_especiales.sql).
function agregarMensualidad({ persona, y, m, estado, fechaCreacion, ownerId, descuento }) {
  const plan = PLANES[persona._planKey]
  const concepto = `Mensualidad ${MES_ES[m - 1]} ${y}`
  const periodo = `M${y}-${pad(m)}`
  const fechaVenc = ultimoDiaMes(y, m)
  let descMonto = 0, descTipo = null, descLabel = null
  if (descuento?.tipo === 'beca') {
    descMonto = Math.round(plan.monto * descuento.valor / 100)
    descTipo = 'beca'; descLabel = `Beca ${descuento.valor}%`
  } else if (descuento?.tipo === 'hermanos') {
    descMonto = Math.min(plan.monto, descuento.valor)
    descTipo = 'hermanos'; descLabel = 'Descuento Hermanos'
  }
  const neto = plan.monto - descMonto

  if (neto <= 0) {
    evento({
      personaId: persona.id, categoria: 'FINANZAS', tipo: 'DESCUENTO', titulo: descLabel,
      descripcion: `${concepto} · exento (−$${descMonto})`, fecha: fechaCreacion, actorNombre: 'Sistema (cron)',
      metadata: { descuento_tipo: descTipo, descuento_monto: descMonto, monto_bruto: plan.monto, periodo, exento: true },
    })
    return null
  }

  const cargoId = nuevoCargo({
    personaId: persona.id, concepto, monto: neto, saldo: estado === 'liquidado' ? 0 : neto,
    estado, fechaVenc, origen: 'recurrente', fechaCreacion, ownerId,
    metadata: { plan_id: plan.id, plan_nombre: plan.nombre, periodo, frecuencia: 'mensual', ...(descMonto > 0 ? { monto_bruto: plan.monto, descuento_tipo: descTipo, descuento_monto: descMonto } : {}) },
  })
  evento({
    personaId: persona.id, categoria: 'FINANZAS', tipo: 'CARGO_RECURRENTE', titulo: concepto,
    descripcion: `Cargo recurrente generado automáticamente (${plan.nombre}) por $${neto}`, monto: neto,
    fecha: fechaCreacion, actorNombre: 'Sistema (cron)', metadata: { plan_id: plan.id, periodo, cargo_id: cargoId },
  })
  if (descMonto > 0) {
    evento({
      personaId: persona.id, categoria: 'FINANZAS', tipo: 'DESCUENTO', titulo: descLabel,
      descripcion: `${concepto}: $${plan.monto} → $${neto} (−$${descMonto})`, fecha: fechaCreacion, actorNombre: 'Sistema (cron)',
      metadata: { descuento_tipo: descTipo, descuento_monto: descMonto, monto_bruto: plan.monto, periodo, cargo_id: cargoId },
    })
  }
  return { cargoId, neto }
}

function mesesHistoricos(n) {
  // Devuelve los últimos n meses (incluyendo julio 2026) como [y, m]
  const meses = []
  let y = 2026, m = 7
  for (let i = 0; i < n; i++) {
    meses.unshift([y, m])
    m -= 1
    if (m === 0) { m = 12; y -= 1 }
  }
  return meses
}

// ----------------------------------------------------------------------------
// main
// ----------------------------------------------------------------------------
async function main() {
  console.log('== 1. Creando academia, owner y staff en Supabase Cloud ==')

  const { error: acadErr } = await admin.from('academia').insert({
    id: ACADEMIA_ID,
    nombre: 'Academia Taekwondo Halcones 🦅',
    estado_tenant: 'activa',
    timezone: 'America/Mazatlan',
    config_cobro: { dias_generacion: [1], horas_minimas_recordatorio: 48 },
    config_recargos: {
      aplicar_recargos: false, // ver nota del bug de origen='automatizado' en el plan
      reglas: [{ dia: 5, tipo: 'monto_fijo', valor: 100 }, { dia: 15, tipo: 'monto_fijo', valor: 200 }],
      marcar_critico: { activo: true, dia_umbral: 15 },
    },
    multi_plan_enabled: true,
    allow_partial_payments: true,
    allow_overpayment: true,
    cobrar_inscripcion_default: true,
    monto_inscripcion_default: 300,
    automatizacion_recurrente: true,
    created_at: at('2025-08-15'),
    updated_at: at('2025-08-15'),
  })
  if (acadErr) throw acadErr

  const { data: ownerAuth, error: ownerAuthErr } = await admin.auth.admin.createUser({
    email: OWNER_EMAIL, password: PASSWORD, email_confirm: true,
    user_metadata: { nombre: 'Ricardo Ibarra' },
    app_metadata: { provider: 'email', providers: ['email'], academia_id: ACADEMIA_ID, rol: 'owner', claims_version: 1 },
  })
  if (ownerAuthErr) throw ownerAuthErr
  const OWNER_ID = ownerAuth.user.id

  const { data: staffAuth, error: staffAuthErr } = await admin.auth.admin.createUser({
    email: STAFF_EMAIL, password: PASSWORD, email_confirm: true,
    user_metadata: { nombre: 'Lupita Reyes' },
    app_metadata: { provider: 'email', providers: ['email'], academia_id: ACADEMIA_ID, rol: 'staff', claims_version: 1 },
  })
  if (staffAuthErr) throw staffAuthErr
  const STAFF_ID = staffAuth.user.id

  const { error: usuarioErr } = await admin.from('usuario').insert([
    { id: OWNER_ID, academia_id: ACADEMIA_ID, nombre: 'Ricardo', apellido: 'Ibarra', email_snapshot: OWNER_EMAIL, rol: 'owner', estado: 'activo', created_at: at('2025-08-15'), updated_at: at('2025-08-15') },
    { id: STAFF_ID, academia_id: ACADEMIA_ID, nombre: 'Lupita', apellido: 'Reyes', email_snapshot: STAFF_EMAIL, rol: 'staff', estado: 'activo', invitado_por: OWNER_ID, created_at: at('2025-09-01'), updated_at: at('2025-09-01') },
  ])
  if (usuarioErr) throw usuarioErr

  const { error: subErr } = await admin.from('suscripcion_academia').insert({
    id: uid(), academia_id: ACADEMIA_ID, plan_codigo: 'pro', estado: 'activa', is_current: true,
    max_personas: 150, max_usuarios: 5, max_grupos: null, precio_mensual: 499, moneda: 'MXN',
    fecha_inicio: at('2025-08-15'), created_by: OWNER_ID, created_at: at('2025-08-15'), updated_at: at('2025-08-15'),
  })
  if (subErr) throw subErr

  console.log('== 2. Planes de cobro y grupos ==')

  const { error: planesErr } = await admin.from('planes_cobro').insert(
    Object.values(PLANES).map(p => ({ id: p.id, academia_id: ACADEMIA_ID, nombre: p.nombre, monto: p.monto, frecuencia: 'mensual', activo: true, requiere_inscripcion: true, created_at: at('2025-08-16') }))
  )
  if (planesErr) throw planesErr

  const gruposRegulares = Object.entries(GRUPOS).map(([key, g], i) => ({
    id: g.id, academia_id: ACADEMIA_ID, nombre: g.nombre, descripcion: null, color: g.color, emoji: g.emoji,
    estado: 'activo', orden_visual: i + 1, es_temporal: false, dias_semana: g.dias,
    hora_inicio: g.hi, hora_fin: g.hf, cupo_maximo: g.cupo,
    created_by: OWNER_ID, created_at: at('2025-08-16'), updated_at: at('2025-08-16'),
  }))
  const actividades = Object.entries(ACTIVIDADES).map(([key, a]) => ({
    id: a.id, academia_id: ACADEMIA_ID, nombre: a.nombre, emoji: a.emoji, color: null,
    estado: 'activo', orden_visual: 0, es_temporal: true, fecha_inicio: a.fecha, fecha_fin: a.fecha,
    costo_actividad: a.costo, created_by: OWNER_ID, created_at: at('2025-08-16'), updated_at: at('2025-08-16'),
  }))
  const { error: gruposErr } = await admin.from('grupo').insert([...gruposRegulares, ...actividades])
  if (gruposErr) throw gruposErr

  console.log('== 3. Construyendo alumnos, cargos, pagos y timeline en memoria ==')

  for (const [i, p] of ROSTER.entries()) {
    const id = uid()
    const altaFecha = p.altaDiasAtras != null ? diasAtras(p.altaDiasAtras) : diasAtras(30)
    const creadoPor = (p.key === 'p29' || p.key === 'p30') ? STAFF_ID : OWNER_ID
    const persona = {
      id, academia_id: ACADEMIA_ID, nombre: p.nombre, apellido: p.apellido,
      telefono_whatsapp: `669${String(1000000 + i * 37).slice(-7)}`,
      etiqueta: 'alumno', estado_registro: 'activo',
      notas_internas: p.notaInterna || null,
      created_by: creadoPor, created_at: at(altaFecha), updated_at: at(altaFecha),
      descuento_hermanos_activo: !!p.hermanos, descuento_hermanos_monto: p.hermanos || 0,
      beca_activa: !!p.beca, beca_porcentaje: p.beca || 0,
    }
    personas.push(persona)
    persona._key = p.key
    persona._grupoKey = p.grupo
    persona._planKey = p.plan

    evento({ personaId: id, categoria: 'OPERATIVO', tipo: 'REGISTRO', titulo: 'Alumno registrado', descripcion: `${p.nombre} ${p.apellido} se registró en la academia`, fecha: altaFecha, actorId: creadoPor, actorNombre: creadoPor === STAFF_ID ? 'Lupita Reyes' : 'Ricardo Ibarra' })

    // --- grupo regular ---
    if (p.grupo) {
      personaGrupo.push({ academia_id: ACADEMIA_ID, persona_id: id, grupo_id: GRUPOS[p.grupo].id, estado: 'activo', fecha_inscripcion: at(altaFecha), created_by: creadoPor })
      evento({ personaId: id, categoria: 'OPERATIVO', tipo: 'INSCRIPCION_NUEVO_GRUPO', titulo: 'Alumno asignado a grupo', descripcion: GRUPOS[p.grupo].nombre, fecha: altaFecha, actorId: creadoPor, actorNombre: creadoPor === STAFF_ID ? 'Lupita Reyes' : 'Ricardo Ibarra', metadata: { grupo_id: GRUPOS[p.grupo].id } })
    }

    // --- plan + mensualidades ---
    if (p.plan) {
      alumnoPlanes.push({ academia_id: ACADEMIA_ID, alumno_id: id, plan_cobro_id: PLANES[p.plan].id, created_at: at(altaFecha) })

      const descuento = p.hermanos ? { tipo: 'hermanos', valor: p.hermanos } : (p.beca ? { tipo: 'beca', valor: p.beca } : null)

      if (p.historicoMeses) {
        for (const [y, m] of mesesHistoricos(p.historicoMeses)) {
          const fechaCreacion = ymd(y, m, 1)
          const { cargoId } = agregarMensualidad({ persona, y, m, estado: 'liquidado', fechaCreacion, ownerId: OWNER_ID, descuento: null })
          nuevoPago({ personaId: id, cargoId, monto: PLANES[p.plan].monto, metodo: metodoPago(i + m), fecha: ymd(y, m, 3), ownerId: OWNER_ID })
        }
      } else if (p.caso === 'beca100') {
        agregarMensualidad({ persona, y: 2026, m: 7, estado: 'pendiente', fechaCreacion: TODAY, ownerId: OWNER_ID, descuento })
      } else if (p.caso === 'al_dia') {
        const { cargoId, neto } = agregarMensualidad({ persona, y: 2026, m: 7, estado: 'liquidado', fechaCreacion: '2026-07-01', ownerId: OWNER_ID, descuento })
        nuevoPago({ personaId: id, cargoId, monto: neto, metodo: metodoPago(i), fecha: '2026-07-02', ownerId: OWNER_ID })
      } else if (p.caso === 'pendiente') {
        agregarMensualidad({ persona, y: 2026, m: 7, estado: 'pendiente', fechaCreacion: '2026-07-01', ownerId: OWNER_ID, descuento })
      } else if (p.caso === 'atrasado') {
        agregarMensualidad({ persona, y: 2026, m: 6, estado: 'vencido', fechaCreacion: '2026-06-01', ownerId: OWNER_ID, descuento: null })
        agregarMensualidad({ persona, y: 2026, m: 7, estado: 'pendiente', fechaCreacion: '2026-07-01', ownerId: OWNER_ID, descuento: null })
      } else if (p.caso === 'urgente_2m') {
        agregarMensualidad({ persona, y: 2026, m: 5, estado: 'vencido', fechaCreacion: '2026-05-01', ownerId: OWNER_ID, descuento: null })
        agregarMensualidad({ persona, y: 2026, m: 6, estado: 'vencido', fechaCreacion: '2026-06-01', ownerId: OWNER_ID, descuento: null })
        agregarMensualidad({ persona, y: 2026, m: 7, estado: 'pendiente', fechaCreacion: '2026-07-01', ownerId: OWNER_ID, descuento: null })
      } else if (p.caso === 'urgente_antiguo') {
        agregarMensualidad({ persona, y: 2026, m: 7, estado: 'pendiente', fechaCreacion: '2026-07-01', ownerId: OWNER_ID, descuento: null })
        const cargoAntiguoId = nuevoCargo({ personaId: id, concepto: 'Uniforme oficial de competencia (Nota: pago diferido acordado con el padre)', monto: 450, saldo: 450, estado: 'vencido', fechaVenc: '2026-05-01', origen: 'manual', fechaCreacion: '2026-04-20', ownerId: OWNER_ID, metadata: { manual: true, nota_modificacion: 'pago diferido acordado con el padre' } })
        evento({ personaId: id, categoria: 'FINANZAS', tipo: 'CARGO_UNICO', titulo: 'Cargo individual', descripcion: 'Uniforme oficial de competencia', monto: 450, fecha: '2026-04-20', actorId: OWNER_ID, actorNombre: 'Ricardo Ibarra', metadata: { cargo_id: cargoAntiguoId } })
      } else if (p.caso === 'parcial') {
        const { cargoId } = agregarMensualidad({ persona, y: 2026, m: 7, estado: 'pendiente', fechaCreacion: '2026-07-01', ownerId: OWNER_ID, descuento: null })
        const abono = 300
        const cargo = cargos.find(c => c.id === cargoId)
        cargo.saldo_pendiente = cargo.monto_original - abono
        cargo.estado_financiero = 'parcial'
        nuevoPago({ personaId: id, cargoId, monto: abono, metodo: metodoPago(i), fecha: '2026-07-02', ownerId: OWNER_ID, descripcion: 'Abono · efectivo' })
      } else if (p.caso === 'saldo_favor') {
        const { cargoId } = agregarMensualidad({ persona, y: 2026, m: 7, estado: 'liquidado', fechaCreacion: '2026-07-01', ownerId: OWNER_ID, descuento: null })
        nuevoPago({ personaId: id, cargoId, monto: 900, metodo: 'transferencia', fecha: '2026-07-02', ownerId: OWNER_ID, sobrante: 250, descripcion: 'Pago · transferencia (incluye saldo a favor)' })
      }
    }

    // --- casos especiales adicionales ---
    if (p.inscripcion) {
      const cId = nuevoCargo({ personaId: id, concepto: 'Inscripción', monto: 300, saldo: 0, estado: 'liquidado', fechaVenc: null, origen: 'inscripcion', fechaCreacion: altaFecha, ownerId: OWNER_ID, metadata: { manual: true } })
      nuevoPago({ personaId: id, cargoId: cId, monto: 300, metodo: 'efectivo', fecha: altaFecha, ownerId: OWNER_ID, descripcion: 'Pago · efectivo' })
      evento({ personaId: id, categoria: 'FINANZAS', tipo: 'INSCRIPCION', titulo: 'Cargo: Inscripción', descripcion: 'Inscripción', monto: 300, fecha: altaFecha, actorId: OWNER_ID, actorNombre: 'Ricardo Ibarra', metadata: { cargo_id: cId } })
    }

    if (p.cargoAnulado) {
      const viejoId = nuevoCargo({ personaId: id, concepto: 'Cargo por error (uniforme duplicado)', monto: 200, saldo: 0, estado: 'anulado', fechaVenc: '2026-05-20', origen: 'manual', fechaCreacion: '2026-05-05', ownerId: OWNER_ID, metadata: { anulado: true } })
      evento({ personaId: id, categoria: 'FINANZAS', tipo: 'CARGO_UNICO', titulo: 'Cargo individual', descripcion: 'Cargo por error (uniforme duplicado)', monto: 200, fecha: '2026-05-05', actorId: OWNER_ID, actorNombre: 'Ricardo Ibarra', metadata: { cargo_id: viejoId } })
      evento({ personaId: id, categoria: 'FINANZAS', tipo: 'ANULACION_CARGO', titulo: 'Cargo anulado', descripcion: 'Cargo duplicado por error de captura', monto: 200, fecha: '2026-05-06', actorId: OWNER_ID, actorNombre: 'Ricardo Ibarra', metadata: { cargo_id: viejoId, motivo: 'Cargo duplicado por error de captura' } })
    }

    if (p.pagoAnulado) {
      const kitId = nuevoCargo({ personaId: id, concepto: 'Kit de competencia', monto: 300, saldo: 0, estado: 'liquidado', fechaVenc: null, origen: 'manual', fechaCreacion: '2026-06-10', ownerId: OWNER_ID, metadata: { manual: true } })
      evento({ personaId: id, categoria: 'FINANZAS', tipo: 'CARGO_UNICO', titulo: 'Cargo individual', descripcion: 'Kit de competencia', monto: 300, fecha: '2026-06-10', actorId: OWNER_ID, actorNombre: 'Ricardo Ibarra', metadata: { cargo_id: kitId } })
      nuevoPago({ personaId: id, cargoId: kitId, monto: 300, metodo: 'tarjeta', fecha: '2026-06-10', ownerId: OWNER_ID })
      // Cobro duplicado por error de terminal: no se aplica a ningún cargo, y se anula.
      const dupMovId = uid()
      movimientos.push({ id: dupMovId, academia_id: ACADEMIA_ID, persona_id: id, monto_total: 300, monto_disponible: 300, metodo_pago: 'tarjeta', estado: 'anulado', idempotency_key: `seed-halcones-dup-${id}`, fecha_pago: at('2026-06-10'), created_by: OWNER_ID, created_at: at('2026-06-10') })
      evento({ personaId: id, categoria: 'FINANZAS', tipo: 'PAGO_ABONO', titulo: 'Pago recibido', descripcion: 'Pago · tarjeta (cobro duplicado por error de terminal)', monto: 300, fecha: '2026-06-10', actorId: OWNER_ID, actorNombre: 'Ricardo Ibarra', metadata: { movimiento_id: dupMovId, monto: 300, metodo: 'tarjeta' } })
      evento({ personaId: id, categoria: 'FINANZAS', tipo: 'ANULACION_PAGO', titulo: 'Pago cancelado', descripcion: 'Cobro duplicado por error de terminal', monto: 300, fecha: '2026-06-11', actorId: OWNER_ID, actorNombre: 'Ricardo Ibarra', metadata: { movimiento_id: dupMovId, monto_anulado: 300, motivo: 'Cobro duplicado por error de terminal' } })
    }

    if (p.recargoHistorico) {
      const recId = nuevoCargo({ personaId: id, concepto: 'Recargo por mora (5 días) — Junio 2026', monto: 100, saldo: 100, estado: 'vencido', fechaVenc: '2026-07-05', origen: 'ajuste', fechaCreacion: '2026-07-05', ownerId: OWNER_ID, metadata: { regla_dia: 5, regla_tipo: 'monto_fijo' } })
      evento({ personaId: id, categoria: 'FINANZAS', tipo: 'RECARGO_TARDIO', titulo: 'Recargo por atraso', descripcion: '5 días de retraso · Mensualidad Junio 2026', monto: 100, fecha: '2026-07-05', actorNombre: 'Sistema', metadata: { cargo_id: recId, regla_dia: 5 } })
    }

    if (p.notaInterna) {
      evento({ personaId: id, categoria: 'OPERATIVO', tipo: 'NOTA', titulo: 'Nota interna', descripcion: p.notaInterna, fecha: '2026-07-01', actorId: OWNER_ID, actorNombre: 'Ricardo Ibarra' })
    }

    if (p.mensajeAuto) {
      evento({ personaId: id, categoria: 'COMUNICACION', tipo: 'MENSAJE_AUTOMATICO', titulo: 'Recordatorio de pago enviado', descripcion: 'Recordatorio por WhatsApp de mensualidad vencida', fecha: diasAtras(2), actorNombre: 'Sistema' })
    }
  }

  // --- inscripciones a actividades ---
  // Alumnos cuya cuota de actividad se deja SIN PAGAR a propósito (para mostrar
  // el caso real de "debe una actividad"). El resto la paga al inscribirse, para
  // no arrastrar a alumnos "al día" a "pendiente" solo por una cuota de examen/torneo.
  const NO_PAGAR_ACTIVIDAD = new Set(['p09', 'p26', 'p28', 'p29'])
  for (const [actKey, keys] of Object.entries(INSCRIPCIONES_ACTIVIDAD)) {
    const act = ACTIVIDADES[actKey]
    for (const k of keys) {
      const persona = personas.find(p => p._key === k)
      const fechaInsc = diasAtras(3)
      personaGrupo.push({ academia_id: ACADEMIA_ID, persona_id: persona.id, grupo_id: act.id, estado: 'activo', fecha_inscripcion: at(fechaInsc), created_by: OWNER_ID })
      evento({ personaId: persona.id, categoria: 'OPERATIVO', tipo: 'INSCRIPCION_ACTIVIDAD', titulo: 'Actividad asignada', descripcion: act.nombre, fecha: fechaInsc, actorId: OWNER_ID, actorNombre: 'Ricardo Ibarra', metadata: { grupo_id: act.id } })
      const pagar = !NO_PAGAR_ACTIVIDAD.has(k)
      const cargoId = nuevoCargo({ personaId: persona.id, grupoId: act.id, concepto: act.nombre, monto: act.costo, saldo: pagar ? 0 : act.costo, estado: pagar ? 'liquidado' : 'pendiente', fechaVenc: null, origen: 'actividad', fechaCreacion: fechaInsc, ownerId: OWNER_ID, metadata: { actividad: true, cargo_unico: true, grupo_id: act.id } })
      evento({ personaId: persona.id, categoria: 'FINANZAS', tipo: 'CARGO_UNICO', titulo: 'Cargo individual', descripcion: act.nombre, monto: act.costo, fecha: fechaInsc, actorId: OWNER_ID, actorNombre: 'Ricardo Ibarra', metadata: { cargo_id: cargoId } })
      if (pagar) {
        nuevoPago({ personaId: persona.id, cargoId, monto: act.costo, metodo: metodoPago(parseInt(k.slice(1), 10)), fecha: fechaInsc, ownerId: OWNER_ID })
      }
    }
  }

  // --- Héctor: clase suelta (visita_express), ya pagada ---
  {
    const hector = personas.find(p => p._key === 'p30')
    const cargoId = nuevoCargo({ personaId: hector.id, concepto: 'Clase Suelta (prueba)', monto: 150, saldo: 0, estado: 'liquidado', fechaVenc: null, origen: 'visita_express', fechaCreacion: diasAtras(1), ownerId: STAFF_ID, metadata: {} })
    evento({ personaId: hector.id, categoria: 'FINANZAS', tipo: 'CARGO_UNICO', titulo: 'Cargo individual', descripcion: 'Clase Suelta (prueba)', monto: 150, fecha: diasAtras(1), actorId: STAFF_ID, actorNombre: 'Lupita Reyes', metadata: { cargo_id: cargoId } })
    nuevoPago({ personaId: hector.id, cargoId, monto: 150, metodo: 'efectivo', fecha: diasAtras(1), ownerId: STAFF_ID })
  }

  // --- aviso grupal (Infantil) ---
  {
    const infantiles = personas.filter(p => p._grupoKey === 'inf')
    for (const persona of infantiles) {
      evento({ personaId: persona.id, categoria: 'OPERATIVO', tipo: 'AVISO_GRUPAL', titulo: 'Aviso grupal', descripcion: 'Cambio de horario temporal por lluvia esta semana', fecha: diasAtras(14), actorId: OWNER_ID, actorNombre: 'Ricardo Ibarra', metadata: { grupo_id: GRUPOS.inf.id } })
    }
  }

  console.log(`   personas=${personas.length} cargos=${cargos.length} movimientos=${movimientos.length} aplicaciones=${aplicaciones.length} eventos=${eventos.length}`)

  console.log('== 4. Insertando personas ==')
  const { data: personasInsertadas, error: personaErr } = await admin.from('persona').insert(personas.map(({ _key, _grupoKey, _planKey, ...rest }) => rest)).select('id, nombre, apellido, share_code')
  if (personaErr) throw personaErr

  console.log('== 5. Insertando alumno_planes y persona_grupo ==')
  if (alumnoPlanes.length) { const { error } = await admin.from('alumno_planes').insert(alumnoPlanes); if (error) throw error }
  if (personaGrupo.length) { const { error } = await admin.from('persona_grupo').insert(personaGrupo); if (error) throw error }

  console.log('== 6. Insertando cargos ==')
  if (cargos.length) { const { error } = await admin.from('cargo').insert(cargos); if (error) throw error }

  console.log('== 7. Insertando movimientos y aplicaciones ==')
  if (movimientos.length) { const { error } = await admin.from('movimiento').insert(movimientos); if (error) throw error }
  if (aplicaciones.length) { const { error } = await admin.from('aplicacion_movimiento').insert(aplicaciones); if (error) throw error }

  console.log('== 8. Insertando evento_timeline ==')
  // Insertar en lotes para no exceder límites de payload.
  for (let i = 0; i < eventos.length; i += 200) {
    const lote = eventos.slice(i, i + 200)
    const { error } = await admin.from('evento_timeline').insert(lote)
    if (error) throw error
  }

  console.log('== 9. Verificación de conteos ==')
  const tablas = ['persona', 'grupo', 'planes_cobro', 'cargo', 'movimiento', 'aplicacion_movimiento', 'evento_timeline', 'alumno_planes', 'persona_grupo']
  for (const t of tablas) {
    const { count, error } = await admin.from(t).select('*', { count: 'exact', head: true }).eq('academia_id', ACADEMIA_ID)
    if (error) throw error
    console.log(`   ${t}: ${count}`)
  }

  console.log('== 10. Login de prueba (owner) ==')
  const anon = createClient(SUPABASE_URL, ANON_KEY)
  const { data: loginData, error: loginErr } = await anon.auth.signInWithPassword({ email: OWNER_EMAIL, password: PASSWORD })
  if (loginErr) {
    console.error('   LOGIN FALLÓ:', loginErr.message)
  } else {
    console.log(`   Login OK — user id ${loginData.user.id}`)
  }

  const luis = personasInsertadas.find(p => p.nombre === 'Luis Ángel')
  console.log('\n== Listo ==')
  console.log(`Academia ID: ${ACADEMIA_ID}`)
  console.log(`Owner: ${OWNER_EMAIL} / ${PASSWORD}`)
  console.log(`Staff: ${STAFF_EMAIL} / ${PASSWORD}`)
  if (luis) console.log(`Ficha pública de ejemplo (pago parcial): https://sipra-three.vercel.app/historial/${luis.share_code}`)
}

main().catch((err) => {
  console.error('ERROR:', err)
  process.exit(1)
})
