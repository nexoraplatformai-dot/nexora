// js/dashboard.js
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
    // ... inchangé
}

document.getElementById('logout')?.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
});

(async () => {
    const user = await checkAuth();
    if (user) loadStats();
})();