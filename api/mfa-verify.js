import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    const { factorId, code } = req.body;

    // L'utilisateur doit être authentifié (le middleware Vercel peut gérer ça)
    const { data: { user }, error: userError } = await supabase.auth.getUser(req.headers.authorization);
    if (userError || !user) return res.status(401).json({ error: 'Non authentifié' });

    const { data, error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    if (error) return res.status(400).json({ error: error.message });

    res.status(200).json({ success: true });
}