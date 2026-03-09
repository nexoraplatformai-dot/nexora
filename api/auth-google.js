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
    console.error(`Missing env: ${env}`);
    return res.status(500).send(`Configuration error: missing ${env}`);
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
    // Étape 1: Générer l'URL d'autorisation
    if (req.method === 'GET' && !req.query.code) {
      // Récupérer l'userId depuis le state (encodé en base64)
      const state = req.query.state ? JSON.parse(Buffer.from(req.query.state, 'base64').toString()) : null;
      const userId = state?.userId;
      if (!userId) {
        return res.status(400).send('Missing userId in state');
      }
      const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/calendar.readonly'],
        state: req.query.state, // repasser l'état
        prompt: 'consent'
      });
      return res.redirect(url);
    }

    // Étape 2: Callback avec le code
    if (req.method === 'GET' && req.query.code) {
      const { code, state } = req.query;
      // Décoder le state pour récupérer userId
      let userId;
      try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        userId = stateData.userId;
      } catch (e) {
        return res.status(400).send('Invalid state parameter');
      }

      // Échanger le code contre des tokens
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      // Stocker les tokens dans Supabase
      const { error } = await supabase.from('user_tokens').upsert({
        user_id: userId,
        provider: 'google',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(Date.now() + tokens.expiry_date).toISOString()
      }, { onConflict: 'user_id, provider' });

      if (error) {
        console.error('Supabase error:', error);
        return res.status(500).send('Error storing tokens');
      }

      // Rediriger vers l'interface avec succès
      return res.redirect('/workflow-edit.html?success=google_connected');
    }

    res.status(405).send('Method not allowed');
  } catch (err) {
    console.error('OAuth error:', err);
    // Gérer l'erreur invalid_grant
    if (err.message.includes('invalid_grant')) {
      return res.redirect('/workflow-edit.html?error=invalid_grant');
    }
    res.status(500).send('OAuth failed: ' + err.message);
  }
}