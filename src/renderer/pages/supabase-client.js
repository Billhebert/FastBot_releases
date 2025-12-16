const { createClient } = supabase;

const SUPABASE_URL = 'https://dqiyvfpntkitbjqieklb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxaXl2ZnBudGtpdGJqcWlla2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0MDk3MTUsImV4cCI6MjA4MDk4NTcxNX0.4k05eS7EFPm3UYM357_lHhh4oze2_wg-bMNWaRriTeI';

const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkAccess(userId) {
  const { data, error } = await supabaseClient
    .from('users')
    .select('access_expires_at, role')
    .eq('id', userId)
    .single();

  if (error) return { hasAccess: false };

  const now = new Date();
  const expiresAt = new Date(data.access_expires_at);
  
  return {
    hasAccess: now < expiresAt,
    role: data.role,
    expiresAt: data.access_expires_at
  };
}

async function trackMacroExecution(userId, macroId) {
  await supabaseClient.from('macro_executions').insert({
    user_id: userId,
    macro_id: macroId,
    executed_at: new Date().toISOString()
  });
}

async function getMostExecutedMacros(limit = 10) {
  const { data } = await supabaseClient
    .rpc('get_most_executed_macros', { limit_count: limit });
  return data;
}

async function saveRegistration(entry) {
  await supabaseClient.from('registrations').insert({
    ...entry,
    created_at: entry.created_at || new Date().toISOString()
  });
}
