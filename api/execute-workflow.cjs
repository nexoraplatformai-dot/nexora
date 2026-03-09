import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  console.log('=== execute-workflow called ===');
  console.log('Method:', req.method);
  console.log('Body:', req.body);

  if (req.method !== 'POST') {
    console.log('Method not allowed');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase environment variables');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { workflowId } = req.body;
  if (!workflowId) {
    return res.status(400).json({ error: 'workflowId manquant' });
  }

  try {
    const { data: workflow, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (error) {
      console.error('❌ Supabase error:', error);
      return res.status(500).json({ error: 'Database error', details: error.message });
    }
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow non trouvé' });
    }

    console.log('✅ Workflow found:', workflow.name);

    // Log d'exécution (optionnel)
    try {
      await supabase.from('workflow_logs').insert({
        workflow_id: workflowId,
        status: 'success',
        executed_at: new Date().toISOString()
      });
    } catch (logErr) {
      console.warn('⚠️ Logging failed:', logErr.message);
    }

    return res.status(200).json({ success: true, message: 'Workflow exécuté', name: workflow.name });

  } catch (err) {
    console.error('❌ Unhandled error:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
}