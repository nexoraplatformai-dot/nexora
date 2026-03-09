const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  console.log('=== execute-workflow called ===');
  console.log('Method:', req.method);
  console.log('Body:', req.body);

  // Vérifier la méthode HTTP
  if (req.method !== 'POST') {
    console.log('Method not allowed');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Vérifier les variables d'environnement
  if (!process.env.SUPABASE_URL) {
    console.error('❌ SUPABASE_URL manquante');
    return res.status(500).json({ error: 'Configuration error: missing SUPABASE_URL' });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY manquante');
    return res.status(500).json({ error: 'Configuration error: missing SERVICE_ROLE_KEY' });
  }

  // Initialiser le client Supabase (try/catch pour l'initialisation)
  let supabase;
  try {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  } catch (err) {
    console.error('❌ Erreur lors de la création du client Supabase:', err);
    return res.status(500).json({ error: 'Erreur de connexion à la base de données' });
  }

  const { workflowId } = req.body;
  if (!workflowId) {
    console.log('workflowId manquant');
    return res.status(400).json({ error: 'workflowId manquant' });
  }

  // Récupérer le workflow (try/catch pour la requête)
  let workflow;
  try {
    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (error) {
      console.error('❌ Erreur Supabase lors de la récupération du workflow:', error);
      return res.status(500).json({ error: 'Erreur base de données', details: error.message });
    }
    if (!data) {
      console.log('Workflow non trouvé pour id:', workflowId);
      return res.status(404).json({ error: 'Workflow non trouvé' });
    }
    workflow = data;
    console.log('✅ Workflow trouvé:', workflow.name, 'type:', workflow.type);
  } catch (err) {
    console.error('❌ Exception lors de la récupération du workflow:', err);
    return res.status(500).json({ error: 'Erreur lors de la récupération du workflow', details: err.message });
  }

  // Simuler l'exécution (à remplacer par votre logique métier)
  console.log('Exécution simulée du workflow...');

  // Enregistrer un log d'exécution (optionnel)
  try {
    const { error: logError } = await supabase
      .from('workflow_logs')
      .insert({
        workflow_id: workflowId,
        status: 'success',
        executed_at: new Date().toISOString()
      });

    if (logError) {
      console.warn('⚠️ Échec de l’insertion dans workflow_logs (table manquante ?) :', logError.message);
    } else {
      console.log('✅ Log enregistré avec succès');
    }
  } catch (logErr) {
    console.warn('⚠️ Exception lors du log :', logErr.message);
  }

  // Réponse de succès
  return res.status(200).json({
    success: true,
    message: 'Workflow exécuté avec succès',
    workflowId: workflow.id,
    name: workflow.name
  });
};