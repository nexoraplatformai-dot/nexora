import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email, code } = req.body;

    // Récupérer l'utilisateur
    const { data: user, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

    if (userError || !user) {
        return res.status(400).json({ error: 'Utilisateur non trouvé' });
    }

    // Vérifier le code
    const { data: smsCode, error: codeError } = await supabase
        .from('sms_codes')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (codeError || !smsCode) {
        return res.status(400).json({ error: 'Aucun code demandé' });
    }

    if (smsCode.used || new Date() > new Date(smsCode.expires_at)) {
        return res.status(400).json({ error: 'Code expiré ou déjà utilisé' });
    }

    if (smsCode.code !== code) {
        return res.status(400).json({ error: 'Code incorrect' });
    }

    // Marquer le code comme utilisé
    await supabase
        .from('sms_codes')
        .update({ used: true })
        .eq('user_id', user.id);

    // Créer une session (ou retourner un token)
    // Pour simplifier, on peut utiliser supabase.auth.signInWithPassword avec le mot de passe (mais on ne l'a pas)
    // Ici, on suppose que l'utilisateur a déjà saisi son mot de passe auparavant. Une autre approche est de générer un token magique.
    // Pour une solution simple, on peut rediriger vers une page de connexion avec un token temporaire (à implémenter).
    // Pour l'instant, on renvoie un succès et on laisse le client gérer.
    res.status(200).json({ success: true });
}