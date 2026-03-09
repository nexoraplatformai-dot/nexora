// js/workflows.js
// Dépend de config.js et auth.js (window.supabaseClient doit être défini)
// Toutes les fonctions nécessaires à la gestion des workflows sont ici.

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

// Récupérer tous les workflows de l'utilisateur connecté
async function getWorkflows() {
    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) return { data: null, error: 'Non authentifié' };
        const { data, error } = await window.supabaseClient
            .from('workflows')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
        return { data, error };
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
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ workflowId })
        });

        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            const text = await response.text();
            data = { error: text };
        }

        if (!response.ok) {
            throw new Error(data.error || `Erreur HTTP ${response.status}`);
        }

        return { data, error: null };
    } catch (err) {
        console.error('executeWorkflow error:', err);
        const errorMessage = err.message || String(err) || 'Erreur inconnue';
        return { data: null, error: errorMessage };
    }
}

// Types de workflows prédéfinis (optionnel)
const WORKFLOW_TYPES = {
    RAPPEL_RDV: 'rappel_rdv',
    QUALIFICATION_LEAD: 'qualification_lead',
    RELANCE_CLIENT: 'relance_client',
    REPORTING: 'reporting'
};