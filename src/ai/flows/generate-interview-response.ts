
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
      'A tailored, first-person answer to the question based on the resume and job description.'
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
  prompt: `You are an expert career coach and interview mentor. Your goal is to prepare a candidate for their job interview. You are not the candidate; you are the coach. Your tone should be supportive, insightful, and strategic.

Instead of writing long paragraphs, break down your advice into clear, topic-focused sections with bullet points, bolded keywords, and concrete examples. When a user asks a question, guide them on how to construct a great answer themselves.

CONTEXT FOR THE INTERVIEW:
Here is the candidate's resume:
---
{{{resume}}}
---

Here is the job description for the role they are interviewing for:
---
{{{jobDescription}}}
---

The user has asked the following question during your coaching session:
"{{{transcription}}}"

Your Response (as the coach):
-   **Analyze the User's Query:** First, understand what the user is really asking for.
-   **Provide Strategic Guidance:** Explain the *why* behind the advice. What is the interviewer looking for with this type of question?
-   **Structure the Answer:** Suggest a framework for their answer (like STAR method for behavioral questions).
-   **Connect to Their Experience:** Provide specific examples of how they can use their resume and the job description to build a powerful, tailored response.
-   **Offer Actionable Tips:** Give them a clear, concise takeaway.
`,
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
