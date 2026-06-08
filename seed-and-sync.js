const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

async function main() {
  console.log('Iniciando sincronización de Auth...');
  
  // 1. Leer variables de entorno
  const envFile = fs.readFileSync('.env.local', 'utf8');
  let supabaseUrl = '';
  let serviceRoleKey = '';
  
  envFile.split('\n').forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) serviceRoleKey = line.split('=')[1].trim();
  });

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Falta URL o SERVICE_ROLE_KEY en .env.local');
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // 2. Definir los usuarios a asegurar
  const targetUsers = [
    { email: 'admin@ritmo.com', password: 'password123', varName: 'v_owner1_id' },
    { email: 'staff@ritmo.com', password: 'password123', varName: 'v_staff1_id' },
    { email: 'admin@dojo.com', password: 'password123', varName: 'v_owner2_id' },
    { email: 'staff@dojo.com', password: 'password123', varName: 'v_staff2_id' },
  ];

  const userMapping = {};

  // 3. Crear o actualizar cada usuario
  for (const tu of targetUsers) {
    console.log(`Procesando ${tu.email}...`);
    // Buscar si existe
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    let existingUser = users.find(u => u.email === tu.email);

    if (existingUser) {
      console.log(`  El usuario ya existe. Forzando reseteo de password y confirmación...`);
      await supabase.auth.admin.updateUserById(existingUser.id, { 
        password: tu.password,
        email_confirm: true
      });
      userMapping[tu.varName] = existingUser.id;
    } else {
      console.log(`  Creando usuario nuevo...`);
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: tu.email,
        password: tu.password,
        email_confirm: true
      });
      if (createError) throw createError;
      userMapping[tu.varName] = newUser.user.id;
    }
  }

  // 4. Leer y actualizar seed.sql
  console.log('Actualizando seed.sql...');
  let seedSql = fs.readFileSync('supabase/seed.sql', 'utf8');

  // Reemplazar los UUIDs
  for (const [varName, uuid] of Object.entries(userMapping)) {
    const regex = new RegExp(`${varName}\\s+UUID\\s+:=\\s+'[^']+';`, 'g');
    seedSql = seedSql.replace(regex, `${varName} UUID := '${uuid}';`);
  }

  // Borrar los bloques de inserción manual de auth (usaremos split/replace para ser certeros)
  const authUsersStart = '-- 3. INYECCIÓN AUTH.USERS';
  const academiasStart = '-- 4. ACADEMIAS Y SUSCRIPCIONES';
  
  if (seedSql.includes(authUsersStart) && seedSql.includes(academiasStart)) {
    const beforeAuth = seedSql.substring(0, seedSql.indexOf(authUsersStart));
    const afterAuth = seedSql.substring(seedSql.indexOf(academiasStart));
    seedSql = beforeAuth + '\n  ' + afterAuth;
  }

  fs.writeFileSync('supabase/seed.sql', seedSql);
  console.log('¡Sincronización completada! seed.sql ha sido actualizado con los UUIDs reales.');
}

main().catch(console.error);
