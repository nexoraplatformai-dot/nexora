const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  console.log('=== execute-workflow called ===');
  console.log('Method:', req.method);
  console.log('Body:', req.body);

  // Vérifier la méthode
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Vérifier les variables d'env
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase environment variables');
    return res.status(500).json({ error: 'Configuration error' });
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

    // Simuler une exécution (remplacer par la vraie logique plus tard)
    // Par exemple, envoyer un email, déclencher un webhook, etc.

    // Essayer d'enregistrer un log (si la table existe)
    try {
      const { error: logError } = await supabase
        .from('workflow_logs')
        .insert({
          workflow_id: workflowId,
          status: 'success',
          executed_at: new Date().toISOString()
        });

      if (logError) {
        // Si la table n'existe pas, on log juste l'erreur mais on ne fait pas échouer la requête
        console.warn('Could not insert into workflow_logs (maybe table missing):', logError.message);
      } else {
        console.log('Execution logged successfully');
      }
    } catch (logErr) {
      console.warn('Error while logging execution:', logErr.message);
    }

    // Répondre avec succès
    return res.status(200).json({ 
      success: true, 
      message: 'Workflow exécuté avec succès',
      workflowId: workflow.id,
      name: workflow.name
    });

  } catch (err) {
    console.error('Unhandled error in execute-workflow:', err);
    return res.status(500).json({ error: 'Erreur interne du serveur', details: err.message });
  }
};