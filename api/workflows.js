// api/workflows.js (POST)
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Vérifier l'authentification via le token (à adapter selon votre méthode)
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  const { user } = await supabase.auth.getUser(req.headers.authorization?.split(' ')[1]);
  if (!user) return res.status(401).json({ error: 'Non authentifié' });

  const { name, type, config, active = true } = req.body;

  try {
    const { data, error } = await supabase
      .from('workflows')
      .insert([{ user_id: user.id, name, type, config, active }])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err) {
    console.error('Erreur création workflow:', err);
    res.status(500).json({ error: err.message });
  }
}