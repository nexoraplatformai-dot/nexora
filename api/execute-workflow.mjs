import { createClient } from '@supabase/supabase-js';
import { sendSMS, sendEmail } from '../lib/notifications'; // à créer

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

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

    if (error || !workflow) {
      return res.status(404).json({ error: 'Workflow non trouvé' });
    }

    // Exemple : envoyer une notification (à adapter selon votre logique)
    console.log('Exécution du workflow :', workflow.name);

    // Log d'exécution
    await supabase.from('workflow_logs').insert([{
      workflow_id: workflowId,
      status: 'success',
      executed_at: new Date().toISOString()
    }]);

    res.status(200).json({ success: true, message: 'Workflow exécuté' });
  } catch (err) {
    console.error('Erreur:', err);
    res.status(500).json({ error: err.message });
  }
};