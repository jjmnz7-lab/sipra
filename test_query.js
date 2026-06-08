import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

async function testQuery() {
  const { data: cargos, error } = await supabase
    .from('cargo')
    .select(`
      id, concepto, monto_original, saldo_pendiente, fecha_vencimiento, estado_financiero, persona_id,
      persona (nombre, apellido)
    `)
    .limit(1)

  console.log('Result:', JSON.stringify(cargos, null, 2))
  console.log('Error:', error)
}

testQuery()
