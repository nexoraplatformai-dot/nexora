const { google } = require('googleapis');
const { createClient } = require('@supabase/supabase-js');

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
    console.error(`❌ Missing environment variable: ${env}`);
    throw new Error(`Missing environment variable: ${env}`);
  }
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

module.exports = async function handler(req, res) {
  console.log('=== OAuth handler called ===');
  console.log('Method:', req.method);
  console.log('Query:', req.query);

  try {
    // Étape 1: Générer l'URL d'autorisation (pas de code)
    if (req.method === 'GET' && !req.query.code) {
      const { state } = req.query;
      if (!state) {
        console.error('❌ Missing state parameter in initial request');
        return res.status(400).send('Missing state parameter. Le state doit contenir l\'ID utilisateur.');
      }
      const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/calendar.readonly'],
        state: state,
        prompt: 'consent'
      });
      console.log('✅ Redirecting to Google auth URL');
      return res.redirect(url);
    }

    // Étape 2: Callback avec code
    if (req.method === 'GET' && req.query.code) {
      const { code, state } = req.query;
      console.log('Callback received, code present, state:', state);

      if (!state) {
        console.error('❌ Missing state parameter in callback');
        return res.status(400).send('Missing state parameter dans le callback.');
      }

      // Décoder le state pour récupérer userId
      let userId;
      try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        userId = stateData.userId;
        console.log('✅ Decoded userId from state:', userId);
      } catch (e) {
        console.error('❌ Invalid state format:', e.message);
        return res.status(400).send('Invalid state format.');
      }

      if (!userId) {
        console.error('❌ UserId missing in state');
        return res.status(400).send('UserId manquant dans le state.');
      }

      // Échanger le code contre des tokens
      let tokens;
      try {
        const tokenResponse = await oauth2Client.getToken(code);
        tokens = tokenResponse.tokens;
        console.log('✅ Tokens obtained from Google');
      } catch (err) {
        console.error('❌ Error getting tokens from Google:', err.message);
        return res.redirect('/workflow-edit.html?error=token_exchange_failed');
      }

      oauth2Client.setCredentials(tokens);

      // Stocker les tokens dans Supabase
      try {
        const { error } = await supabase
          .from('user_tokens')
          .upsert({
            user_id: userId,
            provider: 'google',
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: new Date(Date.now() + tokens.expiry_date).toISOString()
          }, { onConflict: 'user_id, provider' });

        if (error) {
          console.error('❌ Supabase insert error:', error);
          // Vérifier si la table existe
          if (error.code === '42P01') { // relation does not exist
            return res.status(500).send('La table user_tokens n\'existe pas. Veuillez la créer dans Supabase.');
          }
          return res.status(500).send('Error storing tokens: ' + error.message);
        }
        console.log('✅ Tokens stored in Supabase');
      } catch (dbErr) {
        console.error('❌ Database error:', dbErr);
        return res.status(500).send('Database error: ' + dbErr.message);
      }

      // Rediriger vers l'interface avec succès
      console.log('✅ OAuth flow completed, redirecting to workflow-edit.html?success=google_connected');
      return res.redirect('/workflow-edit.html?success=google_connected');
    }

    console.log('❌ Method not allowed:', req.method);
    res.status(405).send('Method not allowed');
  } catch (err) {
    console.error('❌ Unhandled error in OAuth handler:', err);
    if (err.message.includes('invalid_grant')) {
      return res.redirect('/workflow-edit.html?error=invalid_grant');
    }
    res.status(500).send('OAuth failed: ' + err.message);
  }
};