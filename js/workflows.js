const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  // Seules les requêtes POST sont acceptées
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Initialiser le client Supabase avec la clé service (pour avoir les droits d'écriture)
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { workflowId } = req.body;
  if (!workflowId) {
    return res.status(400).json({ error: 'workflowId manquant' });
  }

  try {
    // Récupérer le workflow depuis la base
    const { data: workflow, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (error || !workflow) {
      console.error('Workflow non trouvé:', workflowId, error);
      return res.status(404).json({ error: 'Workflow non trouvé' });
    }

    // Simuler une exécution (vous pourrez plus tard y mettre la vraie logique)
    console.log(`Exécution du workflow "${workflow.name}" (ID: ${workflowId})`);

    // Optionnel : enregistrer un log d'exécution (si la table workflow_logs existe)
    try {
      await supabase.from('workflow_logs').insert({
        workflow_id: workflowId,
        status: 'success',
        executed_at: new Date().toISOString()
      });
    } catch (logErr) {
      console.warn('Impossible d’écrire dans workflow_logs (peut-être table manquante)');
    }

    // Réponse de succès
    res.status(200).json({ 
      success: true, 
      message: 'Workflow exécuté avec succès',
      workflow: workflow.name
    });
  } catch (err) {
    console.error('Erreur dans execute-workflow:', err);
    res.status(500).json({ error: err.message });
  }
};