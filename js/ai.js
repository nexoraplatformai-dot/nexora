// Assistant IA pour aider à la communication et suggestions
// Utilise l'API OpenAI (via une fonction serverless pour protéger la clé)

async function suggestReformulation(message, tone = 'neutre') {
    // Appelle une fonction Edge qui utilise OpenAI
    const { data, error } = await supabase.functions.invoke('ai-suggest', {
        body: { message, tone }
    });
    return { data, error };
}

async function moderateMessage(message) {
    // Vérifie si le message est approprié (détection de conflit)
    const { data, error } = await supabase.functions.invoke('ai-moderate', {
        body: { message }
    });
    return { data, error };
}

async function generateBrief(context) {
    // Génère un résumé des échanges récents
    const { data, error } = await supabase.functions.invoke('ai-brief', {
        body: { context }
    });
    return { data, error };
}

// Fonctions locales (sans appel API) pour des suggestions simples
function getSuggestedResponses(lastMessage) {
    // Exemples de réponses pré-enregistrées selon le contexte
    const suggestions = [
        "Merci pour votre message, je vous réponds rapidement.",
        "Pouvons-nous convenir d'un horaire ?",
        "Je transmets l'information."
    ];
    return suggestions;
}