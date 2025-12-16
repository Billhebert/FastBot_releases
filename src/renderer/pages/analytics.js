async function trackEvent(eventName, eventData = {}) {
  const user = getCurrentUser();
  if (!user) return;
  
  try {
    await supabaseClient.from('analytics_events').insert({
      user_id: user.id,
      event_name: eventName,
      event_data: eventData,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao registrar evento:', error);
  }
}

async function getMacroStats(limit = 10) {
  try {
    const { data } = await supabaseClient
      .from('macro_executions')
      .select(`
        macro_id,
        macros(name),
        count
      `)
      .order('count', { ascending: false })
      .limit(limit);
    
    return data;
  } catch (error) {
    console.error('Erro ao buscar stats:', error);
    return [];
  }
}

async function getUserStats(userId) {
  try {
    const [executions, macros] = await Promise.all([
      supabaseClient
        .from('macro_executions')
        .select('*', { count: 'exact' })
        .eq('user_id', userId),
      supabaseClient
        .from('macros')
        .select('*', { count: 'exact' })
    ]);
    
    return {
      totalExecutions: executions.count,
      totalMacros: macros.count
    };
  } catch (error) {
    console.error('Erro ao buscar estatísticas do usuário:', error);
    return { totalExecutions: 0, totalMacros: 0 };
  }
}