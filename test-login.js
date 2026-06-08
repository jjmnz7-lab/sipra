const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gbimkrnsmeqsitbaxnrk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdiaW1rcm5zbWVxc2l0YmF4bnJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5Mzc5OTYsImV4cCI6MjA5NDUxMzk5Nn0.qoT8WRR5j-Y_SWpDhAuku2rXDMm-KI3wWTrYAGsNhS4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLogin() {
  console.log('Intentando hacer login con admin@ritmo.com / password123 ...');
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin@ritmo.com',
    password: 'password123',
  });

  if (error) {
    console.error('ERROR COMPLETO:', JSON.stringify(error, null, 2));
    console.error('Mensaje:', error.message);
  } else {
    console.log('¡LOGIN EXITOSO!');
    console.log('User ID:', data.user.id);
  }
}

testLogin();
