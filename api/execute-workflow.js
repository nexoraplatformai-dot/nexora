// api/execute-workflow.js (version robuste avec logs détaillés)
const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  console.log('=== execute-workflow called ===');
  console.log('Method:', req.method);
  console.log('Body:', JSON.stringify(req.body));
  console.log('Headers:', JSON.stringify(req.headers));

  // Forcer le type de contenu en JSON
  res.setHeader('Content-Type', 'application/json');

  // Vérifier la méthode
  if (req.method !== 'POST') {
    console.log('Method not allowed');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Vérifier les variables d'environnement
  if (!process.env.SUPABASE_URL) {
    console.error('❌ SUPABASE_URL is missing');
    return res.status(500).json({ error: 'Configuration error: SUPABASE_URL missing' });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY is missing');
    return res.status(500).json({ error: 'Configuration error: SERVICE_ROLE_KEY missing' });
  }

  console.log('✅ Environment variables OK');

  // Créer le client Supabase
  let supabase;
  try {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    console.log('✅ Supabase client created');
  } catch (err) {
    console.error('❌ Failed to create Supabase client:', err);
    return res.status(500).json({ error: 'Failed to create Supabase client', details: err.message });
  }

  const { workflowId } = req.body;
  if (!workflowId) {
    console.log('❌ workflowId missing in body');
    return res.status(400).json({ error: 'workflowId manquant' });
  }

  console.log('workflowId:', workflowId);

  try {
    // Récupérer le workflow
    console.log('Fetching workflow from Supabase...');
    const { data: workflow, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (error) {
      console.error('❌ Supabase error fetching workflow:', error);
      if (error.code === '42P01') {
        return res.status(500).json({ error: 'La table workflows n\'existe pas dans Supabase' });
      }
      return res.status(500).json({ error: 'Database error', details: error.message });
    }

    if (!workflow) {
      console.log('❌ Workflow not found');
      return res.status(404).json({ error: 'Workflow non trouvé' });
    }

    console.log('✅ Workflow found:', workflow.name, 'type:', workflow.type);

    // Simuler l'exécution (vous mettrez votre vraie logique ici)
    console.log('Executing workflow...');

    // Enregistrer un log d'exécution (optionnel)
    try {
      console.log('Attempting to insert workflow log...');
      const { error: logError } = await supabase
        .from('workflow_logs')
        .insert({
          workflow_id: workflowId,
          status: 'success',
          executed_at: new Date().toISOString()
        });
      if (logError) {
        console.warn('⚠️ Failed to insert into workflow_logs:', logError.message);
      } else {
        console.log('✅ Workflow log inserted');
      }
    } catch (logErr) {
      console.warn('⚠️ Exception while logging:', logErr.message);
    }

    // Réponse de succès
    console.log('✅ Sending success response');
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