// js/dashboard.js corrigé
// (plus de déclaration de supabaseClient, il vient de auth.js)

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
    // votre code de chargement des stats
}