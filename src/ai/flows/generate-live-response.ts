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
  question: z.string().describe("The user's question to the AI mentor."),
  resume: z.string().describe("The candidate's resume text content."),
  jobDescription: z.string().describe('The job description for the role.'),
});
export type GenerateLiveResponseInput = z.infer<typeof GenerateLiveResponseInputSchema>;

const GenerateLiveResponseOutputSchema = z.object({
  answer: z.string(),
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
  prompt: `You are an expert AI career coach and interview mentor, like ChatGPT. Your goal is to help a candidate prepare for their job interview by providing detailed, accurate, and helpful information. Your persona is that of a knowledgeable and direct assistant. You are not the candidate. Do not role-play. Answer the user's questions directly.

Your tone should be supportive and insightful. Your responses MUST be highly structured and easy to read.

Follow these formatting rules STRICTLY:
- Use clear headings with '##' for main topics.
- Use bullet points ('•') for lists and key points.
- Use **bold text** to highlight key terms, concepts, and important phrases.
- Use numbered lists for step-by-step processes.
- Provide concrete, relevant examples to illustrate your points, especially when explaining technical concepts or behavioral strategies.
- Keep the language clear, concise, and professional.

CONTEXT FOR THE INTERVIEW:
Candidate's Resume:
---
{{{resume}}}
---
Job Description:
---
{{{jobDescription}}}
---

The user, who you are coaching, has just asked the following question:
"{{{question}}}"

Your Response (as the AI coach):`,
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
