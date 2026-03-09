const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  console.log('=== execute-workflow called ===');
  console.log('Method:', req.method);
  console.log('Body:', req.body);

  // Vérifier la méthode HTTP
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Vérifier les variables d'environnement
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase environment variables');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // Initialiser le client Supabase
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
      console.error('❌ Supabase error:', error);
      return res.status(500).json({ error: 'Database error', details: error.message });
    }
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow non trouvé' });
    }

    // Simuler l'exécution (remplacer par votre logique réelle)
    console.log('✅ Workflow exécuté:', workflow.name);

    // Enregistrer un log d'exécution (optionnel)
    try {
      await supabase.from('workflow_logs').insert({
        workflow_id: workflowId,
        status: 'success',
        executed_at: new Date().toISOString()
      });
    } catch (logErr) {
      console.warn('⚠️ Échec de l’insertion dans workflow_logs :', logErr.message);
    }

    // Réponse JSON de succès
    return res.status(200).json({ 
      success: true, 
      message: 'Workflow exécuté avec succès',
      workflowId: workflow.id,
      name: workflow.name
    });

  } catch (err) {
    console.error('❌ Erreur non gérée:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
};