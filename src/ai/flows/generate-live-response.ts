
'use server';

/**
 * @fileOverview A flow for generating a tailored interview response for the Live Co-pilot.
 *
 * - generateLiveResponse - Generates an answer to a question, contextualized by resume, JD, and conversation history.
 * - GenerateLiveResponseInput - The input type for the function.
 * - GenerateLiveResponseOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

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
  // Pre-process history to add boolean flags for Handlebars
  const processedHistory = input.conversationHistory?.map(msg => ({
    ...msg,
    isUser: msg.role === 'user',
    isModel: msg.role === 'model',
  }));

  return generateLiveResponseFlow({ ...input, conversationHistory: processedHistory as any });
}

const prompt = ai.definePrompt({
  name: 'generateLiveResponsePrompt',
  input: {
    schema: z.object({
      question: z.string(),
      resume: z.string(),
      jobDescription: z.string(),
      conversationHistory: z.array(z.object({
        role: z.enum(['user', 'model']),
        content: z.string(),
        isUser: z.boolean(),
        isModel: z.boolean(),
      })).optional(),
    })
  },
  output: { schema: GenerateLiveResponseOutputSchema },
  prompt: `You are an expert career coach and industry researcher providing a suggested answer for a candidate in a live interview.
Your task is to synthesize the candidate's resume, the job description, and general knowledge about the company to formulate a highly precise and impressive answer.

The answer MUST be from the candidate's perspective, using the first person (e.g., "I," "my," "I have experience with...").
It must be concise and impactful, designed to be spoken in approximately 20 seconds (around 60 words).
Use **bold markdown** to highlight key names, technologies, or concepts that should be emphasized when speaking.

CONTEXT:
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
{{#if isUser}}Interviewer: {{content}}{{/if}}
{{#if isModel}}Me (My Answer): {{content}}{{/if}}
{{/each}}
---
{{/if}}

Most Recent Interviewer's Question:
"{{{question}}}"

Your Suggested Answer (as the candidate, ~60 words):`,
});

const generateLiveResponseFlow = ai.defineFlow(
  {
    name: 'generateLiveResponseFlow',
    inputSchema: z.object({ // Corresponds to the prompt's input schema
      question: z.string(),
      resume: z.string(),
      jobDescription: z.string(),
      conversationHistory: z.array(z.object({
        role: z.enum(['user', 'model']),
        content: z.string(),
        isUser: z.boolean(),
        isModel: z.boolean(),
      })).optional(),
    }),
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
