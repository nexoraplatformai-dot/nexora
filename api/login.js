import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY // Utiliser la clé service pour les opérations admin si nécessaire
    );

    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        return res.status(401).json({ error: error.message });
    }

    // Journalisation
    await supabase.from('audit_logs').insert([{
        user_id: data.user.id,
        action: 'login',
        metadata: { method: 'password' },
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress
    }]);

    res.status(200).json(data);
}