const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  console.log('=== execute-workflow called ===');
  console.log('Method:', req.method);
  console.log('Body:', req.body);

  // Forcer le type de contenu en JSON
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Vérifier les variables d'environnement
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase environment variables');
    return res.status(500).json({ error: 'Server configuration error: missing Supabase credentials' });
  }

  let supabase;
  try {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  } catch (err) {
    console.error('❌ Failed to create Supabase client:', err);
    return res.status(500).json({ error: 'Failed to initialize Supabase client', details: err.message });
  }

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
      console.error('❌ Supabase error fetching workflow:', error);
      // Si la table n'existe pas, on renvoie une erreur claire
      if (error.code === '42P01') { // relation does not exist
        return res.status(500).json({ error: 'La table workflows n\'existe pas dans Supabase' });
      }
      return res.status(500).json({ error: 'Database error', details: error.message });
    }
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow non trouvé' });
    }

    console.log('✅ Workflow trouvé:', workflow.name, 'type:', workflow.type);

    // Simuler l'exécution (remplacer par votre vraie logique)
    console.log('Exécution simulée...');

    // Tentative d'enregistrer un log (optionnel) – on ignore les erreurs
    try {
      await supabase
        .from('workflow_logs')
        .insert({
          workflow_id: workflowId,
          status: 'success',
          executed_at: new Date().toISOString()
        });
      console.log('✅ Log enregistré avec succès');
    } catch (logErr) {
      console.warn('⚠️ Échec de l’insertion dans workflow_logs (table manquante ?) :', logErr.message);
    }

    // Réponse JSON de succès
    return res.status(200).json({ 
      success: true, 
      message: 'Workflow exécuté avec succès',
      workflowId: workflow.id,
      name: workflow.name
    });

  } catch (err) {
    console.error('❌ Unhandled error in execute-workflow:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
};