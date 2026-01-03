export const generateAIColors = async (prompt, count = 5) => {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

    if (!apiKey) {
        console.error("Missing OpenAI API Key");
        throw new Error("Missing API Key");
    }

    const systemPrompt = `You are a professional color theorist. Generate a highly aesthetic, harmonious, and premium color palette based on the user's description. Ensure the colors complement each other perfectly.
  Return ONLY a JSON array of ${count} hex codes. 
  Example: ${JSON.stringify(Array(count).fill('#000000'))}`;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4-turbo-preview",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: prompt }
                ],
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'API Error');
        }

        const data = await response.json();
        const content = JSON.parse(data.choices[0].message.content);

        // Handle cases where AI might nest it
        const colors = Array.isArray(content) ? content : content.colors || Object.values(content)[0];
        return colors;
    } catch (error) {
        console.error("AI Generation Error:", error);
        throw error;
    }
};
