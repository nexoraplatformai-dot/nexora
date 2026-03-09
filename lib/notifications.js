// lib/notifications.js – à utiliser dans les fonctions serverless
import twilio from 'twilio';
import sgMail from '@sendgrid/mail';

const twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export async function sendSMS(to, message) {
    try {
        await twilioClient.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE,
            to
        });
    } catch (err) {
        console.error('Erreur SMS:', err);
    }
}

export async function sendEmail(to, subject, html) {
    try {
        await sgMail.send({
            to,
            from: process.env.EMAIL_FROM,
            subject,
            html
        });
    } catch (err) {
        console.error('Erreur email:', err);
    }
}