const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  // Logs détaillés (visibles dans les logs Vercel)
  console.log('=== execute-workflow called ===');
  console.log('Method:', req.method);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);

  // 1. Vérifier la méthode
  if (req.method !== 'POST') {
    console.log('Method not allowed');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. Vérifier les variables d'environnement
  if (!process.env.SUPABASE_URL) {
    console.error('❌ SUPABASE_URL manquante');
    return res.status(500).json({ error: 'Configuration error: missing SUPABASE_URL' });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY manquante');
    return res.status(500).json({ error: 'Configuration error: missing SERVICE_ROLE_KEY' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { workflowId } = req.body;
  if (!workflowId) {
    console.log('workflowId manquant');
    return res.status(400).json({ error: 'workflowId manquant' });
  }

  try {
    // 3. Récupérer le workflow
    const { data: workflow, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (error) {
      console.error('❌ Erreur Supabase lors de la récupération du workflow:', error);
      // Envoyer l'erreur détaillée seulement en développement, en production masquer
      return res.status(500).json({ error: 'Erreur base de données', details: error.message });
    }

    if (!workflow) {
      console.log('Workflow non trouvé pour id:', workflowId);
      return res.status(404).json({ error: 'Workflow non trouvé' });
    }

    console.log('✅ Workflow trouvé:', workflow.name, 'type:', workflow.type);

    // 4. Simuler une exécution (vous mettrez votre vraie logique ici)
    // Par exemple : envoyer un email, déclencher un webhook, etc.
    console.log('Exécution simulée du workflow...');

    // 5. Enregistrer un log d'exécution (optionnel)
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

    // 6. Réponse de succès
    return res.status(200).json({
      success: true,
      message: 'Workflow exécuté avec succès',
      workflowId: workflow.id,
      name: workflow.name
    });

  } catch (err) {
    console.error('❌ Exception non gérée dans execute-workflow:', err);
    return res.status(500).json({ error: 'Erreur interne du serveur', details: err.message });
  }
};