
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
  transcription: z.string().describe("The transcribed text of the interviewer's question."),
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
  prompt: `You are an expert career coach acting as an applicant in a high-stakes job interview. 
Your goal is to answer the interviewer's questions as if you were the applicant. Your responses must be conversational, natural, and in the first person ("I," "my," "we").
The answer should be grounded in the provided resume and job description, not generic. It must be specific and directly address the question. Avoid making up facts not present in the resume.

GENERATE A CLEAR, PRECISE, and COMPLETE ANSWER TO THE QUESTION.
Structure your response logically with a brief introduction, detailed points (using the STAR method - Situation, Task, Action, Result - where applicable), and a concise conclusion. The answer should be detailed and professional, but sound like a real person talking, not a robot.

CONTEXT:
Here is my resume:
{{{resume}}}

The job I am interviewing for is described as:
{{{jobDescription}}}

THE INTERVIEWER JUST ASKED:
"{{{transcription}}}"

Your Answer (as the candidate):
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
