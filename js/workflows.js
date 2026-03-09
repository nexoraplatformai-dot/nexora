// Gestion des workflows d'automatisation
// Dépend de config.js et auth.js (pour l'utilisateur connecté)

async function createWorkflow(workflowData) {
    // workflowData = { type, config, userId }
    const { data, error } = await supabase
        .from('workflows')
        .insert([workflowData])
        .select();
    return { data, error };
}

async function getWorkflows(userId) {
    const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('user_id', userId);
    return { data, error };
}

async function updateWorkflow(id, updates) {
    const { data, error } = await supabase
        .from('workflows')
        .update(updates)
        .eq('id', id)
        .select();
    return { data, error };
}

async function deleteWorkflow(id) {
    const { error } = await supabase
        .from('workflows')
        .delete()
        .eq('id', id);
    return { error };
}

async function executeWorkflow(workflowId) {
    // Appelle une fonction Edge ou un webhook pour exécuter le workflow
    const { data, error } = await supabase.functions.invoke('execute-workflow', {
        body: { workflowId }
    });
    return { data, error };
}

// Types de workflows prédéfinis
const WORKFLOW_TYPES = {
    RAPPEL_RDV: 'rappel_rdv',
    QUALIFICATION_LEAD: 'qualification_lead',
    RELANCE_CLIENT: 'relance_client',
    REPORTING: 'reporting'
};

// Configuration par défaut pour un rappel de rendez-vous
const defaultRappelConfig = {
    triggers: [{ type: 'calendar_event', calendar: 'google', filter: 'rendez-vous' }],
    actions: [
        { type: 'sms', delay: -1, message: 'Rappel: votre rendez-vous demain à {heure}' },
        { type: 'email', delay: -2, message: 'Confirmez-vous votre présence ?' }
    ]
};