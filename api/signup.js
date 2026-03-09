import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { email, password, name } = req.body;

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { name },
            emailRedirectTo: `${req.headers.origin}/verify-email.html`
        }
    });

    if (error) return res.status(400).json({ error: error.message });

    // Créer un profil
    if (data.user) {
        await supabase.from('profiles').insert([{
            id: data.user.id,
            email,
            name,
            created_at: new Date().toISOString()
        }]);
    }

    res.status(200).json(data);
}