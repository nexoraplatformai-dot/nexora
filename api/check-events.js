import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  // Récupérer tous les workflows actifs de type 'rappel_rdv'
  const { data: workflows } = await supabase
    .from('workflows')
    .select('*')
    .eq('type', 'rappel_rdv')
    .eq('active', true);

  for (const workflow of workflows) {
    // Récupérer le token Google de l'utilisateur
    const { data: tokenData } = await supabase
      .from('user_tokens')
      .select('*')
      .eq('user_id', workflow.user_id)
      .eq('provider', 'google')
      .single();

    if (!tokenData) continue;

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Récupérer les événements des prochaines 48h
    const now = new Date();
    const timeMax = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const events = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    // Filtrer selon les mots-clés configurés
    const keywords = workflow.config.keywords || [];
    const relevantEvents = events.data.items.filter(event => {
      const title = event.summary.toLowerCase();
      return keywords.some(k => title.includes(k.toLowerCase()));
    });

    for (const event of relevantEvents) {
      const eventStart = new Date(event.start.dateTime || event.start.date);
      const diffHours = (eventStart - now) / (1000 * 60 * 60);

      // Envoyer rappel J-1 (24h avant)
      if (diffHours > 23 && diffHours < 25) {
        await sendReminder(workflow, event, 'j-1');
      }
      // Envoyer rappel H-2
      if (diffHours > 1.5 && diffHours < 2.5) {
        await sendReminder(workflow, event, 'h-2');
      }
    }
  }

  res.status(200).json({ message: 'Vérification effectuée' });
}

async function sendReminder(workflow, event, type) {
  // Logique d'envoi via /api/send-reminder
  // À implémenter avec fetch interne ou appel direct aux fonctions
}