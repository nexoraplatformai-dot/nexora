import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

// Vérification des variables d'environnement
const requiredEnv = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_REDIRECT_URI'
];
for (const env of requiredEnv) {
  if (!process.env[env]) {
    throw new Error(`Missing environment variable: ${env}`);
  }
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export default async function handler(req, res) {
  try {
    if (req.method === 'GET' && req.query.code) {
      // Callback après autorisation
      const { code } = req.query;
      const { tokens } = await oauth2Client.getToken(code);
      
      // Ici, l'utilisateur doit être authentifié via Supabase (on peut utiliser un paramètre state)
      // Pour simplifier, on suppose que l'utilisateur est connecté et on stocke les tokens
      // Vous devez passer l'ID utilisateur dans le state lors de la génération de l'URL
      const { data: { user }, error } = await supabase.auth.getUser(req.headers.authorization);
      if (error || !user) return res.status(401).json({ error: 'Non authentifié' });

      await supabase.from('user_tokens').upsert({
        user_id: user.id,
        provider: 'google',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(Date.now() + tokens.expiry_date).toISOString()
      }, { onConflict: 'user_id, provider' });

      return res.redirect('/workflow-edit.html?success=google_connected');
    } else {
      // Générer l'URL d'autorisation
      const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/calendar.readonly'],
        prompt: 'consent'
      });
      return res.redirect(url);
    }
  } catch (err) {
    console.error('Erreur dans auth-google:', err);
    return res.status(500).json({ error: err.message });
  }
}