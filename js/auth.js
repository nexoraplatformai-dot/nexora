// js/auth.js
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Inscription
async function signUp(email, password) {
    const { data, error } = await supabaseClient.auth.signUp({ 
        email, 
        password,
        options: {
            emailRedirectTo: window.location.origin + '/verify-email.html'
        }
    });
    return { data, error };
}

// Connexion
async function signIn(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    return { data, error };
}

// Déconnexion
async function signOut() {
    await supabaseClient.auth.signOut();
    window.location.href = '/index.html';
}

// Récupérer l'utilisateur courant
async function getCurrentUser() {
    const { data: { user }, error } = await supabaseClient.auth.getUser();
    return { user, error };
}

// Gestion MFA
async function enrollMFA() {
    const { data, error } = await supabaseClient.auth.mfa.enroll({ factorType: 'totp' });
    return { data, error };
}

async function verifyMFA(factorId, code) {
    const { error } = await supabaseClient.auth.mfa.challengeAndVerify({ factorId, code });
    return { error };
}

async function listFactors() {
    const { data, error } = await supabaseClient.auth.mfa.listFactors();
    return { data, error };
}

// Récupération mot de passe
async function resetPassword(email) {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password.html'
    });
    return { error };
}

// Mettre à jour le mot de passe
async function updatePassword(newPassword) {
    const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
    return { error };
}