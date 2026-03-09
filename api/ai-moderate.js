import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const { message } = req.body;

    try {
        const response = await openai.moderations.create({ input: message });
        const flagged = response.results[0].flagged;
        res.status(200).json({ flagged, categories: response.results[0].categories });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}