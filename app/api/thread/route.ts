import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export async function POST(req: Request) {
    const threadId = (await openai.beta.threads.create({})).id;

    return Response.json({ threadId: threadId });
}