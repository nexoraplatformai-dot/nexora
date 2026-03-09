const SUPABASE_URL = 'https://sqzovftrdjcjpahpifnx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Pvcew-turPW9IoFTJajAwA_YbAlWc11';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Fonctions d'authentification complètes avec MFA
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Inscription
async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ 
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
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

// Déconnexion
async function signOut() {
  await supabase.auth.signOut();
  window.location.href = '/index.html';
}

// Récupérer l'utilisateur courant
async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
}

// Gestion MFA
async function enrollMFA() {
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
  return { data, error };
}

async function verifyMFA(factorId, code) {
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  return { error };
}

async function listFactors() {
  const { data, error } = await supabase.auth.mfa.listFactors();
  return { data, error };
}

// Récupération mot de passe
async function resetPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/reset-password.html'
  });
  return { error };
}

// Mettre à jour le mot de passe
async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  return { error };
}

// Vérifier si l'utilisateur a la MFA activée
async function hasMFA() {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) return false;
  return data.totp && data.totp.length > 0;
}