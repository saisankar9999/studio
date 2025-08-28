
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

const GenerateLiveResponseInputSchema = z.object({
  question: z.string().describe("The interview question that was asked."),
  resume: z.string().describe("The candidate's resume text content."),
  jobDescription: z.string().describe('The job description for the role.'),
});
export type GenerateLiveResponseInput = z.infer<typeof GenerateLiveResponseInputSchema>;

const GenerateLiveResponseOutputSchema = z.object({
  answer: z.string().describe("A concise, first-person answer to the interview question."),
});
export type GenerateLiveResponseOutput = z.infer<typeof GenerateLiveResponseOutputSchema>;

export async function generateLiveResponse(
  input: GenerateLiveResponseInput
): Promise<GenerateLiveResponseOutput> {
  return generateLiveResponseFlow(input);
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

Interviewer's Question:
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
