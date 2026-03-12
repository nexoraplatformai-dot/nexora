// api/auth.js – Point d'entrée unique pour toutes les opérations d'authentification
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';
import sgMail from '@sendgrid/mail';

// Initialisation des clients Supabase
const supabaseService = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const supabaseAnon = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Client Twilio (SMS)
const twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

// Client SendGrid (email)
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Client OAuth Google
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// URL de base pour les redirections (priorité à la variable d'environnement, sinon origine de la requête)
const baseUrl = process.env.SITE_URL || process.env.VERCEL_URL || (req && req.headers.origin) || 'https://nexora-ruddy-omega.vercel.app';

export default async function handler(req, res) {
  const { action } = req.query; // L'action est passée en paramètre GET

  try {
    switch (action) {
      // ------------------------------------------------------------
      // Google OAuth
      // ------------------------------------------------------------
      case 'google-oauth': {
        console.log('=== OAuth handler called ===');
        console.log('Method:', req.method);
        console.log('Query:', req.query);

        if (req.method === 'GET' && !req.query.code) {
          const { state } = req.query;
          if (!state) {
            console.error('❌ Missing state parameter in initial request');
            return res.status(400).send('Missing state parameter. Le state doit contenir l\'ID utilisateur.');
          }
          const url = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: ['https://www.googleapis.com/auth/calendar.readonly'],
            state: state,
            prompt: 'consent'
          });
          console.log('✅ Redirecting to Google auth URL');
          return res.redirect(url);
        }

        if (req.method === 'GET' && req.query.code) {
          const { code, state } = req.query;
          console.log('Callback received, code present, state:', state);

          if (!state) {
            console.error('❌ Missing state parameter in callback');
            return res.status(400).send('Missing state parameter dans le callback.');
          }

          let userId;
          try {
            const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
            userId = stateData.userId;
            console.log('✅ Decoded userId from state:', userId);
          } catch (e) {
            console.error('❌ Invalid state format:', e.message);
            return res.status(400).send('Invalid state format.');
          }

          if (!userId) {
            console.error('❌ UserId missing in state');
            return res.status(400).send('UserId manquant dans le state.');
          }

          let tokens;
          try {
            const tokenResponse = await oauth2Client.getToken(code);
            tokens = tokenResponse.tokens;
            console.log('✅ Tokens obtained from Google');
          } catch (err) {
            console.error('❌ Error getting tokens from Google:', err.message);
            return res.redirect('/workflow-edit.html?error=token_exchange_failed');
          }

          oauth2Client.setCredentials(tokens);

          try {
            const { error } = await supabaseService
              .from('user_tokens')
              .upsert({
                user_id: userId,
                provider: 'google',
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                expires_at: new Date(Date.now() + tokens.expiry_date).toISOString()
              }, { onConflict: 'user_id, provider' });

            if (error) {
              console.error('❌ Supabase insert error:', error);
              if (error.code === '42P01') {
                return res.status(500).send('La table user_tokens n\'existe pas. Veuillez la créer dans Supabase.');
              }
              return res.status(500).send('Error storing tokens: ' + error.message);
            }
            console.log('✅ Tokens stored in Supabase');
          } catch (dbErr) {
            console.error('❌ Database error:', dbErr);
            return res.status(500).send('Database error: ' + dbErr.message);
          }

          console.log('✅ OAuth flow completed, redirecting to workflow-edit.html?success=google_connected');
          return res.redirect('/workflow-edit.html?success=google_connected');
        }

        console.log('❌ Method not allowed:', req.method);
        return res.status(405).send('Method not allowed');
      }

      // ------------------------------------------------------------
      // Login (email + mot de passe)
      // ------------------------------------------------------------
      case 'login': {
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' });
        }

        const { email, password } = req.body;

        const { data, error } = await supabaseService.auth.signInWithPassword({ email, password });

        if (error) {
          return res.status(401).json({ error: error.message });
        }

        // Journalisation (optionnel)
        await supabaseService.from('audit_logs').insert([{
          user_id: data.user.id,
          action: 'login',
          metadata: { method: 'password' },
          ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress
        }]);

        return res.status(200).json(data);
      }

      // ------------------------------------------------------------
      // Signup (inscription) avec redirection dynamique
      // ------------------------------------------------------------
      case 'signup': {
        if (req.method !== 'POST') return res.status(405).end();

        const { email, password, name, phone } = req.body;

        // Utiliser l'URL de base pour la redirection
        const siteUrl = process.env.SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : req.headers.origin) || 'https://nexora-ruddy-omega.vercel.app';

        const { data, error } = await supabaseService.auth.signUp({
          email,
          password,
          options: {
            data: { name, phone },
            emailRedirectTo: `${siteUrl}/verify-email.html`
          }
        });
        console.log('siteUrl utilisé :', siteUrl);

        if (error) return res.status(400).json({ error: error.message });

        if (data.user) {
          await supabaseService.from('profiles').insert([{
            id: data.user.id,
            email,
            name,
            phone,
            created_at: new Date().toISOString()
          }]);
        }

        return res.status(200).json(data);
      }

      // ------------------------------------------------------------
      // Vérification MFA TOTP (code Google Authenticator)
      // ------------------------------------------------------------
      case 'mfa-verify': {
        if (req.method !== 'POST') return res.status(405).end();

        const { factorId, code } = req.body;

        const { data: { user }, error: userError } = await supabaseAnon.auth.getUser(req.headers.authorization);
        if (userError || !user) return res.status(401).json({ error: 'Non authentifié' });

        const { data, error } = await supabaseAnon.auth.mfa.challengeAndVerify({ factorId, code });
        if (error) return res.status(400).json({ error: error.message });

        return res.status(200).json({ success: true });
      }

      // ------------------------------------------------------------
      // Envoi de code par SMS
      // ------------------------------------------------------------
      case 'send-sms': {
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' });
        }

        const { userId } = req.body; // ou email, selon votre logique

        // Récupérer le téléphone de l'utilisateur
        const { data: user, error } = await supabaseService
          .from('profiles')
          .select('phone')
          .eq('id', userId)
          .single();

        if (error || !user || !user.phone) {
          return res.status(400).json({ error: 'Numéro de téléphone non trouvé' });
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await supabaseService
          .from('sms_codes')
          .upsert({
            user_id: userId,
            code,
            expires_at: expiresAt,
            used: false
          }, { onConflict: 'user_id' });

        try {
          await twilioClient.messages.create({
            body: `Votre code de vérification NEXORA est : ${code}`,
            from: process.env.TWILIO_PHONE,
            to: user.phone
          });
          return res.status(200).json({ success: true });
        } catch (err) {
          console.error(err);
          return res.status(500).json({ error: 'Erreur lors de l\'envoi du SMS' });
        }
      }

      // ------------------------------------------------------------
      // Vérification du code SMS
      // ------------------------------------------------------------
      case 'verify-sms': {
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' });
        }

        const { userId, code } = req.body; // ou email

        const { data: smsCode, error: codeError } = await supabaseService
          .from('sms_codes')
          .select('*')
          .eq('user_id', userId)
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

        await supabaseService
          .from('sms_codes')
          .update({ used: true })
          .eq('user_id', userId);

        // Marquer l'utilisateur comme ayant activé la 2FA SMS (optionnel)
        await supabaseService
          .from('profiles')
          .update({ mfa_method: 'sms' })
          .eq('id', userId);

        return res.status(200).json({ success: true });
      }

      // ------------------------------------------------------------
      // Envoi de code par email
      // ------------------------------------------------------------
      case 'send-email-code': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email manquant' });

        const { data: user, error: userError } = await supabaseService
          .from('profiles')
          .select('id')
          .eq('email', email)
          .single();

        if (userError || !user) {
          return res.status(400).json({ error: 'Utilisateur non trouvé' });
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await supabaseService
          .from('email_codes')
          .upsert({
            user_id: user.id,
            code,
            expires_at: expiresAt,
            used: false
          }, { onConflict: 'user_id' });

        try {
          await sgMail.send({
            to: email,
            from: process.env.EMAIL_FROM,
            subject: 'Votre code de vérification NEXORA',
            html: `<p>Votre code de vérification est : <strong>${code}</strong></p><p>Ce code est valable 10 minutes.</p>`
          });
          res.status(200).json({ success: true });
        } catch (err) {
          console.error(err);
          res.status(500).json({ error: 'Erreur lors de l\'envoi de l\'email' });
        }
        break;
      }

      // ------------------------------------------------------------
      // Vérification du code email
      // ------------------------------------------------------------
      case 'verify-email-code': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

        const { email, code } = req.body;

        const { data: user, error: userError } = await supabaseService
          .from('profiles')
          .select('id')
          .eq('email', email)
          .single();

        if (userError || !user) {
          return res.status(400).json({ error: 'Utilisateur non trouvé' });
        }

        const { data: emailCode, error: codeError } = await supabaseService
          .from('email_codes')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (codeError || !emailCode) {
          return res.status(400).json({ error: 'Aucun code demandé' });
        }

        if (emailCode.used || new Date() > new Date(emailCode.expires_at)) {
          return res.status(400).json({ error: 'Code expiré ou déjà utilisé' });
        }

        if (emailCode.code !== code) {
          return res.status(400).json({ error: 'Code incorrect' });
        }

        await supabaseService
          .from('email_codes')
          .update({ used: true })
          .eq('user_id', user.id);

        // Marquer l'utilisateur comme ayant activé la 2FA email
        await supabaseService
          .from('profiles')
          .update({ mfa_method: 'email' })
          .eq('id', user.id);

        res.status(200).json({ success: true });
        break;
      }

      // ------------------------------------------------------------
      // Cas par défaut
      // ------------------------------------------------------------
      default:
        return res.status(400).json({ error: 'Action non spécifiée ou invalide' });
    }
  } catch (err) {
    console.error('Erreur non gérée:', err);
    return res.status(500).json({ error: err.message });
  }
}