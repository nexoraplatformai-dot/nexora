// js/dashboard.js corrigé
// NE PAS redéclarer supabaseClient, il vient de auth.js

async function checkAuth() {
    const { data: { user }, error } = await supabaseClient.auth.getUser();
    if (error || !user) {
        window.location.href = 'login.html';
        return null;
    }
    const { data: factors } = await supabaseClient.auth.mfa.listFactors();
    if (!factors.totp || factors.totp.length === 0) {
        window.location.href = 'mfa-setup.html';
        return null;
    }
    return user;
}

async function loadStats() {
    // Exemple de chargement de stats (à adapter)
    document.querySelectorAll('.stat-number').forEach((el, index) => {
        if (index === 0) el.textContent = '3';
        if (index === 1) el.textContent = '12h';
        if (index === 2) el.textContent = '247';
    });
}

// Pas de code auto-exécuté ici (tout sera géré depuis la page HTML)