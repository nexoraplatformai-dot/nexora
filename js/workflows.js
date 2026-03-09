// js/workflows.js
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createWorkflow(workflowData) {
    const { data, error } = await supabaseClient
        .from('workflows')
        .insert([workflowData])
        .select();
    return { data, error };
}

async function getWorkflows() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return { data: null, error: 'Non authentifié' };
    const { data, error } = await supabaseClient
        .from('workflows')
        .select('*')
        .eq('user_id', user.id);
    return { data, error };
}

async function updateWorkflow(id, updates) {
    const { data, error } = await supabaseClient
        .from('workflows')
        .update(updates)
        .eq('id', id)
        .select();
    return { data, error };
}

async function deleteWorkflow(id) {
    const { error } = await supabaseClient
        .from('workflows')
        .delete()
        .eq('id', id);
    return { error };
}

async function executeWorkflow(workflowId) {
    const { data, error } = await supabaseClient.functions.invoke('execute-workflow', {
        body: { workflowId }
    });
    return { data, error };
}

const WORKFLOW_TYPES = {
    RAPPEL_RDV: 'rappel_rdv',
    QUALIFICATION_LEAD: 'qualification_lead',
    RELANCE_CLIENT: 'relance_client',
    REPORTING: 'reporting'
};

const defaultRappelConfig = {
    triggers: [{ type: 'calendar_event', calendar: 'google', filter: 'rendez-vous' }],
    actions: [
        { type: 'sms', delay: -1, message: 'Rappel: votre rendez-vous demain à {heure}' },
        { type: 'email', delay: -2, message: 'Confirmez-vous votre présence ?' }
    ]
};