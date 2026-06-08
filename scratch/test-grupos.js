const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

async function testQuery() {
  const { data, error } = await supabase
    .from('grupo')
    .select(`
      id, nombre, descripcion, estado, costo_mensualidad, costo_inscripcion, color, emoji,
      persona_grupo (
        persona (estado_global)
      )
    `)
    .eq('estado', 'activo')
    .order('nombre', { ascending: true });

  console.log('Result:', JSON.stringify(data, null, 2));
  console.log('Error:', error);
}

testQuery();
