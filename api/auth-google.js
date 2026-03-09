import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export default async function handler(req, res) {
  if (req.method === 'GET' && req.query.code) {
    // Callback après autorisation
    const { code } = req.query;
    try {
      const { tokens } = await oauth2Client.getToken(code);
      // Stocker les tokens pour l'utilisateur connecté
      // (l'utilisateur doit être authentifié, on utilise un state pour l'identifier)
      // Pour simplifier, on suppose que l'utilisateur est déjà connecté via Supabase
      const { data: { user }, error } = await supabase.auth.getUser(req.headers.authorization);
      if (error || !user) return res.status(401).json({ error: 'Non authentifié' });

      await supabase.from('user_tokens').upsert({
        user_id: user.id,
        provider: 'google',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(Date.now() + tokens.expiry_date).toISOString()
      }, { onConflict: 'user_id, provider' });

      res.redirect('/workflow-edit.html?success=google_connected');
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    // Générer l'URL d'autorisation
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar.readonly'],
      prompt: 'consent'
    });
    res.redirect(url);
  }
}