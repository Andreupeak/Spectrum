import { OpenAI } from 'openai';

const openai = new OpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true
});

export const generateAIColors = async (prompt) => {
    const systemPrompt = `You are a professional color theorist. Generate a color palette based on the user's description. 
  Return ONLY a JSON array of 5 hex codes. 
  Example: ["#FF5733", "#C70039", "#900C3F", "#581845", "#FFC300"]`;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4-turbo-preview",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" }
        });

        const content = JSON.parse(response.choices[0].message.content);
        // Handle cases where AI might nest it
        const colors = Array.isArray(content) ? content : content.colors || Object.values(content)[0];
        return colors;
    } catch (error) {
        console.error("AI Generation Error:", error);
        return null;
    }
};
