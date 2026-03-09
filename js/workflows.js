// js/workflows.js
// Dépend de config.js et auth.js (supabaseClient est global via window.supabaseClient)

// Créer un workflow
async function createWorkflow(workflowData) {
    try {
        const { data, error } = await window.supabaseClient
            .from('workflows')
            .insert([workflowData])
            .select();
        return { data, error };
    } catch (err) {
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
            // Si la réponse n'est pas du JSON (ex: erreur 500 avec HTML), on récupère le texte
            const text = await response.text();
            data = { error: text };
        }

        if (!response.ok) {
            throw new Error(data.error || `Erreur HTTP ${response.status}`);
        }

        return { data, error: null };
    } catch (err) {
        console.error('Erreur exécution workflow:', err);
        const errorMessage = err.message || String(err) || 'Erreur inconnue';
        return { data: null, error: errorMessage };
    }
}

// Types de workflows prédéfinis (pour référence)
const WORKFLOW_TYPES = {
    RAPPEL_RDV: 'rappel_rdv',
    QUALIFICATION_LEAD: 'qualification_lead',
    RELANCE_CLIENT: 'relance_client',
    REPORTING: 'reporting'
};

// Configuration par défaut pour un rappel de rendez-vous (exemple)
const defaultRappelConfig = {
    triggers: [{ type: 'calendar_event', calendar: 'google', filter: 'rendez-vous' }],
    actions: [
        { type: 'sms', delay: -1, message: 'Rappel: votre rendez-vous demain à {heure}' },
        { type: 'email', delay: -2, message: 'Confirmez-vous votre présence ?' }
    ]
};