// js/workflows.js
// Dépend de config.js et auth.js (window.supabaseClient doit être défini)

// Créer un workflow
async function createWorkflow(workflowData) {
    try {
        const { data, error } = await window.supabaseClient
            .from('workflows')
            .insert([workflowData])
            .select();
        return { data, error };
    } catch (err) {
        console.error('createWorkflow error:', err);
        return { data: null, error: err.message };
    }
}

// Récupérer tous les workflows de l'utilisateur connecté, avec la dernière exécution
async function getWorkflows() {
    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) return { data: null, error: 'Non authentifié' };
        
        // Récupérer les workflows
        const { data: workflows, error } = await window.supabaseClient
            .from('workflows')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
        if (error) throw error;

        // Pour chaque workflow, récupérer le dernier log d'exécution
        const workflowsWithLogs = await Promise.all(workflows.map(async (w) => {
            try {
                const { data: logs, error: logError } = await window.supabaseClient
                    .from('workflow_logs')
                    .select('executed_at')
                    .eq('workflow_id', w.id)
                    .eq('status', 'success')
                    .order('executed_at', { ascending: false })
                    .limit(1);
                if (logError) throw logError;
                const lastExecuted = logs && logs.length > 0 ? logs[0].executed_at : null;
                return { ...w, last_executed: lastExecuted };
            } catch (logErr) {
                console.warn('Erreur lors de la récupération du log pour le workflow', w.id, logErr);
                return { ...w, last_executed: null };
            }
        }));
        return { data: workflowsWithLogs, error: null };
    } catch (err) {
        console.error('getWorkflows error:', err);
        return { data: null, error: err.message };
    }
}

// Mettre à jour un workflow
async function updateWorkflow(id, updates) {
    try {
        const { data, error } = await window.supabaseClient
            .from('workflows')
            .update(updates)
            .eq('id', id)
            .select();
        return { data, error };
    } catch (err) {
        console.error('updateWorkflow error:', err);
        return { data: null, error: err.message };
    }
}

// Supprimer un workflow
async function deleteWorkflow(id) {
    try {
        const { error } = await window.supabaseClient
            .from('workflows')
            .delete()
            .eq('id', id);
        return { error };
    } catch (err) {
        console.error('deleteWorkflow error:', err);
        return { error: err.message };
    }
}

// Exécuter un workflow (appel à l'API Vercel)
async function executeWorkflow(workflowId) {
    try {
        const response = await fetch('/api/execute-workflow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workflowId })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || `Erreur HTTP ${response.status}`);
        return { data, error: null };
    } catch (err) {
        console.error('executeWorkflow error:', err);
        return { data: null, error: err.message };
    }
}

// Types de workflows prédéfinis
const WORKFLOW_TYPES = {
    RAPPEL_RDV: 'rappel_rdv',
    QUALIFICATION_LEAD: 'qualification_lead',
    RELANCE_CLIENT: 'relance_client',
    REPORTING: 'reporting'
};