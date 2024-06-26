import OpenAI from 'openai';

export default async function updateAssistant() {
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY || '',
      });
    const assistantId = process.env.ASSISTANT_ID || ''
    const assistant = await openai.beta.assistants.update(assistantId, {
        model: "gpt-4o",
        instructions:
        "You are a bot. Use the provided functions to answer questions.",
        tools: [
        {
            type: "function",
            function: {
            name: "getCurrentTemperature",
            description: "Get the current temperature for a specific location",
            parameters: {
                type: "object",
                properties: {
                location: {
                    type: "string",
                    description: "The city and state, e.g., San Francisco, CA",
                },
                unit: {
                    type: "string",
                    enum: ["Celsius", "Fahrenheit"],
                    description:
                    "The temperature unit to use. Infer this from the user's location.",
                },
                },
                required: ["location", "unit"],
            },
            },
        },
        {
            type: "function",
            function: {
            name: "getRainProbability",
            description: "Get the probability of rain for a specific location",
            parameters: {
                type: "object",
                properties: {
                location: {
                    type: "string",
                    description: "The city and state, e.g., San Francisco, CA",
                },
                },
                required: ["location"],
            },
            },
        },
        {
            type: "function",
            function: {
            name: "getRestaurant",
            description: "Return one restaurant near location",
            parameters: {
                type: "object",
                properties: {
                location: {
                    type: "string",
                    description: "The city and state, e.g., San Francisco, CA",
                },
                },
                required: ["location"],
            },
            },
        },
        {
            type: "file_search"
        }
        ],
    });
}
