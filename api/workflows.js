import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    const { user, error } = await supabase.auth.getUser(req.headers.authorization);
    if (error || !user) return res.status(401).json({ error: 'Non authentifié' });

    if (req.method === 'GET') {
        const { data, error } = await supabase
            .from('workflows')
            .select('*')
            .eq('user_id', user.id);
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data);
    }

    if (req.method === 'POST') {
        const workflow = { ...req.body, user_id: user.id };
        const { data, error } = await supabase
            .from('workflows')
            .insert([workflow])
            .select();
        if (error) return res.status(500).json({ error: error.message });
        return res.status(201).json(data[0]);
    }

    res.status(405).end();
}