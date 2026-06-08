const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

async function main() {
  console.log('Iniciando inyección de claims de seguridad (RLS)...');
  
  const envFile = fs.readFileSync('.env.local', 'utf8');
  let supabaseUrl = '';
  let serviceRoleKey = '';
  
  envFile.split('\n').forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) serviceRoleKey = line.split('=')[1].trim();
  });

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const targets = [
    { email: 'admin@ritmo.com', academia_id: '11111111-1111-1111-1111-111111111111', rol: 'owner' },
    { email: 'staff@ritmo.com', academia_id: '11111111-1111-1111-1111-111111111111', rol: 'staff' },
    { email: 'admin@dojo.com',  academia_id: '22222222-2222-2222-2222-222222222222', rol: 'owner' },
    { email: 'staff@dojo.com',  academia_id: '22222222-2222-2222-2222-222222222222', rol: 'staff' },
  ];

  const { data: { users } } = await supabase.auth.admin.listUsers();

  for (const t of targets) {
    const user = users.find(u => u.email === t.email);
    if (user) {
      console.log(`Actualizando claims para ${t.email}...`);
      await supabase.auth.admin.updateUserById(user.id, {
        app_metadata: { 
          ...user.app_metadata,
          academia_id: t.academia_id,
          rol: t.rol,
          claims_version: 1
        }
      });
    }
  }

  console.log('¡Claims RLS inyectados exitosamente!');
}

main().catch(console.error);
