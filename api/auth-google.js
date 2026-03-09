import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const requiredEnv = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI'];
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
      const { code, state } = req.query;
      if (!state) {
        return res.status(400).json({ error: 'Missing state parameter' });
      }

      // Décoder le state pour obtenir userId
      let userId;
      try {
        const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
        userId = decoded.userId;
      } catch (err) {
        return res.status(400).json({ error: 'Invalid state parameter' });
      }

      const { tokens } = await oauth2Client.getToken(code);

      // Stocker les tokens dans la table user_tokens
      await supabase.from('user_tokens').upsert({
        user_id: userId,
        provider: 'google',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(Date.now() + tokens.expiry_date).toISOString()
      }, { onConflict: 'user_id, provider' });

      return res.redirect('/workflow-edit.html?success=google_connected');
    } else {
      // Générer l'URL d'autorisation
      // Ici, on attend que le client passe le state dans la requête initiale
      // Pour simplifier, on peut générer l'URL sans state et la renvoyer
      const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/calendar.readonly'],
        prompt: 'consent',
        // Le state doit être fourni par le client
        // On va le passer en paramètre de la requête
        state: req.query.state || ''
      });
      return res.redirect(url);
    }
  } catch (err) {
    console.error('Erreur dans auth-google:', err);
    return res.status(500).json({ error: err.message });
  }
}