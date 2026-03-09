// Fonctions de sécurité et conformité

// Journalisation des actions sensibles
async function auditLog(action, metadata = {}) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('audit_logs').insert([{
        user_id: user.id,
        action,
        metadata,
        ip: 'client-side', // À remplacer par l'IP réelle côté serveur
        timestamp: new Date().toISOString()
    }]);
}

// Chiffrement simple côté client (pour les messages très sensibles)
// Note: le vrai chiffrement doit être fait côté serveur
function encryptData(data, key) {
    // Implémentation avec Web Crypto API (simplifié)
    // Retourne un objet chiffré
}

function decryptData(encrypted, key) {
    // Déchiffrement
}

// Vérification de session MFA
async function requireMFA() {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    if (!factors.totp || factors.totp.length === 0) {
        window.location.href = '/mfa-setup.html';
        return false;
    }
    return true;
}

// Export de données conforme RGPD
async function exportUserData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Récupérer toutes les données de l'utilisateur
    const [workflows, logs, profile] = await Promise.all([
        supabase.from('workflows').select('*').eq('user_id', user.id),
        supabase.from('audit_logs').select('*').eq('user_id', user.id),
        supabase.from('profiles').select('*').eq('id', user.id)
    ]);

    const exportData = {
        user,
        workflows: workflows.data,
        logs: logs.data,
        profile: profile.data,
        exportDate: new Date().toISOString()
    };

    // Créer un fichier JSON à télécharger
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexora-export-${user.id}.json`;
    a.click();
}