import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const { message, tone = 'neutre' } = req.body;

    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
                { role: 'system', content: `Tu aides à reformuler des messages entre parents séparés avec un ton ${tone}.` },
                { role: 'user', content: `Reformule ce message : ${message}` }
            ],
            max_tokens: 150
        });

        const suggestion = completion.choices[0].message.content;
        res.status(200).json({ suggestion });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}