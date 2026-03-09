import twilio from 'twilio';
import sgMail from '@sendgrid/mail';

const twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { to, channel, message, subject } = req.body;

  try {
    if (channel === 'sms') {
      await twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE,
        to
      });
    } else if (channel === 'email') {
      await sgMail.send({
        to,
        from: process.env.EMAIL_FROM,
        subject: subject || 'Rappel NEXORA',
        html: `<p>${message}</p>`
      });
    }
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}