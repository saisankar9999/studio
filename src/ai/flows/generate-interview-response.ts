'use server';

/**
 * @fileOverview A flow for generating a tailored interview response based on transcribed text.
 *
 * - generateInterviewResponse - Generates an answer to the transcribed question.
 * - GenerateInterviewResponseInput - The input type for the function.
 * - GenerateInterviewResponseOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateInterviewResponseInputSchema = z.object({
  transcription: z.string().describe("The transcribed text of the user's question to the coach."),
  resume: z.string().describe("The candidate's resume text content."),
  jobDescription: z.string().describe('The job description for the role.'),
});
export type GenerateInterviewResponseInput = z.infer<typeof GenerateInterviewResponseInputSchema>;

const GenerateInterviewResponseOutputSchema = z.object({
  answer: z
    .string()
    .describe(
      'A helpful, direct answer from the perspective of an AI career coach.'
    ),
});
export type GenerateInterviewResponseOutput = z.infer<typeof GenerateInterviewResponseOutputSchema>;

export async function generateInterviewResponse(
  input: GenerateInterviewResponseInput
): Promise<GenerateInterviewResponseOutput> {
  return generateInterviewResponseFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateInterviewResponsePrompt',
  input: {
    schema: GenerateInterviewResponseInputSchema,
  },
  output: { schema: GenerateInterviewResponseOutputSchema },
  prompt: `You are an expert AI career coach and interview mentor. Your goal is to help a candidate prepare for their job interview by providing detailed, accurate, and helpful information.
Your persona is that of a knowledgeable and direct assistant (like Google's Gemini or ChatGPT). You are not the candidate. Do not role-play. Answer the user's questions directly.

Your tone should be supportive and insightful. Your responses MUST be highly structured and easy to read.

Follow these formatting rules STRICTLY:
1.  Use clear headings and subheadings (using markdown) to organize the information into logical sections.
2.  Use bullet points to break down complex topics, lists, or steps.
3.  Use **bold text** to highlight key terms, concepts, and important phrases.
4.  Provide concrete, relevant examples to illustrate your points, especially when explaining technical concepts or behavioral strategies.
5.  Keep the language clear, concise, and professional.

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
"{{{transcription}}}"

Your Response (as the AI coach):`,
});

const generateInterviewResponseFlow = ai.defineFlow(
  {
    name: 'generateInterviewResponseFlow',
    inputSchema: GenerateInterviewResponseInputSchema,
    outputSchema: GenerateInterviewResponseOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);

    if (!output) {
      throw new Error('Failed to generate an answer.');
    }

    return {
      answer: output.answer,
    };
  }
);
