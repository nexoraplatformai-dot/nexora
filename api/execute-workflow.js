import { createClient } from '@supabase/supabase-js';
import { sendSMS, sendEmail } from '../lib/notifications'; // à créer

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { workflowId } = req.body;

    // Récupérer le workflow et sa configuration
    const { data: workflow, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('id', workflowId)
        .single();

    if (error || !workflow) return res.status(404).json({ error: 'Workflow non trouvé' });

    // Exécuter les actions selon le type
    if (workflow.type === 'rappel_rdv') {
        // Logique d'envoi de rappels
        for (const action of workflow.config.actions) {
            if (action.type === 'sms') {
                await sendSMS(action.to, action.message);
            } else if (action.type === 'email') {
                await sendEmail(action.to, action.subject, action.message);
            }
        }
    }

    // Journaliser l'exécution
    await supabase.from('workflow_logs').insert([{
        workflow_id: workflowId,
        executed_at: new Date().toISOString(),
        status: 'success'
    }]);

    res.status(200).json({ success: true });
}