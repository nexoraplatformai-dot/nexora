const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  console.log('=== execute-workflow called ===');
  console.log('Method:', req.method);
  console.log('Body:', req.body);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Vérifier les variables d'env
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase env variables');
    return res.status(500).json({ error: 'Configuration error: missing Supabase credentials' });
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
    // Récupérer le workflow
    const { data: workflow, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (error) {
      console.error('Supabase error fetching workflow:', error);
      return res.status(404).json({ error: 'Workflow non trouvé', details: error.message });
    }

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow non trouvé' });
    }

    console.log('Workflow found:', workflow.name);

    // Ici vous mettrez la logique d'exécution (Google Calendar, Twilio, etc.)
    // Pour l'instant, on simule un succès

    // Optionnel : enregistrer un log dans workflow_logs (si la table existe)
    try {
      await supabase.from('workflow_logs').insert({
        workflow_id: workflowId,
        status: 'success',
        executed_at: new Date().toISOString()
      });
    } catch (logErr) {
      console.warn('Could not insert into workflow_logs:', logErr.message);
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Workflow exécuté avec succès',
      workflow: workflow.name
    });

  } catch (err) {
    console.error('Unhandled error in execute-workflow:', err);
    return res.status(500).json({ 
      error: 'Erreur serveur', 
      details: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};