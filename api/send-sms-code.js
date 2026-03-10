import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId } = req.body; // ou email, selon votre logique

    // Récupérer le téléphone de l'utilisateur
    const { data: user, error } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', userId)
        .single();

    if (error || !user || !user.phone) {
        return res.status(400).json({ error: 'Numéro de téléphone non trouvé' });
    }

    // Générer un code aléatoire à 6 chiffres
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Stocker le code avec une expiration (par exemple dans une table `sms_codes`)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await supabase
        .from('sms_codes')
        .upsert({
            user_id: userId,
            code,
            expires_at: expiresAt,
            used: false
        }, { onConflict: 'user_id' });

    // Envoyer le SMS via Twilio
    try {
        await twilioClient.messages.create({
            body: `Votre code de vérification NEXORA est : ${code}`,
            from: process.env.TWILIO_PHONE,
            to: user.phone
        });
        res.status(200).json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur lors de l\'envoi du SMS' });
    }
}