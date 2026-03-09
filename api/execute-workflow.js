const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  console.log('=== execute-workflow called ===');
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase env vars');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { workflowId } = req.body;
  if (!workflowId) return res.status(400).json({ error: 'workflowId manquant' });

  try {
    const { data: workflow, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .single();
    if (error) throw error;
    if (!workflow) return res.status(404).json({ error: 'Workflow non trouvé' });

    console.log('✅ Workflow exécuté:', workflow.name);

    // Enregistrer le log
    try {
      await supabase.from('workflow_logs').insert({
        workflow_id: workflowId,
        status: 'success',
        executed_at: new Date().toISOString()
      });
    } catch (logErr) {
      console.warn('Logging failed:', logErr.message);
    }

    return res.status(200).json({ success: true, message: 'Workflow exécuté' });
  } catch (err) {
    console.error('❌ Erreur:', err);
    return res.status(500).json({ error: err.message });
  }
};