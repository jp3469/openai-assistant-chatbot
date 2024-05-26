import { AssistantResponse, tool } from 'ai';
import OpenAI from 'openai';
import { auth } from '@/auth'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

const yelp_api_key = process.env.OPENAI_API_KEY

export async function POST(req: Request) {
  
  // Parse the request body
  const input: {
    threadId: string | null;
    message: string;
  } = await req.json();
  const userId = (await auth())?.user.id
  if (!userId) {
    return new Response('Unauthorized', {
      status: 401
    })
  }

  // Create a thread if needed
  const threadId = input.threadId ?? (await openai.beta.threads.create({})).id;

  // Add a message to the thread
  const createdMessage = await openai.beta.threads.messages.create(threadId, {
    role: 'user',
    content: input.message,
  });

  return AssistantResponse(
    { threadId, messageId: createdMessage.id },
    async ({ forwardStream, sendDataMessage }) => {
      // Run the assistant on the thread
      const runStream = openai.beta.threads.runs.stream(threadId, {
        assistant_id:
          process.env.ASSISTANT_ID ??
          (() => {
            throw new Error('ASSISTANT_ID is not set');
          })(),
      });

      // forward run status would stream message deltas
      let runResult = await forwardStream(runStream);

      // status can be: queued, in_progress, requires_action, cancelling, cancelled, failed, completed, or expired
      while (
        runResult?.status === 'requires_action' &&
        runResult.required_action?.type === 'submit_tool_outputs'
      ) {
        const tool_outputs =
          runResult.required_action.submit_tool_outputs.tool_calls.map(
            (toolCall: any) => {
              const parameters = JSON.parse(toolCall.function.arguments);
              if (toolCall.function.name === 'getCurrentTemperature') {
                  return {
                    tool_call_id: toolCall.id,
                    output: "57",
                  };
              } else if (toolCall.function.name === 'getRainProbability') {
                return {
                  tool_call_id: toolCall.id,
                  output: "0.06",
                }
              } else if (toolCall.function.name === 'getRestaurant') {
                return {
                  tool_call_id: toolCall.id,
                  output: getRestaurant(parameters.location),
                }
              }
                // configure your tool calls here
                // case toolCall.function.name === 'getCurrentTemperature': {
                //   return {
                //     tool_call_id: toolCall.id,
                //     output: "57",
                //   };
                // }
                // case toolCall.function.name === 'getRainProbability': {
                //   return {
                //     tool_call_id: toolCall.id,
                //     output: "0.06",
                //   };
                // }
                else {
                  throw new Error(
                    `Unknown tool call function: ${toolCall.function.name}`,
                  );
                }
              }
          );

        runResult = await forwardStream(
          openai.beta.threads.runs.submitToolOutputsStream(
            threadId,
            runResult.id,
            { tool_outputs },
          ),
        );
      }
    },
  );
}

function getRestaurant(location: string): string {
 
  const yelp = require('yelp-fusion');
  const client = yelp.client(yelp_api_key);
  
  client.search({
    term: 'restaurant',
    location: location,
  }).then((response: { jsonBody: { businesses: { name: string; }[]; }; }) => {
    return response.jsonBody.businesses[0].name;
  }).catch((e: any) => {
    console.log(e);
  });
  return "";
}