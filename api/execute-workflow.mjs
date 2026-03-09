// api/execute-workflow.js
const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { workflowId } = req.body;

    if (!workflowId) {
      return res.status(400).json({ error: 'workflowId requis' });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY // ou SERVICE_ROLE_KEY si admin ops
    );

    // Exemple minimal : récupère et "exécute"
    const { data: workflow, error: fetchError } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (fetchError) throw fetchError;
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow introuvable' });
    }

    // ← Ici votre vraie logique d'exécution (actions, triggers, emails, etc.)
    console.log(`Exécution workflow: ${workflow.name} (ID: ${workflowId})`);

    return res.status(200).json({
      success: true,
      message: 'Workflow exécuté avec succès'
    });
  } catch (err) {
    console.error('Erreur dans execute-workflow:', err);
    return res.status(500).json({
      error: err.message || 'Erreur serveur interne'
    });
  }
};