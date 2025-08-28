
'use server';

/**
 * @fileOverview A flow for generating a tailored interview response for the Live Co-pilot.
 *
 * - generateLiveResponse - Generates an answer to a question, contextualized by resume and JD.
 * - GenerateLiveResponseInput - The input type for the function.
 * - GenerateLiveResponseOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Define a schema for conversation history messages
const ChatMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});
type ChatMessage = z.infer<typeof ChatMessageSchema>;


const GenerateLiveResponseInputSchema = z.object({
  question: z.string().describe("The interview question that was asked."),
  resume: z.string().describe("The candidate's resume text content."),
  jobDescription: z.string().describe('The job description for the role.'),
  conversationHistory: z.array(ChatMessageSchema).optional().describe("History of the conversation so far, for context on follow-up questions."),
});
export type GenerateLiveResponseInput = z.infer<typeof GenerateLiveResponseInputSchema>;

const GenerateLiveResponseOutputSchema = z.object({
  answer: z.string().describe("A concise, first-person answer to the interview question."),
});
export type GenerateLiveResponseOutput = z.infer<typeof GenerateLiveResponseOutputSchema>;

export async function generateLiveResponse(
  input: GenerateLiveResponseInput
): Promise<GenerateLiveResponseOutput> {
  const { output } = await prompt(input);

  if (!output) {
    throw new Error('Failed to generate an answer from the AI model.');
  }
  return { answer: output.answer };
}


const prompt = ai.definePrompt({
  name: 'generateLiveResponsePrompt',
  input: {
    schema: GenerateLiveResponseInputSchema
  },
  output: { schema: GenerateLiveResponseOutputSchema },
  prompt: `You are an expert career coach providing a suggested answer for a candidate in a live interview.
Your task is to formulate a concise, professional answer to the interviewer's question. The answer MUST be from the candidate's perspective, using the first person (e.g., "I," "my," "I have experience with...").

The response should be under 150 words and directly address the question. It should not be a conversation with the user, but rather a polished answer ready to be spoken.

Use the following context to tailor the answer:
Candidate's Resume:
---
{{{resume}}}
---
Job Description:
---
{{{jobDescription}}}
---
{{#if conversationHistory}}
CONVERSATION HISTORY (for context on follow-up questions):
---
{{#each conversationHistory}}
{{#if (eq this.role 'user')}}Interviewer: {{this.content}}{{/if}}
{{#if (eq this.role 'model')}}Me (My Answer): {{this.content}}{{/if}}
{{/each}}
---
{{/if}}

Most Recent Interviewer's Question:
"{{{question}}}"

Your Suggested Answer (as the candidate):`,
});

const generateLiveResponseFlow = ai.defineFlow(
  {
    name: 'generateLiveResponseFlow',
    inputSchema: GenerateLiveResponseInputSchema,
    outputSchema: GenerateLiveResponseOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);

    if (!output) {
      throw new Error('Failed to generate an answer from the AI model.');
    }
    return { answer: output.answer };
  }
);


// New Streaming Flow
export async function generateLiveResponseStream(input: GenerateLiveResponseInput): Promise<ReadableStream<string>> {
  const { stream } = ai.generateStream({
    model: 'googleai/gemini-2.0-flash',
    prompt: prompt.compile(input), // Compile the prompt with the input
    output: {
      format: 'text',
    },
  });

  return stream;
}
