import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  const { user } = await supabase.auth.getUser(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Non authentifié' });

  // Récupérer le token Google de l'utilisateur
  const { data: tokenData } = await supabase
    .from('user_tokens')
    .select('*')
    .eq('user_id', user.id)
    .eq('provider', 'google')
    .single();

  if (!tokenData) {
    return res.status(400).json({ error: 'Google non connecté' });
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
  });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  try {
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults: 50,
      singleEvents: true,
      orderBy: 'startTime',
    });
    res.status(200).json(response.data.items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}