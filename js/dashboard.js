// Script pour le tableau de bord

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Vérifier l'authentification et MFA
async function checkAuth() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        window.location.href = 'login.html';
        return null;
    }

    const { data: factors } = await supabase.auth.mfa.listFactors();
    if (!factors.totp || factors.totp.length === 0) {
        window.location.href = 'mfa-setup.html';
        return null;
    }
    return user;
}

// Charger les statistiques (exemple)
async function loadStats() {
    // Ici, vous feriez des appels à votre base de données pour récupérer les vraies stats
    // Pour l'exemple, on met des valeurs fictives
    document.querySelectorAll('.stat-number').forEach((el, index) => {
        if (index === 0) el.textContent = '3';
        if (index === 1) el.textContent = '12h';
        if (index === 2) el.textContent = '247';
    });
}

// Déconnexion
document.getElementById('logout')?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
});

// Initialisation
(async () => {
    const user = await checkAuth();
    if (user) {
        loadStats();
    }
})();